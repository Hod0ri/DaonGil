import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

interface MarkdownPageProps {
  filePath: string; // base path, e.g. /privacy
  titleKey: string;
}

const MarkdownPage: React.FC<MarkdownPageProps> = ({ filePath, titleKey }) => {
  const { t, i18n } = useTranslation();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (filePath) {
      setLoading(true);
      setError('');
      
      // Determine language (e.g., 'ko', 'en')
      const lang = i18n.language.split('-')[0] || 'ko';
      // Try to fetch localized file, e.g. /privacy.ko.md
      const targetPath = `${filePath}.${lang}.md`;
      
      fetch(targetPath)
        .then(async (res) => {
          if (!res.ok) {
            // Fallback to English or base if specific lang not found
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
  }, [filePath, i18n.language]);

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

  return (
    <div className="app-content" style={{ display: 'flex', justifyContent: 'center', padding: '2rem 1rem' }}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="card"
          style={{ maxWidth: '800px', width: '100%', margin: '0 auto', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
        >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
                <Link to="/" style={{ textDecoration: 'none', color: '#666', marginRight: '1rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}>
                    &larr;
                </Link>
                <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#333' }}>{t(titleKey) || titleKey}</h2>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
                {loading && <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>Loading...</div>}
                {error && <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>{error}</div>}
                {!loading && !error && (
                    <div style={{ fontSize: '0.95rem', color: '#444' }}>
                        {renderMarkdown(content)}
                    </div>
                )}
            </div>
        </motion.div>
    </div>
  );
};

export default MarkdownPage;
