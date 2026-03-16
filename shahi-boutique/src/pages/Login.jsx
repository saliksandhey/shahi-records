import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import shahiLogo from '../assets/shahi favicon.png';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!username || !password) {
            return setError('Please fill in both fields');
        }
        setError('');
        setLoading(true);
        try {
            await login(username, password);
            navigate('/');
        } catch (err) {
            setError(err.message || 'Failed to sign in. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            minHeight: '100vh', 
            width: '100%',
            justifyContent: 'center', 
            alignItems: 'center',
            padding: '16px',
            background: 'linear-gradient(135deg, #f6f7fb 0%, #e2e8f0 100%)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Decorative background elements */}
            <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '300px', height: '300px', background: 'var(--accent-color)', opacity: 0.1, filter: 'blur(60px)', borderRadius: '50%' }}></div>
            <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '400px', height: '400px', background: 'var(--primary-color)', opacity: 0.05, filter: 'blur(80px)', borderRadius: '50%' }}></div>

            <div className="card" style={{ 
                maxWidth: '420px', 
                width: '100%', 
                margin: '0 auto',
                padding: '40px 32px',
                borderRadius: '16px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0,0,0,0.05)',
                border: '1px solid rgba(255,255,255,0.8)',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                position: 'relative',
                zIndex: 1
            }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '90px',
                        height: '90px',
                        borderRadius: '20px',
                        marginBottom: '16px',
                        background: 'transparent'
                    }}>
                        <img src={shahiLogo} alt="Shahi Boutique Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <h1 className="page-title brand-font" style={{ marginBottom: '8px', fontSize: '28px', color: 'var(--primary-color)' }}>Shahi Boutique</h1>
                    <p className="text-muted text-sm" style={{ fontWeight: 500 }}>Sign in to your manager account</p>
                </div>

                {error && <div style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: '#fef2f2',
                    border: '1px solid #fee2e2',
                    color: '#dc2626',
                    fontSize: '14px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    fontWeight: 500
                }}>{error}</div>}

                <form onSubmit={handleLogin}>
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label className="form-label" style={{ fontWeight: 600, color: '#374151' }}>Username</label>
                        <input
                            type="text"
                            className="form-control"
                            style={{ 
                                height: '48px', 
                                backgroundColor: '#f9fafb',
                                border: '1px solid #e5e7eb',
                                transition: 'all 0.2s',
                                fontSize: '15px'
                            }}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            autoComplete="username"
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '32px' }}>
                        <label className="form-label" style={{ fontWeight: 600, color: '#374151' }}>Security Passkey</label>
                        <input
                            type="password"
                            className="form-control"
                            style={{ 
                                height: '48px', 
                                backgroundColor: '#f9fafb',
                                border: '1px solid #e5e7eb',
                                transition: 'all 0.2s',
                                fontSize: '15px',
                                letterSpacing: password ? '2px' : 'normal'
                            }}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            autoComplete="current-password"
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                        style={{
                            width: '100%',
                            height: '48px',
                            fontSize: '16px',
                            fontWeight: 600,
                            letterSpacing: '0.5px',
                            borderRadius: '10px',
                            background: 'linear-gradient(to right, var(--primary-color), var(--primary-hover))',
                            boxShadow: '0 4px 12px rgba(139, 0, 0, 0.2)',
                            transition: 'all 0.2s transform'
                        }}
                        onMouseOver={(e) => {
                            if (!loading) Object.assign(e.target.style, { transform: 'translateY(-1px)', boxShadow: '0 6px 16px rgba(139, 0, 0, 0.3)' });
                        }}
                        onMouseOut={(e) => {
                            if (!loading) Object.assign(e.target.style, { transform: 'translateY(0)', boxShadow: '0 4px 12px rgba(139, 0, 0, 0.2)' });
                        }}
                    >
                        {loading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
                                <span>Signing in...</span>
                            </div>
                        ) : 'Sign In'}
                    </button>
                    
                    <div style={{ textAlign: 'center', marginTop: '24px' }}>
                        <p className="text-muted text-xs">Secure login for Shahi Boutique staff</p>
                    </div>
                </form>
            </div>
        </div>
    );
}
