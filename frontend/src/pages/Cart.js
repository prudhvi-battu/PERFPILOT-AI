import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '2rem',
  },
  header: {
    marginBottom: '2rem',
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
  },
  empty: {
    textAlign: 'center',
    padding: '4rem 2rem',
    background: 'white',
    borderRadius: '20px',
    border: '1px solid #e2e8f0',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '1rem',
  },
  emptyText: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '8px',
  },
  emptySub: {
    color: '#64748b',
    fontSize: '14px',
    marginBottom: '1.5rem',
  },
  shopBtn: {
    display: 'inline-block',
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontWeight: 600,
    fontSize: '14px',
  },
  items: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '2rem',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    background: 'white',
    padding: '1.25rem',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
  },
  itemImage: {
    width: '80px',
    height: '80px',
    borderRadius: '12px',
    background: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    color: '#94a3b8',
    flexShrink: 0,
  },
  itemInfo: { flex: 1 },
  itemName: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: '4px',
  },
  itemPrice: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#6366f1',
  },
  itemActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  qtyBtn: {
    width: '36px', height: '36px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    background: 'white',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 700,
    transition: 'all 0.2s',
  },
  qtyNum: {
    width: '48px',
    textAlign: 'center',
    fontWeight: 600,
    fontSize: '15px',
  },
  removeBtn: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '8px',
    background: '#fef2f2',
    color: '#dc2626',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '13px',
    transition: 'all 0.2s',
    marginLeft: '8px',
  },
  summary: {
    background: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
    border: '1px solid #e2e8f0',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    color: '#475569',
    fontSize: '15px',
  },
  summaryTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderTop: '2px solid #e2e8f0',
    marginTop: '8px',
    fontSize: '20px',
    fontWeight: 800,
    color: '#0f172a',
  },
  checkoutBtn: {
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
  clearBtn: {
    padding: '10px 20px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    background: 'white',
    color: '#64748b',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
    transition: 'all 0.2s',
    marginTop: '1rem',
  },
};

const Cart = () => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { fetchCart(); }, []);

  const fetchCart = async () => {
    try {
      const res = await api.get('/api/cart');
      setCart(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    try {
      await api.put(`/api/cart/items/${itemId}`, { quantity });
      fetchCart();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update');
    }
  };

  const removeItem = async (itemId) => {
    try {
      await api.delete(`/api/cart/items/${itemId}`);
      fetchCart();
    } catch (err) {
      alert('Failed to remove item');
    }
  };

  const clearCart = async () => {
    try {
      await api.delete('/api/cart');
      fetchCart();
    } catch (err) {
      alert('Failed to clear cart');
    }
  };

  if (loading) return <div style={{textAlign: 'center', padding: '4rem', color: '#94a3b8'}}>Loading...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Shopping Cart</h1>
        <p style={styles.subtitle}>{cart?.items?.length || 0} items in your cart</p>
      </div>

      {!cart?.items?.length ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>🛒</div>
          <div style={styles.emptyText}>Your cart is empty</div>
          <div style={styles.emptySub}>Start shopping to add items to your cart</div>
          <Link to="/products" style={styles.shopBtn}>Browse Products</Link>
        </div>
      ) : (
        <>
          <div style={styles.items}>
            {cart.items.map(item => (
              <div key={item.id} style={styles.item}>
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} style={{width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', display: 'block', flexShrink: 0}} />
                ) : (
                  <div style={styles.itemImage}>{item.name.charAt(0)}</div>
                )}
                <div style={styles.itemInfo}>
                  <Link to={`/products/${item.slug}`} style={{textDecoration: 'none'}}>
                    <div style={styles.itemName}>{item.name}</div>
                  </Link>
                  <div style={styles.itemPrice}>${item.price}</div>
                </div>
                <div style={styles.itemActions}>
                  <button style={styles.qtyBtn} onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button>
                  <div style={styles.qtyNum}>{item.quantity}</div>
                  <button style={styles.qtyBtn} onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                  <button style={styles.removeBtn} onClick={() => removeItem(item.id)}>Remove</button>
                </div>
              </div>
            ))}
          </div>

          <div style={styles.summary}>
            <div style={styles.summaryRow}>
              <span>Subtotal</span>
              <span>${cart.total}</span>
            </div>
            <div style={styles.summaryRow}>
              <span>Shipping</span>
              <span>{cart.total >= 100 ? 'FREE' : '$9.99'}</span>
            </div>
            <div style={styles.summaryRow}>
              <span>Tax (8%)</span>
              <span>${(cart.total * 0.08).toFixed(2)}</span>
            </div>
            <div style={styles.summaryTotal}>
              <span>Total</span>
              <span>${(cart.total * 1.08 + (cart.total >= 100 ? 0 : 9.99)).toFixed(2)}</span>
            </div>
            <button style={styles.checkoutBtn} onClick={() => navigate('/checkout')}>
              Proceed to Checkout
            </button>
            <div style={{textAlign: 'center'}}>
              <button style={styles.clearBtn} onClick={clearCart}>Clear Cart</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Cart;
