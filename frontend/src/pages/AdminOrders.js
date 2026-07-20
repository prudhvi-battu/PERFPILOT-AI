import React, { useState, useEffect } from 'react';
import api from '../services/api';

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '2rem' },
  title: { fontSize: '28px', fontWeight: 800, color: '#0f172a', marginBottom: '2rem' },
  table: {
    width: '100%', borderCollapse: 'collapse',
    background: 'white', borderRadius: '16px', overflow: 'hidden',
    border: '1px solid #e2e8f0',
  },
  th: { textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' },
  td: { padding: '12px 16px', fontSize: '14px', borderBottom: '1px solid #f1f5f9', color: '#475569' },
  select: {
    padding: '6px 12px', border: '2px solid #e2e8f0', borderRadius: '8px',
    fontSize: '13px', outline: 'none', background: 'white', cursor: 'pointer',
  },
  updateBtn: {
    padding: '6px 14px', borderRadius: '6px', border: 'none',
    background: '#6366f1', color: 'white', fontWeight: 600, fontSize: '12px',
    cursor: 'pointer',
  },
};

const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    api.get('/api/admin/orders')
      .then(res => setOrders(res.data.orders))
      .catch(console.error);
  }, []);

  const updateStatus = async (id) => {
    try {
      await api.put(`/api/admin/orders/${id}/status`, { status: newStatus });
      setUpdatingId(null);
      const res = await api.get('/api/admin/orders');
      setOrders(res.data.orders);
    } catch (err) {
      alert('Failed to update status');
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Order Management</h1>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Order #</th>
            <th style={styles.th}>Customer</th>
            <th style={styles.th}>Amount</th>
            <th style={styles.th}>Payment</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Date</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order.id}>
              <td style={{...styles.td, fontWeight: 600}}>{order.order_number}</td>
              <td style={styles.td}>{order.first_name} {order.last_name}<br/><span style={{fontSize: '12px', color: '#94a3b8'}}>{order.user_email}</span></td>
              <td style={{...styles.td, fontWeight: 700}}>${parseFloat(order.total).toFixed(2)}</td>
              <td style={styles.td}>
                <span style={{color: order.payment_status === 'completed' ? '#16a34a' : '#ca8a04', fontWeight: 600}}>
                  {order.payment_status}
                </span>
              </td>
              <td style={styles.td}>
                {updatingId === order.id ? (
                  <select style={styles.select} value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <span style={{
                    display: 'inline-block', padding: '2px 10px', borderRadius: '20px',
                    fontSize: '12px', fontWeight: 600,
                    background: order.status === 'delivered' ? '#f0fdf4' : order.status === 'cancelled' ? '#fef2f2' : '#eef2ff',
                    color: order.status === 'delivered' ? '#16a34a' : order.status === 'cancelled' ? '#dc2626' : '#6366f1',
                  }}>
                    {order.status}
                  </span>
                )}
              </td>
              <td style={styles.td}>{new Date(order.created_at).toLocaleDateString()}</td>
              <td style={styles.td}>
                {updatingId === order.id ? (
                  <>
                    <button style={styles.updateBtn} onClick={() => updateStatus(order.id)}>Update</button>
                    <button style={{...styles.updateBtn, background: '#64748b', marginLeft: '4px'}} onClick={() => setUpdatingId(null)}>Cancel</button>
                  </>
                ) : (
                  <button style={styles.updateBtn} onClick={() => { setUpdatingId(order.id); setNewStatus(order.status); }}>
                    Change Status
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminOrders;
