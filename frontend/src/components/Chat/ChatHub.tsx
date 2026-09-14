import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  Search,
  Compass,
  CheckCircle2,
  Loader2,
  MapPin,
  Building2,
  Sliders,
  Globe,
  Crosshair,
  Map,
  X,
  ExternalLink,
  Store,
  Navigation2
} from 'lucide-react';
import { SearchJob } from '../../types/lead';
import { api } from '../../services/api';

interface SearchParams {
  query?: string;
  city?: string;
  category?: string;
  radius_km?: number;
  website_filter?: string;
  lat?: number;
  lon?: number;
  locality?: string;
}

interface PlaceSuggestion {
  display_name: string;
  main_text: string;
  secondary_text: string;
  place_type?: string;
  type_label?: string;
  lat: number;
  lon: number;
  city: string;
  state: string;
  country: string;
}

interface RelatedPlace {
  name: string;
  type: string;
  city: string;
  lat?: number;
  lon?: number;
}

interface ChatHubProps {
  onSearch: (params: string | SearchParams) => Promise<void>;
  isSearching: boolean;
  activeJob: SearchJob | null;
}

const POPULAR_CITIES = [
  { name: 'Solan', state: 'Himachal Pradesh', lat: 30.9084, lon: 77.0999 },
  { name: 'Shimla', state: 'Himachal Pradesh', lat: 31.1048, lon: 77.1734 },
  { name: 'Kangra', state: 'Himachal Pradesh', lat: 32.0998, lon: 76.2691 },
  { name: 'Chandigarh', state: 'Punjab / Haryana', lat: 30.7333, lon: 76.7794 },
  { name: 'Delhi', state: 'Delhi NCR', lat: 28.6139, lon: 77.2090 },
  { name: 'Bangalore', state: 'Karnataka', lat: 12.9716, lon: 77.5946 },
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lon: 72.8777 },
  { name: 'Pune', state: 'Maharashtra', lat: 18.5204, lon: 73.8567 },
];

const POPULAR_CATEGORIES = [
  'General Store & Grocery',
  'Car Repair & Mechanic',
  'Plumbing Services',
  'Dental Clinic',
  'Restaurant & Cafe',
  'Hardware & Electrical',
  'Gym & Fitness',
  'Pharmacy & Medical',
];

const PRESET_PROMPTS = [
  "Find grocery and general stores in Solan that have no official website.",
  "Find car mechanics near Kangra without website for immediate outreach.",
  "Find high-rated restaurants in Shimla with no official website.",
  "Find dental clinics in Chandigarh with phone numbers and ratings over 4.0.",
];

export const ChatHub: React.FC<ChatHubProps> = ({ onSearch, isSearching, activeJob }) => {
  const [activeTab, setActiveTab] = useState<'direct' | 'prompt'>('direct');

  // Direct City & Category Mode States
  const [cityInput, setCityInput] = useState('Solan');
  const [selectedPlace, setSelectedPlace] = useState<PlaceSuggestion | null>({
    display_name: 'Solan, Himachal Pradesh, India',
    main_text: 'Solan',
    secondary_text: 'Himachal Pradesh, India',
    type_label: 'City / Town',
    lat: 30.9084,
    lon: 77.0999,
    city: 'Solan',
    state: 'Himachal Pradesh',
    country: 'India',
  });

  const [category, setCategory] = useState('General Store & Grocery');
  const [radiusKm, setRadiusKm] = useState(30);
  const [websiteFilter, setWebsiteFilter] = useState('no_website');

  // Autocomplete & Related Places States
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [relatedPlaces, setRelatedPlaces] = useState<RelatedPlace[]>([
    { name: "Mall Road", type: "Market & Commercial", city: "Solan", lat: 30.9045, lon: 77.1025 },
    { name: "Saproon", type: "Locality & Market", city: "Solan", lat: 30.9012, lon: 77.0950 },
    { name: "Chambaghat", type: "Sub-Town & Hub", city: "Solan", lat: 30.9230, lon: 77.1120 },
    { name: "Deonghat", type: "Locality & Hub", city: "Solan", lat: 30.8920, lon: 77.0850 },
    { name: "Kotla Nala", type: "Commercial Area", city: "Solan", lat: 30.9090, lon: 77.1010 },
    { name: "Kumarhatti", type: "Junction & Town", city: "Solan", lat: 30.8750, lon: 77.0500 },
    { name: "Kandaghat", type: "Subdivision & Town", city: "Solan", lat: 30.9600, lon: 77.1100 },
    { name: "Dharampur", type: "Town & Market", city: "Solan", lat: 30.9020, lon: 77.0250 },
    { name: "Barog", type: "Hill Station", city: "Solan", lat: 30.8900, lon: 77.0800 },
  ]);
  const [isFetchingPlaces, setIsFetchingPlaces] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // AI Prompt Mode State
  const [query, setQuery] = useState('');

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced Places Autocomplete
  useEffect(() => {
    if (!cityInput || cityInput.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsFetchingPlaces(true);
      try {
        const res = await api.getPlaceSuggestions(cityInput);
        setSuggestions(res.suggestions || []);
        if (res.related_places && res.related_places.length > 0) {
          setRelatedPlaces(res.related_places);
        }
        if (res.suggestions && res.suggestions.length > 0) {
          setShowDropdown(true);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setIsFetchingPlaces(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [cityInput]);

  const handleSelectPlace = (place: PlaceSuggestion) => {
    setSelectedPlace(place);
    setCityInput(place.main_text || place.city || place.display_name);
    setShowDropdown(false);
  };

  const handleSelectRelatedPlace = (rel: RelatedPlace) => {
    const fullName = `${rel.name}, ${rel.city}`;
    const newPlace: PlaceSuggestion = {
      display_name: `${rel.name}, ${rel.city}, India`,
      main_text: rel.name,
      secondary_text: `${rel.city}, India`,
      type_label: rel.type || "Locality",
      lat: rel.lat || (selectedPlace?.lat || 30.9084),
      lon: rel.lon || (selectedPlace?.lon || 77.0999),
      city: rel.city,
      state: selectedPlace?.state || "Himachal Pradesh",
      country: "India"
    };
    setSelectedPlace(newPlace);
    setCityInput(fullName);
    setShowDropdown(false);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}`);
          if (res.ok) {
            const data = await res.json();
            const feat = data.features?.[0] || {};
            const props = feat.properties || {};
            const locality = props.district || props.locality || props.street || "";
            const cityName = props.city || props.name || props.county || props.state || "My Location";
            const mainText = locality && locality !== cityName ? `${locality}, ${cityName}` : cityName;
            const newPlace: PlaceSuggestion = {
              display_name: `${mainText}, ${props.state || 'Himachal Pradesh'}, India`,
              main_text: mainText,
              secondary_text: `${props.state || ''}, ${props.country || 'India'}`,
              type_label: "Current GPS Location",
              lat,
              lon,
              city: cityName,
              state: props.state || '',
              country: props.country || 'India',
            };
            setSelectedPlace(newPlace);
            setCityInput(mainText);

            // Fetch related places for this detected city
            const placeRes = await api.getPlaceSuggestions(cityName);
            if (placeRes.related_places && placeRes.related_places.length > 0) {
              setRelatedPlaces(placeRes.related_places);
            }
          }
        } catch {
          alert("Could not determine address from your GPS location.");
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        alert(`Location permission denied: ${err.message}`);
      }
    );
  };

  const handleDirectSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSearching) return;
    const targetCity = selectedPlace?.city || cityInput.trim() || 'Solan';
    onSearch({
      city: targetCity,
      category: category.trim() || 'General Store',
      radius_km: radiusKm,
      website_filter: websiteFilter,
      lat: selectedPlace?.lat,
      lon: selectedPlace?.lon,
    });
  };

  const handlePromptSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isSearching) return;
    onSearch(query.trim());
  };

  const handleSelectPrompt = (prompt: string) => {
    setQuery(prompt);
    onSearch(prompt);
  };

  const getGoogleMapsUrl = () => {
    if (!selectedPlace) return `https://maps.google.com/?q=${encodeURIComponent(cityInput || 'Solan')}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedPlace.display_name || cityInput)}`;
  };

  const getPlaceTypeIcon = (typeLabel?: string) => {
    const l = (typeLabel || "").toLowerCase();
    if (l.includes("commercial") || l.includes("market") || l.includes("bazaar")) {
      return <Store size={15} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px' }} />;
    }
    if (l.includes("city") || l.includes("town")) {
      return <Building2 size={15} color="#60a5fa" style={{ flexShrink: 0, marginTop: '2px' }} />;
    }
    if (l.includes("landmark") || l.includes("poi")) {
      return <Navigation2 size={15} color="#a855f7" style={{ flexShrink: 0, marginTop: '2px' }} />;
    }
    return <MapPin size={15} color="#f43f5e" style={{ flexShrink: 0, marginTop: '2px' }} />;
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
      {/* Top Header & Mode Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            padding: '10px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <MapPin size={22} color="#ef4444" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
                Google Maps Places & Lead Search
              </h2>
              <span className="badge badge-success" style={{ fontSize: '0.65rem', textTransform: 'uppercase', padding: '2px 8px' }}>
                Live Geodata
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Search any place or locality worldwide with live Google Maps place typeahead and related area discovery.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          background: 'rgba(0, 0, 0, 0.35)',
          padding: '4px',
          borderRadius: '10px',
          border: '1px solid var(--border-subtle)',
          gap: '4px',
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('direct')}
            style={{
              padding: '7px 16px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 700,
              background: activeTab === 'direct' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'direct' ? '#ffffff' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
          >
            <MapPin size={14} />
            <span>Google Maps Search</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('prompt')}
            style={{
              padding: '7px 16px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 700,
              background: activeTab === 'prompt' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'prompt' ? '#ffffff' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
          >
            <Sparkles size={14} />
            <span>AI Natural Language</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Direct Google Maps Place & Category Search */}
      {activeTab === 'direct' && (
        <form onSubmit={handleDirectSearch}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '16px',
            marginBottom: '16px',
          }}>
            {/* Google Maps Places Autocomplete Input */}
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: '#fca5a5' }}>
                  <MapPin size={14} color="#ef4444" />
                  <span>GOOGLE MAPS LOCATION / PLACE</span>
                </label>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocating || isSearching}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.725rem',
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-primary)',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                  title="Detect your current city via GPS"
                >
                  <Crosshair size={13} className={isLocating ? "live-pulse" : ""} />
                  <span>{isLocating ? "Locating..." : "Use My GPS"}</span>
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={cityInput}
                  onChange={(e) => {
                    setCityInput(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => {
                    if (suggestions.length > 0 || relatedPlaces.length > 0) setShowDropdown(true);
                  }}
                  placeholder="Search a place, locality, market, or landmark on Google Maps..."
                  disabled={isSearching}
                  style={{
                    width: '100%',
                    padding: '13px 40px 13px 16px',
                    background: 'var(--bg-input)',
                    border: showDropdown ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.925rem',
                    outline: 'none',
                    boxShadow: showDropdown ? '0 0 0 3px rgba(99, 102, 241, 0.2)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                />

                {isFetchingPlaces ? (
                  <Loader2 size={16} className="live-pulse" style={{ position: 'absolute', right: '14px', top: '35%', color: 'var(--accent-primary)' }} />
                ) : cityInput ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCityInput('');
                      setSelectedPlace(null);
                      setSuggestions([]);
                    }}
                    style={{ position: 'absolute', right: '12px', top: '30%', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                  >
                    <X size={15} />
                  </button>
                ) : null}
              </div>

              {/* Google Maps Style Autocomplete Dropdown */}
              {showDropdown && (suggestions.length > 0 || relatedPlaces.length > 0) && (
                <div
                  ref={dropdownRef}
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    right: 0,
                    background: '#13182c',
                    border: '1px solid rgba(99, 102, 241, 0.35)',
                    borderRadius: '10px',
                    boxShadow: '0 16px 36px -4px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                    zIndex: 100,
                    maxHeight: '340px',
                    overflowY: 'auto',
                  }}
                >
                  <div style={{
                    padding: '8px 14px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    color: '#94a3b8',
                    letterSpacing: '0.05em',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(0, 0, 0, 0.25)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Map size={13} color="#ef4444" />
                      <span>GOOGLE MAPS PLACES MATCHING "{cityInput}"</span>
                    </div>
                    <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{suggestions.length} places found</span>
                  </div>

                  {/* Suggestions List */}
                  {suggestions.map((p, index) => (
                    <div
                      key={index}
                      onClick={() => handleSelectPlace(p)}
                      style={{
                        padding: '11px 14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.18)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {getPlaceTypeIcon(p.type_label)}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p.main_text}
                          </span>
                          {p.type_label && (
                            <span style={{
                              fontSize: '0.625rem',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: '#cbd5e1',
                              whiteSpace: 'nowrap'
                            }}>
                              {p.type_label}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                          {p.secondary_text || p.display_name}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Related Sub-Localities in Dropdown */}
                  {relatedPlaces.length > 0 && (
                    <div style={{ padding: '12px 14px', background: 'rgba(0, 0, 0, 0.4)', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#a5b4fc', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Store size={13} color="#f59e0b" />
                        <span>RELATED LOCALITIES & MARKETS IN THIS AREA:</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {relatedPlaces.slice(0, 8).map((rel, rIdx) => (
                          <button
                            key={rIdx}
                            type="button"
                            onClick={() => handleSelectRelatedPlace(rel)}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.7rem',
                              background: 'rgba(99, 102, 241, 0.15)',
                              border: '1px solid rgba(99, 102, 241, 0.3)',
                              color: '#e2e8f0',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span style={{ color: '#f43f5e' }}>📍</span>
                            <span>{rel.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Selected Location Card Banner */}
              {selectedPlace && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge badge-info" style={{ fontSize: '0.65rem', fontWeight: 700 }}>
                      📍 GPS: {selectedPlace.lat.toFixed(4)}, {selectedPlace.lon.toFixed(4)}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 600 }}>
                      {selectedPlace.main_text} ({selectedPlace.state || selectedPlace.country})
                    </span>
                  </div>
                  <a
                    href={getGoogleMapsUrl()}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      textDecoration: 'none',
                      fontWeight: 700,
                    }}
                  >
                    <span>View on Google Maps</span>
                    <ExternalLink size={11} />
                  </a>
                </div>
              )}
            </div>

            {/* Business Category Input */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: '#a5b4fc' }}>
                <Building2 size={14} />
                <span>BUSINESS TYPE / CATEGORY</span>
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. General Store, Grocery, Car Mechanic, Dentist, Restaurant..."
                disabled={isSearching}
                style={{
                  width: '100%',
                  padding: '13px 14px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.925rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* Radius (km) */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: '#a5b4fc' }}>
                <Sliders size={14} />
                <span>SEARCH RADIUS</span>
              </label>
              <select
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                disabled={isSearching}
                style={{
                  width: '100%',
                  padding: '13px 14px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.925rem',
                  outline: 'none',
                }}
              >
                <option value={10}>10 km (Immediate Local Market & Center)</option>
                <option value={20}>20 km (Surrounding Localities & Sub-Towns)</option>
                <option value={30}>30 km (Full District & Regional Radius)</option>
                <option value={50}>50 km (Broad Extended Metro / District)</option>
              </select>
            </div>

            {/* Website Filter */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: '#a5b4fc' }}>
                <Globe size={14} />
                <span>WEBSITE FILTER</span>
              </label>
              <select
                value={websiteFilter}
                onChange={(e) => setWebsiteFilter(e.target.value)}
                disabled={isSearching}
                style={{
                  width: '100%',
                  padding: '13px 14px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.925rem',
                  outline: 'none',
                }}
              >
                <option value="no_website">No Website (High Opportunity Leads)</option>
                <option value="all">All Real Businesses (With & Without)</option>
                <option value="has_website">Has Website Only</option>
              </select>
            </div>
          </div>

          {/* Related Places & Sub-Localities Interactive Tray */}
          {relatedPlaces.length > 0 && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1' }}>
                  <MapPin size={13} color="#f43f5e" />
                  <span>Related Places & Localities in {selectedPlace?.city || cityInput}:</span>
                </div>
                <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>Click to search that specific area</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {relatedPlaces.map((rel, rIdx) => {
                  const isActive = cityInput.includes(rel.name);
                  return (
                    <button
                      key={rIdx}
                      type="button"
                      onClick={() => handleSelectRelatedPlace(rel)}
                      disabled={isSearching}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.725rem',
                        fontWeight: 600,
                        background: isActive ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                        border: isActive ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.08)',
                        color: isActive ? '#ffffff' : '#94a3b8',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.borderColor = 'var(--accent-primary)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      }}
                    >
                      <span style={{ color: isActive ? '#ef4444' : '#64748b' }}>📍</span>
                      <span>{rel.name}</span>
                      <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginLeft: '2px' }}>({rel.type.split(' ')[0]})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Hub Badges */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)' }}>Popular Cities:</span>
              {POPULAR_CITIES.map((c) => {
                const isSelected = cityInput === c.name;
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={async () => {
                      setCityInput(c.name);
                      setSelectedPlace({
                        display_name: `${c.name}, ${c.state}, India`,
                        main_text: c.name,
                        secondary_text: `${c.state}, India`,
                        type_label: 'City',
                        lat: c.lat,
                        lon: c.lon,
                        city: c.name,
                        state: c.state,
                        country: 'India',
                      });
                      const placeRes = await api.getPlaceSuggestions(c.name);
                      if (placeRes.related_places && placeRes.related_places.length > 0) {
                        setRelatedPlaces(placeRes.related_places);
                      }
                    }}
                    disabled={isSearching}
                    style={{
                      padding: '3px 9px',
                      borderRadius: '12px',
                      fontSize: '0.725rem',
                      background: isSelected ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    📍 {c.name}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)' }}>Quick Categories:</span>
              {POPULAR_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  disabled={isSearching}
                  style={{
                    padding: '3px 9px',
                    borderRadius: '12px',
                    fontSize: '0.725rem',
                    background: category === cat ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                    border: category === cat ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    color: category === cat ? '#ffffff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Search Trigger Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={isSearching || !cityInput.trim() || !category.trim()}
              className="btn btn-primary"
              style={{
                padding: '13px 32px',
                fontSize: '0.95rem',
                borderRadius: '8px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
              }}
            >
              {isSearching ? <Loader2 size={18} className="live-pulse" /> : <Search size={18} />}
              <span>{isSearching ? `Searching in ${cityInput}...` : `Search ${category} in ${cityInput}`}</span>
            </button>
          </div>
        </form>
      )}

      {/* Mode 2: AI Natural Language Prompt Form */}
      {activeTab === 'prompt' && (
        <div>
          <form onSubmit={handlePromptSearch} style={{ position: 'relative', marginBottom: '16px' }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Find grocery stores in Solan with no website, research their details and prepare calling strategy..."
              disabled={isSearching}
              style={{
                width: '100%',
                padding: '16px 60px 16px 20px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                fontFamily: 'var(--font-main)',
                outline: 'none',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.4)',
              }}
            />
            <button
              type="submit"
              disabled={isSearching || !query.trim()}
              className="btn btn-primary"
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                padding: '10px 18px',
                borderRadius: '8px',
              }}
            >
              {isSearching ? <Loader2 size={16} className="live-pulse" /> : <Send size={16} />}
              <span>{isSearching ? 'Executing Agents...' : 'Run Pipeline'}</span>
            </button>
          </form>

          {/* Preset Prompts */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Quick Prompts:</span>
            {PRESET_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPrompt(p)}
                disabled={isSearching}
                className="btn btn-secondary"
                style={{
                  fontSize: '0.75rem',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                }}
              >
                <Sparkles size={12} color="var(--accent-secondary)" />
                <span>{p.length > 55 ? p.substring(0, 55) + '...' : p}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pipeline Status Stepper */}
      {(isSearching || activeJob) && (
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: 'rgba(0, 0, 0, 0.25)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                AGENT PIPELINE EXECUTION:
              </span>
              {activeJob?.parsed_intent?.category && (
                <span className="badge badge-info">
                  {activeJob.parsed_intent.category} in {activeJob.parsed_intent.location || 'Solan'} ({activeJob.parsed_intent.radius_km || 30}km)
                </span>
              )}
            </div>
            {activeJob && (
              <span className={`badge ${activeJob.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                {activeJob.status.toUpperCase()} ({activeJob.leads_found_count} leads ready)
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div style={{
              padding: '10px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.775rem', fontWeight: 600, color: '#a5b4fc' }}>
                <CheckCircle2 size={14} color="#34d399" />
                <span>1. Criteria & Intent</span>
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Targeted city, category & radius configured
              </p>
            </div>

            <div style={{
              padding: '10px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.775rem', fontWeight: 600, color: '#a5b4fc' }}>
                <CheckCircle2 size={14} color="#34d399" />
                <span>2. Multi-Source Research</span>
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Queried Maps, OpenStreetMap & Web Sources
              </p>
            </div>

            <div style={{
              padding: '10px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.775rem', fontWeight: 600, color: '#a5b4fc' }}>
                <CheckCircle2 size={14} color="#34d399" />
                <span>3. Verification & Dedup</span>
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Normalized phones, addresses & domain health
              </p>
            </div>

            <div style={{
              padding: '10px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.775rem', fontWeight: 600, color: '#a5b4fc' }}>
                <CheckCircle2 size={14} color="#34d399" />
                <span>4. Scoring & Strategy</span>
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Calculated 0-100 opportunity score & pitch
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

