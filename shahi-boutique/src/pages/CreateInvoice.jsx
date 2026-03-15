import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { PlusCircle, Trash2, Printer, Download, CheckCircle, FileText } from 'lucide-react';
import html2pdf from 'html2pdf.js';

function convertNumberToWords(amount) {
    if (amount === 0) return "Zero Only";
    const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    if ((amount = amount.toString()).length > 9) return "Amount too high";
    let n = ("000000000" + amount).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return;
    let str = "";
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + " " + a[n[1][1]]) + " Crore " : "";
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + " " + a[n[2][1]]) + " Lakh " : "";
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + " " + a[n[3][1]]) + " Thousand " : "";
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + " " + a[n[4][1]]) + " Hundred " : "";
    str += (n[5] != 0) ? ((str != "") ? "and " : "") + (a[Number(n[5])] || b[n[5][0]] + " " + a[n[5][1]]) + " " : "";
    return str.trim() + " Rupees Only";
}

export default function CreateInvoice() {
    const [customerName, setCustomerName] = useState('');
    const [phone, setPhone] = useState('');
    const [recDate, setRecDate] = useState(new Date().toISOString().split('T')[0]);
    const [delDate, setDelDate] = useState('');

    const [items, setItems] = useState([{ id: Date.now(), description: '', quantity: 1, price: '' }]);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    const printRef = useRef(null);
    const stampInputRef = useRef(null);
    const [stampImage, setStampImage] = useState(
        () => localStorage.getItem('shahi_boutique_stamp') || null
    );

    useEffect(() => {
        fetchNextInvoiceNumber();
    }, []);

    const fetchNextInvoiceNumber = async () => {
        const year = new Date().getFullYear();
        try {
            const { data, error } = await supabase
                .from('invoices')
                .select('invoice_number')
                .ilike('invoice_number', `SB-${year}-%`)
                .order('created_at', { ascending: false })
                .limit(1);

            if (error && error.code !== 'PGRST116') throw error;

            if (data && data.length > 0) {
                const lastNumStr = data[0].invoice_number.split('-')[2];
                const nextNum = parseInt(lastNumStr, 10) + 1;
                setInvoiceNumber(`SB-${year}-${String(nextNum).padStart(4, '0')}`);
            } else {
                setInvoiceNumber(`SB-${year}-0001`);
            }
        } catch (error) {
            console.error('Error fetching invoice number:', error);
            // Fallback
            setInvoiceNumber(`SB-${year}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`);
        }
    };

    const handleAddItem = () => {
        setItems([...items, { id: Date.now(), description: '', quantity: 1, price: '' }]);
    };

    const handleRemoveItem = (id) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== id));
        }
    };

    const handleItemChange = (id, field, value) => {
        setItems(items.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    const calculateTotal = () => {
        return items.reduce((total, item) => {
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.price) || 0;
            return total + (qty * price);
        }, 0);
    };

    const handleSaveInvoice = async () => {
        if (!customerName || !recDate || !delDate || items.length === 0) {
            alert('Please fill customer details, dates, and at least one item.');
            return;
        }

        setIsSaving(true);
        try {
            const totalAmount = calculateTotal();

            // Insert Invoice
            const { data: invoiceData, error: invoiceError } = await supabase
                .from('invoices')
                .insert([{
                    invoice_number: invoiceNumber,
                    customer_name: customerName,
                    phone: phone,
                    rec_date: recDate,
                    delivery_date: delDate,
                    total_amount: totalAmount
                }])
                .select()
                .single();

            if (invoiceError) throw invoiceError;

            // Insert Items
            const itemsToInsert = items.map(item => ({
                invoice_id: invoiceData.id,
                description: item.description,
                quantity: parseFloat(item.quantity) || 1,
                price: parseFloat(item.price) || 0,
                amount: (parseFloat(item.quantity) || 1) * (parseFloat(item.price) || 0)
            }));

            const { error: itemsError } = await supabase
                .from('invoice_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            setIsSaved(true);
        } catch (error) {
            console.error('Error saving invoice:', error);
            alert('Failed to save invoice. Ensure tables are created (run invoice_setup.sql).');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrint = () => window.print();

    const handleStampUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target.result;
            setStampImage(dataUrl);
            localStorage.setItem('shahi_boutique_stamp', dataUrl);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveStamp = () => {
        setStampImage(null);
        localStorage.removeItem('shahi_boutique_stamp');
        if (stampInputRef.current) stampInputRef.current.value = '';
    };

    const handleDownloadPDF = async () => {
        const element = document.getElementById('invoice');
        if (!element) return;
        element.classList.add('invoice-pdf');
        await new Promise(r => setTimeout(r, 80));
        try {
            await html2pdf().set({
                margin: [5, 6, 5, 6],
                filename: `${invoiceNumber}.pdf`,
                image: { type: 'jpeg', quality: 0.99 },
                html2canvas: { scale: 3, useCORS: true, logging: false, letterRendering: true },
                jsPDF: { unit: 'mm', format: 'a5', orientation: 'portrait' },
                pagebreak: { mode: ['avoid-all'] },
            }).from(element).save();
        } catch (err) {
            console.error('PDF generation failed:', err);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            element.classList.remove('invoice-pdf');
        }
    };

    const resetForm = () => {
        setCustomerName('');
        setPhone('');
        setRecDate(new Date().toISOString().split('T')[0]);
        setDelDate('');
        setItems([{ id: Date.now(), description: '', quantity: 1, price: '' }]);
        setIsSaved(false);
        fetchNextInvoiceNumber();
    };

    const totalAmount = calculateTotal();

    return (
        <div className="page-container">
            <div className="flex-row-between mb-4">
                <h1 className="page-title" style={{ margin: 0 }}>Create Invoice</h1>
                {isSaved && (
                    <button className="btn btn-secondary" onClick={resetForm}>
                        Create New
                    </button>
                )}
            </div>

            <div className="invoice-grid d-print-none">
                <div className="card">
                    <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={20} className="text-muted" /> Invoice Details
                    </h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Customer Name *</label>
                            <input type="text" className="form-control" value={customerName} onChange={e => setCustomerName(e.target.value)} disabled={isSaved} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Phone</label>
                            <input type="text" className="form-control" value={phone} onChange={e => setPhone(e.target.value)} disabled={isSaved} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Rec Date *</label>
                            <input type="date" className="form-control" value={recDate} onChange={e => setRecDate(e.target.value)} disabled={isSaved} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Delivery Date *</label>
                            <input type="date" className="form-control" value={delDate} onChange={e => setDelDate(e.target.value)} disabled={isSaved} />
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h3 className="section-title">Items</h3>
                    <div className="item-list">
                        {items.map((item, index) => (
                            <div key={item.id} className="item-row">
                                <div>
                                    <label className="form-label" style={{ display: index === 0 ? 'block' : 'none' }}>Description</label>
                                    <input type="text" className="form-control" value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} placeholder="Item desc" disabled={isSaved} />
                                </div>
                                <div>
                                    <label className="form-label" style={{ display: index === 0 ? 'block' : 'none' }}>Qty</label>
                                    <input type="number" min="1" className="form-control" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', e.target.value)} disabled={isSaved} />
                                </div>
                                <div>
                                    <label className="form-label" style={{ display: index === 0 ? 'block' : 'none' }}>Price</label>
                                    <input type="number" min="0" className="form-control" value={item.price} onChange={e => handleItemChange(item.id, 'price', e.target.value)} disabled={isSaved} />
                                </div>
                                <div>
                                    <label className="form-label" style={{ display: index === 0 ? 'block' : 'none' }}>Amount</label>
                                    <input type="text" className="form-control text-right" disabled value={((item.quantity || 0) * (item.price || 0)).toFixed(2)} />
                                </div>
                                <div style={{ paddingTop: index === 0 ? '28px' : '0' }}>
                                    <button className="btn-danger-icon" onClick={() => handleRemoveItem(item.id)} disabled={isSaved || items.length === 1}>
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {!isSaved && (
                        <button className="btn btn-secondary mt-2" onClick={handleAddItem}>
                            <PlusCircle size={18} /> Add Item
                        </button>
                    )}
                </div>
            </div>

            {/* ── STAMP UPLOAD + TOTAL BAR ── */}
            <div className="total-bar d-print-none">
                <div>
                    <span className="text-muted">Total Amount: </span>
                    <span className="font-bold" style={{ fontSize: '24px', color: 'var(--primary-color)' }}>₹ {totalAmount.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    {/* Stamp upload */}
                    <input
                        ref={stampInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleStampUpload}
                    />
                    <button
                        className="btn btn-secondary"
                        style={{ fontSize: '13px' }}
                        onClick={() => stampInputRef.current?.click()}
                    >
                        {stampImage ? '🔁 Change Stamp' : '🖼️ Upload Stamp'}
                    </button>
                    {stampImage && (
                        <button
                            className="btn btn-secondary"
                            style={{ fontSize: '12px', color: '#dc2626', borderColor: '#fca5a5' }}
                            onClick={handleRemoveStamp}
                        >
                            ✕ Remove Stamp
                        </button>
                    )}
                    {/* Action buttons */}
                    {!isSaved ? (
                        <button className="btn btn-primary" onClick={handleSaveInvoice} disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Generate Invoice'}
                        </button>
                    ) : (
                        <>
                            <button className="btn btn-primary" disabled><CheckCircle size={18} /> Saved</button>
                            <button className="btn btn-secondary" onClick={handleDownloadPDF}><Download size={18} /> Download PDF</button>
                            <button className="btn btn-secondary" onClick={handlePrint}><Printer size={18} /> Print Invoice</button>
                        </>
                    )}
                </div>
            </div>

            {/* PREVIEW SECTION */}
            <h3 className="section-title d-print-none" style={{ marginBottom: '12px' }}>Invoice Preview</h3>
            <div className="invoice-preview-container d-print-none-wrapper">
                <div id="invoice" className="invoice-preview" ref={printRef}>

                    {/* ── HEADER ── */}
                    <div className="inv-header">
                        <span className="inv-brand-gold">Est. Malerkotla, Punjab</span>
                        <h1 className="inv-brand">SH&#256;HI BOUTIQUE</h1>
                        <p className="inv-tagline">Exclusive Ladies Suits &amp; Designer Wear &nbsp;✦&nbsp; Premium Fashion House</p>
                        <div className="inv-divider"><span className="inv-divider-jewel">❖</span></div>
                    </div>

                    {/* ── INVOICE TITLE ROW ── */}
                    <div className="inv-title-row">
                        <span className="inv-doc-label">&#9670; Tax Invoice</span>
                        <span className="inv-number">{invoiceNumber}</span>
                    </div>

                    {/* ── CUSTOMER INFO ── */}
                    <div className="inv-info-grid">
                        <div className="inv-info-col">
                            <div className="inv-info-label">Billed To</div>
                            <div className="inv-customer-name">{customerName || '—'}</div>
                            {phone && <div className="inv-info-value">📞 {phone}</div>}
                        </div>
                        <div className="inv-info-col inv-info-right">
                            <div className="inv-info-row">
                                <span className="inv-info-label">Bill No</span>
                                <span className="inv-info-value inv-bold">{invoiceNumber}</span>
                            </div>
                            <div className="inv-info-row">
                                <span className="inv-info-label">Receiving Date</span>
                                <span className="inv-info-value">{recDate ? new Date(recDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
                            </div>
                            <div className="inv-info-row">
                                <span className="inv-info-label">Delivery Date</span>
                                <span className="inv-info-value">{delDate ? new Date(delDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
                            </div>
                        </div>
                    </div>

                    {/* ── ITEMS TABLE ── */}
                    <div className="inv-table-wrapper">
                    <table className="inv-table">
                        <thead>
                            <tr>
                                <th className="inv-th inv-th-sno">#</th>
                                <th className="inv-th">Description</th>
                                <th className="inv-th inv-text-right">Qty</th>
                                <th className="inv-th inv-text-right">Rate (₹)</th>
                                <th className="inv-th inv-text-right">Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => {
                                const qty = parseFloat(item.quantity) || 0;
                                const price = parseFloat(item.price) || 0;
                                return (
                                    <tr key={index} className={index % 2 === 1 ? 'inv-tr-alt' : ''}>
                                        <td className="inv-td inv-td-center">{index + 1}</td>
                                        <td className="inv-td">{item.description || '—'}</td>
                                        <td className="inv-td inv-text-right">{qty}</td>
                                        <td className="inv-td inv-text-right">{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        <td className="inv-td inv-text-right inv-bold">{(qty * price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                );
                            })}
                            {items.length < 5 && Array.from({ length: 5 - items.length }).map((_, i) => (
                                <tr key={`empty-${i}`}>
                                    <td className="inv-td inv-td-center inv-td-empty">&nbsp;</td>
                                    <td className="inv-td inv-td-empty" colSpan={4}></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>

                    {/* ── TOTAL BLOCK ── */}
                    <div className="inv-totals-section">
                        <div className="inv-totals-box">
                            <div className="inv-total-row">
                                <span className="inv-total-label">TOTAL</span>
                                <span className="inv-total-value">₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="inv-amount-words">
                                <span className="inv-words-label">Amount in Words: </span>
                                <span className="inv-words-value">{convertNumberToWords(totalAmount)}</span>
                            </div>
                        </div>
                    </div>

                    {/* ── FOOTER ── */}
                    <div className="inv-footer">
                        <div className="inv-footer-left">
                            <span className="inv-thankyou">✦ Thank you for shopping with Shahi Boutique.</span>
                            <span className="inv-footer-note">This is a computer-generated invoice. No signature required.</span>
                        </div>

                        {/* Stamp: image if uploaded, CSS seal otherwise */}
                        {stampImage ? (
                            <img
                                src={stampImage}
                                alt="Official Stamp"
                                className="inv-stamp-img"
                            />
                        ) : (
                            <div className="inv-stamp">
                                <div className="inv-stamp-outer">
                                    <div className="inv-stamp-inner">
                                        <div className="inv-stamp-content">
                                            <div className="inv-stamp-brand">SH&#256;HI</div>
                                            <div className="inv-stamp-divline" />
                                            <div className="inv-stamp-sub">BOUTIQUE</div>
                                            <div className="inv-stamp-city">MALERKOTLA</div>
                                            <div className="inv-stamp-divline" />
                                            <div className="inv-stamp-official">✦ OFFICIAL STAMP ✦</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
            {/* Added a special class for non-print items */}
            <style>{`
                @media print {
                    .d-print-none { display: none !important; }
                }
            `}</style>
        </div>
    );
}

