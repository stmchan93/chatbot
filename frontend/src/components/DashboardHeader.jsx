import './DashboardHeader.css';

function DashboardHeader({ user, onLogout }) {
  return (
    <div className="dashboard-header">
      <div className="header-content">
        <div className="doctor-info">
          <h1>👨‍⚕️ Doctor Dashboard</h1>
          <p className="doctor-greeting">Dr. {user.name}</p>
          {user.specialty && <p className="doctor-specialty">{user.specialty}</p>}
        </div>
        
        <button onClick={onLogout} className="btn-logout">
          Logout
        </button>
      </div>
    </div>
  );
}

export default DashboardHeader;
