import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  title?: string;
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, title, onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'white',
      borderRadius: '50px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      padding: '0.8rem 1.5rem',
      zIndex: 3000,
      minWidth: '300px',
      maxWidth: '90vw',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      animation: 'slideDown 0.3s ease-out'
    }}>
      <div style={{ 
        backgroundColor: '#FFD1DC', 
        borderRadius: '50%', 
        width: '32px', 
        height: '32px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexShrink: 0
      }}>
        🔔
      </div>
      <div>
        {title && <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#333' }}>{title}</div>}
        <div style={{ color: '#666', fontSize: '0.85rem' }}>{message}</div>
      </div>
      <style>{`
        @keyframes slideDown {
          from { transform: translate(-50%, -100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Toast;
