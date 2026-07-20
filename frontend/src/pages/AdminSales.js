import React, { useState, useEffect } from 'react';
import api from '../services/api';

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '2rem' },
  title: { fontSize: '28px', fontWeight: 800, color: '#0f172a', marginBottom: '2rem' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' },
  card: { background: 'white', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0' },
  cardTitle: { fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' },
  bar: { marginBottom: '12px' },
  barLabel: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', marginBottom: '4px' },
  barTrack: { height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '4px', transition: 'width 0.5s ease' },
  revenueList: { maxHeight: '400px', overflowY: 'auto' },
  revenueItem: {
    display: 'flex', justifyContent: 'space-between', padding: '8px 0',
    borderBottom: '1px solid #f1f5f9', fontSize: '13px', color: '#475569',
  },
  fullWidth: { gridColumn: '1 / -1' },
};

const AdminSales = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/admin/sales')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{textAlign: 'center', padding: '4rem'}}>Loading...</div>;
  if (!data) return <div style={{textAlign: 'center', padding: '4rem', color: '#dc2626'}}>No sales data available. Place some orders first!</div>;

  const maxRevenue = Math.max(...(data.top_products || []).map(p => parseFloat(p.total_revenue)), 1);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Sales Reports</h1>

      <div style={styles.grid}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Top Products</h2>
          {(data.top_products || []).map((p, i) => (
            <div key={i} style={styles.bar}>
              <div style={styles.barLabel}>
                <span>{p.product_name}</span>
                <span style={{fontWeight: 600}}>${parseFloat(p.total_revenue).toLocaleString()}</span>
              </div>
              <div style={styles.barTrack}>
                <div style={{
                  ...styles.barFill,
                  width: `${(parseFloat(p.total_revenue) / maxRevenue) * 100}%`,
                  background: `linear-gradient(90deg, #6366f1, ${i === 0 ? '#8b5cf6' : i === 1 ? '#a78bfa' : '#c4b5fd'})`
                }} />
              </div>
            </div>
          ))}
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Sales by Category</h2>
          {(data.sales_by_category || []).map((c, i) => {
            const maxCatRevenue = Math.max(...(data.sales_by_category || []).map(c => parseFloat(c.revenue)), 1);
            return (
              <div key={i} style={styles.bar}>
                <div style={styles.barLabel}>
                  <span>{c.name}</span>
                  <span style={{fontWeight: 600}}>${parseFloat(c.revenue).toLocaleString()}</span>
                </div>
                <div style={styles.barTrack}>
                  <div style={{
                    ...styles.barFill,
                    width: `${(parseFloat(c.revenue) / maxCatRevenue) * 100}%`,
                    background: 'linear-gradient(90deg, #f59e0b, #f97316)'
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{...styles.card, ...styles.fullWidth}}>
        <h2 style={styles.cardTitle}>Daily Revenue (Last 30 Days)</h2>
        <div style={styles.revenueList}>
          <div style={{...styles.revenueItem, fontWeight: 700, color: '#0f172a'}}>
            <span>Date</span>
            <span>Orders</span>
            <span>Revenue</span>
          </div>
          {(data.revenue_by_day || []).map((d, i) => (
            <div key={i} style={styles.revenueItem}>
              <span>{new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              <span>{d.orders} orders</span>
              <span style={{fontWeight: 600}}>${parseFloat(d.revenue).toLocaleString()}</span>
            </div>
          ))}
          {(data.revenue_by_day || []).length === 0 && (
            <div style={{color: '#94a3b8', textAlign: 'center', padding: '2rem'}}>No revenue data for the last 30 days</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSales;
