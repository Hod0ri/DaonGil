import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Place, getPlaces } from '../api/places';

interface MapContextType {
    places: Place[];
    refreshPlaces: () => Promise<void>;
    focusedLocation: { lat: number; lng: number; zoom?: number; timestamp: number } | null;
    focusLocation: (lat: number, lng: number, zoom?: number) => void;
    focusPlace: (placeId: number) => void;
    searchPlaces: (query: string) => Place[];
    searchAddress: (query: string) => Promise<any[]>;
    tempPin: { lat: number; lng: number; address: string; name: string } | null;
    setTempPin: (pin: { lat: number; lng: number; address: string; name: string } | null) => void;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

export const MapProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [places, setPlaces] = useState<Place[]>([]);
    const [focusedLocation, setFocusedLocation] = useState<{ lat: number; lng: number; zoom?: number; timestamp: number } | null>(null);
    const [tempPin, setTempPin] = useState<{ lat: number; lng: number; address: string; name: string } | null>(null);

    const refreshPlaces = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const data = await getPlaces(token);
                setPlaces(data);
            } catch (error) {
                console.error("Failed to fetch places", error);
            }
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        refreshPlaces();
    }, [refreshPlaces]);

    const focusLocation = useCallback((lat: number, lng: number, zoom?: number) => {
        setFocusedLocation({ lat, lng, zoom, timestamp: Date.now() });
    }, []);

    const focusPlace = useCallback((placeId: number) => {
        const place = places.find(p => p.id === placeId);
        if (place) {
            focusLocation(place.latitude, place.longitude, 15);
        } else {
            console.warn(`Place ${placeId} not found`);
        }
    }, [places, focusLocation]);

    const searchPlaces = useCallback((query: string): Place[] => {
        if (!query) return [];
        const lowerQuery = query.toLowerCase();
        return places.filter(place => 
            place.name.toLowerCase().includes(lowerQuery) || 
            (place.address && place.address.toLowerCase().includes(lowerQuery))
        );
    }, [places]);

    const searchAddress = useCallback((query: string): Promise<any[]> => {
        return new Promise((resolve) => {
            const { naver } = window as any;
            if (!naver || !naver.maps || !naver.maps.Service) {
                console.warn("Naver Maps Service not available");
                resolve([]);
                return;
            }

            naver.maps.Service.geocode({
                query: query
            }, function(status: any, response: any) {
                if (status === naver.maps.Service.Status.OK && response.v2.addresses.length > 0) {
                    resolve(response.v2.addresses);
                } else {
                    resolve([]);
                }
            });
        });
    }, []);

    return (
        <MapContext.Provider value={{ places, refreshPlaces, focusedLocation, focusLocation, focusPlace, searchPlaces, searchAddress, tempPin, setTempPin }}>
            {children}
        </MapContext.Provider>
    );
};

export const useMapContext = () => {
    const context = useContext(MapContext);
    if (!context) {
        throw new Error('useMapContext must be used within a MapProvider');
    }
    return context;
};
