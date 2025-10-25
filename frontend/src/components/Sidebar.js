import React from 'react';

const Sidebar = ({ activeSection, onNavClick }) => {
  const navItems = [
    { id: 'dashboard', icon: 'fas fa-tachometer-alt', label: 'Dashboard' },
    { id: 'prediction', icon: 'fas fa-brain', label: 'Prediksi SLA' },
    { id: 'analytics', icon: 'fas fa-chart-bar', label: 'Analitik & Visualisasi' },
    { id: 'about', icon: 'fas fa-info-circle', label: 'Tentang Aplikasi' },
  ];

  return (
    <nav className="sidebar">
      <div className="logo">
        <h2>SLA Predictor</h2>
        <p>Incident Management System</p>
      </div>
      <ul className="nav-menu">
        {navItems.map((item) => (
          <li key={item.id} className="nav-item">
            <button  // Ganti <a> ke <button> (fix ESLint)
              className={`nav-link ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => onNavClick(item.id)}
              style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}  // Style seperti link
            >
              <i className={item.icon}></i>
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Sidebar;