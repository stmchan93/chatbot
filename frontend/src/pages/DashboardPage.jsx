import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import DashboardHeader from '../components/DashboardHeader';
import AppointmentModal from '../components/AppointmentModal';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './DashboardPage.css';

// Setup date-fns localizer for react-big-calendar
const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

function DashboardPage() {
  const [appointments, setAppointments] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('week');
  const [date, setDate] = useState(new Date());
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
      navigate('/login');
      return;
    }

    const userData = JSON.parse(userStr);
    if (userData.role !== 'doctor') {
      navigate('/login');
      return;
    }

    setUser(userData);
    fetchAppointments(userData.id);
  }, [navigate]);

  const fetchAppointments = async (doctorId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/doctors/${doctorId}/appointments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch appointments');
      }

      const data = await response.json();
      setAppointments(data.appointments || []);
      
      // Transform appointments to calendar events
      const calendarEvents = (data.appointments || []).map(apt => ({
        id: apt.id,
        title: `${apt.patient_name} - ${apt.type}`,
        start: new Date(apt.start_time),
        end: new Date(apt.end_time),
        resource: apt, // Store full appointment data
      }));
      
      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      alert('Failed to load appointments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEvent = (event) => {
    setSelectedAppointment(event.resource);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedAppointment(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleViewChange = (newView) => {
    setView(newView);
  };

  const handleNavigate = (newDate) => {
    setDate(newDate);
  };

  // Custom event styling
  const eventStyleGetter = (event) => {
    const appointment = event.resource;
    let backgroundColor = '#667eea';
    
    // Color code by appointment type
    switch (appointment.type) {
      case 'consultation':
        backgroundColor = '#667eea';
        break;
      case 'follow-up':
        backgroundColor = '#48bb78';
        break;
      case 'emergency':
        backgroundColor = '#f56565';
        break;
      default:
        backgroundColor = '#667eea';
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: 0.9,
        color: 'white',
        border: '0',
        display: 'block',
      }
    };
  };

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="dashboard-page">
      <DashboardHeader user={user} onLogout={handleLogout} />
      
      <div className="dashboard-container">
        <div className="dashboard-header-controls">
          <h2>My Appointments</h2>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading appointments...</p>
          </div>
        ) : (
          <div className="calendar-wrapper">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 'calc(100vh - 250px)', minHeight: '500px' }}
              view={view}
              date={date}
              onView={handleViewChange}
              onNavigate={handleNavigate}
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventStyleGetter}
              views={['week', 'month']}
              step={30}
              timeslots={2}
              defaultDate={new Date()}
              min={new Date(1970, 0, 1, 8, 0, 0)} // 8 AM
              max={new Date(1970, 0, 1, 17, 0, 0)} // 5 PM
            />
          </div>
        )}

        {appointments.length === 0 && !loading && (
          <div className="no-appointments">
            <p>📅 No appointments scheduled</p>
          </div>
        )}
      </div>

      {showModal && selectedAppointment && (
        <AppointmentModal 
          appointment={selectedAppointment} 
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

export default DashboardPage;
