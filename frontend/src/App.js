import { useState } from 'react';
import { Navigate, BrowserRouter as Router, useLocation } from 'react-router-dom'; // Tambah routing
import About from './components/About';
import Analytics from './components/Analytics';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import Login from './components/Login'; // Import Login
import Prediction from './components/Prediction';
import Sidebar from './components/Sidebar';

const AppContent = () => {
  const location = useLocation();  // Deteksi route
  const [activeSection, setActiveSection] = useState('dashboard');

  const updateSection = (section) => {
    setActiveSection(section);
  };

  // Fungsi untuk data Header (hanya untuk non-login routes)
  const getHeaderData = () => {
    const headers = {
      dashboard: { title: 'Dashboard', description: 'Ringkasan status tiket dan informasi SLA' },
      prediction: { title: 'Prediksi SLA', description: 'Input data tiket untuk prediksi pelanggaran SLA' },
      analytics: { title: 'Analitik & Visualisasi', description: 'Grafik dan analisis data tiket insiden' },
      about: { title: 'Tentang Aplikasi', description: 'Informasi sistem dan metodologi yang digunakan' },
    };
    return headers[activeSection] || headers.dashboard;
  };

  // Fungsi untuk render konten internal (non-login)
  const getContentComponent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard />;
      case 'prediction':
        return <Prediction />;
      case 'analytics':
        return <Analytics />;
      case 'about':
        return <About />;
      default:
        return <Dashboard />;
    }
  };

  // LOGIKA RENDERING UTAMA
  if (location.pathname === '/') {
    // BARIS BARU: Jika di root, redirect ke /login
    return <Navigate to="/login" replace />;
}

  if (location.pathname === '/login') {
    // Route /login: Full-page tanpa layout (sidebar/header/container)
    return (
      <div className="login-page-wrapper" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Login />
      </div>
    );
  }

  // Route normal: Layout dengan sidebar, header, & konten
  return (
    <div className="container">
      <Sidebar activeSection={activeSection} onNavClick={updateSection} />
      <main className="main-content">
        <Header title={getHeaderData().title} description={getHeaderData().description} />
        {getContentComponent()}
      </main>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App