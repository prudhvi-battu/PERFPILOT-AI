import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  title: { fontSize: '28px', fontWeight: 800, color: '#0f172a' },
  badge: {
    padding: '8px 16px', borderRadius: '8px',
    background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    color: 'white', fontWeight: 600, fontSize: '13px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
    border: '1px solid #e2e8f0',
  },
  cardLabel: { fontSize: '13px', color: '#64748b', fontWeight: 500, marginBottom: '8px' },
  cardValue: { fontSize: '32px', fontWeight: 800, color: '#0f172a' },
  cardSub: { fontSize: '13px', color: '#94a3b8', marginTop: '4px' },
  section: { marginBottom: '2rem' },
  sectionTitle: { fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' },
  table: {
    width: '100%', borderCollapse: 'collapse',
    background: 'white', borderRadius: '16px', overflow: 'hidden',
    border: '1px solid #e2e8f0',
  },
  th: { textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' },
  td: { padding: '12px 16px', fontSize: '14px', borderBottom: '1px solid #f1f5f9', color: '#475569' },
  navGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginTop: '2rem',
  },
  navCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
    border: '1px solid #e2e8f0',
    textDecoration: 'none',
    display: 'block',
    transition: 'all 0.2s',
  },
  navIcon: { fontSize: '32px', marginBottom: '8px' },
  navTitle: { fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' },
  navDesc: { fontSize: '13px', color: '#64748b' },
};

const statusColors = {
  pending: { bg: '#fefce8', color: '#ca8a04' },
  confirmed: { bg: '#eef2ff', color: '#6366f1' },
  processing: { bg: '#eff6ff', color: '#2563eb' },
  shipped: { bg: '#f0fdf4', color: '#16a34a' },
  delivered: { bg: '#f0fdf4', color: '#16a34a' },
  cancelled: { bg: '#fef2f2', color: '#dc2626' },
};

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/admin/stats')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{textAlign: 'center', padding: '4rem'}}>Loading...</div>;
  if (!data) return <div style={{textAlign: 'center', padding: '4rem', color: '#dc2626'}}>Failed to load dashboard</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Admin Dashboard</h1>
        <span style={styles.badge}>⚡ AI Powered</span>
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardLabel}>Total Revenue</div>
          <div style={styles.cardValue}>${parseFloat(data.stats.total_revenue).toLocaleString()}</div>
          <div style={styles.cardSub}>Lifetime sales</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardLabel}>Total Orders</div>
          <div style={styles.cardValue}>{data.stats.total_orders}</div>
          <div style={styles.cardSub}>All time orders</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardLabel}>Products</div>
          <div style={styles.cardValue}>{data.stats.total_products}</div>
          <div style={styles.cardSub}>Active products</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardLabel}>Users</div>
          <div style={styles.cardValue}>{data.stats.total_users}</div>
          <div style={styles.cardSub}>Registered accounts</div>
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Orders by Status</h2>
        <div style={styles.grid}>
          {(data.stats.orders_by_status || []).map(s => (
            <div key={s.status} style={styles.card}>
              <div style={{...styles.cardLabel, display: 'flex', alignItems: 'center', gap: '8px'}}>
                <span style={{width: '10px', height: '10px', borderRadius: '50%', background: (statusColors[s.status] || {}).color || '#94a3b8'}}></span>
                {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
              </div>
              <div style={styles.cardValue}>{s.count}</div>
            </div>
          ))}
        </div>
      </div>

      {data.stats.low_stock_items?.length > 0 && (
        <div style={styles.section}>
          <h2 style={{...styles.sectionTitle, color: '#dc2626'}}>⚠ Low Stock Alert</h2>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Product</th>
                <th style={styles.th}>SKU</th>
                <th style={styles.th}>Stock</th>
              </tr>
            </thead>
            <tbody>
              {data.stats.low_stock_items.map(item => (
                <tr key={item.id}>
                  <td style={styles.td}>{item.name}</td>
                  <td style={styles.td}>{item.sku}</td>
                  <td style={{...styles.td, color: item.stock_quantity === 0 ? '#dc2626' : '#ca8a04', fontWeight: 600}}>
                    {item.stock_quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Recent Orders</h2>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Order</th>
              <th style={styles.th}>Amount</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Date</th>
            </tr>
          </thead>
          <tbody>
            {data.recent_orders.map(order => (
              <tr key={order.order_number}>
                <td style={{...styles.td, fontWeight: 600}}>{order.order_number}</td>
                <td style={styles.td}>${parseFloat(order.total).toFixed(2)}</td>
                <td style={styles.td}>
                  <span style={{
                    display: 'inline-block', padding: '2px 10px', borderRadius: '20px',
                    fontSize: '12px', fontWeight: 600,
                    background: (statusColors[order.status] || {}).bg || '#f1f5f9',
                    color: (statusColors[order.status] || {}).color || '#475569',
                  }}>
                    {order.status}
                  </span>
                </td>
                <td style={styles.td}>{new Date(order.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={styles.navGrid}>
        <Link to="/admin/products" style={styles.navCard}>
          <div style={styles.navIcon}>📦</div>
          <div style={styles.navTitle}>Products</div>
          <div style={styles.navDesc}>Manage product catalog and inventory</div>
        </Link>
        <Link to="/admin/orders" style={styles.navCard}>
          <div style={styles.navIcon}>📋</div>
          <div style={styles.navTitle}>Orders</div>
          <div style={styles.navDesc}>View and manage all orders</div>
        </Link>
        <Link to="/admin/sales" style={styles.navCard}>
          <div style={styles.navIcon}>📈</div>
          <div style={styles.navTitle}>Sales Reports</div>
          <div style={styles.navDesc}>Revenue analytics and trends</div>
        </Link>
      </div>
    </div>
  );
};

export default AdminDashboard;
