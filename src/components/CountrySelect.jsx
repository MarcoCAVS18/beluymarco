import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import CountryFlag from './CountryFlag';
import { COUNTRIES } from '../data/countries';

const CountrySelect = ({ value, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const filteredCountries = COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(search.toLowerCase()) ||
    country.code.toLowerCase().includes(search.toLowerCase())
  );

  const selectedCountry = COUNTRIES.find(c => c.code === value);

  const handleSelect = (code) => {
    onChange(code);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-dark-bg border border-dark-hover rounded-xl text-sm focus:border-accent outline-none transition-colors"
      >
        <div className="flex items-center gap-2">
          {value ? (
            <>
              <CountryFlag code={value} size="md" />
              <span>{selectedCountry?.name || value}</span>
            </>
          ) : (
            <span className="text-dark-subtext">Select a country...</span>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-dark-subtext transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-dark-sidebar border border-dark-hover rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Search input */}
          <div className="p-2 border-b border-dark-hover">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-subtext" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search countries..."
                className="w-full pl-8 pr-3 py-2 bg-dark-bg border border-dark-hover rounded-lg text-sm outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Country list */}
          <div className="max-h-60 overflow-y-auto">
            {filteredCountries.length === 0 ? (
              <div className="px-4 py-3 text-sm text-dark-subtext text-center">
                No countries found
              </div>
            ) : (
              filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleSelect(country.code)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-dark-hover transition-colors ${
                    value === country.code ? 'bg-accent/10 text-accent' : ''
                  }`}
                >
                  <CountryFlag code={country.code} size="md" />
                  <span>{country.name}</span>
                  <span className="ml-auto text-dark-subtext text-xs">{country.code}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CountrySelect;
