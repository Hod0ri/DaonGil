import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PlaceCreate } from '../api/places';
import DaumPostcodeEmbed from 'react-daum-postcode';

interface PlaceCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (place: PlaceCreate) => void;
  location?: { lat: number; lng: number };
  onSelectMap: () => void;
}

const COLORS = ['#FF5733', '#33FF57', '#3357FF', '#FF33A8', '#FFC300', '#DAF7A6', '#581845', '#900C3F'];

const PlaceCreateModal: React.FC<PlaceCreateModalProps> = ({ isOpen, onClose, onSave, location, onSelectMap }) => {
  const { t } = useTranslation();
  
  // mode: 'initial' (choose option), 'search' (address search), 'form' (enter details)
  const [mode, setMode] = useState<'initial' | 'search' | 'form'>('initial');
  
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [tags, setTags] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | undefined>(location);

  // Sync mode and location when modal opens or location changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isOpen) {
        if (location) {
            setMode('form');
            setCurrentLocation(location);
        } else {
            if (mode === 'initial' && !currentLocation) {
                 setName('');
                 setAddress('');
                 setTags('');
                 setColor(COLORS[0]);
             }
        }
    }
  }, [isOpen, location]);

  // If location prop updates specifically (e.g. user selected from map and it re-opened), update internal state
  useEffect(() => {
      if (location) {
          setCurrentLocation(location);
          setMode('form');
      }
  }, [location]);

  // Reverse Geocoding to auto-fill address
  useEffect(() => {
      if (location && isOpen && mode === 'form') {
          const { naver } = window as any;
          if (naver && naver.maps && naver.maps.Service) {
              naver.maps.Service.reverseGeocode({
                  coords: new naver.maps.LatLng(location.lat, location.lng),
              }, function(status: any, response: any) {
                  if (status === naver.maps.Service.Status.OK) {
                      const result = response.v2;
                      if (result && result.address) {
                          setAddress(result.address.jibunAddress || result.address.roadAddress);
                      }
                  }
              });
          }
      }
  }, [location, isOpen, mode]);

  if (!isOpen) return null;

  const handleCompletePostcode = (data: any) => {
      const fullAddress = data.address;
      const roadAddress = data.roadAddress;
      const jibunAddress = data.jibunAddress;
      const extraAddress = data.buildingName ? ` (${data.buildingName})` : '';
      const finalAddress = fullAddress + extraAddress;
      
      setAddress(finalAddress);
      
      if (!fullAddress) {
          return alert('Address is empty. Please try again.');
      }

      const { naver } = window as any;
      if (naver && naver.maps && naver.maps.Service) {
          
          const searchGeocode = (query: string, retryQuery?: string) => {
              naver.maps.Service.geocode({
                  query: query
              }, function(status: any, response: any) {
                  if (status === naver.maps.Service.Status.OK && response.v2.addresses.length > 0) {
                      const result = response.v2.addresses[0];
                      const lat = parseFloat(result.y);
                      const lng = parseFloat(result.x);
                      
                      setCurrentLocation({ lat, lng });
                      setMode('form');
                  } else {
                      console.warn(`Geocode failed for query: ${query}`);
                      if (retryQuery && retryQuery !== query) {
                          searchGeocode(retryQuery);
                      } else {
                          console.error('Geocode final failure');
                          alert('No location found for this address. Please try selecting on map.');
                      }
                  }
              });
          };

          // Try road address first, then jibun address as fallback
          const primaryQuery = roadAddress || fullAddress;
          const secondaryQuery = jibunAddress;

          searchGeocode(primaryQuery, secondaryQuery);

      } else {
          console.error('Naver Maps Service not found');
          alert("Map service is not fully loaded. Please refresh the page or try 'Select on Map'.");
      }
  };

  const handleSubmit = () => {
    if (!name) {
        // Simple validation visual cue could be added
        return;
    }
    if (!currentLocation) return;

    const placeData: PlaceCreate = {
      name,
      address,
      latitude: currentLocation.lat,
      longitude: currentLocation.lng,
      tags: tags.split(',').map(s => s.trim()).filter(s => s),
      color
    };
    onSave(placeData);
    
    // Reset
    setCurrentLocation(undefined);
    setMode('initial');
  };

  const handleClose = () => {
      setCurrentLocation(undefined);
      setMode('initial');
      onClose();
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div className="card" style={{ width: '90%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
        
        {mode === 'initial' && (
            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem'}}>
                <h3 style={{textAlign: 'center', margin: 0}}>{t('places.add_place')}</h3>
                <button 
                    className="btn-primary" 
                    onClick={() => setMode('search')}
                    style={{padding: '1rem', fontSize: '1.1rem'}}
                >
                    🔍 {t('places.search_address') || "주소 검색"}
                </button>
                <button 
                    className="btn-secondary" 
                    onClick={onSelectMap}
                    style={{padding: '1rem', fontSize: '1.1rem'}}
                >
                    🗺️ {t('places.select_on_map') || "지도에서 선택"}
                </button>
                <button className="btn-secondary" onClick={handleClose} style={{marginTop: '1rem'}}>
                    {t('places.cancel')}
                </button>
            </div>
        )}

        {mode === 'search' && (
            <div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                    <h3 style={{margin: 0}}>{t('places.search_address') || "주소 검색"}</h3>
                    <button 
                        onClick={() => setMode('initial')} 
                        style={{background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer'}}
                        aria-label={t('common.close', 'Close')}
                    >
                        ✕
                    </button>
                </div>
                <DaumPostcodeEmbed 
                    onComplete={handleCompletePostcode} 
                    autoClose={false}
                    style={{height: '400px'}}
                />
            </div>
        )}

        {mode === 'form' && (
            <>
                <h2 style={{marginTop: 0, color: 'var(--color-primary-dark)'}}>{t('places.add_place')}</h2>
                
                <div className="form-group">
                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>{t('places.name')}</label>
                <input 
                    className="form-input" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder={t('places.enter_name') || ''}
                    style={{ borderColor: !name ? '#eee' : undefined }}
                />
                </div>

                <div className="form-group">
                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>{t('places.address')}</label>
                <input className="form-input" value={address} onChange={e => setAddress(e.target.value)} placeholder={t('places.enter_address') || ''} />
                {currentLocation && (
                    <small style={{color: '#888'}}>Location: {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}</small>
                )}
                </div>

                <div className="form-group">
                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>{t('places.tags')}</label>
                <input className="form-input" value={tags} onChange={e => setTags(e.target.value)} placeholder="tag1, tag2" />
                </div>

                <div className="form-group">
                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>{t('places.color')}</label>
                <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                    {COLORS.map(c => (
                        <div 
                            key={c} 
                            onClick={() => setColor(c)}
                            role="button"
                            tabIndex={0}
                            aria-label={`Select color ${c}`}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setColor(c);
                                }
                            }}
                            style={{
                                width: '30px', 
                                height: '30px', 
                                backgroundColor: c, 
                                borderRadius: '50%', 
                                cursor: 'pointer',
                                border: color === c ? '3px solid #333' : '1px solid #ddd',
                                transform: color === c ? 'scale(1.1)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        />
                    ))}
                </div>
                </div>

                <div style={{display: 'flex', gap: '1rem', marginTop: '2rem'}}>
                    <button className="btn-secondary" onClick={handleClose} style={{flex: 1}}>{t('places.cancel')}</button>
                    <button className="btn-primary" onClick={handleSubmit} style={{flex: 1}}>{t('places.save')}</button>
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default PlaceCreateModal;
