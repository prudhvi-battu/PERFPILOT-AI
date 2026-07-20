import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const styles = {
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '2rem',
  },
  back: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    color: '#64748b',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
    marginBottom: '2rem',
    padding: '8px 16px',
    borderRadius: '8px',
    background: 'white',
    border: '1px solid #e2e8f0',
    transition: 'all 0.2s',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '3rem',
    marginBottom: '3rem',
  },
  imageContainer: {
    background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
    borderRadius: '20px',
    height: '400px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '80px',
    color: '#94a3b8',
  },
  info: {},
  category: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '8px',
  },
  name: {
    fontSize: '28px',
    fontWeight: 800,
    color: '#0f172a',
    marginBottom: '12px',
    lineHeight: 1.2,
  },
  price: {
    fontSize: '32px',
    fontWeight: 800,
    color: '#0f172a',
    marginBottom: '4px',
  },
  comparePrice: {
    fontSize: '18px',
    color: '#94a3b8',
    textDecoration: 'line-through',
    marginLeft: '12px',
    fontWeight: 400,
  },
  sku: {
    color: '#94a3b8',
    fontSize: '13px',
    marginBottom: '1.5rem',
  },
  description: {
    color: '#475569',
    fontSize: '15px',
    lineHeight: 1.7,
    marginBottom: '2rem',
  },
  stock: {
    display: 'inline-block',
    padding: '4px 14px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '1.5rem',
  },
  actions: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
  },
  qtyBtn: {
    width: '44px', height: '44px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    background: 'white',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: 700,
    transition: 'all 0.2s',
  },
  qtyInput: {
    width: '64px', height: '44px',
    textAlign: 'center',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    outline: 'none',
  },
  addToCart: {
    flex: 1,
    padding: '14px 28px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  section: {
    marginBottom: '2rem',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: '1rem',
  },
  relatedGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '1rem',
  },
  relatedCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '1rem',
    border: '1px solid #e2e8f0',
    textDecoration: 'none',
    display: 'block',
  },
  relatedName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#0f172a',
    marginTop: '8px',
  },
  relatedPrice: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#6366f1',
    marginTop: '4px',
  },
};

const ProductDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/api/products/${slug}`)
      .then(res => setProduct(res.data))
      .catch(err => { console.error(err); navigate('/products'); })
      .finally(() => setLoading(false));
  }, [slug, navigate]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setAdding(true);
    try {
      await api.post('/api/cart', { product_id: product.id, quantity });
      navigate('/cart');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add to cart');
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <div style={{textAlign: 'center', padding: '4rem', color: '#94a3b8'}}>Loading...</div>;
  if (!product) return null;

  const stockLevel = product.stock_quantity > 20 ? {background: '#f0fdf4', color: '#16a34a', text: `${product.stock_quantity} in stock`} :
    product.stock_quantity > 0 ? {background: '#fefce8', color: '#ca8a04', text: `Only ${product.stock_quantity} left`} :
    {background: '#fef2f2', color: '#dc2626', text: 'Out of stock'};

  return (
    <div style={styles.container}>
      <Link to="/products" style={styles.back}>← Back to Products</Link>

      <div style={styles.layout}>
        <div style={styles.imageContainer}>
          {product.name.charAt(0)}
        </div>
        <div style={styles.info}>
          <div style={styles.category}>{product.category_name}</div>
          <h1 style={styles.name}>{product.name}</h1>
          <div style={styles.price}>
            ${product.price}
            {product.compare_price && <span style={styles.comparePrice}>${product.compare_price}</span>}
          </div>
          <div style={styles.sku}>SKU: {product.sku}</div>
          <div style={{...styles.stock, ...stockLevel}}>{stockLevel.text}</div>
          <p style={styles.description}>{product.description}</p>

          {product.stock_quantity > 0 && (
            <div style={styles.actions}>
              <button style={styles.qtyBtn} onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
              <input style={styles.qtyInput} value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} />
              <button style={styles.qtyBtn} onClick={() => setQuantity(q => Math.min(product.stock_quantity, q + 1))}>+</button>
              <button style={styles.addToCart} onClick={handleAddToCart} disabled={adding}>
                {adding ? 'Adding...' : 'Add to Cart'}
              </button>
            </div>
          )}
        </div>
      </div>

      {product.related_products?.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Related Products</h2>
          <div style={styles.relatedGrid}>
            {product.related_products.map(rp => (
              <Link to={`/products/${rp.slug}`} key={rp.id} style={styles.relatedCard}>
                <div style={{height: '120px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', color: '#94a3b8'}}>
                  {rp.name.charAt(0)}
                </div>
                <div style={styles.relatedName}>{rp.name}</div>
                <div style={styles.relatedPrice}>${rp.price}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
