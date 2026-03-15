import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, FileText, ChevronRight } from 'lucide-react';
import { supabase } from "@/lib/supabaseClient";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

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

            // 2. Pending Payments globally
            const { data: pendingSales, error: pendingError } = await supabase
                .from('sales')
                .select('remaining_amount')
                .gt('remaining_amount', 0);
            if (pendingError) throw pendingError;

            // 3. Recent 5 rows
            const { data: recent, error: recentError } = await supabase
                .from('sales')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);
            if (recentError) throw recentError;

            // Process Stats
            const todaySales = rangeSales.filter(s => s.date === todayStr);
            setStats({
                todayTotal: todaySales.reduce((acc, curr) => acc + Number(curr.total), 0),
                todayEntries: todaySales.length,
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

            const processedChart = Object.keys(dayMap).sort().map(dateIso => {
                const dayName = new Date(dateIso).toLocaleDateString('en-IN', { weekday: 'short' });
                return { name: dayName, total: dayMap[dateIso] };
            });

            // Process Pie Chart (Payment Distribution from exactly same 7 days)
            const payMap = { Cash: 0, UPI: 0, Card: 0 };
            rangeSales.forEach(sale => {
                if (payMap[sale.payment_method] !== undefined) {
                    payMap[sale.payment_method] += Number(sale.total);
                }
            });
            const processedPie = Object.keys(payMap)
                .filter(k => payMap[k] > 0)
                .map(k => ({ name: k, value: payMap[k] }));

            setAnalyticsData(processedChart);
            setPieData(processedPie);
            setRecentSales(recent || []);

        } catch (err) {
            console.error('Error fetching stats:', err);
        } finally {
            setLoading(false);
        }
    };

    const currentDate = new Date().toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const formatCurrency = (val) => Number(val).toLocaleString('en-IN');
    const PIE_COLORS = ['#800020', '#C6A75E', '#1f2937'];

    // Custom tooltips
    const CustomLineTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ background: '#fff', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>{label}</p>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--primary-color)' }}>₹ {formatCurrency(payload[0].value)}</p>
                </div>
            );
        }
        return null;
    };

    const CustomPieTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ background: '#fff', padding: '8px 12px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)' }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>{payload[0].name}</p>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: payload[0].payload.fill }}>₹ {formatCurrency(payload[0].value)}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="page-container">
            {/* TOP HEADER SECTION */}
            <div className="dashboard-header">
                <div>
                    <h2 className="dashboard-title">Dashboard</h2>
                    <p className="dashboard-date">{currentDate}</p>
                </div>
                <button className="btn btn-primary top-add-btn" onClick={() => navigate('/add')}>
                    <PlusCircle size={18} /> Add Sale
                </button>
            </div>

            {/* SUMMARY CARDS SECTION */}
            <div className="stats-grid">
                <div className="dash-card primary-dash-card">
                    <div className="dash-card-label">Today's Total Sale</div>
                    <div className="dash-card-value primary-value">
                        {loading ? '...' : `₹ ${formatCurrency(stats.todayTotal)}`}
                    </div>
                    <div className="dash-card-sub">Gross revenue today</div>
                </div>

                <div className="dash-card warning-dash-card">
                    <div className="dash-card-label">Pending Payments</div>
                    <div className="dash-card-value warning-value">
                        {loading ? '...' : `₹ ${formatCurrency(stats.pendingPayments)}`}
                    </div>
                    <div className="dash-card-sub">Outstanding dues globally</div>
                </div>

                <div className="dash-card tertiary-dash-card">
                    <div className="dash-card-label">Total Entries Today</div>
                    <div className="dash-card-value tertiary-value">
                        {loading ? '...' : stats.todayEntries}
                    </div>
                    <div className="dash-card-sub">Transactions recorded</div>
                </div>
            </div>

            {/* SALES ANALYTICS */}
            <div style={{ marginTop: '30px' }}>
                <h3 className="section-title">Sales Analytics</h3>

                {loading ? (
                    <div className="dash-card" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="spinner" style={{ borderColor: '#e5e7eb', borderTopColor: 'var(--primary-color)' }}></span>
                    </div>
                ) : (
                    <div className="analytics-grid">
                        {/* Line Chart */}
                        <div className="dash-card analytics-line-card">
                            <div className="dash-card-label" style={{ marginBottom: '24px' }}>7-Day Revenue Trend</div>
                            <div style={{ height: '240px', width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={analyticsData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                                        <Tooltip content={<CustomLineTooltip />} />
                                        <Line type="monotone" dataKey="total" stroke="var(--primary-color)" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, fill: 'var(--primary-color)' }} isAnimationActive={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Donut Chart */}
                        <div className="dash-card analytics-pie-card">
                            <div className="dash-card-label" style={{ marginBottom: '8px' }}>Payment Distribution</div>
                            {pieData.length === 0 ? (
                                <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#9ca3af' }}>No data</div>
                            ) : (
                                <div style={{ height: '200px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" isAnimationActive={false}>
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomPieTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>

                                    <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                                        {pieData.map((entry, index) => (
                                            <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 500, color: 'var(--text-main)' }}>
                                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></span>
                                                {entry.name}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', marginTop: '30px' }}>
                <h3 className="section-title">Recent Sales</h3>
                <button className="btn-text-link" onClick={() => navigate('/records')}>
                    View All <ChevronRight size={16} />
                </button>
            </div>

            {loading ? (
                <div className="empty-state">
                    <span className="spinner" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--primary-color)' }}></span>
                </div>
            ) : recentSales.length === 0 ? (
                <div className="empty-state" style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ fontSize: '15px', color: 'var(--text-main)', marginBottom: '4px' }}>No recent sales</h3>
                    <p style={{ fontSize: '13px' }}>Start by adding a new sale today.</p>
                </div>
            ) : (
                <>
                    {/* DESKTOP TABLE VIEW */}
                    <div className="desktop-recent-table">
                        <table className="records-table" style={{ background: '#FFFFFF', borderRadius: '14px', overflow: 'hidden' }}>
                            <thead>
                                <tr>
                                    <th>Customer Name</th>
                                    <th>Item Name</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentSales.map((sale) => (
                                    <tr key={sale.id}>
                                        <td>
                                            <div style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{sale.customer_name}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                {new Date(sale.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                        </td>
                                        <td style={{ fontWeight: 500, color: 'var(--text-main)' }}>{sale.item_name}</td>
                                        <td style={{ fontWeight: 700 }}>₹{formatCurrency(sale.total)}</td>
                                        <td>
                                            {sale.remaining_amount > 0 ? (
                                                <span className="badges badge-card">Pending: ₹{formatCurrency(sale.remaining_amount)}</span>
                                            ) : (
                                                <span className="badges badge-cash">Settled</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* MOBILE CARD VIEW */}
                    <div className="mobile-recent-cards">
                        {recentSales.map((sale) => (
                            <div key={sale.id} className="mobile-recent-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--primary-color)' }}>{sale.customer_name}</div>
                                    <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-main)' }}>₹{formatCurrency(sale.total)}</div>
                                </div>

                                <div style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: 500, marginBottom: '8px' }}>
                                    {sale.item_name}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                        {new Date(sale.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                    <div>
                                        {sale.remaining_amount > 0 ? (
                                            <span style={{ color: '#dc2626', fontWeight: 600, fontSize: '13px', backgroundColor: '#fee2e2', padding: '4px 8px', borderRadius: '4px' }}>
                                                DUE: ₹{formatCurrency(sale.remaining_amount)}
                                            </span>
                                        ) : (
                                            <span className="badges badge-cash" style={{ padding: '4px 8px', fontSize: '12px' }}>Settled</span>
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
                <button className="btn btn-primary btn-full" onClick={() => navigate('/add')} style={{ padding: '16px', fontSize: '16px', fontWeight: 600, borderRadius: '12px' }}>
                    <PlusCircle size={20} /> Add New Sale
                </button>
            </div>

            <style>{`
        /* Core Header */
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 24px;
        }
        .dashboard-title {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 4px;
          line-height: 1;
        }
        .dashboard-date {
          font-size: 14px;
          color: var(--text-muted);
          font-weight: 500;
        }
        .btn-text-link {
          background: none; border: none; color: var(--text-muted); font-size: 14px; font-weight: 500;
          display: flex; align-items: center; gap: 4px; cursor: pointer;
        }
        .btn-text-link:hover { color: var(--primary-color); }

        /* Dashboard Global Card UI */
        .dash-card {
          background-color: #FFFFFF;
          border-radius: 14px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          border: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          justify-content: center;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .dash-card-label { font-size: 13px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
        .dash-card-sub { font-size: 12px; color: #9ca3af; margin-top: 8px; font-weight: 500; }
        
        .primary-value { font-size: 36px; font-weight: 700; color: var(--primary-color); line-height: 1; }
        .warning-value { font-size: 28px; font-weight: 700; color: #b45309; line-height: 1; }
        .tertiary-value { font-size: 28px; font-weight: 700; color: var(--text-main); line-height: 1; }

        .primary-dash-card { border-top: 4px solid var(--primary-color); }
        .warning-dash-card { border-top: 4px solid #f59e0b; }

        /* Analytics Grid Specific */
        .analytics-grid { display: grid; gap: 20px; width: 100%; }

        /* Mobile Defaults (<768px) */
        @media (max-width: 767px) {
           .page-container { padding-bottom: 32px; }
           .top-add-btn { display: none !important; }
           .desktop-recent-table { display: none !important; }

           .mobile-recent-cards { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
           .mobile-recent-card {
             background: #FFFFFF; border-radius: 14px; padding: 16px;
             box-shadow: 0 2px 10px rgba(0,0,0,0.03); border: 1px solid var(--border-color);
           }
           
           .mobile-fab-container { position: sticky; bottom: 56px; margin-top: 24px; z-index: 50; }
        }

        /* Tablet (768px - 1024px) */
        @media (min-width: 768px) and (max-width: 1023px) {
           .mobile-fab-container { display: none !important; }
           .mobile-recent-cards { display: none !important; }
           
           .dash-card:nth-child(3) { grid-column: span 2; align-items: center; text-align: center; }
        }

        /* Desktop (>1024px) */
        @media (min-width: 1024px) {
           .mobile-fab-container { display: none !important; }
           .mobile-recent-cards { display: none !important; }

           .dash-card:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
           }
        }
      `}</style>
        </div>
    );
}
