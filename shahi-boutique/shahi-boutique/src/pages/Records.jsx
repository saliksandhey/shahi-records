import React, { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabaseClient";
import { Trash2, Filter, ChevronLeft, ChevronRight, Eye, X, ShoppingBag, FileText } from 'lucide-react';

/* ──────────────────────────────────────────────
   DELETE  MODAL
   ────────────────────────────────────────────── */
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, recordType }) => {
    if (!isOpen) return null;
    return (
        <>
            <div className="modal-overlay" onClick={onClose}></div>
            <div className="modal-content">
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>Confirm Deletion</h3>
                <p className="text-muted" style={{ marginBottom: '24px', lineHeight: '1.5', fontSize: '14px' }}>
                    Are you sure you want to delete this {recordType || 'record'}? This action cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={onConfirm} style={{ backgroundColor: '#dc2626' }}>Delete</button>
                </div>
            </div>
        </>
    );
};

/* ──────────────────────────────────────────────
   DETAIL  MODAL  (for viewing a record)
   ────────────────────────────────────────────── */
const DetailModal = ({ record, onClose }) => {
    if (!record) return null;

    const isSale = record._type === 'sale';
    const formatCurrency = (val) => Number(val || 0).toLocaleString('en-IN');
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    return (
        <>
            <div className="modal-overlay" onClick={onClose}></div>
            <div className="modal-content" style={{ maxWidth: '520px', maxHeight: '80vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className={`record-type-badge ${isSale ? 'badge-sale' : 'badge-invoice'}`}>
                            {isSale ? <><ShoppingBag size={13} /> Sale</> : <><FileText size={13} /> Invoice</>}
                        </span>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                            {isSale ? 'Sale Details' : 'Invoice Details'}
                        </h3>
                    </div>
                    <button className="btn-danger-icon" onClick={onClose} style={{ color: 'var(--text-muted)' }}>
                        <X size={20} />
                    </button>
                </div>

                <div className="detail-grid">
                    <div className="detail-item">
                        <span className="detail-label">Customer Name</span>
                        <span className="detail-value">{record.customer_name}</span>
                    </div>
                    {record.phone && (
                        <div className="detail-item">
                            <span className="detail-label">Phone</span>
                            <span className="detail-value">{record.phone}</span>
                        </div>
                    )}
                    <div className="detail-item">
                        <span className="detail-label">Date</span>
                        <span className="detail-value">{formatDate(record._date)}</span>
                    </div>

                    {isSale ? (
                        <>
                            <div className="detail-item">
                                <span className="detail-label">Item</span>
                                <span className="detail-value">{record.item_name}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Qty × Price</span>
                                <span className="detail-value">{record.quantity} × ₹{formatCurrency(record.price)}</span>
                            </div>
                            {record.discount > 0 && (
                                <div className="detail-item">
                                    <span className="detail-label">Discount</span>
                                    <span className="detail-value" style={{ color: '#16a34a' }}>- ₹{formatCurrency(record.discount)}</span>
                                </div>
                            )}
                            <div className="detail-item">
                                <span className="detail-label">Total</span>
                                <span className="detail-value font-bold" style={{ fontSize: '18px', color: 'var(--primary-color)' }}>₹{formatCurrency(record.total)}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Paid</span>
                                <span className="detail-value">₹{formatCurrency(record.paid_amount)} via {record.payment_method}</span>
                            </div>
                            {record.remaining_amount > 0 && (
                                <div className="detail-item">
                                    <span className="detail-label">Remaining</span>
                                    <span className="detail-value" style={{ color: '#dc2626', fontWeight: 600 }}>₹{formatCurrency(record.remaining_amount)}</span>
                                </div>
                            )}
                            {record.notes && (
                                <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                                    <span className="detail-label">Notes</span>
                                    <span className="detail-value">{record.notes}</span>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="detail-item">
                                <span className="detail-label">Invoice Number</span>
                                <span className="detail-value font-bold">{record.invoice_number}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Delivery Date</span>
                                <span className="detail-value">{formatDate(record.delivery_date)}</span>
                            </div>

                            {/* Invoice items table */}
                            {record._items && record._items.length > 0 && (
                                <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                                    <span className="detail-label" style={{ marginBottom: '8px', display: 'block' }}>Items</span>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</th>
                                                <th style={{ textAlign: 'right', padding: '8px 10px', borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Qty</th>
                                                <th style={{ textAlign: 'right', padding: '8px 10px', borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Price</th>
                                                <th style={{ textAlign: 'right', padding: '8px 10px', borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {record._items.map((item, i) => (
                                                <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : '#f9fafb' }}>
                                                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6' }}>{item.description}</td>
                                                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6', textAlign: 'right' }}>{item.quantity}</td>
                                                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6', textAlign: 'right' }}>₹{formatCurrency(item.price)}</td>
                                                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6', textAlign: 'right', fontWeight: 600 }}>₹{formatCurrency(item.amount)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <div className="detail-item">
                                <span className="detail-label">Total Amount</span>
                                <span className="detail-value font-bold" style={{ fontSize: '18px', color: 'var(--primary-color)' }}>₹{formatCurrency(record.total_amount)}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
};

/* ──────────────────────────────────────────────
   MAIN  RECORDS  PAGE
   ────────────────────────────────────────────── */
export default function Records() {
    const [records, setRecords] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'sale' | 'invoice'

    const [page, setPage] = useState(1);
    const limit = 15;

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState(null);
    const [detailRecord, setDetailRecord] = useState(null);

    useEffect(() => {
        fetchRecords();
    }, [dateFilter, typeFilter, page]);

    /* ──── Fetch & merge both tables ──── */
    const fetchRecords = async () => {
        setLoading(true);
        try {
            const mergedRecords = [];

            // ── Fetch Sales ──
            if (typeFilter === 'all' || typeFilter === 'sale') {
                let salesQuery = supabase.from('sales').select('*').order('created_at', { ascending: false });
                if (dateFilter) salesQuery = salesQuery.eq('date', dateFilter);

                const { data: salesData, error: salesError } = await salesQuery;
                if (salesError) throw salesError;

                (salesData || []).forEach(sale => {
                    mergedRecords.push({
                        ...sale,
                        _type: 'sale',
                        _date: sale.date,
                        _customer: sale.customer_name,
                        _phone: sale.phone,
                        _description: sale.item_name + (sale.quantity > 1 ? ` (x${sale.quantity})` : ''),
                        _total: Number(sale.total || 0),
                        _status: sale.remaining_amount > 0 ? 'pending' : 'settled',
                        _sortDate: new Date(sale.created_at || sale.date).getTime(),
                    });
                });
            }

            // ── Fetch Invoices (with items) ──
            if (typeFilter === 'all' || typeFilter === 'invoice') {
                let invQuery = supabase.from('invoices').select('*, invoice_items(*)').order('created_at', { ascending: false });
                if (dateFilter) invQuery = invQuery.eq('rec_date', dateFilter);

                const { data: invData, error: invError } = await invQuery;
                if (invError) throw invError;

                (invData || []).forEach(inv => {
                    const itemsSummary = (inv.invoice_items || []).map(i => i.description).join(', ');
                    mergedRecords.push({
                        ...inv,
                        _type: 'invoice',
                        _date: inv.rec_date,
                        _customer: inv.customer_name,
                        _phone: inv.phone,
                        _description: itemsSummary || 'Invoice',
                        _total: Number(inv.total_amount || 0),
                        _status: 'invoiced',
                        _items: inv.invoice_items || [],
                        _sortDate: new Date(inv.created_at || inv.rec_date).getTime(),
                    });
                });
            }

            // Sort newest first
            mergedRecords.sort((a, b) => b._sortDate - a._sortDate);

            setTotalCount(mergedRecords.length);

            // Client-side pagination
            const start = (page - 1) * limit;
            const paginated = mergedRecords.slice(start, start + limit);

            setRecords(paginated);
        } catch (err) {
            console.error('Error fetching records:', err);
        } finally {
            setLoading(false);
        }
    };

    /* ──── Delete ──── */
    const triggerDelete = (record) => {
        setRecordToDelete(record);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!recordToDelete) return;
        try {
            const table = recordToDelete._type === 'sale' ? 'sales' : 'invoices';
            const { error } = await supabase.from(table).delete().match({ id: recordToDelete.id });
            if (error) throw error;
            fetchRecords();
        } catch (err) {
            console.error('Delete failed:', err);
        } finally {
            setDeleteModalOpen(false);
            setRecordToDelete(null);
        }
    };

    /* ──── Helpers ──── */
    const formatCurrency = (val) => Number(val).toLocaleString('en-IN');
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
    const totalPages = Math.ceil(totalCount / limit);

    /* ──── Status Badge ──── */
    const StatusBadge = ({ record }) => {
        if (record._type === 'invoice') {
            return <span className="badges badge-upi">Invoiced</span>;
        }
        if (record._status === 'pending') {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                    <span className="badges badge-card">Pending: ₹{formatCurrency(record.remaining_amount)}</span>
                    <span className="text-xs text-muted">Paid: ₹{formatCurrency(record.paid_amount)} ({record.payment_method})</span>
                </div>
            );
        }
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                <span className="badges badge-cash">Settled</span>
                <span className="text-xs text-muted">via {record.payment_method}</span>
            </div>
        );
    };

    /* ──── Type Badge ──── */
    const TypeBadge = ({ type }) => (
        <span className={`record-type-badge ${type === 'sale' ? 'badge-sale' : 'badge-invoice'}`}>
            {type === 'sale' ? <><ShoppingBag size={13} /> Sale</> : <><FileText size={13} /> Invoice</>}
        </span>
    );

    return (
        <div className="page-container">
            <h2 className="page-title">Transaction Records</h2>

            <DeleteConfirmModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                recordType={recordToDelete?._type}
            />

            <DetailModal record={detailRecord} onClose={() => setDetailRecord(null)} />

            {/* ── FILTER BAR ── */}
            <div className="filter-wrapper card">
                <div style={{ flex: 1, width: '100%' }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Filter size={14} color="var(--text-muted)" /> Filter Date
                    </label>
                    <input
                        type="date"
                        className="form-control"
                        value={dateFilter}
                        onChange={(e) => {
                            setDateFilter(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
                <div style={{ flex: 1, width: '100%' }}>
                    <label className="form-label">Type</label>
                    <div className="type-filter-group">
                        {[
                            { value: 'all', label: 'All' },
                            { value: 'sale', label: 'Sales' },
                            { value: 'invoice', label: 'Invoices' },
                        ].map(opt => (
                            <button
                                key={opt.value}
                                className={`type-filter-btn ${typeFilter === opt.value ? 'active' : ''}`}
                                onClick={() => { setTypeFilter(opt.value); setPage(1); }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
                {(dateFilter || typeFilter !== 'all') && (
                    <button
                        className="btn btn-secondary clear-filter-btn"
                        onClick={() => { setDateFilter(''); setTypeFilter('all'); setPage(1); }}
                    >
                        Clear All
                    </button>
                )}
            </div>

            {/* ── SUMMARY CHIPS ── */}
            {!loading && records.length > 0 && (
                <div className="records-summary-bar">
                    <div className="records-summary-chip">
                        <span className="text-muted text-sm">Total Records</span>
                        <span className="font-bold">{totalCount}</span>
                    </div>
                    <div className="records-summary-chip" style={{ color: 'var(--primary-color)' }}>
                        <span className="text-muted text-sm">Page Total</span>
                        <span className="font-bold">₹{formatCurrency(records.reduce((s, r) => s + r._total, 0))}</span>
                    </div>
                </div>
            )}

            {/* ── CONTENT ── */}
            {loading ? (
                <div className="empty-state">
                    <span className="spinner" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--primary-color)' }}></span>
                </div>
            ) : records.length === 0 ? (
                <div className="empty-state">
                    <h3 style={{ fontSize: '15px', color: 'var(--text-main)', marginBottom: '4px' }}>No records found</h3>
                    <p style={{ fontSize: '13px' }}>
                        {dateFilter ? `No transactions on ${new Date(dateFilter).toLocaleDateString('en-IN')}.` : "No transactions recorded yet."}
                    </p>
                </div>
            ) : (
                <>
                    {/* ═══════════════ DESKTOP TABLE ═══════════════ */}
                    <div className="desktop-table-container">
                        <table className="records-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th style={{ width: '90px' }}>Type</th>
                                    <th>Customer</th>
                                    <th>Description / Items</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'center', width: '100px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((record) => (
                                    <tr key={`${record._type}-${record.id}`} className="record-row-clickable" onClick={() => setDetailRecord(record)}>
                                        <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDate(record._date)}</td>
                                        <td><TypeBadge type={record._type} /></td>
                                        <td>
                                            <div className="font-semibold" style={{ color: 'var(--primary-color)' }}>{record._customer}</div>
                                            {record._phone && <div className="text-xs text-muted">{record._phone}</div>}
                                        </td>
                                        <td>
                                            <div className="font-medium record-desc-cell">{record._description || '—'}</div>
                                        </td>
                                        <td className="font-bold" style={{ whiteSpace: 'nowrap' }}>₹{formatCurrency(record._total)}</td>
                                        <td><StatusBadge record={record} /></td>
                                        <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                <button className="btn-danger-icon" onClick={() => setDetailRecord(record)} title="View Details" style={{ color: 'var(--text-muted)' }}>
                                                    <Eye size={16} />
                                                </button>
                                                <button className="btn-danger-icon" onClick={() => triggerDelete(record)} title="Delete Record">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {totalCount > limit && (
                            <div className="pagination">
                                <div className="pagination-info">
                                    Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalCount)} of {totalCount}
                                </div>
                                <div className="pagination-controls">
                                    <button className="btn btn-secondary" style={{ padding: '6px 12px' }} disabled={page === 1} onClick={() => setPage(page - 1)}>
                                        <ChevronLeft size={16} />
                                    </button>
                                    <button className="btn btn-secondary" style={{ padding: '6px 12px' }} disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ═══════════════ MOBILE CARD LIST ═══════════════ */}
                    <div className="mobile-only-list">
                        {records.map((record) => (
                            <div key={`${record._type}-${record.id}`} className="mobile-record-card" onClick={() => setDetailRecord(record)}>

                                {/* Top Row: Type + Total */}
                                <div className="card-top-row">
                                    <TypeBadge type={record._type} />
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <div className="card-total">₹{formatCurrency(record._total)}</div>
                                        <button className="card-delete-icon" onClick={(e) => { e.stopPropagation(); triggerDelete(record); }}>
                                            <Trash2 size={16} color="#dc2626" />
                                        </button>
                                    </div>
                                </div>

                                {/* Customer Name */}
                                <div className="card-customer">{record._customer}</div>

                                {/* Description */}
                                <div className="card-item-row">{record._description || '—'}</div>

                                {/* Meta Row */}
                                <div className="card-meta-row">
                                    <span>{formatDate(record._date)}</span>
                                    {record._type === 'sale' && (
                                        <>
                                            <span className="meta-dot">•</span>
                                            <span>{record.payment_method}</span>
                                        </>
                                    )}
                                    {record._type === 'invoice' && record.invoice_number && (
                                        <>
                                            <span className="meta-dot">•</span>
                                            <span>{record.invoice_number}</span>
                                        </>
                                    )}
                                </div>

                                {/* Status Row */}
                                <div className="card-status-row">
                                    {record._type === 'invoice' ? (
                                        <span className="badges badge-upi" style={{ padding: '6px 10px', fontSize: '13px' }}>Invoiced</span>
                                    ) : record.remaining_amount > 0 ? (
                                        <span className="card-status-remaining">Remaining: ₹{formatCurrency(record.remaining_amount)}</span>
                                    ) : (
                                        <span className="badges badge-cash" style={{ padding: '6px 10px', fontSize: '13px' }}>Settled</span>
                                    )}
                                </div>
                            </div>
                        ))}

                        {totalCount > limit && (
                            <div style={{ display: 'flex', gap: '12px', padding: '16px 0 32px 0' }}>
                                <button className="btn btn-secondary" style={{ flex: 1, height: '44px' }} disabled={page === 1} onClick={() => setPage(page - 1)}>
                                    <ChevronLeft size={16} /> Prev
                                </button>
                                <button className="btn btn-secondary" style={{ flex: 1, height: '44px' }} disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                                    Next <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ═══════════════ RESPONSIVE STYLES ═══════════════ */}
                    <style>{`
            /* ── Filter Bar ── */
            .filter-wrapper { display: flex; gap: 12px; align-items: flex-end; padding: 16px; margin-bottom: 24px; flex-wrap: wrap; }
            .clear-filter-btn { padding: 10px 16px; height: 44px; }

            /* ── Type Filter Buttons ── */
            .type-filter-group { display: flex; gap: 6px; }
            .type-filter-btn {
                padding: 8px 14px; border-radius: var(--radius-btn); border: 1px solid var(--border-color);
                background: var(--card-bg); color: var(--text-muted); font-size: 13px; font-weight: 500;
                cursor: pointer; transition: all 0.2s;
            }
            .type-filter-btn:hover { background: var(--surface-hover); }
            .type-filter-btn.active {
                background: rgba(139, 0, 0, 0.06); border-color: var(--primary-color);
                color: var(--primary-color); font-weight: 600;
            }

            /* ── Type Badges ── */
            .record-type-badge {
                display: inline-flex; align-items: center; gap: 5px;
                padding: 4px 10px; border-radius: 20px;
                font-size: 11.5px; font-weight: 600; white-space: nowrap;
            }
            .badge-sale { background: #FFF7ED; color: #C2410C; border: 1px solid #FED7AA; }
            .badge-invoice { background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; }

            /* ── Summary Bar ── */
            .records-summary-bar { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
            .records-summary-chip {
                display: flex; align-items: center; gap: 8px;
                background: var(--card-bg); border: 1px solid var(--border-color);
                padding: 8px 16px; border-radius: var(--radius-btn); font-size: 14px;
            }

            /* ── Clickable Row ── */
            .record-row-clickable { cursor: pointer; transition: background 0.15s; }
            .record-row-clickable:hover { background-color: #fafafa; }

            /* ── Description Cell ── */
            .record-desc-cell { max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

            /* ── Detail Modal ── */
            .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            .detail-item { display: flex; flex-direction: column; gap: 4px; }
            .detail-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); }
            .detail-value { font-size: 14px; color: var(--text-main); font-weight: 500; }

            /* ── Mobile: hide desktop ── */
            .mobile-only-list { display: none; }

            @media (max-width: 767px) {
              .desktop-table-container { display: none !important; }
              .mobile-only-list { display: flex; flex-direction: column; width: 100%; }

              .filter-wrapper { flex-direction: column; gap: 16px; margin-bottom: 20px; align-items: stretch; }
              .clear-filter-btn { width: 100%; }
              .type-filter-group { width: 100%; }
              .type-filter-btn { flex: 1; text-align: center; }

              .records-summary-bar { flex-direction: column; }

              .detail-grid { grid-template-columns: 1fr; }

              .mobile-record-card {
                background: #FFFFFF; border-radius: 14px; padding: 16px;
                margin-bottom: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
                border: 1px solid var(--border-color); cursor: pointer;
              }
              .mobile-record-card:active { background: #fafafa; }

              .card-top-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
              .card-customer { font-size: 16px; font-weight: 700; color: var(--text-main); margin-bottom: 4px; }
              .card-total { font-size: 20px; font-weight: 700; color: var(--primary-color); }
              .card-delete-icon {
                background: transparent; border: none; padding: 6px; border-radius: 6px; cursor: pointer;
                display: flex; align-items: center; justify-content: center;
              }
              .card-delete-icon:active { background: #fee2e2; }

              .card-item-row { font-size: 14px; color: var(--text-main); font-weight: 500; margin-bottom: 10px;
                overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }

              .card-meta-row {
                display: flex; align-items: center; gap: 8px;
                font-size: 13px; color: var(--text-muted); font-weight: 500;
                margin-bottom: 14px;
              }
              .meta-dot { font-size: 10px; color: #cbd5e1; }

              .card-status-row { border-top: 1px solid var(--border-color); padding-top: 12px; }
              .card-status-remaining {
                color: #dc2626; font-weight: 600; font-size: 14px;
                background-color: #fee2e2; padding: 6px 10px; border-radius: 6px; display: inline-block;
              }
            }
          `}</style>
                </>
            )}
        </div>
    );
}
