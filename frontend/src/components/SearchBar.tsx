import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMapContext } from '../contexts/MapContext';

interface SearchBarProps {
    onFocusPlace?: (placeId: number) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onFocusPlace }) => {
    const { t } = useTranslation();
    const { searchPlaces, searchAddress, focusPlace, focusLocation, setTempPin } = useMapContext();
    const [searchMode, setSearchMode] = useState<'places' | 'address'>('places');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const searchRef = useRef<HTMLDivElement>(null);

    // Close search results when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setSearchResults([]);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (query.length > 0) {
            if (searchMode === 'places') {
                const results = searchPlaces(query);
                setSearchResults(results);
            } else {
                // Debounce could be good here, but for now simple implementation
                if (query.length > 1) {
                    const results = await searchAddress(query);
                    setSearchResults(results);
                }
            }
        } else {
            setSearchResults([]);
        }
    };

    const handleSelectResult = (result: any) => {
        if (searchMode === 'places') {
            focusPlace(result.id);
            setTempPin(null);
            if (onFocusPlace) onFocusPlace(result.id);
        } else {
            const lat = parseFloat(result.y);
            const lng = parseFloat(result.x);
            focusLocation(lat, lng, 15);
            setTempPin({
                lat,
                lng,
                address: result.roadAddress || result.jibunAddress || result.addressElements?.map((e: any) => e.longName).join(' '),
                name: searchQuery
            });
        }
        setSearchQuery('');
        setSearchResults([]);
    };

    return (
        <div style={{ position: 'relative', margin: '0 auto 1.5rem', width: '100%', maxWidth: '600px' }} ref={searchRef}>
            <div style={{ position: 'relative', width: '100%', display: 'flex', gap: '8px' }}>
                <select
                    value={searchMode}
                    onChange={(e) => {
                        setSearchMode(e.target.value as 'places' | 'address');
                        setSearchQuery('');
                        setSearchResults([]);
                    }}
                    style={{
                        padding: '12px 16px',
                        borderRadius: '25px',
                        border: '1px solid #ddd',
                        fontSize: '0.9rem',
                        fontFamily: 'var(--font-main)',
                        backgroundColor: 'white',
                        outline: 'none',
                        cursor: 'pointer',
                        flexShrink: 0
                    }}
                >
                    <option value="places">{t('search_mode_places') || "Pins"}</option>
                    <option value="address">{t('search_mode_address') || "Address"}</option>
                </select>

                <div style={{ position: 'relative', flex: 1 }}>
                    <input 
                        type="text" 
                        placeholder={searchMode === 'places' ? (t('search_placeholder') || "Search places...") : (t('search_address_placeholder') || "Search address...")}
                        value={searchQuery}
                        onChange={handleSearch}
                        onFocus={() => {
                            if (searchQuery.length > 0) {
                                // re-trigger search
                                const e = { target: { value: searchQuery } } as React.ChangeEvent<HTMLInputElement>;
                                handleSearch(e);
                            }
                        }}
                        style={{
                            width: '100%',
                            padding: '12px 20px 12px 40px',
                            borderRadius: '25px',
                            border: '1px solid #ddd',
                            fontSize: '1rem',
                            fontFamily: 'var(--font-main)',
                            backgroundColor: 'white',
                            outline: 'none',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                        }}
                    />
                    <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="20" 
                        height="20" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="#999" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
                    >
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </div>
            </div>

            {searchResults.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                    zIndex: 1000,
                    marginTop: '5px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    border: '1px solid #eee'
                }}>
                    {searchResults.map((result, index) => (
                        <div 
                            key={searchMode === 'places' ? result.id : index}
                            onClick={() => handleSelectResult(result)}
                            style={{
                                padding: '12px 20px',
                                borderBottom: '1px solid #f0f0f0',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}
                            className="search-item"
                        >
                            {searchMode === 'places' ? (
                                <>
                                    <div style={{ 
                                        width: '12px', 
                                        height: '12px', 
                                        borderRadius: '50%', 
                                        backgroundColor: result.color 
                                    }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{result.name}</div>
                                        {result.address && (
                                            <div style={{ fontSize: '0.85rem', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {result.address}
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
                                        {result.roadAddress || result.jibunAddress || "Unknown Address"}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                        {result.jibunAddress !== result.roadAddress ? result.jibunAddress : ''}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SearchBar;
