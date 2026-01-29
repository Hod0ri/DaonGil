import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

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

  // Update local state when user prop changes
  useEffect(() => {
    setNewNickname(user.nickname);
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
      const token = localStorage.getItem('token');
      const res = await axios.patch(
        'http://localhost:8000/api/v1/users/me',
        { nickname: newNickname },
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
      const token = localStorage.getItem('token');
      const res = await axios.patch(
        'http://localhost:8000/api/v1/users/me',
        { partner_code: partnerCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onUpdateUser(res.data);
      setPartnerCode('');
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


  const handleConfirmYes = () => {
    setShowConfirmModal(false);
    setShowDisconnectModal(true);
    setDisconnectInput('');
    setIsAgreed(false);
  };

  const handleDisconnectConfirm = async () => {

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:8000/api/v1/users/disconnect',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh user data to clear partner info
      const res = await axios.get(
        'http://localhost:8000/api/v1/users/me',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onUpdateUser(res.data);
    } catch (err) {
      console.error('Failed to disconnect', err);
      setError(t('error_disconnect_partner'));
    } finally {
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

    </motion.div>

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
          <div className="card" style={{ maxWidth: '400px', width: '90%', textAlign: 'left' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--color-text)' }}>{t('disconnect_terms_title')}</h3>
            
            <div style={{ 
              backgroundColor: '#f9f9f9', 
              padding: '1rem', 
              borderRadius: '8px',
              fontSize: '0.9rem',
              color: '#666',
              marginBottom: '1rem',
              whiteSpace: 'pre-line'
            }}>
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
