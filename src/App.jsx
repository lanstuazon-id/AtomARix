import React, { useState, createContext, useContext, useEffect } from 'react'
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

export const ThemeContext = createContext(null);

const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

    useEffect(() => {
        document.body.className = '';
        document.body.classList.add(`${theme}-mode`);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};

function App() {
  // Protects routes that require login
  const ProtectedRoute = ({ children }) => {
    const user = sessionStorage.getItem('loggedInUser');
    if (!user) {
      return <Navigate to="/" replace />;
    }
    return children;
  };

  // Protects the admin page 
  const AdminGuard = ({ children }) => {
    const role = sessionStorage.getItem('userRole');
    if (role === 'admin') return children;
    return <Navigate to="/" replace />;
  };

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Login />} />
          {/* Teacher invite link lands here — token is read from the URL by Login.jsx */}
          <Route path="/register" element={<Login />} />
          {/* Student classroom invite link */}
          <Route path="/join" element={<Login />} />

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
    </ThemeProvider>
  )
}

export default App
