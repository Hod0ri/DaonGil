import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Place, Memory, MemoryCreate } from '../api/places';

interface PlaceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  place: Place;
  onAddMemory: (memory: MemoryCreate) => void;
  onDeletePlace: () => void;
}

const PlaceDetailModal: React.FC<PlaceDetailModalProps> = ({ isOpen, onClose, place, onAddMemory, onDeletePlace }) => {
  const { t } = useTranslation();
  
  const [isAddingMemory, setIsAddingMemory] = useState(false);
  const [visitDate, setVisitDate] = useState<Date | null>(new Date());
  const [description, setDescription] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  
  // Confirmation Modal State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        const files = Array.from(e.target.files);
        const totalImages = selectedImages.length + files.length;
        
        if (totalImages > 5) {
            alert(t('places.max_images_error') || 'Maximum 5 images allowed');
            return;
        }

        setSelectedImages([...selectedImages, ...files]);

        // Generate previews
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setImagePreviews([...imagePreviews, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...selectedImages];
    newImages.splice(index, 1);
    setSelectedImages(newImages);

    const newPreviews = [...imagePreviews];
    URL.revokeObjectURL(newPreviews[index]); // Cleanup
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);
  };

  const handleAddMemorySubmit = () => {
      if (!visitDate) return;
      
      const memoryData: MemoryCreate = {
          visit_date: visitDate.toISOString().split('T')[0],
          description,
          images: selectedImages
      };
      
      onAddMemory(memoryData);
      setIsAddingMemory(false);
      setDescription('');
      setVisitDate(new Date());
      setSelectedImages([]);
      setImagePreviews([]);
  };

  return (
    <>
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div className="card" style={{ width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button 
            onClick={onClose} 
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#666' }}
        >
            &times;
        </button>
        
        <h2 style={{marginTop: 0, color: 'var(--color-primary-dark)', marginRight: '2rem'}}>{place.name}</h2>
        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{place.address}</p>
        
        {place.tags && place.tags.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                {place.tags.map((tag, idx) => (
                    <span key={idx} style={{ background: '#f0f0f0', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', color: '#555' }}>
                        #{tag}
                    </span>
                ))}
            </div>
        )}
        
        <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '1rem 0' }} />
        
        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>{t('places.memories')}</h3>
        
        {/* Memory List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            {place.memories && place.memories.length > 0 ? (
                place.memories
                    .sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime())
                    .map((mem) => (
                    <div key={mem.id} style={{ background: '#fafafa', padding: '1rem', borderRadius: '8px', borderLeft: `4px solid ${place.color}` }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '0.3rem', color: '#333' }}>{mem.visit_date}</div>
                        <div style={{ whiteSpace: 'pre-wrap', color: '#555' }}>{mem.description}</div>
                        {/* Display Images */}
                        {mem.images && mem.images.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                                {mem.images.map((img, idx) => {
                                    // Construct image URL
                                    // Assuming backend returns relative path or object name
                                    // If backend returns full URL, use it directly.
                                    // If MinIO is served via Nginx or backend proxy, adjust here.
                                    // For now, assuming backend serves or MinIO public URL.
                                    // Let's assume the backend returns just the object name and we need to construct URL
                                    // OR we can proxy through backend if needed.
                                    // Let's try to use the MinIO endpoint directly if public.
                                    // Since we set public policy, we can construct URL:
                                    // http://localhost:9000/couple-media/{img}
                                    
                                    // Actually, it's safer to ask backend for full URL or proxy.
                                    // But to keep it simple, let's assume we can access MinIO directly for now
                                    // Or better: Let's assume the backend response contains the relative path and we use a helper.
                                    // Given local setup: http://localhost:9000/couple-media/
                                    const bucketUrl = process.env.REACT_APP_MINIO_URL || 'http://localhost:9000/couple-media';
                                    const imageUrl = img.startsWith('http') ? img : `${bucketUrl}/${img}`;
                                    
                                    return (
                                        <a key={idx} href={imageUrl} target="_blank" rel="noopener noreferrer">
                                            <img 
                                                src={imageUrl} 
                                                alt={`memory-${mem.id}-${idx}`} 
                                                style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px' }} 
                                            />
                                        </a>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))
            ) : (
                <p style={{ color: '#aaa', fontStyle: 'italic' }}>{t('places.no_memories')}</p>
            )}
        </div>

        {/* Add Memory Form */}
        {isAddingMemory ? (
            <div style={{ background: '#fff', border: '1px solid #ddd', padding: '1rem', borderRadius: '8px', animation: 'fadeIn 0.3s' }}>
                <h4 style={{ marginTop: 0, marginBottom: '0.5rem' }}>{t('places.add_memory')}</h4>
                <div style={{ marginBottom: '0.5rem' }}>
                    <DatePicker 
                        selected={visitDate} 
                        onChange={(date: Date | null) => setVisitDate(date)} 
                        dateFormat="yyyy-MM-dd"
                        className="form-input"
                    />
                </div>
                <textarea 
                    className="form-input" 
                    placeholder={t('places.enter_note') || ''} 
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={3}
                />
                
                {/* Image Upload */}
                <div style={{ marginTop: '0.5rem' }}>
                    <label 
                        htmlFor="image-upload" 
                        style={{ 
                            display: 'inline-block', 
                            padding: '0.5rem 1rem', 
                            background: '#f0f0f0', 
                            borderRadius: '4px', 
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            color: '#555'
                        }}
                    >
                        📷 {t('places.add_photos')} ({selectedImages.length}/5)
                    </label>
                    <input 
                        id="image-upload"
                        type="file" 
                        accept="image/*" 
                        multiple 
                        onChange={handleImageChange}
                        style={{ display: 'none' }}
                        disabled={selectedImages.length >= 5}
                    />
                </div>

                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                        {imagePreviews.map((preview, idx) => (
                            <div key={idx} style={{ position: 'relative', flexShrink: 0 }}>
                                <img 
                                    src={preview} 
                                    alt={`preview-${idx}`} 
                                    style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} 
                                />
                                <button 
                                    onClick={() => removeImage(idx)}
                                    style={{ 
                                        position: 'absolute', 
                                        top: '-5px', 
                                        right: '-5px', 
                                        background: 'red', 
                                        color: 'white', 
                                        borderRadius: '50%', 
                                        width: '18px', 
                                        height: '18px', 
                                        border: 'none', 
                                        fontSize: '12px', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        cursor: 'pointer'
                                    }}
                                >
                                    &times;
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button className="btn-secondary" onClick={() => setIsAddingMemory(false)} style={{ flex: 1, padding: '0.5rem' }}>{t('places.cancel')}</button>
                    <button className="btn-primary" onClick={handleAddMemorySubmit} style={{ flex: 1, padding: '0.5rem' }}>{t('places.save')}</button>
                </div>
            </div>
        ) : (
            <button 
                className="btn-primary" 
                onClick={() => setIsAddingMemory(true)} 
                style={{ width: '100%', marginBottom: '2rem' }}
            >
                + {t('places.add_memory')}
            </button>
        )}

        <div style={{ marginTop: 'auto', textAlign: 'right' }}>
            <button 
                onClick={() => setShowDeleteConfirm(true)}
                style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', textDecoration: 'underline' }}
            >
                {t('places.delete')}
            </button>
        </div>
      </div>
    </div>
    
    {/* Delete Confirmation Modal */}
    {showDeleteConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2100 }}>
            <div className="card" style={{ maxWidth: '300px', width: '90%', textAlign: 'center', padding: '2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>{t('places.confirm_delete')}</h3>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>{t('places.cancel')}</button>
                    <button className="btn-primary" style={{ backgroundColor: '#ff4444', borderColor: '#ff4444' }} onClick={onDeletePlace}>{t('places.delete')}</button>
                </div>
            </div>
        </div>
    )}
    </>
  );
};

export default PlaceDetailModal;
