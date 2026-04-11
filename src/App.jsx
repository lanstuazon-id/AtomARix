import React from 'react'
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

function App() {
  // A simple wrapper to protect routes that require login
  const ProtectedRoute = ({ children }) => {
    const user = sessionStorage.getItem('loggedInUser');
    if (!user) {
      return <Navigate to="/" replace />;
    }
    return children;
  };

  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/" element={<Login />} />

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
