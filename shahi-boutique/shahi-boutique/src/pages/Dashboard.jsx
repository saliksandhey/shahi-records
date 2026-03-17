import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, ChevronRight, TrendingUp, AlertCircle, ShoppingBag, CreditCard, Banknote, Smartphone, FileText } from 'lucide-react';
import { supabase } from "@/lib/supabaseClient";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

export default function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ todayTotal: 0, todayEntries: 0, pendingPayments: 0 });
    const [recentSales, setRecentSales] = useState([]);
    const [analyticsData, setAnalyticsData] = useState([]);
    const [pieData, setPieData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMainDashboardStats();
    }, []);

    const fetchMainDashboardStats = async () => {
        try {
            const todayStr = new Date().toISOString().split('T')[0];

            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
            const pastStr = sevenDaysAgo.toISOString().split('T')[0];

            // 1. Fetch 7 days for analytics & today stats
            const { data: rangeSales, error: rangeError } = await supabase
                .from('sales')
                .select('*')
                .gte('date', pastStr)
                .lte('date', todayStr);
            if (rangeError) throw rangeError;

            const { data: rangeInvoices, error: invError } = await supabase
                .from('invoices')
                .select('*, invoice_items(*)')
                .gte('rec_date', pastStr)
                .lte('rec_date', todayStr);
            if (invError) throw invError;

            // 2. Pending Payments globally (Sales only for now)
            const { data: pendingSales, error: pendingError } = await supabase
                .from('sales')
                .select('remaining_amount')
                .gt('remaining_amount', 0);
            if (pendingError) throw pendingError;

            // 3. Recent 5 rows from both
            const { data: recentSalesList, error: recentError } = await supabase
                .from('sales')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);
            if (recentError) throw recentError;

            const { data: recentInvList } = await supabase
                .from('invoices')
                .select('*, invoice_items(*)')
                .order('created_at', { ascending: false })
                .limit(5);

            // Process Stats
            const todaySales = rangeSales.filter(s => s.date === todayStr);
            const todayInvoices = rangeInvoices.filter(i => i.rec_date === todayStr);

            setStats({
                todayTotal: 
                    todaySales.reduce((acc, curr) => acc + Number(curr.total), 0) + 
                    todayInvoices.reduce((acc, curr) => acc + Number(curr.total_amount), 0),
                todayEntries: todaySales.length + todayInvoices.length,
                pendingPayments: pendingSales.reduce((acc, curr) => acc + Number(curr.remaining_amount), 0)
            });

            // Process Line Chart (Last 7 Days)
            const dayMap = {};
            for (let i = 0; i < 7; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const iso = d.toISOString().split('T')[0];
                dayMap[iso] = 0; // Initialize 0
            }

            rangeSales.forEach(sale => {
                if (dayMap[sale.date] !== undefined) dayMap[sale.date] += Number(sale.total);
            });
            rangeInvoices.forEach(inv => {
                if (dayMap[inv.rec_date] !== undefined) dayMap[inv.rec_date] += Number(inv.total_amount);
            });

            const processedChart = Object.keys(dayMap).sort().map(dateIso => {
                const dayName = new Date(dateIso).toLocaleDateString('en-IN', { weekday: 'short' });
                return { name: dayName, total: dayMap[dateIso] };
            });

            // Process Pie Chart (Payment Distribution)
            const payMap = {};
            rangeSales.forEach(sale => {
                const pm = sale.payment_method || 'Cash';
                payMap[pm] = (payMap[pm] || 0) + Number(sale.total);
            });
            rangeInvoices.forEach(inv => {
                payMap['Invoice'] = (payMap['Invoice'] || 0) + Number(inv.total_amount);
            });
            const processedPie = Object.keys(payMap)
                .filter(k => payMap[k] > 0)
                .map(k => ({ name: k, value: payMap[k] }));

            // Merge recent records
            const mergedRecent = [];
            (recentSalesList || []).forEach(sale => {
                mergedRecent.push({
                    id: sale.id,
                    _type: 'sale',
                    _date: sale.date,
                    _customer: sale.customer_name,
                    _description: sale.item_name,
                    _total: Number(sale.total || 0),
                    _status: sale.remaining_amount > 0 ? 'pending' : 'settled',
                    _remaining: sale.remaining_amount,
                    _payment: sale.payment_method,
                    _sortDate: new Date(sale.created_at || sale.date).getTime(),
                });
            });

            (recentInvList || []).forEach(inv => {
                const itemsSummary = (inv.invoice_items || []).map(i => i.description).join(', ');
                mergedRecent.push({
                    id: inv.id,
                    _type: 'invoice',
                    _date: inv.rec_date,
                    _customer: inv.customer_name,
                    _description: itemsSummary || 'Invoice',
                    _total: Number(inv.total_amount || 0),
                    _status: 'invoiced',
                    _sortDate: new Date(inv.created_at || inv.rec_date).getTime(),
                });
            });

            mergedRecent.sort((a, b) => b._sortDate - a._sortDate);

            setAnalyticsData(processedChart);
            setPieData(processedPie);
            setRecentSales(mergedRecent.slice(0, 5));

        } catch (err) {
            console.error('Error fetching stats:', err);
        } finally {
            setLoading(false);
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    const currentDate = new Date().toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const formatCurrency = (val) => Number(val).toLocaleString('en-IN');
    const PIE_COLORS = ['#8b0000', '#C6A75E', '#1f2937', '#3b82f6'];

    const getPaymentIcon = (method) => {
        switch(method) {
            case 'UPI': return <Smartphone size={14} color="#8b0000" />;
            case 'Card': return <CreditCard size={14} color="#C6A75E" />;
            case 'Invoice': return <FileText size={14} color="#3b82f6" />;
            default: return <Banknote size={14} color="#1f2937" />;
        }
    }

    // Custom tooltips
    const CustomLineTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="custom-chart-tooltip">
                    <p className="tooltip-label">{label}</p>
                    <p className="tooltip-value">₹ {formatCurrency(payload[0].value)}</p>
                </div>
            );
        }
        return null;
    };

    const CustomPieTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="custom-chart-tooltip">
                    <p className="tooltip-label">{payload[0].name}</p>
                    <p className="tooltip-value" style={{ color: payload[0].payload.fill }}>
                        ₹ {formatCurrency(payload[0].value)}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="page-container page-animate-in">
            {/* TOP HEADER SECTION */}
            <div className="modern-header-section">
                <div className="header-greeting-wrapper">
                    <div className="greeting-pill">{getGreeting()}</div>
                    <h2 className="dashboard-title-modern">Welcome to Shahi Records</h2>
                    <p className="dashboard-date-modern">{currentDate}</p>
                </div>
                <button className="btn btn-primary top-add-btn premium-glow-btn" onClick={() => navigate('/add')}>
                    <PlusCircle size={18} /> Add Sale
                </button>
            </div>

            {/* SUMMARY CARDS SECTION */}
            <div className="stats-grid premium-stats">
                <div className="dash-card premium-card card-primary fade-up-1">
                    <div className="card-bg-decoration"></div>
                    <div className="premium-card-icon-wrapper" style={{ background: '#fdf2f2' }}>
                        <TrendingUp size={24} color="#8b0000" />
                    </div>
                    <div className="premium-card-content">
                        <div className="dash-card-label">Today's Revenue</div>
                        <div className="dash-card-value primary-value">
                            {loading ? <span className="skeleton-text skeleton-shimmer"></span> : `₹${formatCurrency(stats.todayTotal)}`}
                        </div>
                        <div className="dash-card-sub">Gross collections today</div>
                    </div>
                </div>

                <div className="dash-card premium-card card-warning fade-up-2">
                    <div className="card-bg-decoration"></div>
                    <div className="premium-card-icon-wrapper" style={{ background: '#fef3c7' }}>
                        <AlertCircle size={24} color="#b45309" />
                    </div>
                    <div className="premium-card-content">
                        <div className="dash-card-label">Pending Payments</div>
                        <div className="dash-card-value warning-value">
                            {loading ? <span className="skeleton-text skeleton-shimmer"></span> : `₹${formatCurrency(stats.pendingPayments)}`}
                        </div>
                        <div className="dash-card-sub">Outstanding global dues</div>
                    </div>
                </div>

                <div className="dash-card premium-card card-tertiary fade-up-3">
                     <div className="card-bg-decoration"></div>
                    <div className="premium-card-icon-wrapper" style={{ background: '#f3f4f6' }}>
                        <ShoppingBag size={24} color="#374151" />
                    </div>
                    <div className="premium-card-content">
                        <div className="dash-card-label">Today's Entries</div>
                        <div className="dash-card-value tertiary-value">
                            {loading ? <span className="skeleton-text skeleton-shimmer"></span> : stats.todayEntries}
                        </div>
                        <div className="dash-card-sub">Total sales recorded</div>
                    </div>
                </div>
            </div>

            {/* SALES ANALYTICS */}
            <div className="analytics-section-wrapper fade-up-4">
                <h3 className="section-title modern-section-title">Sales Analytics</h3>

                {loading ? (
                    <div className="dash-card skeleton-card" style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="spinner" style={{ borderColor: '#e5e7eb', borderTopColor: 'var(--primary-color)' }}></span>
                    </div>
                ) : (
                    <div className="analytics-grid">
                        {/* Area Chart for Revenue Trend */}
                        <div className="dash-card analytics-modern-card area-chart-card">
                            <div className="glass-reflection"></div>
                            <div className="card-modern-header">
                                <h4 className="dash-card-label m-0">7-Day Revenue Trend</h4>
                                <span className="trend-badge">Last 7 Days</span>
                            </div>
                            <div className="chart-container-inner">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={analyticsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.25}/>
                                                <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                        <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val >= 1000 ? val / 1000 + 'k' : val}`} dx={-10} />
                                        <Tooltip content={<CustomLineTooltip />} cursor={{ stroke: 'rgba(139,0,0,0.1)', strokeWidth: 2 }} />
                                        <Area type="monotone" dataKey="total" stroke="var(--primary-color)" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--primary-color)' }} isAnimationActive={true} animationDuration={1000} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Donut Chart */}
                        <div className="dash-card analytics-modern-card pie-chart-card">
                             <div className="card-modern-header">
                                <h4 className="dash-card-label m-0">Payment Modes</h4>
                            </div>
                            {pieData.length === 0 ? (
                                <div className="no-data-msg">No data available</div>
                            ) : (
                                <div className="pie-container-inner">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none" isAnimationActive={true} animationDuration={1000}>
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} style={{ outline: 'none' }} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomPieTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>

                                    <div className="pie-legend-container">
                                        {pieData.map((entry, index) => (
                                            <div key={entry.name} className="pie-legend-item">
                                                <div className="legend-color-dot" style={{ backgroundColor: '#fff', border: `1px solid ${PIE_COLORS[index % PIE_COLORS.length]}` }}>
                                                    {getPaymentIcon(entry.name)}
                                                </div>
                                                <div className="legend-text">
                                                    <span className="legend-name">{entry.name}</span>
                                                    <span className="legend-val">₹{formatCurrency(entry.value)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* RECENT SALES TITLES */}
            <div className="recent-sales-header fade-up-5">
                <h3 className="section-title modern-section-title">Recent Transactions</h3>
                <button className="btn-text-link hover-slide" onClick={() => navigate('/records')}>
                    View All <ChevronRight size={16} />
                </button>
            </div>

            {loading ? (
                <div className="dash-card skeleton-card" style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <span className="spinner" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--primary-color)' }}></span>
                </div>
            ) : recentSales.length === 0 ? (
                <div className="empty-state modern-empty fade-up-5" >
                    <div className="empty-icon-circle">
                         <ShoppingBag size={28} color="var(--primary-color)" opacity={0.5} />
                    </div>
                    <h3 className="empty-title">No transactions yet</h3>
                    <p className="empty-desc">Your recent sales will appear right here.</p>
                </div>
            ) : (
                <>
                    {/* DESKTOP TABLE VIEW */}
                    <div className="desktop-recent-table animated-table-wrapper fade-up-5">
                        <table className="modern-records-table">
                            <thead>
                                <tr>
                                    <th>Customer Details</th>
                                    <th>Item Purchased</th>
                                    <th>Amount</th>
                                    <th>Payment Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentSales.map((sale, i) => (
                                    <tr key={`${sale._type}-${sale.id}`} className="table-row-hover">
                                        <td>
                                            <div className="td-customer-name">{sale._customer}</div>
                                            <div className="td-customer-date">
                                                {new Date(sale._date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                        </td>
                                        <td className="td-item-name">
                                            <span className="item-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                {sale._type === 'invoice' ? <FileText size={12} /> : <ShoppingBag size={12} />}
                                                {sale._description}
                                            </span>
                                        </td>
                                        <td className="td-amount">
                                           ₹{formatCurrency(sale._total)}
                                           <div className="td-pay-method">{sale._type === 'invoice' ? 'Invoice' : sale._payment}</div>
                                        </td>
                                        <td>
                                            {sale._type === 'invoice' ? (
                                                <span className="modern-badge" style={{background:'#EFF6FF', color:'#1D4ED8'}}>Invoiced</span>
                                            ) : sale._status === 'pending' ? (
                                                <span className="modern-badge badge-pending">Due: ₹{formatCurrency(sale._remaining)}</span>
                                            ) : (
                                                <span className="modern-badge badge-settled">Settled</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* MOBILE CARD VIEW */}
                    <div className="mobile-recent-cards fade-up-5">
                        {recentSales.map((sale, i) => (
                            <div key={`${sale._type}-${sale.id}`} className="mobile-recent-card">
                                <div className="m-card-header">
                                    <div className="m-card-customer">{sale._customer}</div>
                                    <div className="m-card-amount">₹{formatCurrency(sale._total)}</div>
                                </div>

                                <div className="m-card-item">
                                    {sale._type === 'invoice' ? <FileText size={14} style={{ marginRight: '6px', opacity: 0.6 }}/> : <ShoppingBag size={14} style={{ marginRight: '6px', opacity: 0.6 }}/>} {sale._description}
                                </div>

                                <div className="m-card-footer">
                                    <div className="m-card-date">
                                        {new Date(sale._date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                    <div className="m-card-status">
                                        {sale._type === 'invoice' ? (
                                            <span style={{background:'#EFF6FF', color:'#1D4ED8', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700}}>Invoiced</span>
                                        ) : sale._status === 'pending' ? (
                                            <span className="m-badge-pending">
                                                ₹{formatCurrency(sale._remaining)} Due
                                            </span>
                                        ) : (
                                            <span className="m-badge-settled">Settled</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* MOBILE ACTION BUTTON */}
            <div className="mobile-fab-container">
                <button className="btn btn-primary btn-full floating-fab premium-glow-btn" onClick={() => navigate('/add')}>
                    <PlusCircle size={22} className="fab-icon" /> <span>Add New Sale</span>
                </button>
            </div>
        </div>
    );
}
