import { format } from 'date-fns';
import './AppointmentModal.css';

function AppointmentModal({ appointment, onClose }) {
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return format(date, 'EEEE, MMMM d, yyyy \'at\' h:mm a');
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return format(date, 'h:mm a');
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'consultation':
        return '#667eea';
      case 'follow-up':
        return '#48bb78';
      case 'emergency':
        return '#f56565';
      default:
        return '#667eea';
    }
  };

  const getTypeLabel = (type) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Appointment Details</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="appointment-section">
            <div className="section-icon">👤</div>
            <div className="section-content">
              <h3>Patient Information</h3>
              <p className="patient-name">{appointment.patient_name}</p>
              <p className="patient-contact">
                <span>📧 {appointment.patient_email}</span>
                <span>📱 {appointment.patient_phone}</span>
              </p>
            </div>
          </div>

          <div className="appointment-section">
            <div className="section-icon">📅</div>
            <div className="section-content">
              <h3>Date & Time</h3>
              <p className="datetime">{formatDateTime(appointment.start_time)}</p>
              <p className="duration">
                Duration: {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
              </p>
            </div>
          </div>

          <div className="appointment-section">
            <div className="section-icon">🏥</div>
            <div className="section-content">
              <h3>Appointment Type</h3>
              <span 
                className="type-badge"
                style={{ backgroundColor: getTypeColor(appointment.type) }}
              >
                {getTypeLabel(appointment.type)}
              </span>
            </div>
          </div>

          {appointment.conversation_summary && (
            <div className="appointment-section">
              <div className="section-icon">📝</div>
              <div className="section-content">
                <h3>Visit Reason</h3>
                <p className="summary">{appointment.conversation_summary}</p>
              </div>
            </div>
          )}

          <div className="appointment-section">
            <div className="section-icon">ℹ️</div>
            <div className="section-content">
              <h3>Status</h3>
              <span className={`status-badge ${appointment.status}`}>
                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
              </span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-close" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default AppointmentModal;
