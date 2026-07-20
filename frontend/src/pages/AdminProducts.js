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
  th: {
    textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 600,
    color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px',
    borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
  },
  td: { padding: '12px 16px', fontSize: '14px', borderBottom: '1px solid #f1f5f9', color: '#475569' },
  input: {
    padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: '8px',
    fontSize: '13px', outline: 'none', width: '100%', background: '#f8fafc',
  },
  saveBtn: {
    padding: '6px 14px', borderRadius: '6px', border: 'none',
    background: '#6366f1', color: 'white', fontWeight: 600, fontSize: '12px',
    cursor: 'pointer', marginRight: '4px',
  },
  deleteBtn: {
    padding: '6px 14px', borderRadius: '6px', border: 'none',
    background: '#fef2f2', color: '#dc2626', fontWeight: 600, fontSize: '12px',
    cursor: 'pointer',
  },
};

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    api.get('/api/admin/products')
      .then(res => setProducts(res.data.products))
      .catch(console.error);
  }, []);

  const startEdit = (product) => {
    setEditingId(product.id);
    setEditForm({
      name: product.name,
      price: product.price,
      stock_quantity: product.stock_quantity,
      is_active: product.is_active
    });
  };

  const save = async (id) => {
    try {
      await api.put(`/api/admin/products/${id}`, editForm);
      setEditingId(null);
      const res = await api.get('/api/admin/products');
      setProducts(res.data.products);
    } catch (err) {
      alert('Failed to save');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await api.delete(`/api/admin/products/${id}`);
      setProducts(products.filter(p => p.id !== id));
    } catch (err) {
      alert('Failed to delete');
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Product Management</h1>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Product</th>
            <th style={styles.th}>SKU</th>
            <th style={styles.th}>Category</th>
            <th style={styles.th}>Price</th>
            <th style={styles.th}>Stock</th>
            <th style={styles.th}>Active</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map(product => (
            <tr key={product.id}>
              <td style={{...styles.td, fontWeight: 600}}>{product.name}</td>
              <td style={styles.td}>{product.sku}</td>
              <td style={styles.td}>{product.category_name}</td>
              <td style={styles.td}>
                {editingId === product.id ? (
                  <input style={{...styles.input, width: '80px'}} value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} />
                ) : `$${parseFloat(product.price).toFixed(2)}`}
              </td>
              <td style={styles.td}>
                {editingId === product.id ? (
                  <input style={{...styles.input, width: '60px'}} value={editForm.stock_quantity} onChange={e => setEditForm({...editForm, stock_quantity: e.target.value})} />
                ) : (
                  <span style={{color: product.stock_quantity < 10 ? '#dc2626' : '#16a34a', fontWeight: 600}}>
                    {product.stock_quantity}
                  </span>
                )}
              </td>
              <td style={styles.td}>
                {editingId === product.id ? (
                  <input type="checkbox" checked={editForm.is_active} onChange={e => setEditForm({...editForm, is_active: e.target.checked})} />
                ) : (
                  <span style={{color: product.is_active ? '#16a34a' : '#94a3b8'}}>
                    {product.is_active ? '✓' : '✗'}
                  </span>
                )}
              </td>
              <td style={styles.td}>
                {editingId === product.id ? (
                  <>
                    <button style={styles.saveBtn} onClick={() => save(product.id)}>Save</button>
                    <button style={{...styles.saveBtn, background: '#64748b'}} onClick={() => setEditingId(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button style={{...styles.saveBtn, background: '#6366f1'}} onClick={() => startEdit(product)}>Edit</button>
                    <button style={styles.deleteBtn} onClick={() => remove(product.id)}>Delete</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminProducts;
