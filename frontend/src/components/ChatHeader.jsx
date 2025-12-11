import './ChatHeader.css';

function ChatHeader({ user, onLogout }) {
  return (
    <div className="chat-header">
      <div className="header-content">
        <div className="clinic-info">
          <h1>🏥 HealthCare Clinic</h1>
          <p className="user-greeting">Welcome, {user.name}</p>
        </div>
        
        <button onClick={onLogout} className="btn-logout">
          Logout
        </button>
      </div>
    </div>
  );
}

export default ChatHeader;
