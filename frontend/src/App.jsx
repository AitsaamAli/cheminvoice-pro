import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import axios from 'axios';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import InvoiceForm from './components/InvoiceForm';
import PDFPreview from './components/PDFPreview';
import CustomersPage from './pages/CustomersPage';
import ProductsPage from './pages/ProductsPage';
import SettingsPage from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';
import CustomerPortalLogin from './pages/CustomerPortalLogin';
import CustomerDashboard from './pages/CustomerDashboard';
import CustomerLedgerPage from './pages/CustomerLedgerPage';
import QuotationsPage from './pages/QuotationsPage';
import LandingPage from './pages/LandingPage';
import AdminPanel from './pages/AdminPanel';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/refresh`, { refreshToken });
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          error.config.headers.Authorization = `Bearer ${data.accessToken}`;
          return API(error.config);
        } catch (e) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('accessToken');
  return token ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const token = localStorage.getItem('accessToken');
  if (!token) return <Navigate to="/login" />;
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user.role === 'SUPERADMIN' ? children : <Navigate to="/" />;
}

function UserRoute({ children }) {
  const token = localStorage.getItem('accessToken');
  if (!token) return <Navigate to="/login" />;
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.role === 'SUPERADMIN') return <Navigate to="/admin" />;
  return children;
}

function CustomerProtectedRoute({ children }) {
  const token = localStorage.getItem('customerToken');
  return token ? children : <Navigate to="/customer-portal" />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <UserRoute>
              <Dashboard />
            </UserRoute>
          }
        />
        <Route
          path="/invoices/create"
          element={
            <UserRoute>
              <InvoiceForm />
            </UserRoute>
          }
        />
        <Route
          path="/invoices/:id/pdf"
          element={
            <UserRoute>
              <PDFPreview />
            </UserRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <UserRoute>
              <CustomersPage />
            </UserRoute>
          }
        />
        <Route
          path="/products"
          element={
            <UserRoute>
              <ProductsPage />
            </UserRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <UserRoute>
              <ReportsPage />
            </UserRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <UserRoute>
              <SettingsPage />
            </UserRoute>
          }
        />
        <Route
          path="/customers/:customerId/ledger"
          element={
            <UserRoute>
              <CustomerLedgerPage />
            </UserRoute>
          }
        />
        <Route
          path="/quotations"
          element={
            <UserRoute>
              <QuotationsPage />
            </UserRoute>
          }
        />
        <Route path="/landing" element={<LandingPage />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          }
        />
        <Route path="/customer-portal" element={<CustomerPortalLogin />} />
        <Route
          path="/customer-dashboard"
          element={
            <CustomerProtectedRoute>
              <CustomerDashboard />
            </CustomerProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export { API };
