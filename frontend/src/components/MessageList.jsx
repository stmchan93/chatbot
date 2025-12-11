import './MessageList.css';

function MessageList({ messages }) {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatMessageContent = (content, action) => {
    // Check if there's action metadata to display
    if (action && action.type) {
      const actionInfo = formatActionInfo(action);
      if (actionInfo) {
        return (
          <>
            <div className="message-text">{content}</div>
            {actionInfo}
          </>
        );
      }
    }
    
    // Format regular text with line breaks
    return content.split('\n').map((line, i) => (
      <span key={i}>
        {line}
        {i < content.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  const formatActionInfo = (action) => {
    if (!action || !action.data) return null;

    switch (action.type) {
      case 'schedule':
        return (
          <div className="action-card schedule">
            <div className="action-icon">✅</div>
            <div className="action-details">
              <strong>Appointment Scheduled</strong>
              <div className="appointment-details">
                <p>📅 {new Date(action.data.start_time).toLocaleString()}</p>
                <p>⏱️ Duration: {action.data.duration || '30'} minutes</p>
                <p>🩺 Type: {action.data.type}</p>
              </div>
            </div>
          </div>
        );
      
      case 'cancel':
        return (
          <div className="action-card cancel">
            <div className="action-icon">❌</div>
            <div className="action-details">
              <strong>Appointment Cancelled</strong>
              {action.data.id && <p>ID: #{action.data.id}</p>}
            </div>
          </div>
        );
      
      case 'reschedule':
        return (
          <div className="action-card reschedule">
            <div className="action-icon">🔄</div>
            <div className="action-details">
              <strong>Appointment Rescheduled</strong>
              <p>📅 New time: {new Date(action.data.start_time).toLocaleString()}</p>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="message-list">
      {messages.map((msg, index) => (
        <div 
          key={index} 
          className={`message ${msg.role} ${msg.isError ? 'error' : ''}`}
        >
          <div className="message-content">
            {formatMessageContent(msg.content, msg.action)}
          </div>
          <div className="message-time">
            {formatTime(msg.timestamp)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default MessageList;
