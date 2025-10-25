import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PieController,
  PointElement,
  ScatterController,
  Title, Tooltip,
} from 'chart.js';
import React, { useEffect, useState } from 'react';
import { Bar, Doughnut, Line, Pie, Scatter } from 'react-chartjs-2'; // Import chart types

// Register necessary Chart.js components
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, ScatterController, PieController, ArcElement,
  Title, Tooltip, Legend
);

// Define consistent cluster colors outside the component (optional but helpful)
const clusterColors = [
  'rgba(102, 126, 234, 0.8)', // Cluster 0 - Blueish
  'rgba(72, 187, 120, 0.8)',  // Cluster 1 - Greenish
  'rgba(245, 101, 101, 0.8)', // Cluster 2 - Reddish
  'rgba(246, 173, 85, 0.8)'   // Cluster 3 - Orangish
];
const clusterBorderColors = [ // Optional: for borders if needed
  '#667eea',
  '#48bb78',
  '#f56565',
  '#f6ad55'
];

const Analytics = () => {
  // State for all chart data fetched from API
  const [violationData, setViolationData] = useState(null); // Processed data for violation chart
  const [trendData, setTrendData] = useState(null);       // Processed data for trend chart
  const [importanceData, setImportanceData] = useState(null); // Processed data for importance chart
  const [clusterAPIData, setClusterAPIData] = useState(null); // Holds the RAW API response for /api/clusters/

  // Combined loading and error states
  const [loading, setLoading] = useState({
    violation: true,
    trend: true,
    importance: true,
    clusters: true,
  });
  const [error, setError] = useState(null);

  // Single useEffect to fetch all data on component mount
  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates on unmounted component

    // Helper function to fetch and process data
    const fetchData = async (url, dataSetter, loadingKey, processFunc = null) => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} fetching ${loadingKey}`);
        }
        let data = await response.json();
        // Optional processing step specific to each fetch
        if (processFunc) {
          data = processFunc(data); // Process into ChartJS format
        }
        if (isMounted) {
          dataSetter(data); // Set the processed (or raw for clusters) data
        }
      } catch (err) {
        console.error(`Error fetching ${loadingKey}:`, err);
        if (isMounted) {
          setError(prev => prev ? `${prev}\nFailed to load ${loadingKey}.` : `Failed to load ${loadingKey}.`);
          dataSetter(null); // Set data to null on error
        }
      } finally {
        if (isMounted) {
          setLoading(prev => ({ ...prev, [loadingKey]: false }));
        }
      }
    };

    // --- Define Processing Functions ---

    // Process Violation Data for ChartJS
    const processViolationData = (apiData) => {
        if (!apiData || apiData.length === 0) return null;
        const sortedData = [...apiData].sort((a, b) => b.violation_rate - a.violation_rate);
        return {
            labels: sortedData.map(d => d.category),
            datasets: [{
                label: 'Tingkat Pelanggaran SLA (%)',
                data: sortedData.map(d => d.violation_rate),
                backgroundColor: 'rgba(239, 68, 68, 0.7)',
                borderColor: 'rgba(239, 68, 68, 1)',
                borderWidth: 1,
            }],
            tooltipData: sortedData.map(d => `Total: ${d.total_tickets}`),
        };
    };

    // Process Trend Data for ChartJS
    const processTrendData = (apiData) => {
      if (!apiData || apiData.length === 0) return null;
      return {
        labels: apiData.map(d => d.month),
        datasets: [
          { label: 'Total Tiket Dibuka', data: apiData.map(d => d.total_tickets), borderColor: 'rgb(59, 130, 246)', backgroundColor: 'rgba(59, 130, 246, 0.5)', tension: 0.1 },
          { label: 'Tiket Melanggar SLA', data: apiData.map(d => d.violation), borderColor: 'rgb(239, 68, 68)', backgroundColor: 'rgba(239, 68, 68, 0.5)', tension: 0.1 },
        ],
      };
    };

    // Process Importance Data for ChartJS
    const processImportanceData = (apiData) => {
      if (!apiData || apiData.length === 0) return null;
      const sortedData = [...apiData].sort((a, b) => b.importance - a.importance);
      return {
        labels: sortedData.map(d => d.feature),
        datasets: [{
          label: 'Feature Importance Score',
          data: sortedData.map(d => d.importance),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        }],
      };
    };

    // --- Perform Fetches ---
    fetchData('http://localhost:8000/api/stats/violation-by-category/', setViolationData, 'violation', processViolationData);
    fetchData('http://localhost:8000/api/stats/monthly-trend/', setTrendData, 'trend', processTrendData);
    fetchData('http://localhost:8000/api/stats/feature-importance/', setImportanceData, 'importance', processImportanceData);
    // Fetch raw cluster data, processing will happen using useMemo below
    fetchData('http://localhost:8000/api/clusters/', setClusterAPIData, 'clusters');

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array means this runs only once on mount

  // --- Process Cluster API Data into Chart-Specific Formats using useMemo ---

  const pcaScatterData = React.useMemo(() => {
    if (!clusterAPIData?.pca_scatter?.datasets) return null;
    return {
        datasets: clusterAPIData.pca_scatter.datasets.map((ds, index) => ({
            ...ds,
            backgroundColor: ds.backgroundColor || clusterColors[index % clusterColors.length]
        }))
    };
  }, [clusterAPIData]);

  const meanBarData = React.useMemo(() => {
     // Check if the specific structure for mean_bar exists in the API response
    if (!clusterAPIData?.mean_bar?.datasets) return null;
    return clusterAPIData.mean_bar; // Use the structure directly if backend provides it
  }, [clusterAPIData]);

  const clusterSizePieData = React.useMemo(() => {
    // Check if the specific structure for cluster_size_pie exists
    if (!clusterAPIData?.cluster_size_pie?.datasets) return null;
    return clusterAPIData.cluster_size_pie; // Use the structure directly
  }, [clusterAPIData]);

  // --- Hardcoded Data for Converted Cluster Charts ---

  const clusterComplianceData = {
    labels: ['Cluster 0\n(SIBS Off-Hour)', 'Cluster 1\n(ETP Regular)', 'Cluster 2\n(Network)', 'Cluster 3\n(ETP Morning)'],
    datasets: [{
      label: 'SLA Compliance Rate',
      data: [36.87, 39.24, 20.67, 38.98],
      backgroundColor: clusterColors,
      borderColor: clusterBorderColors,
      borderWidth: 2,
      borderRadius: 8
    }]
  };

  const clusterResolutionData = {
    labels: ['Cluster 0\n(SIBS)', 'Cluster 1\n(ETP)', 'Cluster 2\n(Network)', 'Cluster 3\n(ETP)'],
    datasets: [{
      label: 'Avg Resolution Time (hours)',
      data: [5.74, 5.48, 6.58, 5.47],
      backgroundColor: clusterColors,
      borderColor: clusterBorderColors,
      borderWidth: 2,
      borderRadius: 8
    }]
  };

  const clusterApplicationData = {
    labels: ['SIBS (App 85)', 'ETP (App 97)', 'Network (App 268)', 'ETP Morning (App 97)'],
    datasets: [{
      data: [25, 35, 15, 25],
      backgroundColor: clusterColors,
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };

  const clusterScatterData = {
    datasets: [{
      label: 'Cluster 0 (SIBS)',
      data: [
        {x: 0.10, y: 5.74},
        {x: 0.11, y: 5.65},
        {x: 0.09, y: 5.82}
      ],
      backgroundColor: clusterColors[0],
      borderColor: clusterBorderColors[0],
      pointRadius: 8
    }, {
      label: 'Cluster 1 (ETP Regular)',
      data: [
        {x: 0.13, y: 5.48},
        {x: 0.14, y: 5.42},
        {x: 0.12, y: 5.55}
      ],
      backgroundColor: clusterColors[1],
      borderColor: clusterBorderColors[1],
      pointRadius: 8
    }, {
      label: 'Cluster 2 (Network)',
      data: [
        {x: 0.14, y: 6.58},
        {x: 0.15, y: 6.45},
        {x: 0.13, y: 6.70}
      ],
      backgroundColor: clusterColors[2],
      borderColor: clusterBorderColors[2],
      pointRadius: 8
    }, {
      label: 'Cluster 3 (ETP Morning)',
      data: [
        {x: 0.15, y: 5.47},
        {x: 0.14, y: 5.40},
        {x: 0.16, y: 5.52}
      ],
      backgroundColor: clusterColors[3],
      borderColor: clusterBorderColors[3],
      pointRadius: 8
    }]
  };

  // --- Chart Options Definitions (Using useMemo for stability) ---

  const violationOptions = React.useMemo(() => ({
    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false }, title: { display: true, text: 'Top Kategori: Tingkat Pelanggaran SLA (%)' },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.parsed.x.toFixed(1)}%`,
          footer: (tooltipItems) => {
            const index = tooltipItems[0].dataIndex;
            return violationData?.tooltipData?.[index] || ''; // Access processed data state
          }
        }
      }
    },
    scales: { x: { beginAtZero: true, max: 100, title: { display: true, text: '%' } }, y: { title: { display: true, text: 'Kategori' } } },
  }), [violationData]); // Dependency on violationData because tooltipData is there

  const trendOptions = React.useMemo(() => ({
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'top' }, title: { display: true, text: 'Tren Tiket Dibuka vs Melanggar SLA per Bulan' } },
    scales: { y: { beginAtZero: true, title: { display: true, text: 'Jumlah Tiket' } } },
  }), []);

  const importanceOptions = React.useMemo(() => ({
    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false }, title: { display: true, text: 'Top Faktor Paling Berpengaruh (Model RF)' },
      tooltip: { callbacks: { label: (context) => `Score: ${context.parsed.x.toFixed(3)}` } }
    },
    scales: { x: { beginAtZero: true, title: { display: true, text: 'Importance Score' } }, y: { title: { display: true, text: 'Fitur' } } },
  }), []);

  const pcaScatterOptions = React.useMemo(() => ({
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'top' }, title: {display: true, text: 'Distribusi Cluster (PCA)'}},
    scales: { x: { title: { display: true, text: 'PCA Component 1' } }, y: { title: { display: true, text: 'PCA Component 2' } } },
  }), []);

  const meanBarOptions = React.useMemo(() => ({ // Options for the Mean Bar chart
    indexAxis: 'y', // Horizontal bars
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'top' }, title: { display: true, text: 'Rata-rata Fitur Numerik per Cluster' } },
    scales: { x: { title: { display: true, text: 'Rata-rata Nilai' } }, y: { title: { display: true, text: 'Cluster' } } },
  }), []);

  const pieOptions = React.useMemo(() => ({
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true, position: 'top' }, title: {display: true, text: 'Ukuran Relatif Cluster'} },
  }), []);

  // --- Options for Converted Cluster Charts ---

  const clusterComplianceOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => 'SLA Rate: ' + context.parsed.y.toFixed(2) + '%'
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 50,
        grid: {
          color: 'rgba(0,0,0,0.1)'
        },
        ticks: {
          callback: (value) => value + '%'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  const clusterResolutionOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => 'Avg Time: ' + context.parsed.y.toFixed(2) + ' hours'
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 8,
        grid: {
          color: 'rgba(0,0,0,0.1)'
        },
        ticks: {
          callback: (value) => value + 'h'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  const clusterApplicationOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          usePointStyle: true
        }
      }
    }
  };

  const clusterScatterOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 15
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Days to Due',
          font: {
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(0,0,0,0.1)'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Avg Resolution Time (hours)',
          font: {
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(0,0,0,0.1)'
        }
      }
    }
  };

  // --- JSX Rendering ---
  return (
    <section id="analytics" className="content-section active">
      {/* Existing Chart Grid */}
      <div className="chart-grid">
        {/* Violation Chart */}
        <div className="chart-container" style={{height: '400px'}}>
          <h4>Pelanggaran per Kategori</h4>
          {loading.violation ? <p>Loading...</p> : (violationData ? <Bar options={violationOptions} data={violationData} /> : <p>Data tidak tersedia.</p>)}
        </div>
        {/* Trend Chart */}
        <div className="chart-container" style={{height: '400px'}}>
          <h4>Tren Bulanan</h4>
          {loading.trend ? <p>Loading...</p> : (trendData ? <Line options={trendOptions} data={trendData} /> : <p>Data tidak tersedia.</p>)}
        </div>
        {/* Importance Chart */}
        <div className="chart-container" style={{height: '400px'}}>
          <h4>Fitur Penting RF</h4>
          {loading.importance ? <p>Loading...</p> : (importanceData ? <Bar options={importanceOptions} data={importanceData} /> : <p>Data tidak tersedia.</p>)}
        </div>
        {/* PCA Scatter Chart */}
        <div className="chart-container" style={{height: '400px'}}>
          <h4>Distribusi Cluster (PCA Scatter)</h4>
          {loading.clusters ? <p>Loading...</p> : (pcaScatterData ? <Scatter options={pcaScatterOptions} data={pcaScatterData} /> : <p>Data PCA tidak tersedia.</p>)}
        </div>
        {/* Mean Bar Chart */}
        <div className="chart-container" style={{height: '400px'}}>
           <h4>Rata-rata Fitur Numerik per Cluster</h4>
           {loading.clusters ? <p>Loading...</p> : (meanBarData ? <Bar options={meanBarOptions} data={meanBarData} /> : <p>Data Rata-rata Fitur tidak tersedia.</p>)}
        </div>
         {/* Cluster Size Pie Chart */}
        <div className="chart-container" style={{height: '400px'}}>
          <h4>Ukuran Relatif Cluster (Pie)</h4>
          {loading.clusters ? <p>Loading...</p> : (clusterSizePieData ? <Pie options={pieOptions} data={clusterSizePieData} /> : <p>Data Ukuran Cluster tidak tersedia.</p>)}
        </div>
      </div>

      {/* Converted Cluster Charts Grid */}
      <div className="chart-grid">
        <div className="chart-container">
          <h4>Perbandingan SLA Compliance Rate per Cluster</h4>
          <div style={{position: 'relative', height: '300px'}}>
            <Bar data={clusterComplianceData} options={clusterComplianceOptions} />
          </div>
        </div>
        
        <div className="chart-container">
          <h4>Average Resolution Time per Cluster</h4>
          <div style={{position: 'relative', height: '300px'}}>
            <Bar data={clusterResolutionData} options={clusterResolutionOptions} />
          </div>
        </div>

        <div className="chart-container">
          <h4>Distribusi Aplikasi Dominan per Cluster</h4>
          <div style={{position: 'relative', height: '300px'}}>
            <Doughnut data={clusterApplicationData} options={clusterApplicationOptions} />
          </div>
        </div>

        <div className="chart-container">
          <h4>Days to Due vs Resolution Time</h4>
          <div style={{position: 'relative', height: '300px'}}>
            <Scatter data={clusterScatterData} options={clusterScatterOptions} />
          </div>
        </div>
      </div>
      {/* Converted Cluster Details Cards - Hardcoded */}
      <div className="cluster-cards-grid">
        <div className="cluster-card" style={{background: 'linear-gradient(135deg, #667eea, #764ba2)'}}>
          <h4>🔹 Cluster 0: SIBS Off-Hour</h4>
          <p><strong>Aplikasi:</strong> SIBS (App 85)</p>
          <p><strong>SLA Rate:</strong> 36.9%</p>
          <p><strong>Resolusi:</strong> 5.74 jam</p>
          <p><strong>Waktu:</strong> Sabtu → Jumat</p>
          <p style={{fontSize: '0.9rem', opacity: 0.9, marginTop: '10px'}}>Tiket sistem perbankan di luar jam kerja dengan respon cepat</p>
        </div>

        <div className="cluster-card" style={{background: 'linear-gradient(135deg, #48bb78, #38a169)'}}>
          <h4>🔹 Cluster 1: ETP Regular</h4>
          <p><strong>Aplikasi:</strong> ETP (App 97)</p>
          <p><strong>SLA Rate:</strong> 39.2%</p>
          <p><strong>Resolusi:</strong> 5.48 jam</p>
          <p><strong>Waktu:</strong> Senin → Senin</p>
          <p style={{fontSize: '0.9rem', opacity: 0.9, marginTop: '10px'}}>Tiket reguler jam kerja dengan kinerja stabil dan efisien</p>
        </div>

        <div className="cluster-card" style={{background: 'linear-gradient(135deg, #f56565, #c53030)'}}>
          <h4>🔹 Cluster 2: Network Problem</h4>
          <p><strong>Aplikasi:</strong> Network (App 268)</p>
          <p><strong>SLA Rate:</strong> 20.7% ⚠️</p>
          <p><strong>Resolusi:</strong> 6.58 jam</p>
          <p><strong>Waktu:</strong> Selasa → Selasa</p>
          <p style={{fontSize: '0.9rem', opacity: 0.9, marginTop: '10px'}}>SLA terburuk - perlu fokus perbaikan dan eskalasi</p>
        </div>

        <div className="cluster-card" style={{background: 'linear-gradient(135deg, #f6ad55, #ed8936)'}}>
          <h4>🔹 Cluster 3: ETP Morning</h4>
          <p><strong>Aplikasi:</strong> ETP (App 97)</p>
          <p><strong>SLA Rate:</strong> 39.0%</p>
          <p><strong>Resolusi:</strong> 5.47 jam</p>
          <p><strong>Waktu:</strong> Senin pagi (10:00)</p>
          <p style={{fontSize: '0.9rem', opacity: 0.9, marginTop: '10px'}}>Efisiensi tinggi pada awal shift kerja</p>
        </div>
      </div>
      {/* Converted Clustering Insights */}
      <div style={{marginTop: '30px', padding: '25px', background: 'rgba(255,255,255,0.95)', borderRadius: '15px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)'}}>
        <h4 style={{color: '#2d3748', marginBottom: '15px'}}>🧭 Insight Clustering K-Prototypes:</h4>
        <ul style={{color: '#4a5568', lineHeight: '1.8'}}>
          <li><strong>SKOR SILHOUETTE MODEL FINAL (k=4)</strong> 0.3812</li>
          <li><strong>Gamma yang digunakan</strong> 0.5000</li>
          <li><strong>Best Practice:</strong> Cluster 1 dan 3 (ETP) menunjukkan pola operasional paling efisien, terutama pada jam kerja normal dan pagi hari - bisa dijadikan benchmark.</li>
          <li><strong>Off-Hour Pattern:</strong> Cluster 0 (SIBS) menunjukkan respon cepat di luar jam kerja untuk sistem perbankan kritikal, meski SLA compliance masih bisa ditingkatkan.</li>
          <li><strong>Pola Waktu:</strong> Terdapat korelasi antara waktu pembuatan tiket dan kinerja SLA - tiket yang dibuat pagi hari cenderung diselesaikan lebih cepat.</li>
          <li><strong>Rekomendasi:</strong> Fokuskan resource tambahan untuk Network Application (Cluster 2) dan optimalkan proses handling di kategori ini untuk meningkatkan SLA compliance.</li>
        </ul>
      </div>

      {/* Error Display */}
      {error && <p style={{ color: 'red', marginTop: '20px', whiteSpace: 'pre-line' }}>Error fetching data: {error}</p>}
    </section>
  );
};

export default Analytics;