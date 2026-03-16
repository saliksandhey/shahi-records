import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check local storage for persistent mock session
        const savedUser = localStorage.getItem('shahi_mock_user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        // Simple username/passkey requirement
        if (username === 'boutique.shahi' && password === 'shahi2010') {
            const mockUser = { id: 1, role: 'admin', username: 'boutique.shahi' };
            setUser(mockUser);
            localStorage.setItem('shahi_mock_user', JSON.stringify(mockUser));
            return mockUser;
        } else {
            throw new Error('Invalid username or passkey!');
        }
    };

    const logout = async () => {
        setUser(null);
        localStorage.removeItem('shahi_mock_user');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {!loading ? children : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 500, color: '#800020' }}>Loading Shahi Boutique...</div>
                </div>
            )}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
