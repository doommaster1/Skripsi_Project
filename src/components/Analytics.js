import React, { useEffect, useState } from 'react';
import { Bar, Line, Scatter, Pie } from 'react-chartjs-2'; // Import chart types
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, ScatterController, PieController,
  ArcElement, Title, Tooltip, Legend,
} from 'chart.js';

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
          { label: 'Tiket Melanggar SLA', data: apiData.map(d => d.violations), borderColor: 'rgb(239, 68, 68)', backgroundColor: 'rgba(239, 68, 68, 0.5)', tension: 0.1 },
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


  // --- JSX Rendering ---
  return (
    <section id="analytics" className="content-section active">

      {/* Optional: Cluster Cards Grid - Renders summary info */}
      {/* Remove or keep this section based on your preference */}
       <div className="cluster-cards-grid">
         {loading.clusters ? <p>Loading cluster summaries...</p> :
           (clusterAPIData && clusterAPIData.summary_per_cluster ?
             Array.from({ length: clusterAPIData.num_clusters || 0 }).map((_, index) => {
               const clusterId = index.toString();
               const summary = clusterAPIData.summary_per_cluster[clusterId];
               if (!summary) return <p key={clusterId}>Data cluster {clusterId} tidak ditemukan.</p>;
               return (
                  <div key={clusterId} className="cluster-card" style={{ backgroundColor: clusterColors[index % clusterColors.length], color: 'white' /* Ensure text is visible */ }}>
                    <h4>Cluster {clusterId}</h4>
                    <p><strong>Ukuran:</strong> {summary.size || 'N/A'}</p>
                    <p><strong>Prioritas Umum:</strong> {summary.mode_categorical?.Priority || 'N/A'}</p>
                    <p><strong>Item Umum:</strong> {summary.mode_categorical?.Item || 'N/A'}</p>
                    <p><strong>Kategori Umum:</strong> {summary.mode_categorical?.Category || 'N/A'}</p>
                    <p><strong>Avg. Compliance:</strong> {((summary.mean_numerical?.['Application SLA Compliance Rate'] || 0) * 100).toFixed(2)}%</p>
                    <p><strong>Avg. Resolution Time:</strong> {(summary.mean_numerical?.['Average Resolution Time (Ac)'] || 0).toFixed(2)} Jam</p>
                  </div>
               );
             })
             : <p></p>
           )
         }
       </div>


      {/* Chart Grid */}
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

      {/* Error Display */}
      {error && <p style={{ color: 'red', marginTop: '20px', whiteSpace: 'pre-line' }}>Error fetching data: {error}</p>}
    </section>
  );
};

export default Analytics;