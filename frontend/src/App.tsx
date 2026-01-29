import { useState, useEffect } from 'react'
import axios from 'axios'
import { GoogleLogin, CredentialResponse } from '@react-oauth/google'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import ProfileSetup from './components/ProfileSetup'
import Logo from './components/Logo'
import MyPage from './components/MyPage'
import NaverMap from './components/Map'
import './App.css'

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function App() {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'mypage'>('dashboard');

  const fetchUser = async (token: string) => {
    try {
      const res = await axios.get(`${API_URL}/api/v1/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
        const res = await axios.post(`${API_URL}/api/v1/auth/login/google`, {
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

  return (
    <div className="App">
      {!user ? (
        <>
        <div className="lang-switcher" style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 100 }}>
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
          className="card"
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <Logo />
          </div>
          <p>{t('app_subtitle')}</p>
          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={handleLoginSuccess}
              onError={() => console.log('Login Failed')}
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
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="dashboard"
        >
          <header className="app-header">
            <div 
              style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setView('dashboard')}
            >
              <Logo style={{ height: '40px', width: 'auto' }} />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div 
                className="user-info-pill" 
                onClick={() => setView('mypage')}
                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                title={t('my_profile')}
              >
                <span>{t('greeting', { name: user.nickname })}</span>
              </div>
              
              <div className="lang-switcher-mini">
                <button onClick={() => changeLanguage('ko')} className={i18n.language === 'ko' ? 'active' : ''}>
                  <img src="https://flagcdn.com/w40/kr.png" alt="Korea" />
                </button>
                <button onClick={() => changeLanguage('en')} className={i18n.language === 'en' ? 'active' : ''}>
                  <img src="https://flagcdn.com/w40/us.png" alt="USA" />
                </button>
                <button onClick={() => changeLanguage('ja')} className={i18n.language === 'ja' ? 'active' : ''}>
                  <img src="https://flagcdn.com/w40/jp.png" alt="Japan" />
                </button>
                <button onClick={() => changeLanguage('es')} className={i18n.language === 'es' ? 'active' : ''}>
                  <img src="https://flagcdn.com/w40/es.png" alt="Spain" />
                </button>
              </div>

              <button className="btn-logout" onClick={handleLogout}>
                {t('logout_button')}
              </button>
            </div>
          </header>
          
          {view === 'mypage' ? (
            <MyPage user={user} onUpdateUser={setUser} />
          ) : (
            <div className="card" style={{ maxWidth: '100%', textAlign: 'left', marginTop: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {t('welcome')}
                    <div style={{ display: 'flex', alignItems: 'center', marginLeft: '0.5rem', fontSize: '1.5rem' }}>
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
                  <div style={{ 
                    backgroundColor: '#FFF0F5', 
                    padding: '0.8rem 1.5rem', 
                    borderRadius: '24px', 
                    color: '#d65a7a', 
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 8px rgba(214, 90, 122, 0.2)'
                  }}>
                    Day {calculateDDay(user.first_meeting_date)}
                  </div>
                ) : !user.partner ? (
                  <div style={{
                    backgroundColor: '#f8f9fa',
                    padding: '0.8rem 1.2rem',
                    borderRadius: '12px',
                    color: '#6c757d',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    border: '1px dashed #ced4da',
                    cursor: 'pointer'
                  }} onClick={() => setView('mypage')}>
                    {t('no_partner_register')}
                  </div>
                ) : null}
              </div>
              
              <div style={{ marginTop: '1rem' }}>
                <NaverMap />
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

export default App
