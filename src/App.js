import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Prediction from './components/Prediction';
import Analytics from './components/Analytics';
import About from './components/About';

const App = () => {
  const [activeSection, setActiveSection] = useState('dashboard');

  const updateSection = (section) => {
    setActiveSection(section);
  };

  const getHeaderData = () => {
    const headers = {
      dashboard: { title: 'Dashboard', description: 'Ringkasan status tiket dan informasi SLA' },
      prediction: { title: 'Prediksi SLA', description: 'Input data tiket untuk prediksi pelanggaran SLA' },
      analytics: { title: 'Analitik & Visualisasi', description: 'Grafik dan analisis data tiket insiden' },
      about: { title: 'Tentang Aplikasi', description: 'Informasi sistem dan metodologi yang digunakan' },
    };
    return headers[activeSection] || headers.dashboard;
  };

  const renderContent = () => {
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

  return (
    <div className="container">
      <Sidebar activeSection={activeSection} onNavClick={updateSection} />
      <main className="main-content">
        <Header title={getHeaderData().title} description={getHeaderData().description} />
        {renderContent()}
      </main>
    </div>
  );
};

export default App;