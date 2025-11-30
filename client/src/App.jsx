import { useState, useEffect } from 'react';
import AuthPage from './components/AuthPage';
import ChatPage from './components/ChatPage';
import './App.css';

function App() {
  const [token, setToken] = useState(null);

  useEffect(() => {
    // Check for a token in localStorage when the app loads
    const storedToken = localStorage.getItem('chat_token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const handleAuthSuccess = (newToken) => {
    localStorage.setItem('chat_token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('chat_token');
    setToken(null);
  };

  return (
    <div className="App">
      {token ? (
        <ChatPage token={token} onLogout={handleLogout} />
      ) : (
        <AuthPage onAuthSuccess={handleAuthSuccess} />
      )}
    </div>
  );
}

export default App;
