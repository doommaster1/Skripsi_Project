import { useCallback, useEffect, useState } from 'react';
import TicketDetailModal from './TicketDetailModal';

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_tickets: null,  // Init null, bukan dummy
    violation_count: null,
    compliance_count: null,
    compliance_rate: null,
    // ... tambah fields lain jika pakai
  });
  const [tickets, setTickets] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);  // Loading khusus stats
  const [loadingTickets, setLoadingTickets] = useState(true);  // Loading khusus tickets
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const PAGE_SIZE = 7;  // Sesuai backend

  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState([]);
  const [sortOrder, setSortOrder] = useState('-open_date');

  const debouncedSearch = useCallback(() => {
    // Fetch ulang hanya setelah delay
    setCurrentPage(1);  // Reset page
    // useEffect akan trigger otomatis karena dependency searchTerm
  }, []);

  // Input onChange dengan debounce
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    // Clear timeout sebelumnya & set baru
    if (handleSearchChange.timeoutId) {
      clearTimeout(handleSearchChange.timeoutId);
    }
    handleSearchChange.timeoutId = setTimeout(debouncedSearch, 300);  // Delay 300ms
  };

  // Fetch stats (tetap sama)
  useEffect(() => {
    // Fetch ini hanya untuk mengisi dropdown filter, jalan sekali saja
    console.log('Fetching unique filter values...');
    fetch('http://localhost:8000/api/unique-values/')
      .then(res => {
        if (!res.ok) {
          throw new Error('Gagal mengambil data filter kategori');
        }
        return res.json();
      })
      .then(data => {
        // Endpoint Anda mengembalikan { categories: [], items: [], ... }
        if (data && Array.isArray(data.categories)) {
          setCategories(data.categories); // Simpan daftarnya di state
        }
      })
      .catch(err => {
        console.error('Error fetching unique values:', err);
        // Opsi: Set kategori default jika fetch gagal
        // setCategories([
        //   { value: 'kegagalan proses', label: 'Kegagalan Proses' },
        //   { value: 'application', label: 'Application' },
        // ]);
      });
  }, []);

  useEffect(() => {
    console.log('Fetching stats...');  // Debug start
    setLoadingStats(true);
    fetch('http://localhost:8000/api/stats/')
      .then(res => {
        console.log('Stats response status:', res.status);  // Debug status
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('Stats data received:', data);  // Debug full data
        setStats(data);  // Update state
        setLoadingStats(false);
      })
      .catch(err => {
        console.error('Stats fetch error:', err);  // Log detail error
        setLoadingStats(false);
        alert('Gagal load stats: ' + err.message);
        // Fallback dummy jika gagal (untuk test)
        setStats({
          total_tickets: 49836,
          violation_count: 11107,
          compliance_count: 38729,
          compliance_rate: 77.7,
        });
      });
  }, []);  // Jalankan sekali

  useEffect(() => {
    if (searchTerm.length < 2) return;  // Skip fetch jika <2 char (hindari spam kosong)
    // ... existing fetch code ...
  }, [currentPage, searchTerm, priorityFilter, categoryFilter, sortOrder]);

  // Fetch tickets (dengan params filter, independen dari stats)
  useEffect(() => {
    console.log('Fetching tickets...');  // Debug
    setLoadingTickets(true);
    let url = `http://localhost:8000/api/tickets/?page=${currentPage}&page_size=${PAGE_SIZE}`;
    if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
    if (priorityFilter !== 'all') url += `&priority=${encodeURIComponent(priorityFilter)}`;
    if (categoryFilter !== 'all') url += `&category=${encodeURIComponent(categoryFilter)}`;
    url += `&sort=${sortOrder}`;
    
    console.log('Tickets URL:', url);  // Debug URL
    
    fetch(url)
      .then(res => {
        console.log('Tickets response status:', res.status);  // Debug
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log('Tickets data received:', data);  // Debug
        setTickets(data.results || data);
        setTotalPages(Math.ceil((data.count || 0) / PAGE_SIZE));
        setLoadingTickets(false);
      })
      .catch(err => {
        console.error('Tickets fetch error:', err);
        setLoadingTickets(false);
        alert('Gagal load tickets: ' + err.message);
      });
  }, [currentPage, searchTerm, priorityFilter, categoryFilter, sortOrder]);

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

  // Handler untuk clear filter jika perlu
  const clearFilters = () => {
    setSearchTerm('');
    setPriorityFilter('all');
    setCategoryFilter('all');
    setSortOrder('-open_date');
    setCurrentPage(1);  // Reset ke page 1
  };

  return (
    <section id="dashboard" className="content-section active">
      {/* Stats Cards - Render dengan check null & loadingStats */}
      <div className="stats-grid">
        <div className="stat-card">
          <i className="fas fa-ticket-alt"></i>
          <h3>{loadingStats ? 'Loading...' : (stats.total_tickets ? stats.total_tickets.toLocaleString() : '0')}</h3>
          <p>Total Tiket</p>
        </div>
        <div className="stat-card">
          <i className="fas fa-exclamation-triangle"></i>
          <h3>{loadingStats ? 'Loading...' : (stats.violation_count ? stats.violation_count.toLocaleString() : '0')}</h3>
          <p>Pelanggaran SLA</p>
        </div>
        <div className="stat-card">
          <i className="fas fa-check-circle"></i>
          <h3>{loadingStats ? 'Loading...' : (stats.compliance_count ? stats.compliance_count.toLocaleString() : '0')}</h3>
          <p>Dalam SLA</p>
        </div>
        <div className="stat-card">
          <i className="fas fa-percentage"></i>
          <h3>{loadingStats ? 'Loading...' : (stats.compliance_rate ? stats.compliance_rate + '%' : '0%')}</h3>
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
          style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', flex: 1, minWidth: '200px' }}
        />
        
        <select
          value={priorityFilter}
          onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
          style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
        >
          <option value="all">All Prioritas</option>
          <option value="4 - Low">Low</option>
          <option value="3 - Medium">Medium</option>
          <option value="2 - High">High</option>
          <option value="1 - Critical">Critical</option>
        </select>
        
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
          style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
        >
          <option value="all">All Category</option>
          {categories.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
          {/* Tambah option lain dari CSV unique: df['Category'].unique() */}
        </select>
        
        <select
          value={sortOrder}
          onChange={(e) => { setSortOrder(e.target.value); setCurrentPage(1); }}
          style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
        >
          <option value="-open_date">Waktu Dibuat (Terbaru)</option>
          <option value="open_date">Waktu Dibuat (Terlama)</option>
        </select>
        
        <button className="btn" onClick={clearFilters} style={{ padding: '10px 20px' }}>
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
            <th>Kategori</th>
            <th>Dibuat</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr key={ticket.number}>
              <td>{ticket.number}</td>
              <td>{ticket.item}</td>
              <td><span className={`priority-${ticket.priority.replace(' - ', '-').toLowerCase()}`}>{ticket.priority}</span></td>
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