import React, { useEffect, useRef } from 'react';

const NaverMap = () => {
  const mapElement = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const { naver } = window as any;
    if (!mapElement.current || !naver) return;

    // Map initialization
    // Default to Seoul City Hall if no user location
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
    
    // Add a marker example
    new naver.maps.Marker({
      position: location,
      map,
    });
  }, []);

  return (
    <div 
      ref={mapElement} 
      style={{ 
        width: '100%', 
        height: '500px', 
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
      }} 
    />
  );
};

export default NaverMap;
