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
    marginBottom: '2rem',
  },
  title: {
    fontSize: '32px',
    fontWeight: 800,
    color: '#0f172a',
    marginBottom: '8px',
  },
  subtitle: {
    color: '#64748b',
    fontSize: '15px',
  },
  searchBar: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '2rem',
    flexWrap: 'wrap',
  },
  searchInput: {
    flex: 1,
    minWidth: '250px',
    padding: '14px 20px',
    border: '2px solid #e2e8f0',
    borderRadius: '14px',
    fontSize: '15px',
    outline: 'none',
    transition: 'all 0.2s',
    background: 'white',
  },
  filterSelect: {
    padding: '14px 20px',
    border: '2px solid #e2e8f0',
    borderRadius: '14px',
    fontSize: '14px',
    outline: 'none',
    background: 'white',
    cursor: 'pointer',
    minWidth: '160px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
    transition: 'all 0.3s',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'block',
  },
  cardImage: {
    width: '100%',
    height: '200px',
    background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '48px',
    color: '#94a3b8',
    objectFit: 'cover',
  },
  cardBody: {
    padding: '1.25rem',
  },
  cardCategory: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '6px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: '4px',
    lineHeight: 1.3,
  },
  cardPrice: {
    fontSize: '20px',
    fontWeight: 800,
    color: '#0f172a',
    marginTop: '8px',
  },
  cardCompare: {
    fontSize: '14px',
    color: '#94a3b8',
    textDecoration: 'line-through',
    marginLeft: '8px',
    fontWeight: 400,
  },
  cardStock: {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 600,
    marginTop: '8px',
  },
  stockLow: { background: '#fef2f2', color: '#dc2626' },
  stockHigh: { background: '#f0fdf4', color: '#16a34a' },
  loading: {
    textAlign: 'center',
    padding: '4rem',
    color: '#94a3b8',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '2rem',
  },
  pageBtn: {
    padding: '10px 18px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    background: 'white',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  pageBtnActive: {
    background: '#6366f1',
    borderColor: '#6366f1',
    color: 'white',
  },
};

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1 });

  useEffect(() => {
    api.get('/api/products/categories')
      .then(res => setCategories(res.data.categories))
      .catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { page: pagination.page, limit: 12 };
    if (search) params.q = search;
    if (category) params.category_id = category;

    api.get('/api/products', { params })
      .then(res => {
        setProducts(res.data.products);
        setPagination(prev => ({ ...prev, ...res.data.pagination }));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, category, pagination.page]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Products</h1>
        <p style={styles.subtitle}>Browse our catalog of {pagination.total || '0'} items</p>
      </div>

      <div style={styles.searchBar}>
        <input
          style={styles.searchInput}
          placeholder="Search products..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPagination(p => ({...p, page: 1})); }}
        />
        <select style={styles.filterSelect} value={category} onChange={e => { setCategory(e.target.value); setPagination(p => ({...p, page: 1})); }}>
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name} ({c.product_count})</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading products...</div>
      ) : (
        <>
          <div style={styles.grid}>
            {products.map(product => (
              <Link to={`/products/${product.slug}`} key={product.id} style={styles.card}>
                <div style={styles.cardImage}>
                  {product.name.charAt(0)}
                </div>
                <div style={styles.cardBody}>
                  <div style={styles.cardCategory}>{product.category_name}</div>
                  <div style={styles.cardTitle}>{product.name}</div>
                  <div style={styles.cardPrice}>
                    ${product.price}
                    {product.compare_price && (
                      <span style={styles.cardCompare}>${product.compare_price}</span>
                    )}
                  </div>
                  <div style={{
                    ...styles.cardStock,
                    ...(product.stock_quantity < 10 ? styles.stockLow : styles.stockHigh)
                  }}>
                    {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : 'Out of stock'}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {pagination.total_pages > 1 && (
            <div style={styles.pagination}>
              {Array.from({ length: pagination.total_pages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  style={{...styles.pageBtn, ...(page === pagination.page ? styles.pageBtnActive : {})}}
                  onClick={() => setPagination(p => ({...p, page}))}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Products;
