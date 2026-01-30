import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface MarkdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  filePath: string; // base path, e.g. /privacy
}

const MarkdownModal: React.FC<MarkdownModalProps> = ({ isOpen, onClose, title, filePath }) => {
  const { t, i18n } = useTranslation();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen && filePath) {
      setLoading(true);
      setError('');
      
      // Determine language (e.g., 'ko', 'en')
      const lang = i18n.language.split('-')[0] || 'ko';
      // Try to fetch localized file, e.g. /privacy.ko.md
      const targetPath = `${filePath}.${lang}.md`;
      
      fetch(targetPath)
        .then(async (res) => {
          if (!res.ok) {
            // Fallback to English or base if specific lang not found (optional)
            // For now, try default (e.g. .ko.md if standard) or throw
            // If failed, maybe try default '.md' ?
            if (lang !== 'ko') {
                const retry = await fetch(`${filePath}.ko.md`);
                if (retry.ok) return retry.text();
            }
            throw new Error('Failed to load markdown');
          }
          return res.text();
        })
        .then((text) => {
          setContent(text);
        })
        .catch((e) => setError('문서를 불러올 수 없습니다.'))
        .finally(() => setLoading(false));
    }
  }, [isOpen, filePath, i18n.language]);

  // Simple Markdown Parser
  const renderMarkdown = (text: string) => {
    if (!text) return null;

    const lines = text.split('\n');
    const elements: React.ReactElement[] = [];
    let listItems: React.ReactElement[] = [];
    let inList = false;

    lines.forEach((line, index) => {
      // Headers
      if (line.startsWith('### ')) {
        if (inList) { elements.push(<ul key={`ul-${index}`}>{listItems}</ul>); listItems = []; inList = false; }
        elements.push(<h3 key={index} style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '0.5rem', fontWeight: 600 }}>{line.replace('### ', '')}</h3>);
      } else if (line.startsWith('## ')) {
        if (inList) { elements.push(<ul key={`ul-${index}`}>{listItems}</ul>); listItems = []; inList = false; }
        elements.push(<h2 key={index} style={{ fontSize: '1.3rem', marginTop: '2rem', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', fontWeight: 700 }}>{line.replace('## ', '')}</h2>);
      } else if (line.startsWith('# ')) {
        if (inList) { elements.push(<ul key={`ul-${index}`}>{listItems}</ul>); listItems = []; inList = false; }
        elements.push(<h1 key={index} style={{ fontSize: '1.5rem', marginTop: '1rem', marginBottom: '1.5rem', fontWeight: 800, textAlign: 'left' }}>{line.replace('# ', '')}</h1>);
      }
      // List Items
      else if (line.trim().startsWith('- ')) {
        inList = true;
        const content = line.trim().replace('- ', '');
        listItems.push(<li key={`li-${index}`} style={{ marginBottom: '0.25rem' }}>{parseInline(content)}</li>);
      }
      // Empty Lines
      else if (line.trim() === '') {
        if (inList) { elements.push(<ul key={`ul-${index}`}>{listItems}</ul>); listItems = []; inList = false; }
        // elements.push(<br key={index} />); 
      }
      // Paragraphs
      else {
        if (inList) { elements.push(<ul key={`ul-${index}`}>{listItems}</ul>); listItems = []; inList = false; }
        elements.push(<p key={index} style={{ marginBottom: '0.8rem', lineHeight: 1.6 }}>{parseInline(line)}</p>);
      }
    });

    if (inList) {
        elements.push(<ul key={`ul-last`}>{listItems}</ul>);
    }

    return elements;
  };

  const parseInline = (text: string) => {
      // Simple bold parsing **text**
      const parts = text.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={i}>{part.slice(2, -2)}</strong>;
          }
          return part;
      });
  };

  if (!isOpen) return null;

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
          maxWidth: '800px',
          maxHeight: '80vh',
          borderRadius: '16px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{title}</h3>
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
        <div style={{ padding: '1.5rem 2rem', overflowY: 'auto', fontSize: '0.95rem' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Loading...</div>
          ) : error ? (
            <div style={{ color: '#d9534f', padding: '1rem' }}>{error}</div>
          ) : (
            <div
              style={{
                fontFamily: 'var(--font-main)',
                lineHeight: 1.6,
                color: '#333',
                textAlign: 'left'
              }}
            >
              {renderMarkdown(content)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarkdownModal;
