import React, { useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import DatePicker from 'react-datepicker';
import { ko, ja, es, enUS } from 'date-fns/locale';
import { getYear, getMonth, format } from 'date-fns';
import { motion } from 'framer-motion';

import "react-datepicker/dist/react-datepicker.css";

interface ProfileSetupProps {
  onProfileComplete: (user: any) => void;
  initialName?: string;
  initialData?: any;
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({ onProfileComplete, initialName, initialData }) => {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    nickname: initialData?.nickname || initialName || '',
    birthdate: initialData?.birthdate ? new Date(initialData.birthdate) : null,
    gender: initialData?.gender || '',
    partner_code: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get date-fns locale based on i18n language
  const getDateLocale = () => {
    switch (i18n.language) {
      case 'ko': return ko;
      case 'ja': return ja;
      case 'es': return es;
      default: return enUS;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleDateChange = (date: Date | null) => {
    setFormData({
      ...formData,
      birthdate: date
    });
  };

  const handleGenderSelect = (gender: string) => {
    setFormData({ ...formData, gender });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (step === 1) {
      if (!formData.nickname || !formData.birthdate || !formData.gender) {
        setError(t('nickname_placeholder')); // 임시 에러 메시지
        return;
      }
      setStep(2);
      return;
    }

    await submitData(formData.partner_code);
  };

  const handleSkipPartner = async () => {
    await submitData();
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const submitData = async (partnerCode?: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Format date to YYYY-MM-DD for backend
      const formattedDate = formData.birthdate 
        ? formData.birthdate.toISOString().split('T')[0] 
        : null;

      const payload: any = {
        nickname: formData.nickname,
        birthdate: formattedDate,
        gender: formData.gender
      };
      
      if (partnerCode && partnerCode.trim()) {
        payload.partner_code = partnerCode.trim();
      }

      const res = await axios.patch(
        'http://localhost:8000/api/v1/users/me',
        payload,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      onProfileComplete(res.data);
    } catch (err: any) {
      console.error('Profile update failed:', err);
      if (err.response?.status === 404) {
        setError(t('partner_code_desc')); // 실제로는 "코드가 올바르지 않습니다" 같은 메시지 필요
      } else {
        setError('Failed to update profile.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="card"
      style={{ maxWidth: '400px', margin: '0 auto', position: 'relative' }}
    >
      <div className="lang-switcher-mini" style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
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

      {step === 1 ? (
        <>
          <h2>{t('profile_setup_title')}</h2>
          <p style={{ color: 'var(--color-text-light)', marginBottom: '1.5rem' }}>
            {t('app_subtitle')}
          </p>
          
          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            {/* 닉네임 */}
            <div className="form-group">
              <label htmlFor="nickname">{t('nickname') || 'Nickname'}</label>
              <input
                id="nickname"
                name="nickname"
                type="text"
                className="form-input"
                value={formData.nickname}
                onChange={handleChange}
                placeholder={t('nickname_placeholder') || ''}
                maxLength={20}
              />
            </div>

            {/* 생년월일 (React Datepicker) */}
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label htmlFor="birthdate">{t('birthdate_label')}</label>
              <div style={{ width: '100%' }}>
                <DatePicker
                  selected={formData.birthdate}
                  onChange={handleDateChange}
                  dateFormat="yyyy/MM/dd"
                  locale={getDateLocale()}
                  placeholderText="YYYY/MM/DD"
                  className="form-input"
                  wrapperClassName="date-picker-wrapper"
                  renderCustomHeader={({
                    date,
                    changeYear,
                    changeMonth,
                    decreaseMonth,
                    increaseMonth,
                    prevMonthButtonDisabled,
                    nextMonthButtonDisabled,
                  }) => {
                    const years = Array.from(
                      { length: new Date().getFullYear() - 1900 + 1 },
                      (_, i) => 1900 + i
                    ).reverse();
                    
                    // 현재 locale에 맞는 월 이름 생성
                    const months = Array.from({ length: 12 }, (_, i) => {
                      return format(new Date(2024, i, 1), 'MMMM', { locale: getDateLocale() });
                    });

                    return (
                      <div
                        style={{
                          margin: 10,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "center",
                        }}
                      >
                        {/* 맨 위 텍스트: 일자 선택 (라운딩 박스 적용) */}
                        <div style={{ 
                          fontWeight: 'bold', 
                          marginBottom: '10px', 
                          color: '#fff',
                          backgroundColor: 'var(--color-primary-dark)',
                          padding: '8px 16px',
                          borderRadius: '20px',
                          display: 'inline-block'
                        }}>
                          {t('select_date')}
                        </div>
                        
                        <div style={{ display: "flex", justifyContent: "center", alignItems: 'center', gap: '5px' }}>
                          <button onClick={decreaseMonth} disabled={prevMonthButtonDisabled} type="button" style={{background:'none', border:'none', cursor:'pointer', fontSize:'1.2rem', color: 'var(--color-text)'}}>
                            {"<"}
                          </button>

                          {/* 연도 선택 (먼저 배치) */}
                          <select
                            value={getYear(date)}
                            onChange={({ target: { value } }) => changeYear(Number(value))}
                            style={{ 
                              padding: '5px', 
                              borderRadius: '8px', 
                              border: '1px solid #ddd',
                              backgroundColor: '#f8f9fa',
                              cursor: 'pointer',
                              outline: 'none'
                            }}
                          >
                            {years.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>

                          {/* 월 선택 (나중에 배치) */}
                          <select
                            value={months[getMonth(date)]}
                            onChange={({ target: { value } }) =>
                              changeMonth(months.indexOf(value))
                            }
                            style={{ 
                              padding: '5px', 
                              borderRadius: '8px', 
                              border: '1px solid #ddd',
                              backgroundColor: '#f8f9fa',
                              cursor: 'pointer',
                              outline: 'none'
                            }}
                          >
                            {months.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>

                          <button onClick={increaseMonth} disabled={nextMonthButtonDisabled} type="button" style={{background:'none', border:'none', cursor:'pointer', fontSize:'1.2rem', color: 'var(--color-text)'}}>
                            {">"}
                          </button>
                        </div>
                      </div>
                    );
                  }}
                />
              </div>
            </div>

            {/* 성별 (커스텀 버튼) */}
            <div className="form-group" style={{ marginTop: '1rem', width: '100%' }}>
              <label>{t('gender_label')}</label>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', width: '100%' }}>
                <button
                  type="button"
                  onClick={() => handleGenderSelect('M')}
                  style={{
                    flex: 1,
                    padding: '16px',
                    borderRadius: 'var(--radius-button)',
                    border: formData.gender === 'M' ? '2px solid var(--color-blue-dark)' : '1px solid #ddd',
                    backgroundColor: formData.gender === 'M' ? 'var(--color-blue-soft)' : 'white',
                    color: formData.gender === 'M' ? 'white' : 'var(--color-text)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontWeight: formData.gender === 'M' ? 'bold' : 'normal',
                    fontSize: '1.1rem',
                    fontFamily: 'var(--font-main)'
                  }}
                >
                  {t('gender_male')}
                </button>
                <button
                  type="button"
                  onClick={() => handleGenderSelect('F')}
                  style={{
                    flex: 1,
                    padding: '16px',
                    borderRadius: 'var(--radius-button)',
                    border: formData.gender === 'F' ? '2px solid var(--color-primary-dark)' : '1px solid #ddd',
                    backgroundColor: formData.gender === 'F' ? 'var(--color-primary)' : 'white',
                    color: formData.gender === 'F' ? '#D65A7A' : 'var(--color-text)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontWeight: formData.gender === 'F' ? 'bold' : 'normal',
                    fontSize: '1.1rem',
                    fontFamily: 'var(--font-main)'
                  }}
                >
                  {t('gender_female')}
                </button>
              </div>
            </div>
            
            {error && <p className="error-text">{error}</p>}
            
            <button 
              type="submit" 
              className="btn-primary" 
              style={{ width: '100%', marginTop: '2rem' }}
            >
              {t('next_button')}
            </button>
          </form>
        </>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2>{t('partner_code_title')}</h2>
            <p>{t('partner_code_desc')}</p>
            
            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
              <div className="form-group">
                <label htmlFor="partner_code">{t('partner_code_placeholder')}</label>
                <input
                  id="partner_code"
                  name="partner_code"
                  type="text"
                  className="form-input"
                  value={formData.partner_code}
                  onChange={handleChange}
                  placeholder="CODE"
                  style={{ textAlign: 'center', letterSpacing: '2px', textTransform: 'uppercase', fontSize: '1.2rem' }}
                />
              </div>
              
              <div className="info-box" style={{ marginTop: '1rem', background: '#f9f9f9', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ fontSize: '0.9rem', margin: 0, color: 'var(--color-text-light)' }}>
                  {t('my_code_label')}
                </p>
                <strong style={{ color: 'var(--color-primary-dark)', fontSize: '1.2rem', letterSpacing: '1px' }}>
                  {initialData?.personal_code || '...'}
                </strong>
              </div>
              
              {error && <p className="error-text">{error}</p>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '2rem' }}>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={loading}
                >
                  {loading ? 'Connecting...' : t('connect_button')}
                </button>
                <button 
                  type="button" 
                  className="btn-text"
                  onClick={handleSkipPartner}
                  disabled={loading}
                  style={{ background: 'none', border: 'none', color: 'var(--color-text-light)', cursor: 'pointer', padding: '0.5rem' }}
                >
                  {t('skip_button')}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </motion.div>
  );
};

export default ProfileSetup;
