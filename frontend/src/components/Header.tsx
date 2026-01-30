import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useMapContext } from '../contexts/MapContext';
import Logo from './Logo';
import { format } from 'date-fns';

interface HeaderProps {
  user: any;
  setView: (view: 'dashboard' | 'mypage') => void;
  handleLogout: () => void;
  changeLanguage: (lang: string) => void;
  currentLang: string;
}

const Header: React.FC<HeaderProps> = ({ 
  user, 
  setView, 
  handleLogout, 
  changeLanguage, 
  currentLang 
}) => {
  const { t } = useTranslation();
  const { notifications, unreadCount, markAsRead, removeNotification } = useWebSocket();
  const { focusPlace } = useMapContext();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleNotificationClick = async (notification: any) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    if (notification.related_id) {
        focusPlace(notification.related_id);
        setView('dashboard');
        setShowNotifications(false);
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await removeNotification(id);
  };

  const safeFormatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return format(date, 'yyyy-MM-dd HH:mm');
    } catch (error) {
      return '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  return (
    <header className="app-header">
      <div 
        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setView('dashboard')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => handleKeyDown(e, () => setView('dashboard'))}
        aria-label={t('header.home', 'Home')}
      >
        <Logo style={{ height: '40px', width: 'auto' }} />
      </div>
      
      <div className="header-right">
        
        {/* Notification Bell */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <div 
            style={{ 
              cursor: 'pointer', 
              padding: '8px', 
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}
            onClick={() => setShowNotifications(!showNotifications)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => handleKeyDown(e, () => setShowNotifications(!showNotifications))}
            aria-label={t('header.notifications', 'Notifications')}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{ color: '#666' }}
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '0',
                right: '0',
                background: '#FF6B6B',
                color: 'white',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{t('notifications.title')}</span>
                  <span className="notification-count">
                    {notifications.length}
                  </span>
                </div>
                <button 
                  className="close-notifications-btn"
                  onClick={() => setShowNotifications(false)}
                  aria-label={t('common.close', 'Close')}
                >
                  ✕
                </button>
              </div>
              
              <div className="notification-list">
                {notifications.length === 0 ? (
                  <div className="notification-empty">
                    {t('notifications.empty')}
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span className="notification-title">
                          {notif.title}
                        </span>
                        <button 
                          onClick={(e) => handleDeleteNotification(e, notif.id)}
                          className="delete-notification-btn"
                          title={t('notifications.delete')}
                        >
                          &times;
                        </button>
                      </div>
                      <div className="notification-message">
                        {notif.message}
                      </div>
                      <div className="notification-date">
                        {safeFormatDate(notif.created_at)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div 
          className="user-info-pill" 
          onClick={() => setView('mypage')}
          style={{ cursor: 'pointer', transition: 'all 0.2s' }}
          title={t('my_profile')}
        >
          <span>{t('greeting', { name: user.nickname })}</span>
        </div>
        
        <div className="lang-switcher-mini">
          <button onClick={() => changeLanguage('ko')} className={currentLang === 'ko' ? 'active' : ''}>
            <img src="https://flagcdn.com/w40/kr.png" alt="Korea" />
          </button>
          <button onClick={() => changeLanguage('en')} className={currentLang === 'en' ? 'active' : ''}>
            <img src="https://flagcdn.com/w40/us.png" alt="USA" />
          </button>
          <button onClick={() => changeLanguage('ja')} className={currentLang === 'ja' ? 'active' : ''}>
            <img src="https://flagcdn.com/w40/jp.png" alt="Japan" />
          </button>
          <button onClick={() => changeLanguage('es')} className={currentLang === 'es' ? 'active' : ''}>
            <img src="https://flagcdn.com/w40/es.png" alt="Spain" />
          </button>
        </div>

        <button className="btn-logout" onClick={handleLogout}>
          {t('logout_button')}
        </button>
      </div>
    </header>
  );
};

export default Header;
