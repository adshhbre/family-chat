import { useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import AuthPage from './components/AuthPage';
import ChatPage from './components/ChatPage';
import AvatarPicker from './components/AvatarPicker'; // Import the new component
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  // Use a single state object for the current user
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('chat_token');
      if (storedToken) {
        const decodedToken = jwtDecode(storedToken);
        const isExpired = decodedToken.exp * 1000 < Date.now();

        if (isExpired) {
          handleLogout();
        } else {
          // Set the full user object from the token
          setCurrentUser({
            token: storedToken,
            id: decodedToken.id,
            username: decodedToken.username,
            avatar: decodedToken.avatar,
          });
        }
      }
    } catch (error) {
      console.error('Invalid token found:', error);
      handleLogout();
    }
  }, []);

  const handleAuthSuccess = (token, user) => {
    localStorage.setItem('chat_token', token);
    setCurrentUser({ token, ...user });
  };

  const handleLogout = () => {
    localStorage.removeItem('chat_token');
    setCurrentUser(null);
  };
  
  const handleAvatarSelect = async (avatar) => {
    if (!currentUser?.token) return;

    try {
      // Call the backend to save the avatar, which now returns a new token
      const response = await axios.post(
        `${API_URL}/api/user/avatar`,
        { avatar },
        { headers: { Authorization: `Bearer ${currentUser.token}` } }
      );

      const newToken = response.data.token;

      // Save the new token to localStorage
      localStorage.setItem('chat_token', newToken);

      // Update the entire user state with the new token and avatar
      setCurrentUser(prevUser => ({ 
        ...prevUser, 
        avatar: avatar,
        token: newToken 
      }));

    } catch (error) {
      console.error('Failed to update avatar:', error);
      alert(`아바타 업데이트에 실패했습니다: ${error.response?.data?.message || error.message}`);
    }
  };

  // Render logic based on user state
  const renderContent = () => {
    if (!currentUser) {
      // Not logged in -> show AuthPage
      return <AuthPage onAuthSuccess={handleAuthSuccess} />;
    }
    
    if (!currentUser.avatar) {
      // Logged in but no avatar -> show AvatarPicker
      return <AvatarPicker onAvatarSelect={handleAvatarSelect} />;
    }

    // Logged in and has avatar -> show ChatPage
    return (
      <ChatPage
        token={currentUser.token}
        onLogout={handleLogout}
        currentUsername={currentUser.username}
        currentUserAvatar={currentUser.avatar} // Pass avatar down
      />
    );
  };

  return <div className="App">{renderContent()}</div>;
}

export default App;