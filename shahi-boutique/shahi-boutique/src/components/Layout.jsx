import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Store, LogOut, FileText, PlusCircle, LayoutDashboard, Printer } from 'lucide-react';

export default function Layout() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (err) {
            console.error('Logout failed:', err);
        }
    };

    const navLinks = [
        { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={24} /> },
        { name: 'Add Sale', path: '/add', icon: <PlusCircle size={24} /> },
        { name: 'Records', path: '/records', icon: <FileText size={24} /> },
        { name: 'Create Invoice', path: '/invoice', icon: <Printer size={24} /> },
    ];

    return (
        <div className="app-layout">
            {/* =========================================
          DESKTOP SIDEBAR
          ========================================= */}
            <aside className="sidebar">
                <div className="sidebar-brand">
                    <Store size={28} />
                    <span className="brand-font">Shahi Boutique</span>
                </div>

                <nav className="sidebar-menu">
                    {navLinks.map((link) => (
                        <div
                            key={link.name}
                            className={`sidebar-item ${location.pathname === link.path ? 'active' : ''}`}
                            onClick={() => navigate(link.path)}
                        >
                            {React.cloneElement(link.icon, { size: 20 })}
                            <span>{link.name}</span>
                        </div>
                    ))}
                </nav>

                <div className="sidebar-logout">
                    <div className="sidebar-item" onClick={handleLogout} style={{ color: '#dc2626' }}>
                        <LogOut size={20} />
                        <span>Logout</span>
                    </div>
                </div>
            </aside>

            {/* =========================================
          MOBILE TOP HEADER
          ========================================= */}
            <header className="top-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-color)', fontWeight: 600, fontSize: '18px' }}>
                    <Store size={24} />
                    <span className="brand-font">Shahi Boutique</span>
                </div>
                <button className="btn-danger-icon" onClick={handleLogout} title="Logout" style={{ padding: '8px' }}>
                    <LogOut size={20} />
                </button>
            </header>

            {/* =========================================
          MAIN CONTENT AREA (Animated)
          ========================================= */}
            <main className="main-content">
                {/* The key prop forces a re-mount on navigation, triggering the page-transition animation */}
                <div key={location.pathname} className="page-transition">
                    <Outlet />
                </div>
            </main>

            {/* =========================================
          MOBILE BOTTOM NAV
          ========================================= */}
            <nav className="bottom-nav">
                {navLinks.map((link) => (
                    <div
                        key={link.name}
                        className={`nav-item ${location.pathname === link.path ? 'active' : ''}`}
                        onClick={() => navigate(link.path)}
                    >
                        {link.icon}
                        <span>{link.name}</span>
                    </div>
                ))}
            </nav>
        </div>
    );
}
