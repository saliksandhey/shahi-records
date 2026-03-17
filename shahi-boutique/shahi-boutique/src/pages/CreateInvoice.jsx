import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { PlusCircle, Trash2, Printer, Download, CheckCircle, FileText, Upload, RefreshCw, Calendar, User, Scissors, Box, IndianRupee, Sparkles } from 'lucide-react';
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
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            console.error('Error saving invoice:', error);
            alert('Failed to save invoice. Ensure tables are created.');
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
                margin: 0,
                filename: `${invoiceNumber}.pdf`,
                image: { type: 'jpeg', quality: 1 },
                html2canvas: { scale: 3, useCORS: true, logging: false, letterRendering: true, windowWidth: 794 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
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
        <div className="page-container page-animate-in">
            <div className="modern-header-section fade-up-1">
                <div className="header-greeting-wrapper">
                    <div className="greeting-pill"><Sparkles size={12} style={{marginRight: '4px', verticalAlign:'middle'}}/> Premium Billing</div>
                    <h1 className="dashboard-title-modern">Invoice Center</h1>
                    <p className="dashboard-date-modern">Generate & Manage Client Invoices</p>
                </div>
                {isSaved && (
                    <button className="btn btn-secondary premium-glow-btn" onClick={resetForm} style={{ backgroundColor: 'white' }}>
                        <PlusCircle size={18} /> New Invoice
                    </button>
                )}
            </div>

            <div className="invoice-grid d-print-none">
                <div className="dash-card premium-card card-primary fade-up-2" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '30px' }}>
                    <div className="card-bg-decoration"></div>
                    <h3 className="section-title modern-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1, marginBottom: '24px' }}>
                        <User size={20} color="var(--primary-color)" /> Client & Dates
                    </h3>
                    <div className="form-grid" style={{ zIndex: 1 }}>
                        <div className="form-group">
                            <label className="form-label" style={{display:'flex', gap:'6px', alignItems:'center'}}><User size={14}/> Customer Name *</label>
                            <input type="text" className="form-control" placeholder="Enter full name" value={customerName} onChange={e => setCustomerName(e.target.value)} disabled={isSaved} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{display:'flex', gap:'6px', alignItems:'center'}}><User size={14}/> Phone Number</label>
                            <input type="text" className="form-control" placeholder="Optional" value={phone} onChange={e => setPhone(e.target.value)} disabled={isSaved} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{display:'flex', gap:'6px', alignItems:'center'}}><Calendar size={14}/> Receive Date *</label>
                            <input type="date" className="form-control" value={recDate} onChange={e => setRecDate(e.target.value)} disabled={isSaved} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{display:'flex', gap:'6px', alignItems:'center'}}><Calendar size={14}/> Delivery Date *</label>
                            <input type="date" className="form-control" value={delDate} onChange={e => setDelDate(e.target.value)} disabled={isSaved} />
                        </div>
                    </div>
                </div>

                <div className="dash-card premium-card card-tertiary fade-up-3" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '30px' }}>
                     <div className="card-bg-decoration"></div>
                    <h3 className="section-title modern-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1, marginBottom: '24px' }}>
                        <Scissors size={20} color="#374151" /> Services & Items
                    </h3>
                    <div className="item-list form-items-modern" style={{ zIndex: 1, width: '100%' }}>
                        {items.map((item, index) => (
                            <div key={item.id} className="item-row-modern">
                                <div className="item-col-desc">
                                    <label className="form-label" style={{ display: index === 0 ? 'flex' : 'none', gap:'6px', alignItems:'center' }}><Box size={14}/> Description</label>
                                    <input type="text" className="form-control" value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} placeholder="E.g., Custom Bridal Suit" disabled={isSaved} />
                                </div>
                                <div className="item-col-qty">
                                    <label className="form-label" style={{ display: index === 0 ? 'block' : 'none' }}>Qty</label>
                                    <input type="number" min="1" className="form-control" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', e.target.value)} disabled={isSaved} />
                                </div>
                                <div className="item-col-price">
                                    <label className="form-label" style={{ display: index === 0 ? 'flex' : 'none', gap:'6px', alignItems:'center' }}><IndianRupee size={14}/> Price</label>
                                    <input type="number" min="0" className="form-control" value={item.price} onChange={e => handleItemChange(item.id, 'price', e.target.value)} placeholder="0.00" disabled={isSaved} />
                                </div>
                                <div className="item-col-amount">
                                    <label className="form-label" style={{ display: index === 0 ? 'block' : 'none' }}>Amount</label>
                                    <input type="text" className="form-control text-right" style={{background:'#f9fafb', fontWeight: 600, color:'var(--primary-color)'}} disabled value={((item.quantity || 0) * (item.price || 0)).toFixed(2)} />
                                </div>
                                <div className="item-col-action" style={{ paddingTop: index === 0 ? '28px' : '0' }}>
                                    <button className="btn-danger-icon modern-delete-btn" onClick={() => handleRemoveItem(item.id)} disabled={isSaved || items.length === 1}>
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {!isSaved && (
                        <button className="btn btn-secondary mt-4 hover-slide" onClick={handleAddItem} style={{ zIndex: 1, background: 'transparent', borderStyle: 'dashed', width: '100%', padding: '12px' }}>
                            <PlusCircle size={18} /> Add Another Item
                        </button>
                    )}
                </div>
            </div>

            {/* ── TOTAL & ACTION BAR ── */}
            <div className="total-action-bar fade-up-4 d-print-none">
                <div className="total-display">
                    <span className="text-muted" style={{ fontWeight: 600, fontSize: '13px', textTransform:'uppercase', letterSpacing:'1px' }}>Total Amount</span>
                    <span className="font-bold amount-highlight">₹ {totalAmount.toFixed(2)}</span>
                </div>
                <div className="action-buttons-wrap">
                    <input
                        ref={stampInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleStampUpload}
                    />
                    <button
                        className="btn btn-secondary action-btn-outline"
                        onClick={() => stampInputRef.current?.click()}
                    >
                        {stampImage ? <><RefreshCw size={16}/> Change Stamp</> : <><Upload size={16}/> Default Stamp</>}
                    </button>
                    {stampImage && (
                        <button
                            className="btn btn-secondary action-btn-danger"
                            onClick={handleRemoveStamp}
                        >
                            ✕ Remove
                        </button>
                    )}

                    {!isSaved ? (
                        <button className="btn btn-primary premium-glow-btn generate-btn" onClick={handleSaveInvoice} disabled={isSaving}>
                            <Sparkles size={18} /> {isSaving ? 'Processing...' : 'Generate Invoice'}
                        </button>
                    ) : (
                        <div style={{display:'flex', gap:'12px', flexWrap:'wrap', alignItems:'center'}}>
                            <div className="success-badge"><CheckCircle size={16} /> Saved</div>
                            <button className="btn btn-secondary action-btn-solid" onClick={handleDownloadPDF}><Download size={18} /> Download PDF</button>
                            <button className="btn btn-secondary action-btn-solid" onClick={handlePrint}><Printer size={18} /> Print</button>
                        </div>
                    )}
                </div>
            </div>

            {/* PREVIEW SECTION */}
            <h3 className="section-title modern-section-title d-print-none fade-up-5" style={{ marginBottom: '20px', marginTop: '40px' }}>Document Preview</h3>
            
            <div className="invoice-preview-container d-print-none-wrapper fade-up-5">
                <div id="invoice" className="invoice-preview" ref={printRef}>

                    {/* ── WATERMARK ── */}
                    <div className="inv-watermark">SH&#256;HI</div>

                    {/* ── HEADER ── */}
                    <div className="inv-header-pro">
                        <div className="inv-header-left">
                            <span className="inv-brand-pro">SH&#256;HI BOUTIQUE</span>
                            <span className="inv-tagline-pro">Premium Ladies Fashion & Designer Wear</span>
                            <span className="inv-address-pro">Est. Malerkotla, Punjab</span>
                        </div>
                        <div className="inv-header-right">
                            <div className="inv-type-badge-pro">TAX INVOICE</div>
                            <div className="inv-number-pro">{invoiceNumber}</div>
                        </div>
                    </div>

                    {/* ── CUSTOMER INFO ── */}
                    <div className="inv-info-pro">
                        <div className="inv-col-pro">
                            <div className="inv-label-pro">BILLED TO</div>
                            <div className="inv-val-client">{customerName || 'Walk-in Client'}</div>
                            {phone && <div className="inv-val-phone">{phone}</div>}
                        </div>
                        <div className="inv-col-pro" style={{ textAlign: 'right' }}>
                            <table style={{ marginLeft: 'auto', borderCollapse:'collapse' }}>
                                <tbody>
                                    <tr>
                                        <td className="inv-label-pro" style={{paddingRight:'12px'}}>RECEIVING DATE</td>
                                        <td className="inv-val-date">{recDate ? new Date(recDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                                    </tr>
                                    <tr>
                                        <td className="inv-label-pro" style={{paddingRight:'12px', paddingTop:'8px'}}>DELIVERY DATE</td>
                                        <td className="inv-val-date" style={{paddingTop:'8px'}}>{delDate ? new Date(delDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ── ITEMS TABLE ── */}
                    <div className="inv-table-wrapper-pro">
                        <table className="inv-table-pro">
                            <thead>
                                <tr>
                                    <th className="th-pro th-sno">#</th>
                                    <th className="th-pro">DESCRIPTION</th>
                                    <th className="th-pro th-qty">QTY</th>
                                    <th className="th-pro th-rate">RATE (₹)</th>
                                    <th className="th-pro th-amt">AMOUNT (₹)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => {
                                    const qty = parseFloat(item.quantity) || 0;
                                    const price = parseFloat(item.price) || 0;
                                    return (
                                        <tr key={index} className="tr-pro">
                                            <td className="td-pro td-sno ">{String(index + 1).padStart(2,'0')}</td>
                                            <td className="td-pro">{item.description || '—'}</td>
                                            <td className="td-pro td-qty">{qty}</td>
                                            <td className="td-pro td-rate">{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                            <td className="td-pro td-amt">{(qty * price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    );
                                })}
                                {items.length < 5 && Array.from({ length: 5 - items.length }).map((_, i) => (
                                    <tr key={`empty-${i}`} className="tr-pro">
                                        <td className="td-pro td-empty">&nbsp;</td>
                                        <td colSpan={4} className="td-pro td-empty"></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* ── TOTAL BLOCK ── */}
                    <div className="inv-totals-pro">
                        <div className="inv-words-wrap">
                            <span className="inv-words-lbl">AMOUNT IN WORDS</span>
                            <span className="inv-words-txt">{convertNumberToWords(totalAmount)}</span>
                        </div>
                        <div className="inv-amount-wrap">
                            <div className="inv-amount-row">
                                <span className="inv-amt-lbl">GRAND TOTAL</span>
                                <span className="inv-amt-val">₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>

                    {/* ── FOOTER ── */}
                    <div className="inv-footer-pro">
                        <div className="inv-footer-msg">
                            <span className="inv-msg-bold">Terms & Conditions</span>
                            <span className="inv-msg-txt">1. Goods once sold cannot be returned. 2. This is a computer generated invoice.</span>
                        </div>

                        {stampImage ? (
                            <img src={stampImage} alt="Official Stamp" className="inv-stamp-real" />
                        ) : (
                            <div className="inv-stamp-digital">
                                <div className="stamp-ring">
                                    <div className="stamp-inner">SH&#256;HI<br/><span style={{fontSize:'7px'}}>AUTHORIZED</span></div>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* Custom local styling to override the dashboard/recharts styling isolated to this component */}
            <style>{`
                /* Animation Classes */
                .page-animate-in { animation: fadeIn 0.4s ease-out; }
                .fade-up-1 { animation: fadeUp 0.5s ease-out 0.1s both; }
                .fade-up-2 { animation: fadeUp 0.5s ease-out 0.2s both; }
                .fade-up-3 { animation: fadeUp 0.5s ease-out 0.3s both; }
                .fade-up-4 { animation: fadeUp 0.5s ease-out 0.4s both; }
                .fade-up-5 { animation: fadeUp 0.5s ease-out 0.5s both; }
                
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes fadeUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

                .form-items-modern { width: 100%; display: flex; flex-direction: column; gap: 16px; }
                .item-row-modern { display: grid; grid-template-columns: 2.5fr 0.8fr 1.2fr 1.2fr auto; gap: 16px; align-items: flex-end; animation: fadeUp 0.3s ease-out; padding: 16px; background: #fafafa; border-radius: 12px; border: 1px solid #f3f4f6; }
                
                .modern-delete-btn { width: 44px; height: 44px; background: #fff; border: 1px solid #fee2e2; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #dc2626; cursor: pointer; transition: all 0.2s; }
                .modern-delete-btn:hover:not(:disabled) { background: #fee2e2; transform: translateY(-2px); }
                .modern-delete-btn:disabled { opacity: 0.5; cursor: not-allowed; }

                .total-action-bar { display: flex; justify-content: space-between; align-items: center; background: #FFFFFF; padding: 20px 24px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04); border: 1px solid var(--border-color); margin-bottom: 30px; margin-top: 10px; flex-wrap: wrap; gap: 20px; }
                .total-display { display: flex; flex-direction: column; }
                .amount-highlight { font-size: 28px; color: var(--primary-color); line-height: 1.2; font-family: var(--font-heading); }
                
                .action-buttons-wrap { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
                .action-btn-outline { background: transparent; border: 1px solid var(--border-color); color: var(--text-main); font-weight: 600; padding: 10px 16px; display: flex; gap: 8px; border-radius: 10px; }
                .action-btn-outline:hover { background: #f9fafb; border-color: #d1d5db; }
                .action-btn-danger { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; font-weight: 600; padding: 10px 16px; border-radius: 10px; }
                .action-btn-danger:hover { background: #fee2e2; }
                .action-btn-solid { background: white; color: var(--text-main); border: 1px solid #d1d5db; padding: 10px 16px; border-radius: 10px; font-weight: 600; display: flex; gap: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
                .action-btn-solid:hover { background: #f9fafb; }
                
                .generate-btn { padding: 12px 24px; font-size: 15px; font-weight: 600; border-radius: 10px; display: flex; gap: 8px; align-items: center; }
                
                .success-badge { display: flex; align-items: center; gap: 6px; background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; border: 1px solid #bbf7d0; }

                /* Premium Invoice Preview Styles */
                .invoice-preview-container {
                    background: #f3f4f6;
                    padding: 40px;
                    border-radius: 16px;
                    border: 1px dashed #cbd5e1;
                    /* Use block/auto to allow horizontal scrolling on small screens without flex truncating */
                    display: block;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                    text-align: center;
                }
                
                .invoice-preview {
                    width: 794px; /* A4 Width approximation */
                    height: 1122px; /* A4 Height slightly under 297mm to prevent blank page bleed */
                    background: #FFFFFF;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                    position: relative;
                    overflow: hidden;
                    box-sizing: border-box;
                    color: #111827;
                    font-family: 'Inter', sans-serif;
                    margin: 0 auto;
                    text-align: left;
                }

                .inv-watermark {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) rotate(-45deg);
                    font-size: 180px;
                    font-weight: 900;
                    color: rgba(139, 0, 0, 0.02);
                    z-index: 0;
                    pointer-events: none;
                    font-family: var(--font-heading);
                }

                .inv-header-pro {
                    padding: 50px 50px 30px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    border-bottom: 2px solid #8B0000;
                    position: relative;
                    z-index: 1;
                }

                .inv-header-left { display: flex; flex-direction: column; gap: 4px; }
                .inv-brand-pro { font-size: 32px; font-weight: 800; color: #8B0000; letter-spacing: 2px; font-family: var(--font-heading); }
                .inv-tagline-pro { font-size: 12px; color: #4B5563; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
                .inv-address-pro { font-size: 12px; color: #6B7280; margin-top: 2px; }

                .inv-header-right { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
                .inv-type-badge-pro { background: #8B0000; color: #FFF; padding: 6px 16px; font-size: 14px; font-weight: 700; letter-spacing: 2px; border-radius: 4px; }
                .inv-number-pro { font-size: 16px; font-weight: 600; color: #374151; }

                .inv-info-pro {
                    padding: 40px 50px;
                    display: flex;
                    justify-content: space-between;
                    position: relative;
                    z-index: 1;
                }
                .inv-col-pro { flex: 1; }
                .inv-label-pro { font-size: 10px; font-weight: 700; color: #9CA3AF; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; }
                .inv-val-client { font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 4px; }
                .inv-val-phone { font-size: 14px; color: #4B5563; font-weight: 500; }
                .inv-val-date { font-size: 14px; font-weight: 600; color: #111827; }

                .inv-table-wrapper-pro { padding: 0 50px; position: relative; z-index: 1; min-height: 400px; }
                .inv-table-pro { width: 100%; border-collapse: collapse; }
                .th-pro { padding: 12px 16px; text-align: left; background: #F9FAFB; font-size: 11px; font-weight: 700; color: #4B5563; letter-spacing: 1px; border-bottom: 2px solid #E5E7EB; border-top: 2px solid #E5E7EB; }
                .th-sno { width: 50px; text-align: center; }
                .th-qty, .th-rate, .th-amt { text-align: right; }
                
                .td-pro { padding: 16px; font-size: 13px; color: #374151; border-bottom: 1px solid #F3F4F6; }
                .td-sno { text-align: center; font-weight: 600; color: #9CA3AF; }
                .td-qty, .td-rate { text-align: right; }
                .td-amt { text-align: right; font-weight: 700; color: #111827; }
                .td-empty { padding: 22px 16px; border-bottom: 1px solid #F9FAFB; }

                .inv-totals-pro {
                    display: flex;
                    padding: 0 50px;
                    margin-top: 20px;
                    position: relative;
                    z-index: 1;
                }
                .inv-words-wrap { flex: 2; padding: 20px 20px 20px 0; border-top: 2px solid #E5E7EB; }
                .inv-words-lbl { display: block; font-size: 10px; font-weight: 700; color: #9CA3AF; letter-spacing: 1px; margin-bottom: 8px; }
                .inv-words-txt { font-size: 13px; font-weight: 600; color: #4B5563; font-style: italic; }

                .inv-amount-wrap { flex: 1; background: #FFFBFB; padding: 20px 24px; border: 2px solid #8B0000; border-radius: 8px; margin-top: -2px; }
                .inv-amount-row { display: flex; justify-content: space-between; align-items: center; }
                .inv-amt-lbl { font-size: 14px; font-weight: 700; color: #8B0000; letter-spacing: 1px; }
                .inv-amt-val { font-size: 24px; font-weight: 800; color: #8B0000; font-family: var(--font-heading); }

                .inv-footer-pro {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    padding: 40px 50px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    z-index: 1;
                }
                .inv-footer-msg { display: flex; flex-direction: column; gap: 4px; }
                .inv-msg-bold { font-size: 11px; font-weight: 700; color: #4B5563; }
                .inv-msg-txt { font-size: 10px; color: #9CA3AF; max-width: 250px; line-height: 1.4; }

                .inv-stamp-real { max-width: 120px; max-height: 120px; object-fit: contain; }
                .inv-stamp-digital { width: 100px; height: 100px; border: 3px solid rgba(139, 0, 0, 0.2); border-radius: 50%; padding: 4px; display: flex; align-items: center; justify-content: center; }
                .stamp-ring { width: 100%; height: 100%; border: 1px solid rgba(139, 0, 0, 0.4); border-radius: 50%; display: flex; align-items: center; justify-content: center; transform: rotate(-15deg); }
                .stamp-inner { text-align: center; color: rgba(139, 0, 0, 0.5); font-weight: 800; font-size: 16px; letter-spacing: 1px; line-height: 1.2; }

                /* Mobile overrides for layout */
                @media (max-width: 768px) {
                    .item-row-modern { grid-template-columns: 1fr; }
                    .invoice-preview-container { padding: 16px; text-align: left; }
                    .invoice-preview { 
                        transform: none; 
                        margin-bottom: 0; 
                        /* Uses zoom for perfect reflow scaling; falls back to native scroll if unsupported */
                        zoom: 0.42; 
                    }
                }

                @media print {
                    .d-print-none { display: none !important; }
                    .invoice-preview-container { padding: 0; border: none; background: transparent; overflow: visible; }
                    .invoice-preview { box-shadow: none; transform: none; margin: 0; zoom: 1; text-align: left; }
                }

                /* Required for html2pdf rendering */
                .invoice-pdf {
                    width: 794px !important;
                    height: 1122px !important;
                    box-shadow: none !important;
                    margin: 0 !important;
                    border: none !important;
                    border-radius: 0 !important;
                    background: white !important;
                    zoom: 1 !important;
                    transform: none !important;
                }
            `}</style>
        </div>
    );
}
