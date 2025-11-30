import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const ChatPage = ({ token, onLogout }) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  // Effect for scrolling to the bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Effect for socket connection and message fetching
  useEffect(() => {
    // 1. Fetch initial messages
    const fetchMessages = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/messages`, {
          headers: { Authorization: `Bearer ${token}` }, // Assuming protected route
        });
        setMessages(response.data);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    };

    fetchMessages();

    // 2. Establish Socket.IO connection
    const newSocket = io(API_URL, {
      auth: {
        token: token,
      },
    });

    newSocket.on('connect', () => {
      console.log('Connected to socket server!');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from socket server.');
    });

    newSocket.on('newMessage', (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });
    
    newSocket.on('error', (error) => {
        console.error('Socket error:', error);
        alert(`Authentication Error: ${error}`);
        onLogout(); // Force logout on auth error
    });


    setSocket(newSocket);

    // 3. Cleanup on component unmount
    return () => {
      newSocket.disconnect();
    };
  }, [token, onLogout]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (socket && newMessage.trim()) {
      socket.emit('sendMessage', newMessage);
      setNewMessage('');
    }
  };
  
  const formatTimestamp = (timestamp) => {
      if (!timestamp) return '...';
      return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>Family Chat</h2>
        <button onClick={onLogout} className="logout-button">Logout</button>
      </div>
      <div className="messages-area">
        {messages.map((msg) => (
          <div key={msg.id} className="message">
            <span className="username">{msg.username}:</span>
            <span className="content">{msg.message}</span>
            <span className="timestamp">{formatTimestamp(msg.timestamp)}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="message-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default ChatPage;
