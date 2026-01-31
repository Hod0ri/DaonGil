import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import client from './api/client'
import { GoogleLogin, CredentialResponse } from '@react-oauth/google'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import ProfileSetup from './components/ProfileSetup'
import Logo from './components/Logo'
import Header from './components/Header'
import MyPage from './components/MyPage'
import NaverMap from './components/Map'
import Footer from './components/Footer'
import SearchBar from './components/SearchBar'
import MarkdownPage from './components/MarkdownPage'
import { WebSocketProvider } from './contexts/WebSocketContext'
import { MapProvider } from './contexts/MapContext'
import './App.css'

function App() {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'mypage'>('dashboard');

  const fetchUser = async (token: string) => {
    try {
      const res = await client.get('/api/v1/users/me');
      setUser(res.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser(token);
    } else {
      setLoading(false);
    }
  }, []);

  const handleLoginSuccess = async (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      try {
        const res = await client.post('/api/v1/auth/login/google', {
          credential: credentialResponse.credential
        });
        const token = res.data.access_token;
        localStorage.setItem('token', token);
        fetchUser(token);
      } catch (error) {
        console.error('Login Failed:', error);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setView('dashboard');
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  useEffect(() => {
    document.body.className = `lang-${i18n.language}`;
  }, [i18n.language]);

  const calculateDDay = (dateString: string) => {
    if (!dateString) return null;
    const start = new Date(dateString);
    const now = new Date();
    start.setHours(0,0,0,0);
    now.setHours(0,0,0,0);
    const diffTime = now.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
    return diffDays;
  };

  if (loading) {
    return <div className="App">Loading...</div>;
  }

  const MainContent = () => (
    <div className="app-content">
      {!user ? (
        <>
        <div className="lang-switcher login-lang-switcher">
          <button onClick={() => changeLanguage('ko')} className={i18n.language === 'ko' ? 'active' : ''} title="한국어">
            <img src="https://flagcdn.com/w40/kr.png" alt="Korea" />
          </button>
          <button onClick={() => changeLanguage('en')} className={i18n.language === 'en' ? 'active' : ''} title="English">
            <img src="https://flagcdn.com/w40/us.png" alt="USA" />
          </button>
          <button onClick={() => changeLanguage('ja')} className={i18n.language === 'ja' ? 'active' : ''} title="日本語">
            <img src="https://flagcdn.com/w40/jp.png" alt="Japan" />
          </button>
          <button onClick={() => changeLanguage('es')} className={i18n.language === 'es' ? 'active' : ''} title="Español">
            <img src="https://flagcdn.com/w40/es.png" alt="Spain" />
          </button>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="card auth-card"
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <Logo />
          </div>
          <p>{t('app_subtitle')}</p>
          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={handleLoginSuccess}
              onError={() => {}}
            />
          </div>
        </motion.div>
        </>
      ) : !user.nickname ? (
        <ProfileSetup 
          onProfileComplete={(updatedUser) => setUser(updatedUser)} 
          initialName={user.full_name}
          initialData={user}
        />
      ) : (
        <WebSocketProvider>
          <MapProvider>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="dashboard"
              style={{ width: '100%' }}
            >
              <Header 
                user={user} 
                setView={setView} 
                handleLogout={handleLogout} 
                changeLanguage={changeLanguage}
                currentLang={i18n.language}
              />
              
              {view === 'mypage' ? (
                <MyPage user={user} onUpdateUser={setUser} />
              ) : (
                <div className="card" style={{ maxWidth: '100%', textAlign: 'left', marginTop: '2rem' }}>
                  <div className="dashboard-header">
                    <div className="welcome-container">
                      <h2 className="welcome-title">
                        {t('welcome')}
                        <div className="partner-info">
                          <span>{user.emoji || '🙂'}</span>
                          {user.partner && (
                            <>
                              <span style={{ fontSize: '1rem', color: '#ff6b6b', margin: '0 0.2rem' }}>❤️</span>
                              <span>{user.partner.emoji || '🙂'}</span>
                              <span style={{ fontSize: '1rem', color: '#666', marginLeft: '0.5rem', fontWeight: 'normal' }}>
                                {t('with_partner', { name: user.partner.nickname })}
                              </span>
                            </>
                          )}
                        </div>
                      </h2>
                      <p style={{ color: '#666' }}>{t('app_subtitle')}</p>
                    </div>
                    {user.first_meeting_date ? (
                      <div className="day-counter">
                        Day {calculateDDay(user.first_meeting_date)}
                      </div>
                    ) : !user.partner ? (
                      <div className="no-partner-badge" onClick={() => setView('mypage')}>
                        {t('no_partner_register')}
                      </div>
                    ) : null}
                  </div>
                  
                  <SearchBar />

                  <div style={{ marginTop: '1rem' }}>
                    <NaverMap />
                  </div>
                </div>
              )}
            </motion.div>
          </MapProvider>
        </WebSocketProvider>
      )}
    </div>
  );

  return (
    <Router>
      <div className="App" style={{ justifyContent: 'space-between', paddingBottom: 0 }}>
        <Routes>
          <Route path="/privacy" element={<MarkdownPage filePath="/privacy" titleKey="footer.privacy" />} />
          <Route path="/terms" element={<MarkdownPage filePath="/terms" titleKey="footer.terms" />} />
          <Route path="*" element={<MainContent />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  )
}

export default App
