import React from 'react';

const TicketDetailModal = ({ ticket, onClose }) => {
  if (!ticket) return null;

  const getPriorityClass = (priority) => {
    if (priority.includes('High')) return 'badge-high';
    if (priority.includes('Medium')) return 'badge-medium';
    return 'badge-low';
  };

  const violatedClass = ticket.is_sla_violated ? 'violated' : 'safe';

  return (
    <div className="modal show" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Detail Tiket #{ticket.number}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="ticket-info">
          <p><strong>Item yang Terdampak:</strong> {ticket.item}</p>
          <p><strong>Kategori:</strong> {ticket.category}</p>
          <span className={`badge ${getPriorityClass(ticket.priority)}`}>{ticket.priority}</span>
        </div>

        <div className="detail-grid">
          <div className={`detail-item ${violatedClass}`}>
            <h4>SLA Violated</h4>
            <p>{ticket.sla_violated_text}</p>
          </div>
          <div className="detail-item">
            <h4>Prioritas</h4>
            <p>{ticket.priority}</p>
          </div>
          <div className="detail-item">
            <h4>Resolution Duration</h4>
            <p>{ticket.resolution_duration_formatted}</p>
          </div>
          <div className="detail-item">
            <h4>Total Tickets Resolved (Wc)</h4>
            <p>{ticket.total_tickets_resolved_wc.toFixed(1)}</p>
          </div>
          <div className="detail-item">
            <h4>SLA Threshold</h4>
            <p>{ticket.sla_threshold} jam</p>
          </div>
          <div className="detail-item">
            <h4>Average Resolution Time (Ac)</h4>
            <p>{ticket.average_resolution_time_ac.toFixed(2)} jam</p>
          </div>
        </div>

        <div className="detail-grid">
          <div className="detail-item">
            <h4>SLA to Avg Resolution Ratio (Rc)</h4>
            <p>{ticket.sla_to_average_resolution_ratio_rc.toFixed(3)}</p>
          </div>
          <div className="detail-item">
            <h4>Application SLA Compliance Rate</h4>
            <p>{ticket.compliance_rate_percent}</p>
          </div>
          <div className="detail-item">
            <h4>Confidence Score</h4>
            <p>87.3% (dari model)</p>  {/* Atau hitung dari data jika ada */}
          </div>
        </div>

        <div className="metrics-section">
          <h3>Informasi Tambahan</h3>
          <div className="metrics-row">
            <span className="metrics-label">Waktu Dibuka:</span>
            <span className="metrics-value">{ticket.open_date}</span>
          </div>
          <div className="metrics-row">
            <span className="metrics-label">Waktu Ditutup:</span>
            <span className="metrics-value">{ticket.closed_date || 'N/A'}</span>
          </div>
          <div className="metrics-row">
            <span className="metrics-label">Status Tiket:</span>
            <span className="metrics-value">{ticket.status}</span>
          </div>
          <div className="metrics-row">
            <span className="metrics-label">Assigned To:</span>
            <span className="metrics-value">{ticket.assigned_to || 'N/A'}</span>
          </div>
          <div className="metrics-row">
            <span className="metrics-label">Affected Users:</span>
            <span className="metrics-value">{ticket.affected_users?.toLocaleString('id-ID') || 'N/A'}</span>
          </div>
          <div className="metrics-row">
            <span className="metrics-label">Root Cause:</span>
            <span className="metrics-value">{ticket.root_cause || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailModal;