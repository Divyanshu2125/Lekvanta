import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Dashboard from '@/pages/Dashboard';
import Sales from '@/pages/Sales';
import Purchases from '@/pages/Purchases';
import Items from '@/pages/Items';
import Parties from '@/pages/Parties';
import Payments from '@/pages/Payments';
import Expenses from '@/pages/Expenses';
import Accounting from '@/pages/Accounting';
import Reports from '@/pages/Reports';
import GSTReports from '@/pages/GSTReports';
import Settings from '@/pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected App Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="sales/*" element={<Sales />} />
            <Route path="purchases/*" element={<Purchases />} />
            <Route path="items/*" element={<Items />} />
            <Route path="parties/*" element={<Parties />} />
            <Route path="payments/*" element={<Payments />} />
            <Route path="expenses/*" element={<Expenses />} />
            <Route path="accounting/*" element={<Accounting />} />
            <Route path="reports/*" element={<Reports />} />
            <Route path="gst-reports/*" element={<GSTReports />} />
            <Route path="settings/*" element={<Settings />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
