import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import CountryFlag from './CountryFlag';
import { COUNTRIES } from '../data/countries';
import { countryName } from '../data/sectors';

// Lista con el nombre en español (y el inglés para que la búsqueda encuentre ambos)
const OPTIONS = COUNTRIES.map((c) => ({ ...c, es: countryName(c.code) })).sort((a, b) => a.es.localeCompare(b.es, 'es'));

const CountrySelect = ({ value, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Cerrar al tocar afuera
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

  // Foco en la búsqueda al abrir
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const q = search.toLowerCase();
  const filteredCountries = OPTIONS.filter(country =>
    country.es.toLowerCase().includes(q) ||
    country.name.toLowerCase().includes(q) ||
    country.code.toLowerCase().includes(q)
  );

  const selectedCountry = OPTIONS.find(c => c.code === value);

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
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-surface border border-line rounded-xl text-sm focus:border-primary outline-none transition-colors"
      >
        <div className="flex items-center gap-2">
          {value ? (
            <>
              <CountryFlag code={value} size="md" />
              <span>{selectedCountry?.es || value}</span>
            </>
          ) : (
            <span className="text-muted">Elegí un país</span>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-line rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Búsqueda */}
          <div className="p-2 border-b border-line">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar país..."
                className="w-full pl-8 pr-3 py-2 bg-surface border border-line rounded-lg text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Lista de países */}
          <div className="max-h-60 overflow-y-auto">
            {filteredCountries.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted text-center">
                No hay países con ese nombre
              </div>
            ) : (
              filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleSelect(country.code)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-line transition-colors ${
                    value === country.code ? 'bg-primary/10 text-primary' : ''
                  }`}
                >
                  <CountryFlag code={country.code} size="md" />
                  <span>{country.es}</span>
                  <span className="ml-auto text-muted text-xs">{country.code}</span>
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
