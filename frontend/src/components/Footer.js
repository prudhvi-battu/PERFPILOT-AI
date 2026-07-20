import React from 'react';

const styles = {
  footer: {
    background: '#0f172a',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    padding: '2rem',
    textAlign: 'center',
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  brand: {
    color: '#475569',
    fontSize: '13px',
  },
  links: {
    display: 'flex',
    gap: '1.5rem',
  },
  link: {
    color: '#475569',
    textDecoration: 'none',
    fontSize: '13px',
    transition: 'color 0.2s',
  },
  badge: {
    color: '#334155',
    fontSize: '11px',
    letterSpacing: '1px',
    textTransform: 'uppercase',
  }
};

const Footer = () => {
  return (
    <footer style={styles.footer}>
      <div style={styles.content}>
        <div style={styles.brand}>
          ⚡ AI Performance Testing Assistant • E-Commerce Demo Platform
        </div>
        <div style={styles.links}>
          <span style={styles.link}>API Docs</span>
          <span style={styles.link}>Swagger</span>
          <span style={styles.link}>Metrics</span>
          <span style={styles.badge}>v1.0.0</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
