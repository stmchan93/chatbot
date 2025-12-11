# Frontend Implementation Guide - Phase 5

## Overview
The patient chat interface is now complete with a full-featured UI for medical appointment scheduling through an AI chatbot.

## Structure

```
frontend/src/
├── App.jsx                 # Main app with routing
├── App.css                 # Global utility styles
├── index.css               # Base styles and reset
├── main.jsx                # React entry point
├── pages/
│   ├── LoginPage.jsx       # Authentication page
│   ├── LoginPage.css
│   ├── ChatPage.jsx        # Main chat interface
│   └── ChatPage.css
└── components/
    ├── ChatHeader.jsx      # Top bar with clinic name and logout
    ├── ChatHeader.css
    ├── MessageList.jsx     # Displays all messages
    ├── MessageList.css
    ├── MessageInput.jsx    # Text input with send button
    ├── MessageInput.css
    ├── TypingIndicator.jsx # Animated typing indicator
    └── TypingIndicator.css
```

## Key Features Implemented

### 1. Login Page (`LoginPage.jsx`)
- Role selector (Patient/Doctor)
- User dropdown with test accounts
- Password input
- Connects to `/api/auth/login`
- Stores JWT token and user info in localStorage
- Routes to `/chat` for patients, `/dashboard` for doctors

**Test Credentials:**
- Patients: `patient123`
- Doctors: `doctor123`

### 2. Chat Page (`ChatPage.jsx`)
- Protected route (checks authentication)
- Session management with `sessionStorage`
- Loads conversation history on mount
- Auto-scrolls to latest message
- Real-time message sending/receiving
- Integrates all chat components

### 3. Chat Components

**ChatHeader:**
- Displays clinic name and user greeting
- Logout button

**MessageList:**
- Displays user and assistant messages
- Formats timestamps
- Handles action cards (appointments scheduled, cancelled, rescheduled)
- Styled differently for user vs assistant messages
- Error message styling

**MessageInput:**
- Textarea with auto-expand
- Enter key to send (Shift+Enter for new line)
- Send button with icon
- Disabled state during API calls

**TypingIndicator:**
- Animated dots showing assistant is typing
- Shows during API calls

## API Integration

### Authentication
```javascript
POST http://localhost:3000/api/auth/login
Headers: { "Content-Type": "application/json" }
Body: { email, password, role }
Response: { token, user }
```

### Send Message
```javascript
POST http://localhost:3000/api/chat/message
Headers: { 
  "Content-Type": "application/json",
  "Authorization": "Bearer <token>"
}
Body: { message, session_id }
Response: { response, session_id, action }
```

### Get Chat History
```javascript
GET http://localhost:3000/api/chat/history/:sessionId
Headers: { "Authorization": "Bearer <token>" }
Response: { session_id, messages[] }
```

## Styling Approach
- Modern gradient design (purple/blue theme)
- Responsive layout
- Smooth animations and transitions
- Clean, medical-professional aesthetic
- Action cards for appointment confirmations
- Custom scrollbar styling

## State Management
- React hooks (`useState`, `useEffect`, `useRef`)
- localStorage for authentication persistence
- sessionStorage for chat session ID
- No external state management library needed for MVP

## Routing
- `/login` - Authentication page
- `/chat` - Patient chat interface (protected)
- `/dashboard` - Doctor dashboard (placeholder, Phase 6)
- `/` - Redirects to `/login`

## Testing the Application

1. **Start Backend:**
   ```bash
   cd backend && npm run dev
   ```

2. **Start Frontend:**
   ```bash
   cd frontend && npm run dev
   ```

3. **Access Application:**
   - Open http://localhost:5173
   - Login as a patient (e.g., john@example.com / patient123)
   - Try chatting: "I need to see Dr. Sarah Williams tomorrow at 2pm"

## Next Steps (Phase 6)
- Doctor dashboard with calendar view
- react-big-calendar integration
- Appointment viewing and filtering

## Common Issues & Solutions

**API Connection Errors:**
- Ensure backend is running on port 3000
- Check CORS is enabled in backend

**Session Not Persisting:**
- Check browser localStorage and sessionStorage
- Verify JWT token is being stored correctly

**Messages Not Displaying:**
- Check browser console for errors
- Verify API responses in Network tab
- Ensure message format matches expected structure
