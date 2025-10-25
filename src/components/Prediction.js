import { useEffect, useState } from 'react';

const Prediction = () => {
  const [formData, setFormData] = useState({
    priority: '',
    category: '',
    sub_category: '',
    item: '',
    open_date: '',
    due_date: '',
  });
  const [uniqueOptions, setUniqueOptions] = useState({ categories: [], items: [], sub_categories: [] });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingUnique, setLoadingUnique] = useState(true);

  // Fallback options
  const fallbackOptions = {
    categories: [
      { value: 'kegagalan proses', label: 'Kegagalan Proses' },
      { value: 'email', label: 'Email' },
      { value: 're-install', label: 'Re-Install' },
      // Tambah sample lain jika perlu
    ],
    items: [
      { value: 'application 332', label: 'Application 332' },
      // Tambah sample
    ],
  };

  // Fetch unique
  useEffect(() => {
    console.log('Fetching unique...');
    setLoadingUnique(true);
    fetch('http://localhost:8000/api/unique-values/')
      .then(res => {
        console.log('Unique status:', res.status);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log('Unique data length:', data.categories?.length || 0);
        setUniqueOptions(data || fallbackOptions);
        setLoadingUnique(false);
      })
      .catch(err => {
        console.error('Unique error:', err);
        setUniqueOptions(fallbackOptions);
        setLoadingUnique(false);
      });
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category || !formData.item || !formData.open_date || !formData.due_date) {
      alert('Lengkapi field wajib!');
      return;
    }
    setLoading(true);
    setResult(null);  // Reset
    try {
      console.log('Submit data:', formData);
      const response = await fetch('http://localhost:8000/api/predict/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      console.log('Predict status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Result data:', data);
        setResult(data);
      } else {
        const errorText = await response.text();
        console.error('Error:', errorText);
        alert('Prediksi gagal: ' + errorText);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingUnique) {
    return (
      <section id="prediction" className="content-section active">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '3rem', color: '#667eea' }}></i>
          <h3>Loading form...</h3>
        </div>
      </section>
    );
  }

  return (
    <section id="prediction" className="content-section active">
      <h3>Prediksi SLA untuk Tiket Baru</h3>
      <form onSubmit={handleSubmit} method="post">
        <div className="form-group">
          <label>Priority:</label>
          <select name="priority" value={formData.priority} onChange={handleInputChange} required>
            <option value="">Pilih Priority</option>
            <option value="4 - Low">Low</option>sub
            <option value="3 - Medium">Medium</option>
            <option value="2 - High">High</option>
            <option value="1 - Critical">Critical</option>
          </select>
        </div>

        <div className="form-group">
          <label>Category:</label>
          <select name="category" value={formData.category} onChange={handleSelectChange} required>
            <option value="">Pilih Category</option>
            {uniqueOptions.categories.map((opt, index) => (
              <option key={index} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Sub Category: (Opsional)</label>
          <select name="sub_category" value={formData.sub_category} onChange={handleSelectChange}>
            <option value="">Pilih Sub Category (jika ada)</option>
            {uniqueOptions.sub_categories && uniqueOptions.sub_categories.map((opt, index) => (
              <option key={index} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Item:</label>
          <select name="item" value={formData.item} onChange={handleSelectChange} required>
            <option value="">Pilih Item</option>
            {uniqueOptions.items.map((opt, index) => (
              <option key={index} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Open Date:</label>
          <input type="datetime-local" name="open_date" value={formData.open_date} onChange={handleInputChange} required />
        </div>

        <div className="form-group">
          <label>Due Date:</label>
          <input type="datetime-local" name="due_date" value={formData.due_date} onChange={handleInputChange} required />
        </div>

        <button type="submit" className="btn" disabled={loading}>
          {loading ? 'Memprediksi...' : 'Prediksi SLA'}
        </button>
      </form>

      {/* SATU Block Result - Tanpa duplikat */}
      {result && result.sla_violated !== undefined && (
      <div key={`result-${result.confidence}`} className={`prediction-result ${result.sla_violated ? 'prediction-violation' : 'prediction-safe'}`}>
        <h3>{result.violation_text} Melanggar SLA</h3>
        <p>Confidence: {result.confidence}%</p>
        <p>Days to Due: {result.days_to_due} hari</p>
        <p>Open Hour: {result.open_hour}</p>
        
        {/* Info Tambahan */}
        <div style={{ marginTop: '15px', fontSize: '0.9rem' }}>
          <h4>Risk Factors:</h4>
      <ul>{result.risk_factors?.map((factor, idx) => <li key={idx}>{factor}</li>) || 'N/A'}</ul>
      
      <h4>Rekomendasi:</h4>
      <p>{result.recommended_actions}</p>
    </div>
  </div>
)}
    </section>
  );
};

export default Prediction;