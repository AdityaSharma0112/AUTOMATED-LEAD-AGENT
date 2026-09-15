import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  Search,
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

  // Autocomplete Suggestions State
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
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
      return <Store size={15} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />;
    }
    if (l.includes("city") || l.includes("town")) {
      return <Building2 size={15} color="#6366f1" style={{ flexShrink: 0, marginTop: '2px' }} />;
    }
    if (l.includes("landmark") || l.includes("poi")) {
      return <Navigation2 size={15} color="#8b5cf6" style={{ flexShrink: 0, marginTop: '2px' }} />;
    }
    return <MapPin size={15} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />;
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
      {/* Top Header & Mode Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            padding: '10px',
            background: 'var(--danger-bg)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '12px',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <MapPin size={22} color="#ef4444" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
                Google Maps Places & Lead Search
              </h2>
              <span className="badge badge-success" style={{ fontSize: '0.65rem', textTransform: 'uppercase', padding: '2px 8px' }}>
                Live Geodata
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Search any place worldwide with live Google Maps place typeahead and intelligent lead qualification.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          background: 'var(--tab-bg)',
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
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  <MapPin size={14} color="#ef4444" />
                  <span>LOCATION / CITY / PLACE</span>
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
                    if (suggestions.length > 0) setShowDropdown(true);
                  }}
                  placeholder="Search a place, city, or market on Google Maps..."
                  disabled={isSearching}
                  style={{
                    width: '100%',
                    padding: '12px 40px 12px 14px',
                    background: 'var(--bg-input)',
                    border: showDropdown ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.925rem',
                    outline: 'none',
                    boxShadow: showDropdown ? '0 0 0 3px rgba(99, 102, 241, 0.15)' : 'none',
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
              {showDropdown && suggestions.length > 0 && (
                <div
                  ref={dropdownRef}
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    right: 0,
                    background: 'var(--dropdown-bg)',
                    border: '1px solid var(--border-focus)',
                    borderRadius: '10px',
                    boxShadow: '0 16px 36px -4px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--border-subtle)',
                    zIndex: 100,
                    maxHeight: '320px',
                    overflowY: 'auto',
                  }}
                >
                  <div style={{
                    padding: '8px 14px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    color: 'var(--text-secondary)',
                    letterSpacing: '0.05em',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--table-head-bg)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Map size={13} color="#ef4444" />
                      <span>MATCHING PLACES</span>
                    </div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{suggestions.length} places found</span>
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
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--chip-active-bg)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {getPlaceTypeIcon(p.type_label)}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p.main_text}
                          </span>
                          {p.type_label && (
                            <span style={{
                              fontSize: '0.625rem',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: 'var(--chip-bg)',
                              color: 'var(--text-secondary)',
                              whiteSpace: 'nowrap'
                            }}>
                              {p.type_label}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                          {p.secondary_text || p.display_name}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected Location Card Banner */}
              {selectedPlace && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  background: 'var(--banner-bg)',
                  border: '1px solid var(--border-subtle)',
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
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>
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
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                <Building2 size={14} color="var(--accent-primary)" />
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
                  padding: '12px 14px',
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
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                <Sliders size={14} color="var(--accent-primary)" />
                <span>SEARCH RADIUS</span>
              </label>
              <select
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                disabled={isSearching}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.925rem',
                  outline: 'none',
                  cursor: 'pointer',
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
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                <Globe size={14} color="var(--accent-primary)" />
                <span>WEBSITE FILTER</span>
              </label>
              <select
                value={websiteFilter}
                onChange={(e) => setWebsiteFilter(e.target.value)}
                disabled={isSearching}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.925rem',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="no_website">No Website (High Opportunity Leads)</option>
                <option value="all">All Real Businesses (With & Without)</option>
                <option value="has_website">Has Website Only</option>
              </select>
            </div>
          </div>

          {/* Quick Filter Badges */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)' }}>Popular Cities:</span>
              {POPULAR_CITIES.map((c) => {
                const isSelected = cityInput === c.name;
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => {
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
                    }}
                    disabled={isSearching}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '0.725rem',
                      fontWeight: isSelected ? 700 : 500,
                      background: isSelected ? 'var(--chip-active-bg)' : 'var(--chip-bg)',
                      border: isSelected ? '1px solid var(--chip-active-border)' : '1px solid var(--chip-border)',
                      color: isSelected ? 'var(--accent-primary)' : 'var(--chip-text)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    📍 {c.name}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)' }}>Quick Categories:</span>
              {POPULAR_CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    disabled={isSearching}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '0.725rem',
                      fontWeight: isSelected ? 700 : 500,
                      background: isSelected ? 'var(--chip-active-bg)' : 'var(--chip-bg)',
                      border: isSelected ? '1px solid var(--chip-active-border)' : '1px solid var(--chip-border)',
                      color: isSelected ? 'var(--accent-primary)' : 'var(--chip-text)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Trigger Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={isSearching || !cityInput.trim() || !category.trim()}
              className="btn btn-primary"
              style={{
                padding: '12px 28px',
                fontSize: '0.925rem',
                borderRadius: '8px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
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
                padding: '15px 160px 15px 18px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                fontFamily: 'var(--font-main)',
                outline: 'none',
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
                padding: '9px 18px',
                borderRadius: '8px',
              }}
            >
              {isSearching ? <Loader2 size={16} className="live-pulse" /> : <Send size={16} />}
              <span>{isSearching ? 'Executing Agents...' : 'Run Pipeline'}</span>
            </button>
          </form>

          {/* Preset Prompts */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Quick Prompts:</span>
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
          background: 'var(--tab-bg)',
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
              background: 'var(--chip-bg)',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.775rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                <CheckCircle2 size={14} color="#10b981" />
                <span>1. Criteria & Intent</span>
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Targeted city, category & radius configured
              </p>
            </div>

            <div style={{
              padding: '10px',
              background: 'var(--chip-bg)',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.775rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                <CheckCircle2 size={14} color="#10b981" />
                <span>2. Multi-Source Research</span>
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Queried Maps, OpenStreetMap & Web Sources
              </p>
            </div>

            <div style={{
              padding: '10px',
              background: 'var(--chip-bg)',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.775rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                <CheckCircle2 size={14} color="#10b981" />
                <span>3. Verification & Dedup</span>
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Normalized phones, addresses & domain health
              </p>
            </div>

            <div style={{
              padding: '10px',
              background: 'var(--chip-bg)',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.775rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                <CheckCircle2 size={14} color="#10b981" />
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
