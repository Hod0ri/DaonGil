import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

interface MyPageProps {
  user: any;
  onUpdateUser: (updatedUser: any) => void;
}

const MyPage: React.FC<MyPageProps> = ({ user, onUpdateUser }) => {
  const { t } = useTranslation();
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState(user.nickname);
  const [partnerCode, setPartnerCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState('');

  // Disconnect modal state
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [disconnectInput, setDisconnectInput] = useState('');
  const [isAgreed, setIsAgreed] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSaveSuccessModal, setShowSaveSuccessModal] = useState(false);
  const [showDisconnectSuccessModal, setShowDisconnectSuccessModal] = useState(false);
  
  // Couple Stats
  const [coupleStats, setCoupleStats] = useState<{ places: number; memories: number; images: number } | null>(null);

  // Partner Settings State
  const [firstMeetingDate, setFirstMeetingDate] = useState<Date | null>(null);
  const [myEmoji, setMyEmoji] = useState(user.emoji || '🙂');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCoupleSetupModal, setShowCoupleSetupModal] = useState(false);

  const EMOJI_LIST = ["😀", "😃", "😄", "😆", "😅", "😂", "🥰", "😍", "😘", "🤪", "😎", "🤩", "🥳", "🥺", "😭", "😤", "👻", "👽", "💩", "🤖", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "👧", "👦", "👩", "👨", "👵", "👴"];

  // Update local state when user prop changes
  useEffect(() => {
    setNewNickname(user.nickname);
    setMyEmoji(user.emoji || '🙂');
    if (user.first_meeting_date) {
      setFirstMeetingDate(new Date(user.first_meeting_date));
    } else {
      setFirstMeetingDate(null);
    }
  }, [user]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(user.personal_code);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleUpdateNickname = async () => {
    if (!newNickname.trim()) return;
    
    setLoading(true);
    try {
      const res = await client.patch('/api/v1/users/me', { nickname: newNickname });
      onUpdateUser(res.data);
      setIsEditingNickname(false);
    } catch (err) {
      console.error('Failed to update nickname', err);
      setError('Failed to update nickname');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerCode.trim()) return;

    setLoading(true);
    setError('');
    try {
      const res = await client.patch('/api/v1/users/me', { partner_code: partnerCode });
      onUpdateUser(res.data);
      setPartnerCode('');
      setShowCoupleSetupModal(true); // Trigger setup modal
    } catch (err: any) {
      console.error('Failed to connect partner', err);
      if (err.response?.status === 404) {
        setError(t('partner_code_desc'));
      } else {
        setError('Failed to connect partner');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectClick = () => {
    setShowConfirmModal(true);
  };


  const handleConfirmYes = async () => {
    setShowConfirmModal(false);
    
    // Fetch stats before showing modal
    try {
        const res = await client.get('/api/v1/users/couple-stats');
        setCoupleStats(res.data);
    } catch (err) {
        console.error("Failed to fetch couple stats", err);
    }
    
    setShowDisconnectModal(true);
    setDisconnectInput('');
    setIsAgreed(false);
  };

  const handleDisconnectConfirm = async () => {

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await client.post('/api/v1/users/disconnect', {});
      
      // Refresh user data to clear partner info
      const res = await client.get('/api/v1/users/me');
      onUpdateUser(res.data);
      setShowDisconnectModal(false);
      setShowDisconnectSuccessModal(true);
    } catch (err) {
      console.error('Failed to disconnect', err);
      setError(t('error_disconnect_partner'));
    } finally {
      setLoading(false);
    }
  };

  const handleSavePartnerSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const payload: any = {
        emoji: myEmoji
      };
      if (firstMeetingDate) {
        // Format as YYYY-MM-DD
        const offset = firstMeetingDate.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(firstMeetingDate.getTime() - offset)).toISOString().slice(0, 10);
        payload.first_meeting_date = localISOTime;
      }
      
      const res = await client.patch('/api/v1/users/me', payload);
      onUpdateUser(res.data);
      if (showCoupleSetupModal) {
        setShowCoupleSetupModal(false);
      }
      setShowSaveSuccessModal(true);
    } catch (err) {
      console.error(err);
      setError('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (user.partner) {
      alert(t('error_disconnect_first'));
      return;
    }

    if (!window.confirm(t('confirm_delete_account'))) {
      return;
    }

    // 2nd Confirmation
    if (!window.confirm(t('confirm_delete_account_final'))) {
      return;
    }

    setLoading(true);
    try {
      await client.delete('/api/v1/users/me');
      localStorage.removeItem('token');
      window.location.href = '/'; 
    } catch (err) {
      console.error('Failed to delete account', err);
      setError(t('error_delete_account'));
      setLoading(false);
    }
  };

  return (
    <>
      {showConfirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '400px', width: '90%', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--color-text)' }}>
              {t('disconnect_confirm')}
            </h3>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                className="btn-secondary" 
                onClick={() => setShowConfirmModal(false)}
              >
                {t('cancel')}
              </button>
              <button 
                className="btn-primary" 
                style={{ backgroundColor: '#e74c3c', borderColor: '#e74c3c' }}
                onClick={handleConfirmYes}
              >
                {t('disconnect_partner')}
              </button>
            </div>
          </div>
        </div>
      )}

      <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
      style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'left' }}
    >
      <h2 style={{ borderBottom: '2px solid var(--color-primary-dark)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
        {t('mypage_title')}
      </h2>

      {/* 내 프로필 섹션 */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', color: 'var(--color-text)', marginBottom: '1rem' }}>{t('my_profile')}</h3>
        
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label>{t('nickname')}</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {isEditingNickname ? (
              <>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newNickname}
                  onChange={(e) => setNewNickname(e.target.value)}
                />
                <button className="btn-primary" onClick={handleUpdateNickname} disabled={loading} style={{ padding: '0.5rem 1rem' }}>
                  {t('save')}
                </button>
                <button className="btn-secondary" onClick={() => setIsEditingNickname(false)} style={{ padding: '0.5rem 1rem' }}>
                  {t('cancel')}
                </button>
              </>
            ) : (
              <>
                <div className="form-input" style={{ backgroundColor: '#f9f9f9', border: '1px solid #eee' }}>
                  {user.nickname}
                </div>
                <button className="btn-secondary" onClick={() => setIsEditingNickname(true)} style={{ padding: '0.5rem 1rem', whiteSpace: 'nowrap' }}>
                  {t('edit_nickname')}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="form-group">
          <label>{t('my_code')}</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div 
              style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                letterSpacing: '2px', 
                color: 'var(--color-primary-dark)',
                padding: '0.5rem 0'
              }}
            >
              {user.personal_code}
            </div>
            <button 
              onClick={handleCopyCode}
              style={{
                background: 'none',
                border: '1px solid #ddd',
                borderRadius: '20px',
                padding: '4px 12px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                color: 'var(--color-text-light)'
              }}
            >
              {copySuccess ? t('copied') : t('copy_code')}
            </button>
          </div>
        </div>
      </section>

      {/* 짝꿍 정보 섹션 */}
      <section>
        <h3 style={{ fontSize: '1.2rem', color: 'var(--color-text)', marginBottom: '1rem' }}>{t('partner_info')}</h3>
        
        {user.partner ? (
          <div style={{ 
            background: '#FFF0F5', 
            padding: '1.5rem', 
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ 
                width: '50px', 
                height: '50px', 
                borderRadius: '50%', 
                backgroundColor: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem'
              }}>
                {user.partner.gender === 'M' ? '👦' : '👧'}
              </div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{user.partner.nickname}</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--color-text-light)' }}>
                  {user.partner.birthdate} ({user.partner.gender === 'M' ? t('gender_male') : t('gender_female')})
                </div>
              </div>
            </div>
            
            <button 
              onClick={handleDisconnectClick}
              style={{
                background: '#fff',
                border: '1px solid #ffb7c5',
                color: '#d65a7a',
                padding: '8px 16px',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'all 0.2s'
              }}
            >
              {t('disconnect_partner')}
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', background: '#f9f9f9', borderRadius: '16px' }}>
            <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-light)' }}>{t('no_partner')}</p>
            
            <form onSubmit={handleConnectPartner} style={{ display: 'flex', gap: '0.5rem', maxWidth: '300px', margin: '0 auto' }}>
              <input
                type="text"
                className="form-input"
                placeholder={t('enter_partner_code') || ''}
                value={partnerCode}
                onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
                style={{ textAlign: 'center', letterSpacing: '1px' }}
              />
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={loading || !partnerCode}
                style={{ padding: '0.8rem 1.2rem', whiteSpace: 'nowrap' }}
              >
                {t('connect_button')}
              </button>
            </form>
            {error && <p className="error-text" style={{ textAlign: 'center' }}>{error}</p>}
          </div>
        )}
      </section>

      {user.partner && (
        <section style={{ marginTop: '2.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--color-text)', marginBottom: '1rem' }}>{t('partner_settings')}</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* First Meeting Date */}
            <div className="form-group">
              <label>{t('first_meeting_date')}</label>
              <div style={{ width: '100%' }}>
                <DatePicker 
                  selected={firstMeetingDate} 
                  onChange={(date: Date | null) => setFirstMeetingDate(date)} 
                  dateFormat="yyyy-MM-dd"
                  className="form-input"
                  placeholderText={t('select_date') || ''}
                  wrapperClassName="date-picker-wrapper"
                  showYearDropdown
                  showMonthDropdown
                  dropdownMode="select"
                />
              </div>
            </div>

            {/* My Emoji */}
            <div className="form-group">
              <label>{t('my_emoji')}</label>
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  style={{
                    fontSize: '2rem',
                    padding: '0.5rem 1rem',
                    border: '1px solid #ddd',
                    borderRadius: '12px',
                    background: '#fff',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>{myEmoji}</span>
                  <span style={{ fontSize: '0.9rem', color: '#888' }}>{t('select_emoji')} ▼</span>
                </button>
                
                {showEmojiPicker && (
                  <>
                  <div 
                    style={{ position: 'fixed', top:0, left:0, right:0, bottom:0, zIndex: 9 }}
                    onClick={() => setShowEmojiPicker(false)}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    width: '100%',
                    zIndex: 10,
                    background: '#fff',
                    border: '1px solid #eee',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    padding: '1rem',
                    marginTop: '0.5rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
                    gap: '0.5rem',
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}>
                    {EMOJI_LIST.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => {
                          setMyEmoji(emoji);
                          setShowEmojiPicker(false);
                        }}
                        style={{
                          fontSize: '1.8rem',
                          background: myEmoji === emoji ? '#FFF0F5' : 'none',
                          border: myEmoji === emoji ? '2px solid #d65a7a' : 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          padding: '0.25rem',
                          aspectRatio: '1/1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  </>
                )}
              </div>
            </div>
            
            <button 
              className="btn-primary" 
              onClick={handleSavePartnerSettings}
              disabled={loading}
              style={{ marginTop: '1rem' }}
            >
              {t('save')}
            </button>
          </div>
        </section>
      )}

      {/* Account Management */}
      <div style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#e74c3c' }}>{t('account_management')}</h3>
        <button 
            onClick={handleDeleteAccount}
            disabled={!!user.partner}
            style={{
                background: 'transparent',
                border: '1px solid #e74c3c',
                color: '#e74c3c',
                padding: '0.8rem 1.2rem',
                borderRadius: '8px',
                width: '100%',
                cursor: user.partner ? 'not-allowed' : 'pointer',
                opacity: user.partner ? 0.5 : 1,
                fontSize: '0.9rem',
                fontWeight: 600
            }}
        >
            {t('delete_account')}
        </button>
        {user.partner && (
            <p style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.5rem', textAlign: 'center' }}>
                {t('disconnect_first_hint')}
            </p>
        )}
      </div>

    </motion.div>

    {showDisconnectSuccessModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '350px', width: '90%', textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😢</div>
            <h3 style={{ marginBottom: '1rem', color: 'var(--color-text)' }}>
              {t('disconnect_success_title')}
            </h3>
            <p style={{ color: '#666', marginBottom: '1.5rem', whiteSpace: 'pre-line', lineHeight: '1.5' }}>
              {t('disconnect_success_desc')}
            </p>
            <button 
              className="btn-primary" 
              onClick={() => setShowDisconnectSuccessModal(false)}
              style={{ width: '100%', backgroundColor: '#888', borderColor: '#888' }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {showSaveSuccessModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '300px', width: '90%', textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--color-text)' }}>
              {t('settings_saved')}
            </h3>
            <button 
              className="btn-primary" 
              onClick={() => setShowSaveSuccessModal(false)}
              style={{ width: '100%' }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {showCoupleSetupModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--color-primary-dark)' }}>
              {t('partner_connected')}
            </h2>
            <p style={{ textAlign: 'center', marginBottom: '2rem', color: '#666' }}>
              이제 우리만의 특별한 설정을 시작해볼까요? <br/>
              처음 만난 날짜와 나만의 이모지를 선택해주세요!
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* First Meeting Date */}
              <div className="form-group">
                <label>{t('first_meeting_date')}</label>
                <div style={{ width: '100%' }}>
                  <DatePicker 
                    selected={firstMeetingDate} 
                    onChange={(date: Date | null) => setFirstMeetingDate(date)} 
                    dateFormat="yyyy-MM-dd"
                    className="form-input"
                    placeholderText={t('select_date') || ''}
                    wrapperClassName="date-picker-wrapper"
                    showYearDropdown
                    showMonthDropdown
                    dropdownMode="select"
                    popperProps={{ strategy: "fixed" }}
                    portalId="root"
                  />
                </div>
              </div>

              {/* My Emoji */}
              <div className="form-group">
                <label>{t('my_emoji')}</label>
                <div style={{ position: 'relative' }}>
                  <button 
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    style={{
                      fontSize: '2rem',
                      padding: '0.5rem 1rem',
                      border: '1px solid #ddd',
                      borderRadius: '12px',
                      background: '#fff',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>{myEmoji}</span>
                    <span style={{ fontSize: '0.9rem', color: '#888' }}>{t('select_emoji')} ▼</span>
                  </button>
                  
                  {showEmojiPicker && (
                    <>
                    <div 
                      style={{ position: 'fixed', top:0, left:0, right:0, bottom:0, zIndex: 1001 }}
                      onClick={() => setShowEmojiPicker(false)}
                    />
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      width: '100%',
                      zIndex: 1002,
                      background: '#fff',
                      border: '1px solid #eee',
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                      padding: '1rem',
                      marginTop: '0.5rem',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
                      gap: '0.5rem',
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}>
                      {EMOJI_LIST.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => {
                            setMyEmoji(emoji);
                            setShowEmojiPicker(false);
                          }}
                          style={{
                            fontSize: '1.8rem',
                            background: myEmoji === emoji ? '#FFF0F5' : 'none',
                            border: myEmoji === emoji ? '2px solid #d65a7a' : 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            padding: '0.25rem',
                            aspectRatio: '1/1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    </>
                  )}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                 <button 
                  className="btn-secondary" 
                  onClick={() => setShowCoupleSetupModal(false)}
                  style={{ flex: 1 }}
                >
                  {t('cancel')}
                </button>
                <button 
                  className="btn-primary" 
                  onClick={handleSavePartnerSettings}
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  {t('save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDisconnectModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ color: '#ff4444', marginTop: 0 }}>{t('disconnect_terms_title')}</h2>
            
            {coupleStats && (
                <div style={{ background: '#fff0f0', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', color: '#d32f2f' }}>
                        {t('disconnect_stats_intro', { name: user.partner?.nickname || 'Partner' })}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.5rem' }}>
                        <div>
                            <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 'bold' }}>{coupleStats.places}</span>
                            <span style={{ fontSize: '0.8rem', color: '#666' }}>{t('stats_places')}</span>
                        </div>
                        <div>
                            <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 'bold' }}>{coupleStats.memories}</span>
                            <span style={{ fontSize: '0.8rem', color: '#666' }}>{t('stats_memories')}</span>
                        </div>
                        <div>
                            <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 'bold' }}>{coupleStats.images}</span>
                            <span style={{ fontSize: '0.8rem', color: '#666' }}>{t('stats_photos')}</span>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ textAlign: 'left', marginBottom: '1.5rem', whiteSpace: 'pre-line', lineHeight: '1.5' }}>
              {t('disconnect_terms_content')}
            </div>

            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              marginBottom: '1rem',
              cursor: 'pointer',
              fontSize: '0.95rem'
            }}>
              <input 
                type="checkbox" 
                checked={isAgreed}
                onChange={(e) => setIsAgreed(e.target.checked)}
              />
              {t('disconnect_agreement')}
            </label>

            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                {t('disconnect_input_guide')} <br/>
                <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>"{t('disconnect_verification_phrase')}"</span>
              </p>
              <input 
                type="text" 
                className="form-input" 
                value={disconnectInput}
                onChange={(e) => setDisconnectInput(e.target.value)}
                placeholder={t('disconnect_verification_phrase')}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button 
                className="btn-secondary" 
                onClick={() => setShowDisconnectModal(false)}
              >
                {t('cancel')}
              </button>
              <button 
                className="btn-primary" 
                style={{ backgroundColor: '#e74c3c', borderColor: '#e74c3c' }}
                onClick={handleDisconnectConfirm}
                disabled={!isAgreed || disconnectInput !== t('disconnect_verification_phrase') || loading}
              >
                {loading ? '...' : t('disconnect_confirm_action')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MyPage;
