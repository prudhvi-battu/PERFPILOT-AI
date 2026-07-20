import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '2rem',
  },
  title: {
    fontSize: '28px',
    fontWeight: 800,
    color: '#0f172a',
    marginBottom: '4px',
  },
  subtitle: {
    color: '#64748b',
    fontSize: '14px',
    marginBottom: '2rem',
  },
  empty: {
    textAlign: 'center',
    padding: '4rem',
    background: 'white',
    borderRadius: '20px',
    border: '1px solid #e2e8f0',
  },
  order: {
    background: 'white',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    marginBottom: '1rem',
    overflow: 'hidden',
  },
  orderHeader: {
    padding: '1.25rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  orderNumber: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#0f172a',
  },
  orderDate: {
    fontSize: '13px',
    color: '#64748b',
    marginTop: '2px',
  },
  orderTotal: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#0f172a',
  },
  status: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
  },
  orderItems: {
    padding: '0 1.25rem 1.25rem',
    borderTop: '1px solid #e2e8f0',
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '14px',
    color: '#475569',
  },
};

const statusColors = {
  pending: { background: '#fefce8', color: '#ca8a04' },
  confirmed: { background: '#eef2ff', color: '#6366f1' },
  processing: { background: '#eff6ff', color: '#2563eb' },
  shipped: { background: '#f0fdf4', color: '#16a34a' },
  delivered: { background: '#f0fdf4', color: '#16a34a' },
  cancelled: { background: '#fef2f2', color: '#dc2626' },
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    api.get('/api/orders')
      .then(res => setOrders(res.data.orders))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{textAlign: 'center', padding: '4rem'}}>Loading...</div>;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>My Orders</h1>
      <p style={styles.subtitle}>{orders.length} order{orders.length !== 1 ? 's' : ''} placed</p>

      {orders.length === 0 ? (
        <div style={styles.empty}>
          <div style={{fontSize: '48px', marginBottom: '1rem'}}>📦</div>
          <div style={{fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px'}}>No orders yet</div>
          <div style={{color: '#64748b', marginBottom: '1.5rem'}}>Start shopping to place your first order</div>
          <Link to="/products" style={{
            display: 'inline-block', padding: '12px 24px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white', textDecoration: 'none', borderRadius: '12px', fontWeight: 600,
          }}>Browse Products</Link>
        </div>
      ) : (
        orders.map(order => (
          <div key={order.id} style={styles.order}>
            <div style={styles.orderHeader} onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
              <div>
                <div style={styles.orderNumber}>{order.order_number}</div>
                <div style={styles.orderDate}>{new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              <div style={{textAlign: 'right'}}>
                <span style={{...styles.status, ...(statusColors[order.status] || statusColors.pending)}}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
                <div style={styles.orderTotal}>${parseFloat(order.total).toFixed(2)}</div>
              </div>
            </div>
            {expandedId === order.id && (
              <div style={styles.orderItems}>
                <div style={{padding: '12px 0 8px', fontWeight: 600, fontSize: '14px', color: '#64748b'}}>Items</div>
                {(order.items || []).map((item, i) => (
                  <div key={i} style={styles.item}>
                    <span>{item.product_name} × {item.quantity}</span>
                    <span>${parseFloat(item.total_price).toFixed(2)}</span>
                  </div>
                ))}
                <div style={{borderTop: '1px solid #e2e8f0', marginTop: '8px', paddingTop: '8px'}}>
                  <div style={styles.item}><span>Subtotal</span><span>${parseFloat(order.subtotal).toFixed(2)}</span></div>
                  <div style={styles.item}><span>Shipping</span><span>{parseFloat(order.shipping) === 0 ? 'FREE' : `$${parseFloat(order.shipping).toFixed(2)}`}</span></div>
                  <div style={styles.item}><span>Tax</span><span>${parseFloat(order.tax).toFixed(2)}</span></div>
                  <div style={{...styles.item, fontWeight: 700, fontSize: '16px', color: '#0f172a'}}>
                    <span>Total</span><span>${parseFloat(order.total).toFixed(2)}</span>
                  </div>
                </div>
                <div style={{marginTop: '12px', fontSize: '13px', color: '#94a3b8'}}>
                  Payment: {order.payment_method.replace('_', ' ').toUpperCase()} • {order.payment_status}
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default Orders;
