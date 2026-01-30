import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MarkdownModal from './MarkdownModal';
import ContactModal from './ContactModal';

const Footer: React.FC = () => {
  const { t } = useTranslation();
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
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
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '0.8rem' }}>
        <button onClick={() => setShowPrivacy(true)} style={{ color: '#666', textDecoration: 'none', fontWeight: 500, background: 'transparent', border: 'none', cursor: 'pointer' }}>
          {t('footer.privacy') || "개인정보처리방침"}
        </button>
        <button onClick={() => setShowTerms(true)} style={{ color: '#666', textDecoration: 'none', fontWeight: 500, background: 'transparent', border: 'none', cursor: 'pointer' }}>
          {t('footer.terms') || "이용약관"}
        </button>
        <button onClick={() => setShowContact(true)} style={{ color: '#666', textDecoration: 'none', fontWeight: 500, background: 'transparent', border: 'none', cursor: 'pointer' }}>
          {t('footer.contact') || "문의하기"}
        </button>
      </div>
      <div>
        &copy; {new Date().getFullYear()} DaonGil. All rights reserved.
      </div>
      <MarkdownModal
        isOpen={showPrivacy}
        onClose={() => setShowPrivacy(false)}
        title={t('footer.privacy') || "개인정보처리방침"}
        filePath="/privacy"
      />
      <MarkdownModal
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
        title={t('footer.terms') || "이용약관"}
        filePath="/terms"
      />
      <ContactModal
        isOpen={showContact}
        onClose={() => setShowContact(false)}
      />
    </footer>
  );
};

export default Footer;
