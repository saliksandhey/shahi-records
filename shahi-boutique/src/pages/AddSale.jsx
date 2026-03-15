import React, { useState, useRef, useEffect } from 'react';
import { supabase } from "@/lib/supabaseClient";
import { Check } from 'lucide-react';

const Toast = ({ message, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => onClose(), 2500);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="toast-container" style={{ zIndex: 10000 }}>
            <div className="toast">
                <Check size={18} color="#10b981" />
                {message}
            </div>
        </div>
    );
};

// Simple Input moved outside strictly
const SimpleInput = ({ type, name, value, onChange, label, rRef, onKeyDown, required, placeholder = "", inputMode }) => (
    <div className="form-group">
        <label className="form-label">{label} {required && <span style={{ color: '#dc2626' }}>*</span>}</label>
        <input
            type={type} name={name} ref={rRef}
            className="form-control"
            value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder} required={required}
            min={type === "number" ? "0" : undefined}
            step={type === "number" ? "any" : undefined}
            inputMode={inputMode || (type === "number" ? "decimal" : "text")}
        />
    </div>
);

export default function AddSale() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [todayRunningTotal, setTodayRunningTotal] = useState(0);

    const initialFormState = {
        date: new Date().toISOString().split('T')[0],
        customer_name: '',
        phone: '',
        item_name: '',
        quantity: 1,
        price: '',
        discount: '',
        paid_amount: '',
        payment_method: 'Cash',
        notes: ''
    };

    const [formData, setFormData] = useState(initialFormState);

    const firstInputRef = useRef(null);
    const priceRef = useRef(null);
    const paidRef = useRef(null);

    const fetchRunningTotal = async () => {
        const todayStr = new Date().toISOString().split('T')[0];
        const { data } = await supabase.from('sales').select('total').eq('date', todayStr);
        if (data) {
            const total = data.reduce((acc, curr) => acc + Number(curr.total), 0);
            setTodayRunningTotal(total);
        }
    };

    useEffect(() => {
        fetchRunningTotal();
        if (firstInputRef.current && window.innerWidth > 768) {
            firstInputRef.current.focus();
        }
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNumberChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value === '' ? '' : Math.max(0, Number(value))
        }));
    };

    const handleKeyDown = (e, nextRef) => {
        if (e.key === 'Enter' && nextRef?.current) {
            e.preventDefault();
            nextRef.current.focus();
        }
    };

    const quantity = Number(formData.quantity) || 1;
    const price = Number(formData.price) || 0;
    const discount = Number(formData.discount) || 0;

    const total = Math.max(0, (quantity * price) - discount);
    const paid_amount = formData.paid_amount === '' ? total : Math.max(0, Number(formData.paid_amount));
    const remaining_amount = Math.max(0, total - paid_amount);

    const isFormValid = formData.date && formData.customer_name.trim() !== '' && formData.item_name.trim() !== '' && price > 0 && quantity > 0;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!isFormValid) {
            setError('Please fill required fields: Date, Customer Name, Item Description, and Price.');
            return;
        }

        setLoading(true);

        try {
            const { error: insertError } = await supabase.from('sales').insert([{
                date: formData.date,
                customer_name: formData.customer_name,
                phone: formData.phone || null,
                item_name: formData.item_name,
                quantity: quantity,
                price: price,
                discount: discount || 0,
                total: total,
                paid_amount: paid_amount,
                remaining_amount: remaining_amount,
                payment_method: formData.payment_method,
                notes: formData.notes || null,
            }]);

            if (insertError) throw insertError;

            setShowToast(true);
            fetchRunningTotal();

            // Reset form but keep the selected date
            setFormData({
                ...initialFormState,
                date: formData.date
            });

            setTimeout(() => {
                if (firstInputRef.current && window.innerWidth > 768) firstInputRef.current.focus();
            }, 100);

        } catch (err) {
            console.error(err);
            setError('Database save failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container">
            <div className="flex-row-between mb-4">
                <h2 className="page-title" style={{ margin: 0 }}>Add New Sale</h2>
                {todayRunningTotal > 0 && (
                    <div style={{ backgroundColor: '#f1f5f9', color: 'var(--text-main)', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, border: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>
                        Today: ₹{todayRunningTotal.toLocaleString('en-IN')}
                    </div>
                )}
            </div>

            {error && <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #fca5a5', fontSize: '14px' }}>{error}</div>}
            {showToast && <Toast message="Sale recorded successfully" onClose={() => setShowToast(false)} />}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>

                {/* Customer Section */}
                <section className="card" style={{ margin: 0 }}>
                    <h3 className="section-title" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px' }}>
                        Sale Information
                    </h3>
                    <div className="form-grid mobile-flex-col">
                        <SimpleInput type="date" name="date" value={formData.date} onChange={handleInputChange} label="Sale Date" required />
                        <SimpleInput type="text" name="customer_name" rRef={firstInputRef} value={formData.customer_name} onChange={handleInputChange} label="Customer Full Name" required />
                    </div>
                    <div style={{ marginTop: '20px' }}>
                        <SimpleInput type="tel" inputMode="numeric" name="phone" value={formData.phone} onChange={handleInputChange} label="Customer Phone Number (Optional)" />
                    </div>
                </section>

                {/* Item Section */}
                <section className="card" style={{ margin: 0 }}>
                    <h3 className="section-title" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px' }}>
                        Item Details
                    </h3>
                    <SimpleInput type="text" name="item_name" value={formData.item_name} onChange={handleInputChange} label="Item Description" onKeyDown={(e) => handleKeyDown(e, priceRef)} required />

                    <div className="mobile-flex-col" style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                        <div style={{ flex: '0.5', width: '100%' }}>
                            <SimpleInput type="number" inputMode="decimal" name="quantity" value={formData.quantity} onChange={handleNumberChange} label="Quantity" onKeyDown={(e) => handleKeyDown(e, priceRef)} required />
                        </div>
                        <div style={{ flex: '1', width: '100%' }}>
                            <SimpleInput type="number" inputMode="decimal" name="price" rRef={priceRef} value={formData.price} onChange={handleNumberChange} label="Price Per Unit (₹)" onKeyDown={(e) => handleKeyDown(e, paidRef)} required />
                        </div>
                    </div>

                    <div style={{ marginTop: '16px' }}>
                        <SimpleInput type="number" inputMode="decimal" name="discount" value={formData.discount} onChange={handleNumberChange} label="Discount Amount (₹)" onKeyDown={(e) => handleKeyDown(e, paidRef)} />
                    </div>
                </section>

                {/* Calculation (Visually Strong & Distinct) */}
                <section className="card" style={{ margin: 0, backgroundColor: '#fdfbf7', border: '1px solid #e5e0d8', padding: '32px 24px' }}>
                    <div className="text-center">
                        <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Amount Due</div>
                        <div style={{ fontSize: '42px', fontWeight: 700, color: '#2A2A2A', lineHeight: 1 }}>
                            ₹ {total.toLocaleString('en-IN')}
                        </div>
                        {(quantity * price > 0 || discount > 0) && (
                            <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '12px' }}>
                                ₹{(quantity * price).toLocaleString('en-IN')} Subtotal {discount > 0 ? `- ₹${discount.toLocaleString('en-IN')} Discount` : ''}
                            </div>
                        )}
                    </div>
                </section>

                {/* Payment Section */}
                <section className="card" style={{ margin: 0 }}>
                    <h3 className="section-title" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px' }}>
                        Payment Info
                    </h3>
                    <div className="form-grid mobile-flex-col">
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Amount Paid</label>
                            <input
                                type="number"
                                inputMode="decimal"
                                name="paid_amount"
                                ref={paidRef}
                                min="0"
                                className="form-control"
                                value={formData.paid_amount === '' ? '' : formData.paid_amount}
                                onChange={handleNumberChange}
                                placeholder={`Defaults to ₹${total}`}
                                style={{ fontSize: '18px', fontWeight: 600, padding: '14px 16px', height: 'auto' }}
                            />
                            {remaining_amount > 0 && (
                                <div style={{ marginTop: '8px', fontSize: '14px', color: '#b45309', fontWeight: 600 }}>
                                    Remaining Due: ₹ {remaining_amount.toLocaleString('en-IN')}
                                </div>
                            )}
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Payment Method</label>
                            <div className="radio-group mobile-flex-col" style={{ height: 'auto', gap: '12px' }}>
                                <label className="radio-label" style={{ padding: '14px' }}><input type="radio" name="payment_method" value="Cash" checked={formData.payment_method === 'Cash'} onChange={handleInputChange} />Cash</label>
                                <label className="radio-label" style={{ padding: '14px' }}><input type="radio" name="payment_method" value="UPI" checked={formData.payment_method === 'UPI'} onChange={handleInputChange} />UPI</label>
                                <label className="radio-label" style={{ padding: '14px' }}><input type="radio" name="payment_method" value="Card" checked={formData.payment_method === 'Card'} onChange={handleInputChange} />Card</label>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Action Bottom */}
                <div className="mobile-sticky-save">
                    <button type="submit" className="btn btn-primary btn-full" disabled={loading || !isFormValid} style={{ padding: '18px', fontSize: '18px', fontWeight: 600 }}>
                        {loading ? <span className="spinner"></span> : 'Save Record'}
                    </button>
                </div>
            </form>

            <style>{`
        @media (max-width: 767px) {
          .mobile-sticky-save {
            position: sticky;
            bottom: 56px; 
            background-color: var(--bg-color);
            padding: 16px 0;
            z-index: 100;
            margin-top: 16px;
          }
        }
      `}</style>
        </div>
    );
}
