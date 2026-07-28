import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const style = document.createElement('style');
style.textContent = `
  :root {
    --bg-primary: #f8faff;
    --bg-secondary: #ffffff;
    --bg-tertiary: #f0f2f5;
    --text-primary: #2d3436;
    --text-secondary: #636e72;
    --text-muted: #888;
    --border-color: #eee;
    --modal-bg: rgba(0, 0, 0, 0.4);
    --shadow-color: rgba(0, 0, 0, 0.05);
    --floating-icon-color: #6e45e2;
    --floating-icon-opacity: 0.08;
    --card-bg: #ffffff;
    --input-bg: #fdfdff;
    --danger-color: #e74c3c;
  }

  .dark-mode {
    --bg-primary: #1a1a2e;
    --bg-secondary: #24243e;
    --bg-tertiary: #2d2d4f;
    --text-primary: #f0f2f5;
    --text-secondary: #b2bec3;
    --text-muted: #828fa0;
    --border-color: #3a3a5a;
    --modal-bg: rgba(0, 0, 0, 0.7);
    --shadow-color: rgba(0, 0, 0, 0.2);
    --floating-icon-color: #a29bfe;
    --floating-icon-opacity: 0.1;
    --card-bg: #24243e;
    --input-bg: #1a1a2e;
    --danger-color: #ff6b6b;
  }

  body {
    background-color: var(--bg-primary);
    color: var(--text-primary);
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  /* --- Global Component Theming --- */
  .modal-container {
    background: var(--modal-bg);
  }
  .modal-content {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    box-shadow: 0 10px 30px var(--shadow-color);
  }
  .modal-content h2, .modal-title {
    color: var(--text-primary);
  }
  .modal-content p, .modal-content label {
    color: var(--text-secondary);
  }
  .input-group input, .input-group textarea, .class-code-input, .search-input {
    background: var(--input-bg);
    border-color: var(--border-color);
    color: var(--text-primary);
  }
  .input-group input:focus, .input-group textarea:focus, .class-code-input:focus, .search-input:focus {
    background: var(--bg-secondary);
  }
  .btn-cancel {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }
  .btn-cancel:hover {
    background: var(--border-color);
  }
  .close-modal {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
  }
  .close-modal:hover {
    background: #fff0f0;
    color: var(--danger-color);
  }
  .dark-mode .close-modal:hover {
    background: rgba(255, 107, 107, 0.15);
  }

  /* Specific Component Cards */
  .post-card, .stat-card, .room-card, .leaderboard-card, .classroom-updates-card, .progress-stat-card, .score-stat-card, .controls-section, .table-grid, .start-screen, #gameBoard {
    background: var(--card-bg);
    border-color: var(--border-color);
    box-shadow: 0 4px 15px var(--shadow-color);
  }
  .post-card:hover, .stat-card:hover, .room-card:hover, .leaderboard-card:hover, .classroom-updates-card:hover, .progress-stat-card:hover, .score-stat-card:hover {
     box-shadow: 0 8px 25px var(--shadow-color);
  }
  .post-card h4, .leaderboard-header h3, .updates-header h3, .dashboard-section-header h2 {
    color: var(--text-primary);
  }
  .post-card span, .post-card p, .leaderboard-header p, .dashboard-section-header p {
    color: var(--text-secondary);
  }
  .stat-info p, .score-details span {
    color: var(--text-primary);
  }
  .stat-info h3, .score-details h4 {
    color: var(--text-muted);
  }
  .leaderboard-item, .recent-post-item {
    background: var(--bg-primary);
    border-color: var(--border-color);
    color: var(--text-primary);
  }
  .leaderboard-item .user-col, .recent-post-details h4 {
    color: var(--text-primary);
  }
  .leaderboard-item .rank-col, .post-date {
    color: var(--text-muted);
  }
  .no-updates p, .empty-state p, .empty-state h2 {
    color: var(--text-muted);
  }
  .dark-mode .leaderboard-item.gold { background: rgba(241, 196, 15, 0.1); }
  .dark-mode .leaderboard-item.silver { background: rgba(189, 195, 199, 0.1); }
  .dark-mode .leaderboard-item.bronze { background: rgba(230, 126, 34, 0.1); }
  .dark-mode .leaderboard-item.current-user { background: rgba(110, 69, 226, 0.2); }

  /* Navbar */
  .navbar {
    background: color-mix(in srgb, var(--bg-primary) 75%, transparent);
  }
  .nav-links li {
    color: var(--text-secondary);
  }
  .nav-links li:hover {
    background: var(--bg-tertiary);
  }
  .nav-links li.active {
    background: var(--floating-icon-color-light); /* Assuming a light purple variable */
  }
`;
document.head.appendChild(style);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .catch(error => console.error('ServiceWorker registration failed:', error));
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
