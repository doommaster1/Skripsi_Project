import { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Untuk redirect
import '../styles/Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const togglePassword = () => setShowPassword(!showPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

  // Siapkan payload
    const payload = {
        email: formData.email,
        password: formData.password
    };  

    try {
      const response = await fetch('http://127.0.0.1:8000/api/auth/login/', {  // Allauth URL
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json(); // Ambil response JSON      
      if (response.ok) {
        localStorage.setItem('token', data.key);
      } else {
        sessionStorage.setItem('token', data.key);
      }
      setTimeout(() => navigate('/dashboard'), 1500);
    } 
    catch (err) {
      setError('Error koneksi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-header">
        <div className="login-logo">
          <i className="fas fa-brain"></i>
        </div>
        <h1>SLA Predictor</h1>
        <p>Sistem Prediksi Pelanggaran SLA</p>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        {error && <div className="error-message"><i className="fas fa-exclamation-circle"></i> {error}</div>}
        {success && <div className="success-message"><i className="fas fa-check-circle"></i> {success}</div>}

        <div className="form-group">
          <label htmlFor="email">Email</label> {/* Ubah htmlFor */}
          <div className="input-wrapper">
            <i className="fas fa-user"></i>
            <input
              type="email" // Tipe bisa diubah jadi email untuk validasi
              id="email"   // UBAH INI
              name="email"  // UBAH INI
              value={formData.email} // Sesuaikan
              onChange={handleInputChange}
              placeholder="Masukkan email Anda"
              required
            />
          </div>
        </div>

        <div className="form-group">
            {/* ... (Input password tetap sama, name="password" sudah benar) ... */}
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
                <i className="fas fa-lock"></i>
                <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Masukkan password Anda"
                required
                />
                <i className={`fas fa-eye${showPassword ? '-slash' : ''} password-toggle`} onClick={togglePassword}></i>
            </div>
        </div>

        <div className="remember-me">
          <input
            type="checkbox"
            id="rememberMe"
            name="rememberMe"
            checked={formData.rememberMe}
            onChange={handleInputChange}
          />
          <label htmlFor="rememberMe">Ingat saya</label>
        </div>

        <div className="forgot-password">
          <button type="button" onClick={() => alert('Fitur reset password akan segera tersedia.')}>
            Lupa password?
          </button>
        </div>

        <button type="submit" className="login-btn" disabled={loading}>
          <i className="fas fa-sign-in-alt"></i>
          <span>{loading ? 'Memproses...' : 'Masuk ke Sistem'}</span>
        </button>
      </form>

      <div className="divider">
        <span>Demo Account</span>
      </div>

      <div className="demo-login">
        <h4>Akun Demo untuk Testing</h4>
        <div className="demo-credentials">
          <span><strong>Username:</strong> admin</span>
          <span><strong>Password:</strong> admin123</span>
        </div>
      </div>
    </div>
  );
};

export default Login;