import { useCallback, useEffect, useState } from 'react';
import TicketDetailModal from './TicketDetailModal';

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_tickets: null,
    violation_count: null,
    compliance_count: null,
    compliance_rate: null,
  });
  const [tickets, setTickets] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const PAGE_SIZE = 7;

  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  // --- BARU: State untuk filter SLA ---
  const [violationFilter, setViolationFilter] = useState('all');
  // --- AKHIR BARU ---
  const [categories, setCategories] = useState([]);
  const [sortOrder, setSortOrder] = useState('-open_date');

  const debouncedSearch = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (handleSearchChange.timeoutId) {
      clearTimeout(handleSearchChange.timeoutId);
    }
    handleSearchChange.timeoutId = setTimeout(debouncedSearch, 300);
  };

  // Fetch unique (untuk dropdown filter)
  useEffect(() => {
    console.log('Fetching unique filter values...');
    fetch('http://localhost:8000/api/unique-values/')
      .then(res => {
        if (!res.ok) throw new Error('Gagal mengambil data filter kategori');
        return res.json();
      })
      .then(data => {
        if (data && Array.isArray(data.categories)) {
          setCategories(data.categories);
        }
      })
      .catch(err => {
        console.error('Error fetching unique values:', err);
      });
  }, []);

  // Fetch stats (DI MODIFIKASI)
  useEffect(() => {
    console.log('Fetching stats...');
    setLoadingStats(true);

    // BARU: Logika pembuatan URL yang lebih baik untuk banyak filter
    const params = new URLSearchParams();
    if (priorityFilter !== 'all') {
      params.append('priority', priorityFilter);
    }
    if (violationFilter !== 'all') {
      params.append('is_sla_violated', violationFilter);
    }
    
    const queryString = params.toString();
    const url = `http://localhost:8000/api/stats/${queryString ? '?' + queryString : ''}`;
    
    console.log('Stats URL:', url); // Debug URL baru

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then(data => {
        console.log('Stats data received:', data);
        setStats(data);
        setLoadingStats(false);
      })
      .catch(err => {
        console.error('Stats fetch error:', err);
        setLoadingStats(false);
        setStats({ // Set fallback agar tidak crash
            total_tickets: 0,
            violation_count: 0,
            compliance_count: 0,
            compliance_rate: 0,
        });
      });
  // BARU: Tambahkan violationFilter sebagai dependency
  }, [priorityFilter, violationFilter]);

  // Fetch tickets (DI MODIFIKASI)
  useEffect(() => {
    console.log('Fetching tickets...');
    setLoadingTickets(true);
    
    // Gunakan URLSearchParams untuk membuat URL
    const params = new URLSearchParams({
      page: currentPage,
      page_size: PAGE_SIZE,
      sort: sortOrder,
    });

    if (searchTerm) {
      params.append('search', searchTerm);
    }
    if (priorityFilter !== 'all') {
      params.append('priority', priorityFilter);
    }
    if (categoryFilter !== 'all') {
      params.append('category', categoryFilter);
    }
    // --- BARU: Tambahkan filter SLA ke query tiket ---
    if (violationFilter !== 'all') {
      params.append('is_sla_violated', violationFilter);
    }
    // --- AKHIR BARU ---

    const url = `http://localhost:8000/api/tickets/?${params.toString()}`;
    console.log('Tickets URL:', url);
    
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log('Tickets data received:', data);
        setTickets(data.results || []); // Fallback ke array kosong
        setTotalPages(Math.ceil((data.count || 0) / PAGE_SIZE));
        setLoadingTickets(false);
      })
      .catch(err => {
        console.error('Tickets fetch error:', err);
        setLoadingTickets(false);
        setTickets([]); // Set ke array kosong jika error
      });
  // BARU: Tambahkan violationFilter sebagai dependency
  }, [currentPage, searchTerm, priorityFilter, categoryFilter, sortOrder, violationFilter]);

  const viewTicketDetail = async (ticketNumber) => {
    setLoadingTickets(true);  
    try {
      const response = await fetch(`http://localhost:8000/api/tickets/${ticketNumber}/`);
      if (response.ok) {
        const data = await response.json();
        setSelectedTicket(data);
        setShowModal(true);
      } else {
        alert('Gagal memuat detail tiket');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error: ' + error.message);
    } finally {
      setLoadingTickets(false);  
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedTicket(null);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Handler untuk clear filter (DI MODIFIKASI)
  const clearFilters = () => {
    setSearchTerm('');
    setPriorityFilter('all');
    setCategoryFilter('all');
    setViolationFilter('all'); // <-- BARU
    setSortOrder('-open_date');
    setCurrentPage(1);
  };
  
  const filterStyles = { 
    padding: '10px', 
    borderRadius: '8px', 
    border: '1px solid #e2e8f0',
    backgroundColor: 'white' // Pastikan background putih
  };

  return (
    <section id="dashboard" className="content-section active">
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <i className="fas fa-ticket-alt"></i>
          <h3>{loadingStats ? '...' : (stats.total_tickets ? stats.total_tickets.toLocaleString() : '0')}</h3>
          <p>Total Tiket</p>
        </div>
        <div className="stat-card">
          <i className="fas fa-exclamation-triangle"></i>
          <h3>{loadingStats ? '...' : (stats.violation_count ? stats.violation_count.toLocaleString() : '0')}</h3>
          <p>Pelanggaran SLA</p>
        </div>
        <div className="stat-card">
          <i className="fas fa-check-circle"></i>
          <h3>{loadingStats ? '...' : (stats.compliance_count ? stats.compliance_count.toLocaleString() : '0')}</h3>
          <p>Dalam SLA</p>
        </div>
        <div className="stat-card">
          <i className="fas fa-percentage"></i>
          <h3>{loadingStats ? '...' : (stats.compliance_rate ? stats.compliance_rate + '%' : '0%')}</h3>
          <p>SLA Compliance</p>
        </div>
      </div>

      {/* UI Filter/Search/Sort */}
      <div style={{ background: 'rgba(255,255,255,0.95)', padding: '20px', borderRadius: '15px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by ID Tiket..."
          value={searchTerm}
          onChange={handleSearchChange}
          style={{ ...filterStyles, flex: 1, minWidth: '200px' }}
        />
        
        <select
          value={priorityFilter}
          onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
          style={filterStyles}
        >
          <option value="all">All Prioritas</option>
          <option value="4 - Low">Low</option>
          <option value="3 - Medium">Medium</option>
          <option value="2 - High">High</option>
          <option value="1 - Critical">Critical</option>
        </select>
        
        {/* --- BARU: Dropdown Filter SLA --- */}
        <select
          value={violationFilter}
          onChange={(e) => { setViolationFilter(e.target.value); setCurrentPage(1); }}
          style={filterStyles}
        >
          <option value="all">All Status SLA</option>
          <option value="true">Melanggar</option>
          <option value="false">Tidak Melanggar</option>
        </select>
        {/* --- AKHIR BARU --- */}

        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
          style={filterStyles}
        >
          <option value="all">All Category</option>
          {categories.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
        
        <select
          value={sortOrder}
          onChange={(e) => { setSortOrder(e.target.value); setCurrentPage(1); }}
          style={filterStyles}
        >
          <option value="-open_date">Waktu Dibuat (Terbaru)</option>
          <option value="open_date">Waktu Dibuat (Terlama)</option>
        </select>
        
        <button className="btn" onClick={clearFilters} style={{ padding: '10px 20px', height: '42px' }}>
          Clear Filters
        </button>
      </div>

      <h3>Daftar Tiket Insiden Terbaru (Halaman {currentPage} dari {totalPages})</h3>
      {loadingTickets && <p>Loading tickets...</p>}  
      <table className="ticket-table">
        <thead>
          <tr>
            <th>ID Tiket</th>
            <th>Item</th>
            <th>Prioritas</th>
            {/* BARU: Tambah kolom Status SLA */}
            <th>Status SLA</th> 
            <th>Kategori</th>
            <th>Dibuat</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {/* Pastikan `tickets` adalah array sebelum mapping */}
          {Array.isArray(tickets) && tickets.map((ticket) => (
            <tr key={ticket.number}>
              <td>{ticket.number}</td>
              <td>{ticket.item}</td>
              <td><span className={`priority-${ticket.priority.replace(' - ', '-').toLowerCase()}`}>{ticket.priority}</span></td>
              {/* BARU: Tampilkan Status SLA */}
              <td>
                <span className={ticket.is_sla_violated ? 'sla-violated' : 'sla-safe'}>
                  {ticket.is_sla_violated ? 'Melanggar' : 'Aman'}
                </span>
              </td>
              <td>{ticket.category}</td>
              <td>{new Date(ticket.open_date).toLocaleString('id-ID')}</td>
              <td><button className="btn" onClick={() => viewTicketDetail(ticket.number)} disabled={loadingTickets}>Detail</button></td> 
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', gap: '10px' }}>
          <button className="btn" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1 || loadingTickets}>
            Previous
          </button>
          <span>Halaman {currentPage} dari {totalPages}</span>
          <button className="btn" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages || loadingTickets}>
            Next
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && <TicketDetailModal ticket={selectedTicket} onClose={closeModal} />}
    </section>
  );
};

export default Dashboard;