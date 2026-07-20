import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Login from './pages/Login';
import Register from './pages/Register';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import AdminDashboard from './pages/AdminDashboard';
import AdminProducts from './pages/AdminProducts';
import AdminOrders from './pages/AdminOrders';
import AdminSales from './pages/AdminSales';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import AlertDashboard from './pages/AlertDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

const AppStyles = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column'
};

const mainContentStyles = {
  flex: 1,
  paddingTop: '72px'
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div style={AppStyles}>
          <Navbar />
          <div style={mainContentStyles}>
            <Routes>
              <Route path="/" element={<Navigate to="/products" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:slug" element={<ProductDetail />} />
              <Route path="/cart" element={
                <ProtectedRoute><Cart /></ProtectedRoute>
              } />
              <Route path="/checkout" element={
                <ProtectedRoute><Checkout /></ProtectedRoute>
              } />
              <Route path="/orders" element={
                <ProtectedRoute><Orders /></ProtectedRoute>
              } />
              <Route path="/dashboard/alerts" element={
                <AdminRoute><AlertDashboard /></AdminRoute>
              } />
              <Route path="/dashboard/executive" element={<ExecutiveDashboard />} />
              <Route path="/admin" element={
                <AdminRoute><AdminDashboard /></AdminRoute>
              } />
              <Route path="/admin/products" element={
                <AdminRoute><AdminProducts /></AdminRoute>
              } />
              <Route path="/admin/orders" element={
                <AdminRoute><AdminOrders /></AdminRoute>
              } />
              <Route path="/admin/sales" element={
                <AdminRoute><AdminSales /></AdminRoute>
              } />
            </Routes>
          </div>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
