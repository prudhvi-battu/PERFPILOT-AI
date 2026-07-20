import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '2rem',
  },
  title: {
    fontSize: '28px',
    fontWeight: 800,
    color: '#0f172a',
    marginBottom: '2rem',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 1fr',
    gap: '2rem',
  },
  section: {
    background: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
    border: '1px solid #e2e8f0',
    marginBottom: '1.5rem',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: '1rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '1rem',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#475569',
  },
  input: {
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s',
    background: '#f8fafc',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
  orderSummary: {
    background: '#f8fafc',
    borderRadius: '12px',
    padding: '1rem',
  },
  summaryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '14px',
    borderBottom: '1px solid #e2e8f0',
  },
  summaryTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    fontSize: '18px',
    fontWeight: 800,
    color: '#0f172a',
  },
  placeOrder: {
    width: '100%',
    padding: '16px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: '1rem',
  },
  paymentOptions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  paymentOption: {
    padding: '10px 20px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    background: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  paymentActive: {
    borderColor: '#6366f1',
    background: '#eef2ff',
    color: '#6366f1',
    fontWeight: 600,
  },
};

const Checkout = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [address, setAddress] = useState({
    street: '123 Main St',
    city: 'New York',
    state: 'NY',
    zip: '10001',
    country: 'US'
  });

  useEffect(() => {
    api.get('/api/cart')
      .then(res => setCart(res.data))
      .catch(() => navigate('/cart'))
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await api.post('/api/orders', {
        shipping_address: address,
        payment_method: paymentMethod
      });
      navigate(`/orders`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{textAlign: 'center', padding: '4rem'}}>Loading...</div>;
  if (!cart?.items?.length) { navigate('/cart'); return null; }

  const subtotal = cart.total;
  const shipping = subtotal >= 100 ? 0 : 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + tax + shipping;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Checkout</h1>

      <div style={styles.layout}>
        <div>
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Shipping Address</h2>
            <div style={styles.field}>
              <label style={styles.label}>Street Address</label>
              <input style={styles.input} value={address.street} onChange={e => setAddress({...address, street: e.target.value})} />
            </div>
            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>City</label>
                <input style={styles.input} value={address.city} onChange={e => setAddress({...address, city: e.target.value})} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>State</label>
                <input style={styles.input} value={address.state} onChange={e => setAddress({...address, state: e.target.value})} />
              </div>
            </div>
            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>ZIP Code</label>
                <input style={styles.input} value={address.zip} onChange={e => setAddress({...address, zip: e.target.value})} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Country</label>
                <input style={styles.input} value={address.country} onChange={e => setAddress({...address, country: e.target.value})} />
              </div>
            </div>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Payment Method</h2>
            <div style={styles.paymentOptions}>
              {['credit_card', 'debit_card', 'paypal'].map(method => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  style={{...styles.paymentOption, ...(paymentMethod === method ? styles.paymentActive : {})}}
                >
                  {method === 'credit_card' ? '💳 Credit Card' : method === 'debit_card' ? '🏦 Debit Card' : '📱 PayPal'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Order Summary</h2>
          <div style={styles.orderSummary}>
            {cart.items.map(item => (
              <div key={item.id} style={styles.summaryItem}>
                <span>{item.name} × {item.quantity}</span>
                <span style={{fontWeight: 600}}>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div style={styles.summaryItem}>
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div style={styles.summaryItem}>
              <span>Shipping</span>
              <span>{shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</span>
            </div>
            <div style={styles.summaryItem}>
              <span>Tax (8%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div style={styles.summaryTotal}>
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
          <button style={styles.placeOrder} onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Processing Payment...' : `Place Order - $${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
