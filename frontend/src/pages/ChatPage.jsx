import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatHeader from '../components/ChatHeader';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import TypingIndicator from '../components/TypingIndicator';
import './ChatPage.css';

function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
      navigate('/login');
      return;
    }

    const userData = JSON.parse(userStr);
    if (userData.role !== 'patient') {
      navigate('/login');
      return;
    }

    setUser(userData);

    // Generate or retrieve session ID
    let sid = sessionStorage.getItem('chat_session_id');
    if (!sid) {
      sid = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('chat_session_id', sid);
    }
    setSessionId(sid);

    // Load conversation history
    loadChatHistory(sid);
  }, [navigate]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async (sid) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/chat/history/${sid}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        } else {
          // Add welcome message if no history
          setMessages([{
            role: 'assistant',
            content: `Hello! I'm your medical scheduling assistant. I can help you:\n\n• Schedule appointments with our doctors\n• Check doctor availability\n• Get clinic information\n• Cancel or reschedule existing appointments\n\nHow can I help you today?`,
            timestamp: new Date().toISOString()
          }]);
        }
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      // Add welcome message on error
      setMessages([{
        role: 'assistant',
        content: `Hello! I'm your medical scheduling assistant. How can I help you today?`,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const handleSendMessage = async (messageText) => {
    if (!messageText.trim() || !sessionId) return;

    const token = localStorage.getItem('token');
    
    // Add user message to UI
    const userMessage = {
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const response = await fetch('http://localhost:3000/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: messageText,
          session_id: sessionId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      // Add assistant response
      const assistantMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
        action: data.action
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('chat_session_id');
    navigate('/login');
  };

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="chat-page">
      <ChatHeader user={user} onLogout={handleLogout} />
      
      <div className="chat-container">
        <MessageList messages={messages} />
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>
      
      <MessageInput onSend={handleSendMessage} disabled={isTyping} />
    </div>
  );
}

export default ChatPage;
