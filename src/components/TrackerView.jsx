import React, { useState, useMemo } from 'react';
import { Search, Check, X, Edit3, Mail, Filter, Wine, Hotel, EyeOff, Eye, Loader2 } from 'lucide-react';
import { useWineries, useHousekeeping, useConfig } from '../hooks/useFirebaseData';

const TrackerView = () => {
  const [sector, setSector] = useState('winery'); // 'winery' or 'housekeeping'
  const { wineries, loading: wineriesLoading, updateWinery } = useWineries();
  const { housekeeping, loading: housekeepingLoading, updateHousekeeping } = useHousekeeping();
  const { flags = {}, statusOptions = [], loading: configLoading } = useConfig();

  const [showHidden, setShowHidden] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [showCountryFilter, setShowCountryFilter] = useState(false);
  const [selectedWinery, setSelectedWinery] = useState(null); // For Modal
  const [copiedEmail, setCopiedEmail] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Get current dataset based on sector
  const currentData = sector === 'winery' ? wineries : housekeeping;
  const updateCurrentData = sector === 'winery' ? updateWinery : updateHousekeeping;
  const loading = wineriesLoading || housekeepingLoading || configLoading;

  // Get unique countries
  const uniqueCountries = useMemo(() => {
    const countries = [...new Set(currentData.map(w => w.country))];
    return countries.sort();
  }, [currentData]);

  // Toggle Status Function
  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateCurrentData(id, { status: newStatus });
      if (selectedWinery) setSelectedWinery({ ...selectedWinery, status: newStatus });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Toggle country filter
  const toggleCountry = (country) => {
    setSelectedCountries(prev =>
      prev.includes(country)
        ? prev.filter(c => c !== country)
        : [...prev, country]
    );
  };

  // Hide company
  const hideCompany = async (id) => {
    try {
      await updateCurrentData(id, { hidden: true });
    } catch (error) {
      console.error('Error hiding company:', error);
    }
  };

  // Show all hidden companies
  const showAllHidden = () => {
    setShowHidden(!showHidden);
  };

  const filteredWineries = currentData.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.country.toLowerCase().includes(search.toLowerCase());
    const matchesCountry = selectedCountries.length === 0 || selectedCountries.includes(w.country);
    const isNotHidden = showHidden || !w.hidden;
    return matchesSearch && matchesCountry && isNotHidden;
  });

  const hiddenCount = currentData.filter(w => w.hidden).length;

  // Copy single email
  const copyEmail = (email, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  // Copy all emails
  const copyAllEmails = () => {
    const emails = filteredWineries
      .filter(w => w.email && w.email.trim() !== '')
      .map(w => w.email)
      .join(', ');
    navigator.clipboard.writeText(emails);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sector Toggle */}
      <div className="flex justify-center">
        <div className="bg-dark-sidebar p-1 rounded-full border border-dark-hover inline-flex">
          <button
            onClick={() => {
              setSector('winery');
              setSelectedCountries([]);
              setSearch("");
            }}
            className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all ${sector === 'winery' ? 'bg-dark-surface text-white shadow-sm' : 'text-dark-subtext hover:text-white'}`}
          >
            <Wine size={16} />
            Wineries
          </button>
          <button
            onClick={() => {
              setSector('housekeeping');
              setSelectedCountries([]);
              setSearch("");
            }}
            className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all ${sector === 'housekeeping' ? 'bg-dark-surface text-white shadow-sm' : 'text-dark-subtext hover:text-white'}`}
          >
            <Hotel size={16} />
            Housekeeping
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-semibold">
              {sector === 'winery' ? 'Winery' : 'Housekeeping'} Applications
            </h2>
            <p className="text-dark-subtext text-sm">
              Showing {filteredWineries.length} of {currentData.length} opportunities
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-2.5 text-dark-subtext w-4 h-4" />
              <input
                type="text"
                placeholder="Search winery or country..."
                className="w-full bg-dark-surface border border-transparent focus:border-accent rounded-full py-2 pl-10 pr-4 text-sm outline-none transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              onClick={copyAllEmails}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-accent text-black rounded-full text-sm font-medium hover:bg-accent/90 transition-all duration-200 hover:scale-105 whitespace-nowrap"
            >
              {copiedAll ? (
                <>
                  <Check size={16} className="animate-bounce" />
                  Copied!
                </>
              ) : (
                <>
                  <Mail size={16} />
                  Copy All Emails
                </>
              )}
            </button>
          </div>
        </div>

        {/* Country Filter */}
        <div className="relative">
          <button
            onClick={() => setShowCountryFilter(!showCountryFilter)}
            className="flex items-center gap-2 px-4 py-2 bg-dark-surface border border-dark-hover rounded-full text-sm font-medium hover:border-accent transition-all duration-200"
          >
            <Filter size={16} className={`transition-transform duration-200 ${showCountryFilter ? 'rotate-180' : ''}`} />
            Filter by Country
            {selectedCountries.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-accent text-black rounded-full text-xs">
                {selectedCountries.length}
              </span>
            )}
          </button>

          {showCountryFilter && (
            <div className="mt-2 p-3 bg-dark-sidebar border border-dark-hover rounded-2xl shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex flex-wrap gap-2">
                {uniqueCountries.map((country) => (
                  <button
                    key={country}
                    onClick={() => toggleCountry(country)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                      selectedCountries.includes(country)
                        ? 'bg-accent text-black'
                        : 'bg-dark-surface text-dark-text hover:bg-dark-hover'
                    }`}
                  >
                    <span className="text-lg">{flags[country]}</span>
                    <span>{country}</span>
                  </button>
                ))}
              </div>
              {selectedCountries.length > 0 && (
                <button
                  onClick={() => setSelectedCountries([])}
                  className="mt-3 text-xs text-dark-subtext hover:text-accent transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Table / List */}
      <div className="bg-dark-sidebar rounded-2xl overflow-hidden border border-dark-hover shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-dark-surface text-dark-subtext text-xs uppercase tracking-wider border-b border-dark-hover">
                <th className="p-4">Country</th>
                <th className="p-4">{sector === 'winery' ? 'Winery Name' : 'Hotel/Resort'}</th>
                <th className="p-4">Email</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-hover">
              {filteredWineries.map((winery) => (
                <tr key={winery.id} className="hover:bg-dark-hover/50 transition-colors group">
                  <td className="p-4 text-2xl">{flags[winery.country] || "🏳️"}</td>
                  <td className="p-4 font-medium">{winery.name}</td>
                  <td className="p-4">
                    {winery.email ? (
                      <button
                        onClick={(e) => copyEmail(winery.email, e)}
                        className="text-dark-subtext hover:text-accent text-sm font-mono transition-all duration-200 hover:underline decoration-accent decoration-2 underline-offset-2 cursor-pointer relative group/email"
                        title="Click to copy email"
                      >
                        {winery.email}
                        {copiedEmail === winery.email && (
                          <span className="absolute -right-16 top-0 flex items-center gap-1 text-green-400 text-xs font-sans animate-in fade-in slide-in-from-left-2">
                            <Check size={12} className="animate-bounce" />
                            Copied!
                          </span>
                        )}
                      </button>
                    ) : (
                      <span className="text-dark-subtext text-sm italic">No email</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${statusOptions.find(s=>s.label===winery.status)?.color}`}>
                      {winery.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedWinery(winery)}
                        className="p-2 rounded-full hover:bg-dark-surface text-accent transition-all duration-200 hover:rotate-12 hover:scale-110"
                        title="Edit details"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => hideCompany(winery.id)}
                        className="p-2 rounded-full hover:bg-dark-surface text-dark-subtext hover:text-red-400 transition-all duration-200 hover:scale-110"
                        title="Hide this company"
                      >
                        <EyeOff size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Show Hidden Companies Button */}
        {hiddenCount > 0 && (
          <div className="p-4 border-t border-dark-hover bg-dark-bg/50">
            <button
              onClick={showAllHidden}
              className="flex items-center gap-2 text-sm text-dark-subtext hover:text-accent transition-colors"
            >
              {showHidden ? (
                <>
                  <EyeOff size={14} />
                  Hide hidden companies ({hiddenCount})
                </>
              ) : (
                <>
                  <Eye size={14} />
                  Show hidden companies ({hiddenCount})
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedWinery && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-sidebar w-full max-w-md rounded-2xl border border-dark-hover shadow-2xl p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  {flags[selectedWinery.country]} {selectedWinery.name}
                </h3>
                <p className="text-dark-subtext text-sm mt-1">{selectedWinery.email}</p>
              </div>
              <button onClick={() => setSelectedWinery(null)} className="p-1 hover:bg-dark-surface rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium text-dark-subtext uppercase">Update Status</label>
              <div className="grid grid-cols-2 gap-2">
                {statusOptions.map((status) => (
                  <button
                    key={status.label}
                    onClick={() => handleStatusChange(selectedWinery.id, status.label)}
                    className={`p-2 rounded-lg text-sm border transition-all ${
                      selectedWinery.status === status.label
                      ? `${status.color} border-transparent text-white`
                      : 'border-dark-hover bg-dark-surface hover:border-dark-subtext'
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium text-dark-subtext uppercase">Notes</label>
                <textarea
                  className="w-full mt-2 bg-dark-bg rounded-xl p-3 text-sm border border-dark-hover focus:border-accent outline-none min-h-[100px]"
                  placeholder="Did they reply? What did they say?"
                  defaultValue={selectedWinery.notes}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedWinery(null)}
                className="px-4 py-2 bg-dark-text text-dark-bg font-semibold rounded-full hover:bg-white transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackerView;