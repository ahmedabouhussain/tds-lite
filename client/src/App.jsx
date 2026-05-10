import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MasterEvents from './pages/MasterEvents';
import MasterEventForm from './pages/MasterEventForm';
import MasterEventDetail from './pages/MasterEventDetail';
import SubEventForm from './pages/SubEventForm';
import Requests from './pages/Requests';
import Approvals from './pages/Approvals';
import Tickets from './pages/Tickets';
import Allocation from './pages/Allocation';
import Delivery from './pages/Delivery';
import CheckIn from './pages/CheckIn';
import Seating from './pages/Seating';
import Reports from './pages/Reports';
import AccessDenied from './pages/AccessDenied';
import NotFound from './pages/NotFound';

function Protected({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role) && user.role !== 'Admin') return <AccessDenied />;
  return children;
}

export default function App() {
  useEffect(() => {
    const lang = localStorage.getItem('tds_lang') || 'ar';
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, []);
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Protected><Layout /></Protected>}>
            <Route index element={<Dashboard />} />
            <Route path="events" element={<MasterEvents />} />
            <Route path="events/new" element={<Protected roles={['Event Manager']}><MasterEventForm /></Protected>} />
            <Route path="events/:id" element={<MasterEventDetail />} />
            <Route path="events/:id/edit" element={<Protected roles={['Event Manager']}><MasterEventForm /></Protected>} />
            <Route path="events/:masterId/sub-events/new" element={<Protected roles={['Event Manager']}><SubEventForm /></Protected>} />
            <Route path="events/:masterId/sub-events/:id/edit" element={<Protected roles={['Event Manager']}><SubEventForm /></Protected>} />
            <Route path="requests" element={<Requests />} />
            <Route path="approvals" element={<Protected roles={['Approver']}><Approvals /></Protected>} />
            <Route path="tickets" element={<Protected roles={['Ticket Officer','Event Manager']}><Tickets /></Protected>} />
            <Route path="allocation" element={<Protected roles={['Ticket Officer']}><Allocation /></Protected>} />
            <Route path="delivery" element={<Protected roles={['Ticket Officer']}><Delivery /></Protected>} />
            <Route path="checkin" element={<Protected roles={['Gate Scanner','Event Manager']}><CheckIn /></Protected>} />
            <Route path="seating" element={<Seating />} />
            <Route path="reports" element={<Reports />} />
            <Route path="access-denied" element={<AccessDenied />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  );
}
