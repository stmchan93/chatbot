import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

// Hardcoded test users from design doc
const TEST_USERS = {
  patients: [
    { id: 1, name: "John Doe", email: "john@example.com", password: "patient123" },
    { id: 2, name: "Jane Smith", email: "jane@example.com", password: "patient123" },
    { id: 3, name: "Bob Johnson", email: "bob@example.com", password: "patient123" }
  ],
  doctors: [
    { id: 1, name: "Dr. Sarah Williams", email: "sarah@clinic.com", password: "doctor123" },
    { id: 2, name: "Dr. Michael Chen", email: "michael@clinic.com", password: "doctor123" },
    { id: 3, name: "Dr. Emily Rodriguez", email: "emily@clinic.com", password: "doctor123" }
  ]
};

function LoginPage() {
  const [role, setRole] = useState('patient');
  const [selectedUser, setSelectedUser] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const users = role === 'patient' ? TEST_USERS.patients : TEST_USERS.doctors;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!selectedUser || !password) {
      setError('Please select a user and enter password');
      setLoading(false);
      return;
    }

    const user = users.find(u => u.email === selectedUser);
    if (!user) {
      setError('User not found');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: selectedUser,
          password: password,
          role: role
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store token and user info
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Navigate based on role
      if (role === 'patient') {
        navigate('/chat');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>🏥 Doctor Portal</h1>
        <p className="subtitle">Medical Appointment Scheduling</p>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="role">I am a:</label>
            <select 
              id="role"
              value={role} 
              onChange={(e) => {
                setRole(e.target.value);
                setSelectedUser('');
                setError('');
              }}
              className="form-control"
            >
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="user">Select User:</label>
            <select 
              id="user"
              value={selectedUser} 
              onChange={(e) => setSelectedUser(e.target.value)}
              className="form-control"
            >
              <option value="">-- Select a user --</option>
              {users.map(user => (
                <option key={user.email} value={user.email}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-control"
              placeholder={role === 'patient' ? 'patient123' : 'doctor123'}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button 
            type="submit" 
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="test-info">
          <p><strong>Test Passwords:</strong></p>
          <p>Patients: <code>patient123</code></p>
          <p>Doctors: <code>doctor123</code></p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
