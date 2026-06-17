import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

import Login from './Login.jsx'
import StudentHome from './StudentHome.jsx'
import TeacherDashboard from './TeacherDashboard.jsx'
import PeriodicTable from './PeriodicTable.jsx'
import TimeAttack from './TimeAttack.jsx'
import MatchingGame from './MatchingGame.jsx'
import Laboratory from './Laboratory.jsx'
import Achievements from './Achievements.jsx'
import TeacherRoom from './TeacherRoom.jsx'
import StudentRoom from './StudentRoom.jsx'
import AdminDashboard from './AdminDashboard.jsx'
import ArViewer from './ArViewer.jsx'

// ── Change this to your own secret password ──────────────────────────────────
const ADMIN_PASS = 'atomarix-admin-2026';

function App() {
  // Protects routes that require login
  const ProtectedRoute = ({ children }) => {
    const user = sessionStorage.getItem('loggedInUser');
    if (!user) {
      return <Navigate to="/" replace />;
    }
    return children;
  };

  // Protects the admin page with a simple password prompt
  const AdminGuard = ({ children }) => {
    const [unlocked, setUnlocked] = useState(false);
    const [input, setInput] = useState('');
    const [error, setError] = useState(false);

    if (unlocked) return children;

    const handleSubmit = () => {
      if (input === ADMIN_PASS) {
        setUnlocked(true);
      } else {
        setError(true);
        setInput('');
      }
    };

    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f3f0ff' }}>
        <div style={{ background: '#fff', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', textAlign: 'center', width: '320px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔐</div>
          <h2 style={{ margin: '0 0 6px', color: '#1a1a2e' }}>Admin Access</h2>
          <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px' }}>Enter the admin password to continue.</p>
          <input
            type="password"
            value={input}
            onChange={e => { setInput(e.target.value); setError(false); }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Password"
            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: error ? '1.5px solid #e53e3e' : '1.5px solid #e1e1e1', fontSize: '15px', boxSizing: 'border-box', outline: 'none', marginBottom: '8px' }}
          />
          {error && <p style={{ color: '#e53e3e', fontSize: '13px', margin: '0 0 10px' }}>Incorrect password.</p>}
          <button
            onClick={handleSubmit}
            style={{ width: '100%', padding: '11px', borderRadius: '10px', border: 'none', background: '#6e45e2', color: '#fff', fontWeight: '700', fontSize: '15px', cursor: 'pointer', marginTop: '4px' }}
          >
            Unlock
          </button>
        </div>
      </div>
    );
  };

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        {/* Teacher invite link lands here — token is read from the URL by Login.jsx */}
        <Route path="/register" element={<Login />} />

        {/* Public AR viewer — reached by scanning the QR code shown on desktop.
            Intentionally NOT protected: the phone scanning it is a separate,
            unauthenticated browser session and has no logged-in user. */}
        <Route path="/ar-view" element={<ArViewer />} />

        {/* Admin Route — password protected */}
        <Route path="/admin/tokens" element={
          <AdminGuard><AdminDashboard /></AdminGuard>
        } />

        {/* Protected Routes (Only accessible if logged in) */}
        <Route path="/dashboard" element={
          <ProtectedRoute><TeacherDashboard /></ProtectedRoute>
        } />
        
        <Route path="/periodic-table" element={
          <ProtectedRoute><PeriodicTable /></ProtectedRoute>
        } />

        <Route path="/home" element={
          <ProtectedRoute><StudentHome /></ProtectedRoute>
        } />
        
        <Route path="/timeattack" element={
          <ProtectedRoute><TimeAttack /></ProtectedRoute>
        } />
        
        <Route path="/matchinggame" element={
          <ProtectedRoute><MatchingGame /></ProtectedRoute>
        } />
        
        <Route path="/laboratory" element={
          <ProtectedRoute><Laboratory /></ProtectedRoute>
        } />
        
        <Route path="/achievements" element={
          <ProtectedRoute><Achievements /></ProtectedRoute>
        } />

        <Route path="/teacher-room/:roomId" element={
          <ProtectedRoute><TeacherRoom /></ProtectedRoute>
        } />

        <Route path="/student-room/:roomId" element={
          <ProtectedRoute><StudentRoom /></ProtectedRoute>
        } />
      </Routes>
    </Router>
  )
}

export default App
