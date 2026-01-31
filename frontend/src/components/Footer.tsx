import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import ContactModal from './ContactModal';

const Footer: React.FC = () => {
  const { t } = useTranslation();
  const [showContact, setShowContact] = useState(false);

  return (
    <footer style={{
      padding: '1.5rem',
      backgroundColor: '#fff',
      borderTop: '1px solid #f0f0f0',
      marginTop: 'auto',
      textAlign: 'center',
      fontSize: '0.75rem',
      color: '#999'
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
        <Link to="/privacy" style={{ color: '#666', textDecoration: 'none', fontWeight: 500, fontSize: '0.75rem', fontFamily: 'inherit' }}>
          {t('footer.privacy') || "개인정보처리방침"}
        </Link>
        <Link to="/terms" style={{ color: '#666', textDecoration: 'none', fontWeight: 500, fontSize: '0.75rem', fontFamily: 'inherit' }}>
          {t('footer.terms') || "이용약관"}
        </Link>
        <button onClick={() => setShowContact(true)} style={{ color: '#666', textDecoration: 'none', fontWeight: 500, fontSize: '0.75rem', fontFamily: 'inherit', background: 'transparent', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', padding: 0 }}>
          {t('footer.contact') || "문의하기"}
        </button>
      </div>
      <div>
        &copy; {new Date().getFullYear()} DaonGil. All rights reserved.
      </div>
      <ContactModal
        isOpen={showContact}
        onClose={() => setShowContact(false)}
      />
    </footer>
  );
};

export default Footer;
