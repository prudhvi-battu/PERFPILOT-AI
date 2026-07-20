import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const styles = {
  nav: {
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    padding: '0 2rem',
    height: '72px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(12px)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    textDecoration: 'none',
  },
  logoIcon: {
    width: '40px',
    height: '40px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 800,
    color: 'white',
  },
  logoText: {
    color: 'white',
    fontSize: '18px',
    fontWeight: 700,
    letterSpacing: '-0.5px',
  },
  logoSub: {
    color: '#94a3b8',
    fontSize: '11px',
    fontWeight: 400,
    letterSpacing: '0.5px',
    textTransform: 'uppercase' ,
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  link: {
    color: '#cbd5e1',
    textDecoration: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  linkActive: {
    color: 'white',
    background: 'rgba(99,102,241,0.15)',
  },
  authSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  button: {
    padding: '8px 20px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    textDecoration: 'none',
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
  },
  btnOutline: {
    background: 'transparent',
    color: '#cbd5e1',
    border: '1px solid #334155',
  },
  userMenu: {
    position: 'relative',
  },
  userButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '8px',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '8px',
    minWidth: '200px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    zIndex: 100,
  },
  dropdownItem: {
    display: 'block',
    padding: '10px 16px',
    color: '#cbd5e1',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    transition: 'all 0.15s',
    border: 'none',
    background: 'none',
    width: '100%',
    textAlign: 'left',
    cursor: 'pointer',
  },
  badge: {
    background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 600,
    marginLeft: '8px',
  }
};

const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <nav style={styles.nav}>
      <Link to="/products" style={styles.logo}>
        <div style={styles.logoIcon}>⚡</div>
        <div>
          <div style={styles.logoText}>PerfShop</div>
          <div style={styles.logoSub}>AI Performance Testing</div>
        </div>
      </Link>

      <div style={styles.links}>
        <Link to="/products" style={{...styles.link, ...(window.location.pathname === '/products' ? styles.linkActive : {})}}>
          Products
        </Link>
        {isAuthenticated && (
          <>
            <Link to="/cart" style={{...styles.link, ...(window.location.pathname === '/cart' ? styles.linkActive : {})}}>
              Cart
            </Link>
            <Link to="/orders" style={{...styles.link, ...(window.location.pathname === '/orders' ? styles.linkActive : {})}}>
              Orders
            </Link>
          </>
        )}
        <Link to="/dashboard/executive" style={{...styles.link, ...(window.location.pathname.includes('executive') ? styles.linkActive : {})}}>
          Dashboard
        </Link>
        {isAdmin && (
          <Link to="/admin" style={{
            ...styles.link,
            ...(window.location.pathname.includes('/admin') ? styles.linkActive : {}),
            color: '#fbbf24'
          }}>
            Admin
            <span style={styles.badge}>AI</span>
          </Link>
        )}
      </div>

      <div style={styles.authSection}>
        {isAuthenticated ? (
          <div style={styles.userMenu}>
            <button 
              style={styles.userButton}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span style={{fontSize: '16px'}}>👤</span>
              {user?.first_name}
              <span style={{fontSize: '12px', marginLeft: '4px'}}>▾</span>
            </button>
            {menuOpen && (
              <div style={styles.dropdown}>
                <div style={{padding: '8px 16px', borderBottom: '1px solid #334155', marginBottom: '4px'}}>
                  <div style={{color: 'white', fontWeight: 600, fontSize: '14px'}}>
                    {user?.first_name} {user?.last_name}
                  </div>
                  <div style={{color: '#64748b', fontSize: '12px'}}>{user?.email}</div>
                  {user?.role === 'admin' && (
                    <div style={{color: '#fbbf24', fontSize: '11px', marginTop: '2px'}}>⚡ Admin</div>
                  )}
                </div>
                <Link to="/orders" style={styles.dropdownItem} onClick={() => setMenuOpen(false)}>
                  📦 My Orders
                </Link>
                <Link to="/dashboard/executive" style={styles.dropdownItem} onClick={() => setMenuOpen(false)}>
                  📊 Performance Dashboard
                </Link>
                {isAdmin && (
                  <>
                    <Link to="/admin" style={styles.dropdownItem} onClick={() => setMenuOpen(false)}>
                      ⚙️ Admin Panel
                    </Link>
                    <Link to="/admin/sales" style={styles.dropdownItem} onClick={() => setMenuOpen(false)}>
                      📈 Sales Reports
                    </Link>
                  </>
                )}
                <button onClick={handleLogout} style={{...styles.dropdownItem, color: '#ef4444', borderTop: '1px solid #334155', marginTop: '4px', borderRadius: 0}}>
                  🚪 Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <Link to="/login" style={{...styles.button, ...styles.btnOutline}}>Sign In</Link>
            <Link to="/register" style={{...styles.button, ...styles.btnPrimary}}>Get Started</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
