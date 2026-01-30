import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Place, PlaceCreate, getPlaces, createPlace, createMemory, MemoryCreate, deletePlace } from '../api/places';
import PlaceCreateModal from './PlaceCreateModal';
import PlaceDetailModal from './PlaceDetailModal';

const NaverMap = () => {
  const { t } = useTranslation();
  const mapElement = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [isSelectingLocation, setIsSelectingLocation] = useState(false);
  
  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  
  const [newLocation, setNewLocation] = useState<{lat: number, lng: number} | undefined>(undefined);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  
  const [tempMarker, setTempMarker] = useState<any>(null);
  const markersRef = useRef<any[]>([]);

  const fetchPlaces = async () => {
      const token = localStorage.getItem('token');
      if (token) {
          try {
              const data = await getPlaces(token);
              setPlaces(data);
          } catch (e) {
              console.error("Failed to fetch places", e);
          }
      }
  };

  useEffect(() => {
    const { naver } = window as any;
    if (!mapElement.current || !naver) return;

    // Map initialization
    const location = new naver.maps.LatLng(37.5666805, 126.9784147);
    
    const mapOptions = {
      center: location,
      zoom: 15,
      zoomControl: true,
      zoomControlOptions: {
        position: naver.maps.Position.TOP_RIGHT,
      },
    };

    const map = new naver.maps.Map(mapElement.current, mapOptions);
    mapInstance.current = map;

    // Click listener for Selecting Location
    naver.maps.Event.addListener(map, 'click', (e: any) => {
        if (mapInstance.current.isSelectingLocation) {
            const lat = e.coord.lat();
            const lng = e.coord.lng();
            setNewLocation({ lat, lng });
            
            // Show temp marker
            if (mapInstance.current.tempMarker) {
                mapInstance.current.tempMarker.setMap(null);
            }
            const marker = new naver.maps.Marker({
                position: new naver.maps.LatLng(lat, lng),
                map: map,
                icon: {
                    content: '<div style="width: 20px; height: 20px; background: red; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>',
                    anchor: new naver.maps.Point(10, 10)
                }
            });
            mapInstance.current.tempMarker = marker;
            setTempMarker(marker);
            
            // Open Create Modal with location
            setCreateModalOpen(true);
            
            // Turn off selecting mode
            setIsSelectingLocation(false);
            mapInstance.current.isSelectingLocation = false;
        }
    });
    
    fetchPlaces();
  }, []);

  // Update markers when places change
  useEffect(() => {
      const { naver } = window as any;
      if (!mapInstance.current || !naver) return;

      // Clear existing markers
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];

      places.forEach(place => {
          const marker = new naver.maps.Marker({
              position: new naver.maps.LatLng(place.latitude, place.longitude),
              map: mapInstance.current,
              title: place.name,
              icon: {
                  content: `
                    <div style="position: relative; cursor: pointer;">
                        <div style="
                            width: 30px; 
                            height: 30px; 
                            background-color: ${place.color}; 
                            border-radius: 50% 50% 50% 0; 
                            transform: rotate(-45deg);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            box-shadow: 2px 2px 5px rgba(0,0,0,0.3);
                            border: 2px solid white;
                        ">
                        </div>
                        <div style="
                            position: absolute;
                            bottom: -25px;
                            left: 50%;
                            transform: translateX(-50%);
                            white-space: nowrap;
                            background: white;
                            padding: 2px 5px;
                            border-radius: 4px;
                            font-size: 10px;
                            font-weight: bold;
                            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                            color: #333;
                        ">${place.name}</div>
                    </div>
                  `,
                  anchor: new naver.maps.Point(15, 30)
              }
          });
          
          naver.maps.Event.addListener(marker, 'click', () => {
              setSelectedPlace(place);
              setDetailModalOpen(true);
          });

          markersRef.current.push(marker);
      });

  }, [places]);

  // Sync isSelectingLocation state to map instance property for the event listener
  useEffect(() => {
      if (mapInstance.current) {
          mapInstance.current.isSelectingLocation = isSelectingLocation;
          if (isSelectingLocation) {
              mapInstance.current.setOptions({ cursor: 'crosshair' });
          } else {
              mapInstance.current.setOptions({ cursor: 'grab' });
          }
      }
  }, [isSelectingLocation]);

  const handleSavePlace = async (placeData: PlaceCreate) => {
      const token = localStorage.getItem('token');
      if (token) {
          try {
              await createPlace(token, placeData);
              await fetchPlaces();
              setCreateModalOpen(false);
              if (tempMarker) {
                  tempMarker.setMap(null);
                  setTempMarker(null);
              }
          } catch (e) {
              console.error("Failed to create place", e);
              // In real app, show error modal
          }
      }
  };

  const handleAddMemory = async (memoryData: MemoryCreate) => {
      if (!selectedPlace) return;
      const token = localStorage.getItem('token');
      if (token) {
          try {
              const newMemory = await createMemory(token, selectedPlace.id, memoryData);
              // Update local state to reflect new memory immediately
              const updatedPlace = {
                  ...selectedPlace,
                  memories: [...selectedPlace.memories, newMemory]
              };
              setSelectedPlace(updatedPlace);
              
              // Also update in places list
              setPlaces(places.map(p => p.id === selectedPlace.id ? updatedPlace : p));
          } catch (e) {
              console.error("Failed to add memory", e);
          }
      }
  };
  
  const handleDeletePlace = async () => {
      if (!selectedPlace) return;
      const token = localStorage.getItem('token');
      if (token) {
          try {
              await deletePlace(token, selectedPlace.id);
              await fetchPlaces();
              setDetailModalOpen(false);
              setSelectedPlace(null);
          } catch (e) {
              console.error("Failed to delete place", e);
          }
      }
  };

  const handleCancelCreate = () => {
      setCreateModalOpen(false);
      // Only clear temp marker if we are not selecting (actually if we cancel creation, we should clear it)
      if (tempMarker) {
          tempMarker.setMap(null);
          setTempMarker(null);
      }
      setIsSelectingLocation(false);
  };

  const handleAddClick = () => {
      if (isSelectingLocation) {
          setIsSelectingLocation(false);
          // Clear temp marker
          if (tempMarker) {
               tempMarker.setMap(null);
               setTempMarker(null);
          }
      } else {
          // Open modal freshly
          setNewLocation(undefined);
          setCreateModalOpen(true);
      }
  };

  const handleSelectMapLocation = () => {
      setCreateModalOpen(false);
      setIsSelectingLocation(true);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '500px' }}>
      <div 
        ref={mapElement} 
        style={{ 
          width: '100%', 
          height: '100%', 
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
        }} 
      />
      
      {/* Add Button */}
      <button 
        onClick={handleAddClick}
        style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            zIndex: 100,
            backgroundColor: isSelectingLocation ? '#ff4444' : 'var(--color-primary)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '60px',
            height: '60px',
            fontSize: '24px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease'
        }}
        title={t('places.add_place')}
      >
        {isSelectingLocation ? '✕' : '+'}
      </button>
      
      {isSelectingLocation && (
          <div style={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 100,
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              pointerEvents: 'none',
              backdropFilter: 'blur(4px)'
          }}>
              {t('places.click_map_to_add')}
          </div>
      )}

      {/* Create Modal */}
      <PlaceCreateModal 
        isOpen={createModalOpen}
        onClose={handleCancelCreate}
        onSave={handleSavePlace}
        location={newLocation}
        onSelectMap={handleSelectMapLocation}
      />

      {/* Detail Modal */}
      {selectedPlace && (
          <PlaceDetailModal
            isOpen={detailModalOpen}
            onClose={() => setDetailModalOpen(false)}
            place={selectedPlace}
            onAddMemory={handleAddMemory}
            onDeletePlace={handleDeletePlace}
          />
      )}
    </div>
  );
};

export default NaverMap;
