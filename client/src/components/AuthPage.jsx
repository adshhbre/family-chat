import React, { useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const AuthPage = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await axios.post(`${API_URL}/api/register`, { username, password });
      alert('회원가입이 완료되었습니다.'); // Give user feedback
      // Switch to login form after successful registration
      setIsLogin(true);
    } catch (err) {
      setError(err.response?.data?.message || '회원가입에 실패했습니다. 관리자에게 문의해주세요.');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await axios.post(`${API_URL}/api/login`, { username, password });
      onAuthSuccess(response.data.token, response.data.user.username);
    } catch (err) {
      setError(err.response?.data?.message || '아이디 또는 비밀번호를 확인해주세요.');
    }
  };

  const handleSubmit = (e) => {
    if (isLogin) {
      handleLogin(e);
    } else {
      handleRegister(e);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>{isLogin ? '로그인' : '회원가입'}</h2>
        <p className="auth-welcome">앱에 오신 것을 환영합니다! 계속하려면 로그인하세요.</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="아이디"
              required
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              required
            />
          </div>

          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="submit-btn">
            {isLogin ? '로그인' : '회원가입'}
          </button>
          <div className="separator">또는</div>
          <button type="button" onClick={() => setIsLogin(!isLogin)} className="toggle-auth-btn">
            {isLogin ? '계정이 없으신가요? 회원가입' : '계정이 있으신가요? 로그인'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
