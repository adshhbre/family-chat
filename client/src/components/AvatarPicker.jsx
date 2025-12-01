import React, { useState } from 'react';

const avatars = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐲', '🐍', '🐴', '🐐', '🐔'];

const AvatarPicker = ({ onAvatarSelect }) => {
  const [selectedAvatar, setSelectedAvatar] = useState(null);

  const handleSelectClick = () => {
    if (selectedAvatar) {
      onAvatarSelect(selectedAvatar);
    }
  };

  return (
    <div className="avatar-picker-container">
      <h2>대화에서 사용할 대표 동물을 선택하세요.</h2>
      <div className="avatar-grid">
        {avatars.map((avatar, index) => (
          <button
            key={index}
            className={`avatar-item ${selectedAvatar === avatar ? 'selected' : ''}`}
            onClick={() => setSelectedAvatar(avatar)}
          >
            {avatar}
          </button>
        ))}
      </div>
      <button 
        className="select-avatar-btn" 
        onClick={handleSelectClick} 
        disabled={!selectedAvatar}
      >
        선택하기
      </button>
    </div>
  );
};

export default AvatarPicker;