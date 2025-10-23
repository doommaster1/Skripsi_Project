import React from 'react';

const About = () => (
  <section id="about" className="content-section active">
    <div className="about-content">
      <h3>Tentang Aplikasi</h3>
      <p>
        Sistem Prediksi Pelanggaran SLA adalah aplikasi web yang dirancang untuk membantu 
        organisasi dalam mengelola tiket insiden dan memprediksi potensi pelanggaran Service Level Agreement (SLA) 
        menggunakan teknologi Machine Learning.
      </p>

      <h3>Tujuan Pengembangan</h3>
      <p>
        Aplikasi ini bertujuan untuk meningkatkan efisiensi manajemen insiden dengan memberikan 
        prediksi dini terhadap tiket yang berpotensi melanggar SLA, sehingga tim IT dapat 
        mengambil tindakan preventif yang tepat waktu.
      </p>

      <h3>Metode yang Digunakan</h3>
      <ul className="feature-list">
        <li><strong>Random Forest</strong> - Algoritma klasifikasi untuk prediksi pelanggaran SLA</li>
        <li><strong>K-Prototypes</strong> - Algoritma clustering untuk pengelompokan insiden</li>
        <li><strong>Interactive Visualization</strong> - Dashboard interaktif dengan Chart.js</li>
        <li><strong>Real-time Analysis</strong> - Analisis data tiket secara real-time</li>
      </ul>

      <h3>Fitur Utama</h3>
      <ul className="feature-list">
        <li>Dashboard interaktif dengan ringkasan status tiket</li>
        <li>Prediksi pelanggaran SLA dengan confidence score</li>
        <li>Visualisasi data komprehensif</li>
        <li>Analitik tingkat pelanggaran per kategori</li>
        <li>Identifikasi fitur penting yang mempengaruhi SLA</li>
      </ul>

      <h3>Pengembang Sistem</h3>
      <p>
        Sistem ini dikembangkan sebagai bagian dari penelitian untuk meningkatkan 
        manajemen layanan IT menggunakan pendekatan Machine Learning dan Business Intelligence.
        Tim pengembang terdiri dari ahli dalam bidang Data Science, Software Engineering, 
        dan IT Service Management.
      </p>

      <h3>Teknologi yang Digunakan</h3>
      <ul className="feature-list">
        <li>Frontend: HTML5, CSS3, JavaScript</li>
        <li>Visualization: Chart.js</li>
        <li>Machine Learning: Python, Scikit-learn</li>
        <li>Database: SQL Server / PostgreSQL</li>
        <li>Framework: Flask / Django (Backend)</li>
      </ul>
    </div>
  </section>
);

export default About;