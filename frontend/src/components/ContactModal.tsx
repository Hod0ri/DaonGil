import React from 'react';
import { useTranslation } from 'react-i18next';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const email = 'support@daongil.app';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          width: '90%',
          maxWidth: '520px',
          borderRadius: '16px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{t('footer.contact') || '문의하기'}</h3>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '1.1rem',
              color: '#666'
            }}
            aria-label="Close"
            title={t('cancel') || '닫기'}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: '1rem 1.25rem', lineHeight: 1.7, color: '#333' }}>
          <p>{t('contact.description') || "서비스 이용 중 문의가 있으시면 아래 이메일로 연락해주세요."}</p>
          <p style={{ fontWeight: 'bold' }}>{email}</p>
          <a
            href={`mailto:${email}`}
            style={{
              display: 'inline-block',
              marginTop: '0.5rem',
              padding: '10px 16px',
              borderRadius: '12px',
              border: '1px solid #ddd',
              textDecoration: 'none',
              color: '#2c3e50',
              backgroundColor: '#f8f9fa'
            }}
          >
            {t('contact.send_email') || "메일로 문의하기"}
          </a>
        </div>
      </div>
    </div>
  );
};

export default ContactModal;
