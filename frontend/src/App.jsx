import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import { PushProvider } from './context/PushContext';

import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

// Lazy-loaded routes for route-level code splitting
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Students = lazy(() => import('./pages/Students'));
const AddStudent = lazy(() => import('./pages/AddStudent'));
const Leaves = lazy(() => import('./pages/Leaves'));
const LeaveRequestForm = lazy(() => import('./pages/LeaveRequestForm'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Announcements = lazy(() => import('./pages/Announcements'));
// const Expenses = lazy(() => import('./pages/Expenses'));
const TrustLeader = lazy(() => import('./pages/TrustLeader'));

import LoadingSpinner from './components/LoadingSpinner';

// Sleek loading spinner fallback for route transitions
const PageLoader = () => <LoadingSpinner label="Loading..." />;

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <PushProvider>
            <Router>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  
                  <Route path="/" element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }>
                    <Route index element={<Dashboard />} />
                    <Route path="students" element={<Students />} />
                    <Route path="students/add" element={
                      <ProtectedRoute allowedRoles={['Admin']}>
                        <AddStudent />
                      </ProtectedRoute>
                    } />
                    <Route path="leaves" element={<Leaves />} />
                    <Route path="leaves/request" element={
                      <ProtectedRoute allowedRoles={['Student', 'Leader']}>
                        <LeaveRequestForm />
                      </ProtectedRoute>
                    } />
                    <Route path="leaves/edit/:id" element={
                      <ProtectedRoute allowedRoles={['Student', 'Leader']}>
                        <LeaveRequestForm />
                      </ProtectedRoute>
                    } />
                    <Route path="tasks" element={<Tasks />} />
                    <Route path="announcements" element={<Announcements />} />
                    {/* 
                    <Route path="expenses" element={
                      <ProtectedRoute allowedRoles={['Admin', 'Leader', 'Trustee', 'Trust Member']}>
                        <Expenses />
                      </ProtectedRoute>
                    } /> 
                    */}
                    <Route path="trust-members" element={
                      <ProtectedRoute allowedRoles={['Admin', 'Leader', 'Trustee', 'Trust Member', 'Student']}>
                        <TrustLeader />
                      </ProtectedRoute>
                    } />
                  </Route>
                </Routes>
              </Suspense>
            </Router>
          </PushProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
