import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Place, PlaceCreate, createPlace, createMemory, MemoryCreate, deletePlace } from '../api/places';
import PlaceCreateModal from './PlaceCreateModal';
import PlaceDetailModal from './PlaceDetailModal';
import { useMapContext } from '../contexts/MapContext';

const NaverMap = () => {
  const { t } = useTranslation();
  const { places, refreshPlaces, focusedLocation, tempPin, setTempPin, isMapLoaded } = useMapContext();
  const mapElement = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);
  const [isSelectingLocation, setIsSelectingLocation] = useState(false);
  
  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  
  const [newLocation, setNewLocation] = useState<{lat: number, lng: number} | undefined>(undefined);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  
  const [tempMarker, setTempMarker] = useState<any>(null);
  const markersRef = useRef<any[]>([]);

  // Removed local fetchPlaces, use refreshPlaces from context

  useEffect(() => {
    if (!isMapLoaded) return;
    const { naver } = window as any;
    if (!mapElement.current || !naver) return;
    
    // Prevent double initialization
    if (mapInstance.current) return;

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
  }, [isMapLoaded]);

  useEffect(() => {
    refreshPlaces();
  }, [refreshPlaces]);

  // Handle Temp Pin from Context (Search Address)
  useEffect(() => {
    const { naver } = window as any;
    let marker: any = null;

    if (mapInstance.current && naver && tempPin) {
        marker = new naver.maps.Marker({
            position: new naver.maps.LatLng(tempPin.lat, tempPin.lng),
            map: mapInstance.current,
            icon: {
                content: '<div style="width: 24px; height: 24px; background: #FF5733; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.5); cursor: pointer; display: flex; justify-content: center; align-items: center; color: white; font-size: 14px;">+</div>',
                anchor: new naver.maps.Point(12, 12)
            },
            animation: naver.maps.Animation.BOUNCE,
            draggable: true
        });

        naver.maps.Event.addListener(marker, 'click', () => {
            const position = marker.getPosition();
            setNewLocation({ lat: position.y, lng: position.x });
            setCreateModalOpen(true);
        });
        
        // Stop bounce on drag start
        naver.maps.Event.addListener(marker, 'dragstart', () => {
            marker.setAnimation(null);
        });
    }

    return () => {
        if (marker) {
            marker.setMap(null);
        }
    };
  }, [tempPin]);

  // Handle Focus from Context
  useEffect(() => {
    const { naver } = window as any;
    if (mapInstance.current && focusedLocation && naver) {
      const { lat, lng, zoom } = focusedLocation;
      const newCenter = new naver.maps.LatLng(lat, lng);
      
      mapInstance.current.panTo(newCenter);
      
      if (zoom) {
          mapInstance.current.setZoom(zoom);
      }
    }
  }, [focusedLocation]);

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
              await refreshPlaces();
              setCreateModalOpen(false);
              if (tempMarker) {
                  tempMarker.setMap(null);
                  setTempMarker(null);
              }
              if (tempPin) {
                  setTempPin(null);
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
              
              // Refresh all places to keep context in sync
              await refreshPlaces();
          } catch (e) {
              console.error("Failed to add memory", e);
          }
      }
  };

  const handleDeletePlace = async (placeId: number) => {
      const token = localStorage.getItem('token');
      if (token) {
          if (window.confirm(t('confirm_delete'))) {
              try {
                  await deletePlace(token, placeId);
                  await refreshPlaces();
                  setDetailModalOpen(false);
                  setSelectedPlace(null);
              } catch (e) {
                  console.error("Failed to delete place", e);
              }
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
    <div className="map-container">
      <div 
        ref={mapElement} 
        className="map-element"
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
        aria-label={isSelectingLocation ? t('common.cancel', 'Cancel') : t('places.add_place', 'Add Place')}
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
            onClose={() => {
              setDetailModalOpen(false);
              setSelectedPlace(null);
            }}
            place={selectedPlace}
            onAddMemory={handleAddMemory}
            onDeletePlace={() => handleDeletePlace(selectedPlace.id)}
          />
      )}
    </div>
  );
};

export default NaverMap;
