import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const styles = {
  container: {
    minHeight: 'calc(100vh - 72px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    padding: '2rem',
  },
  card: {
    background: 'white',
    borderRadius: '24px',
    padding: '3rem',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
    border: '1px solid rgba(0,0,0,0.04)',
  },
  header: { textAlign: 'center', marginBottom: '2rem' },
  icon: {
    width: '64px', height: '64px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    borderRadius: '16px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '28px', margin: '0 auto 1rem',
  },
  title: { fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' },
  subtitle: { color: '#64748b', fontSize: '14px' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { color: '#475569', fontSize: '13px', fontWeight: 600 },
  input: {
    padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: '12px',
    fontSize: '14px', transition: 'all 0.2s', outline: 'none', background: '#f8fafc',
  },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  button: {
    padding: '14px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px',
    fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', marginTop: '8px',
  },
  error: {
    background: '#fef2f2', color: '#dc2626', padding: '12px', borderRadius: '10px',
    fontSize: '13px', textAlign: 'center',
  },
  footer: {
    textAlign: 'center', marginTop: '1.5rem', color: '#64748b', fontSize: '14px',
  },
  link: { color: '#6366f1', textDecoration: 'none', fontWeight: 600 },
};

const Register = () => {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await register({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        password: form.password
      });
      navigate('/products');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.icon}>✨</div>
          <h1 style={styles.title}>Create Account</h1>
          <p style={styles.subtitle}>Join the AI performance testing platform</p>
        </div>

        <form style={styles.form} onSubmit={handleSubmit}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.row}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>First Name</label>
              <input style={styles.input} value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} required />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Last Name</label>
              <input style={styles.input} value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} required />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input style={styles.input} type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input style={styles.input} type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Confirm Password</label>
            <input style={styles.input} type="password" value={form.confirmPassword} onChange={e => setForm({...form, confirmPassword: e.target.value})} required />
          </div>

          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div style={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
