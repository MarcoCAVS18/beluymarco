import React, { useState, useMemo } from 'react';
import { Search, Check, X, Edit3, Mail, Filter, EyeOff, Eye, Loader2, CheckSquare, Square, Download, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useWineries, useHousekeeping, useConfig } from '../hooks/useFirebaseData';
import { useExportCSV } from '../hooks/useExportCSV';
import { isRecentlyAdded } from '../data/constants';
import CountryFlag from './CountryFlag';
import CountrySelect from './CountrySelect';
import CreateCompanyModal from './CreateCompanyModal';
import SectorToggle from './SectorToggle';

const TrackerView = () => {
  const [sector, setSector] = useState('winery'); // 'winery' or 'housekeeping'
  const { wineries, loading: wineriesLoading, updateWinery, createWinery } = useWineries();
  const { housekeeping, loading: housekeepingLoading, updateHousekeeping, createHousekeeping } = useHousekeeping();
  const { statusOptions = [], loading: configLoading } = useConfig();
  const { exportToCSV } = useExportCSV();

  const [showHidden, setShowHidden] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [showCountryFilter, setShowCountryFilter] = useState(false);
  const [selectedWinery, setSelectedWinery] = useState(null); // For Modal
  const [copiedEmail, setCopiedEmail] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkEditMode, setBulkEditMode] = useState(false); // true when editing multiple
  const [editNotes, setEditNotes] = useState(''); // For tracking notes in edit modal
  const [editEmail, setEditEmail] = useState(''); // For tracking email in edit modal
  const [editName, setEditName] = useState(''); // For tracking name in edit modal
  const [editLocation, setEditLocation] = useState(''); // For tracking location in edit modal
  const [editCountry, setEditCountry] = useState(''); // For tracking country in edit modal
  const [editHarvestSeason, setEditHarvestSeason] = useState(''); // For tracking harvest/season in edit modal
  const [editEmailVerified, setEditEmailVerified] = useState(null); // null | false | true
  const [selectedStatus, setSelectedStatus] = useState(null); // For filtering by status
  const [showCreateModal, setShowCreateModal] = useState(false); // For create modal

  // Get current dataset based on sector
  const currentData = sector === 'winery' ? wineries : housekeeping;
  const updateCurrentData = sector === 'winery' ? updateWinery : updateHousekeeping;
  const loading = wineriesLoading || housekeepingLoading || configLoading;

  // Get unique countries
  const uniqueCountries = useMemo(() => {
    const countries = [...new Set(currentData.map(w => w.country))];
    return countries.sort();
  }, [currentData]);

  // Get selected items for bulk operations
  const selectedItems = useMemo(() => {
    if (!bulkEditMode || selectedIds.size === 0) return [];
    return currentData.filter(w => selectedIds.has(w.id));
  }, [bulkEditMode, selectedIds, currentData]);

  // Toggle Status Function (supports single and bulk update)
  const handleStatusChange = async (id, newStatus) => {
    try {
      if (bulkEditMode && selectedIds.size > 0) {
        // Bulk update all selected items
        await Promise.all([...selectedIds].map(selectedId =>
          updateCurrentData(selectedId, { status: newStatus })
        ));
      } else {
        await updateCurrentData(id, { status: newStatus });
        if (selectedWinery) setSelectedWinery({ ...selectedWinery, status: newStatus });
      }
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

  // Hide company (supports single and bulk hide)
  const hideCompany = async (id) => {
    try {
      if (isSelecting && selectedIds.size > 0 && selectedIds.has(id)) {
        // Bulk hide all selected items
        await Promise.all([...selectedIds].map(selectedId =>
          updateCurrentData(selectedId, { hidden: true })
        ));
        setSelectedIds(new Set());
        setIsSelecting(false);
      } else {
        await updateCurrentData(id, { hidden: true });
      }
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
    const matchesStatus = !selectedStatus || w.status === selectedStatus;
    const isNotHidden = showHidden || !w.hidden;
    return matchesSearch && matchesCountry && matchesStatus && isNotHidden;
  });

  const hiddenCount = currentData.filter(w => w.hidden).length;

  // Count by status
  const statusCounts = useMemo(() => {
    return statusOptions.reduce((acc, status) => {
      acc[status.label] = currentData.filter(w => w.status === status.label && !w.hidden).length;
      return acc;
    }, {});
  }, [currentData, statusOptions]);

  // Copy single email
  const copyEmail = (email, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  // Copy all emails (or selected if in selection mode)
  const copyAllEmails = () => {
    let emailsToCopy;

    if (isSelecting && selectedIds.size > 0) {
      // Copy only selected emails
      emailsToCopy = filteredWineries
        .filter(w => selectedIds.has(w.id) && w.email && w.email.trim() !== '')
        .map(w => w.email)
        .join(', ');
    } else {
      // Copy all filtered emails
      emailsToCopy = filteredWineries
        .filter(w => w.email && w.email.trim() !== '')
        .map(w => w.email)
        .join(', ');
    }

    navigator.clipboard.writeText(emailsToCopy);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  // Toggle selection mode
  const toggleSelectionMode = () => {
    if (isSelecting) {
      // Exiting selection mode - clear selections
      setSelectedIds(new Set());
    }
    setIsSelecting(!isSelecting);
  };

  // Toggle individual selection
  const toggleSelection = (id) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Select all visible
  const selectAllVisible = () => {
    const allVisibleIds = filteredWineries.map(w => w.id);
    setSelectedIds(new Set(allVisibleIds));
  };

  // Clear all selections
  const clearAllSelections = () => {
    setSelectedIds(new Set());
  };

  // Open edit modal (supports single and bulk edit)
  const openEditModal = (winery) => {
    if (isSelecting && selectedIds.size > 0 && selectedIds.has(winery.id)) {
      // Bulk edit mode
      setBulkEditMode(true);
      setSelectedWinery(winery); // Use first selected item to open modal
    } else {
      // Single edit mode
      setBulkEditMode(false);
      setSelectedWinery(winery);
      setEditName(winery.name || '');
      setEditEmail(winery.email || '');
      setEditLocation(winery.location || '');
      setEditCountry(winery.country || 'NZ');
      setEditHarvestSeason(sector === 'winery' ? (winery.harvestStart || '') : (winery.season || ''));
      setEditNotes(winery.notes || '');
      setEditEmailVerified(winery.emailVerified ?? null);
    }
  };

  // Close modal and save all fields
  const closeModal = async () => {
    if (!bulkEditMode && selectedWinery) {
      const updates = {};
      // Save all changed fields
      if (editName !== (selectedWinery.name || '')) {
        updates.name = editName;
      }
      if (editEmail !== (selectedWinery.email || '')) {
        updates.email = editEmail;
        // Si el email cambió, resetear verificación
        if (editEmail) {
          updates.emailVerified = false;
        } else {
          updates.emailVerified = null;
        }
      }
      if (editEmailVerified !== (selectedWinery.emailVerified ?? null)) {
        updates.emailVerified = editEmailVerified;
      }
      if (editLocation !== (selectedWinery.location || '')) {
        updates.location = editLocation;
      }
      if (editCountry !== (selectedWinery.country || '')) {
        updates.country = editCountry;
      }
      // Handle harvest/season based on sector
      const currentHarvestSeason = sector === 'winery' ? (selectedWinery.harvestStart || '') : (selectedWinery.season || '');
      if (editHarvestSeason !== currentHarvestSeason) {
        if (sector === 'winery') {
          updates.harvestStart = editHarvestSeason;
        } else {
          updates.season = editHarvestSeason;
        }
      }
      if (editNotes !== (selectedWinery.notes || '')) {
        updates.notes = editNotes;
      }
      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        try {
          await updateCurrentData(selectedWinery.id, updates);
        } catch (error) {
          console.error('Error saving changes:', error);
        }
      }
    }

    setSelectedWinery(null);
    setEditName('');
    setEditEmail('');
    setEditLocation('');
    setEditCountry('');
    setEditHarvestSeason('');
    setEditNotes('');
    setEditEmailVerified(null);
    if (bulkEditMode) {
      setBulkEditMode(false);
      setSelectedIds(new Set());
      setIsSelecting(false);
    }
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
      <SectorToggle
        sector={sector}
        onSectorChange={(newSector) => {
          setSector(newSector);
          setSelectedCountries([]);
          setSearch("");
          setSelectedIds(new Set());
          setIsSelecting(false);
          setSelectedStatus(null);
        }}
        onAddNew={() => setShowCreateModal(true)}
      />

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
              onClick={toggleSelectionMode}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 whitespace-nowrap ${
                isSelecting
                  ? 'bg-purple-600 text-white hover:bg-purple-500'
                  : 'bg-dark-surface border border-dark-hover text-dark-text hover:border-accent'
              }`}
            >
              <CheckSquare size={16} />
              {isSelecting ? 'Cancel' : 'Select'}
            </button>
            <button
              onClick={copyAllEmails}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-accent text-black rounded-full text-sm font-medium hover:bg-accent/90 transition-all duration-200 hover:scale-105 whitespace-nowrap"
            >
              {copiedAll ? (
                <>
                  <Check size={16} className="animate-bounce" />
                  Copied!
                </>
              ) : isSelecting && selectedIds.size > 0 ? (
                <>
                  <Mail size={16} />
                  Copy Selected ({selectedIds.size})
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
                    <CountryFlag code={country} size="md" />
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

      {/* Selection Info Bar */}
      {isSelecting && (
        <div className="flex items-center justify-between bg-purple-900/30 border border-purple-500/30 rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <CheckSquare size={18} className="text-purple-400" />
            <span className="text-sm">
              <span className="font-semibold text-purple-300">{selectedIds.size}</span>
              <span className="text-dark-subtext"> of {filteredWineries.length} selected</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={selectAllVisible}
              className="text-xs px-3 py-1.5 bg-purple-600/50 hover:bg-purple-600 text-white rounded-full transition-colors"
            >
              Select All
            </button>
            {selectedIds.size > 0 && (
              <button
                onClick={clearAllSelections}
                className="text-xs px-3 py-1.5 bg-dark-surface hover:bg-dark-hover text-dark-text rounded-full transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table / List */}
      <div className="bg-dark-sidebar rounded-2xl overflow-hidden border border-dark-hover shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-dark-surface text-dark-subtext text-xs uppercase tracking-wider border-b border-dark-hover">
                {isSelecting && (
                  <th className="p-4 w-12">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={selectedIds.size === filteredWineries.length ? clearAllSelections : selectAllVisible}
                        className="p-1 hover:bg-dark-hover rounded transition-colors"
                        title={selectedIds.size === filteredWineries.length ? "Deselect all" : "Select all"}
                      >
                        {selectedIds.size === filteredWineries.length ? (
                          <CheckSquare size={18} className="text-accent" />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>
                    </div>
                  </th>
                )}
                <th className="p-4">Country</th>
                <th className="p-4">{sector === 'winery' ? 'Winery Name' : 'Hotel/Resort'}</th>
                <th className="p-4">Email</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-hover">
              {filteredWineries.map((winery) => (
                <tr
                  key={winery.id}
                  className={`hover:bg-dark-hover/50 transition-colors group ${
                    isSelecting && selectedIds.has(winery.id) ? 'bg-accent/10' : ''
                  }`}
                  onClick={isSelecting ? () => toggleSelection(winery.id) : undefined}
                  style={isSelecting ? { cursor: 'pointer' } : undefined}
                >
                  {isSelecting && (
                    <td className="p-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelection(winery.id);
                        }}
                        className="p-1 hover:bg-dark-surface rounded transition-colors"
                      >
                        {selectedIds.has(winery.id) ? (
                          <CheckSquare size={18} className="text-accent" />
                        ) : (
                          <Square size={18} className="text-dark-subtext" />
                        )}
                      </button>
                    </td>
                  )}
                  <td className="p-4"><CountryFlag code={winery.country} size="lg" /></td>
                  <td className="p-4 font-medium">
                    <span className="inline-flex items-center gap-2">
                      {winery.name}
                      {isRecentlyAdded(winery.createdAt) && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-green-500/20 text-green-300 border border-green-500/30"
                          title="Agregada recientemente"
                        >
                          New
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="p-4">
                    {winery.email ? (
                      <div className="flex items-center gap-2">
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
                        {winery.emailVerified === true ? (
                          <ShieldCheck size={14} className="text-green-400 flex-shrink-0" title="Email verificado" />
                        ) : winery.emailVerified === false ? (
                          <ShieldAlert size={14} className="text-amber-400 flex-shrink-0" title="Email sin verificar — abrí el modal para confirmarlo" />
                        ) : null}
                      </div>
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
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(winery);
                        }}
                        className="p-2 rounded-full hover:bg-dark-surface text-accent transition-all duration-200 hover:rotate-12 hover:scale-110"
                        title={isSelecting && selectedIds.size > 0 && selectedIds.has(winery.id) ? `Edit ${selectedIds.size} selected` : "Edit details"}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          hideCompany(winery.id);
                        }}
                        className="p-2 rounded-full hover:bg-dark-surface text-dark-subtext hover:text-red-400 transition-all duration-200 hover:scale-110"
                        title={isSelecting && selectedIds.size > 0 && selectedIds.has(winery.id) ? `Hide ${selectedIds.size} selected` : "Hide this company"}
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

        {/* Status Legend */}
        <div className="px-4 py-3 border-t border-dark-hover bg-dark-bg/30">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {statusOptions.map((status) => (
                <button
                  key={status.label}
                  onClick={() => setSelectedStatus(selectedStatus === status.label ? null : status.label)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full transition-all ${
                    selectedStatus === status.label
                      ? `${status.color} text-white`
                      : 'text-dark-subtext hover:text-dark-text hover:bg-dark-hover'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${selectedStatus === status.label ? 'bg-white' : status.color}`}></span>
                  <span>{statusCounts[status.label] || 0} {status.label.toLowerCase()}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => exportToCSV(currentData, statusOptions, sector, selectedStatus)}
              className="p-1.5 text-dark-subtext hover:text-accent transition-colors"
              title="Download CSV"
            >
              <Download size={16} />
            </button>
          </div>
        </div>

        {/* Show Hidden Companies Button */}
        {hiddenCount > 0 && (
          <div className="px-4 py-3 border-t border-dark-hover bg-dark-bg/50">
            <button
              onClick={showAllHidden}
              className="flex items-center gap-2 text-xs text-dark-subtext hover:text-accent transition-colors"
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

      {/* Edit Modal (single and bulk) */}
      {selectedWinery && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-sidebar w-full max-w-md rounded-2xl border border-dark-hover shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-dark-hover sticky top-0 bg-dark-sidebar">
              <h3 className="text-xl font-bold">
                {bulkEditMode && selectedItems.length > 0 ? (
                  <span className="flex items-center gap-2">
                    <CheckSquare size={20} className="text-purple-400" />
                    Editing {selectedItems.length} items
                  </span>
                ) : (
                  'Edit Company'
                )}
              </h3>
              <button onClick={closeModal} className="p-1 hover:bg-dark-surface rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {bulkEditMode && selectedItems.length > 0 ? (
                <>
                  {/* Bulk edit: show selected items */}
                  <div className="max-h-20 overflow-y-auto mb-4">
                    <div className="flex flex-wrap gap-1">
                      {selectedItems.map((item) => (
                        <span key={item.id} className="text-dark-subtext text-xs bg-dark-surface px-2 py-1 rounded-full flex items-center gap-1">
                          <CountryFlag code={item.country} size="sm" /> {item.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Bulk edit: only status */}
                  <div>
                    <label className="block text-sm font-medium text-dark-subtext mb-2 uppercase">
                      Update Status for All {selectedItems.length} Items
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {statusOptions.map((status) => {
                        const isActive = selectedItems.every(item => item.status === status.label);
                        return (
                          <button
                            key={status.label}
                            onClick={() => handleStatusChange(selectedWinery.id, status.label)}
                            className={`p-2 rounded-lg text-sm border transition-all ${
                              isActive
                              ? `${status.color} border-transparent text-white`
                              : 'border-dark-hover bg-dark-surface hover:border-dark-subtext'
                            }`}
                          >
                            {status.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Single edit: all fields */}
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-dark-subtext mb-1.5">Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-dark-bg border border-dark-hover rounded-xl text-sm outline-none focus:border-accent transition-colors"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-dark-subtext mb-1.5">Email</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => {
                        setEditEmail(e.target.value);
                        // Si cambia el email, se vuelve no verificado
                        if (e.target.value) setEditEmailVerified(false);
                        else setEditEmailVerified(null);
                      }}
                      placeholder="contact@example.com"
                      className="w-full px-4 py-2.5 bg-dark-bg border border-dark-hover rounded-xl text-sm outline-none focus:border-accent transition-colors"
                    />
                  </div>

                  {/* Email Verified */}
                  {editEmail && (
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl border transition-colors"
                      style={{ borderColor: editEmailVerified ? '#22c55e44' : '#f59e0b44', background: editEmailVerified ? '#22c55e11' : '#f59e0b11' }}
                    >
                      <div className="flex items-center gap-2">
                        {editEmailVerified ? (
                          <ShieldCheck size={16} className="text-green-400" />
                        ) : (
                          <ShieldAlert size={16} className="text-amber-400" />
                        )}
                        <span className="text-sm font-medium" style={{ color: editEmailVerified ? '#4ade80' : '#fbbf24' }}>
                          {editEmailVerified ? 'Email verificado' : 'Email sin verificar'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditEmailVerified(prev => !prev)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                          editEmailVerified
                            ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                            : 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                        }`}
                      >
                        {editEmailVerified ? 'Marcar sin verificar' : 'Confirmar email ✓'}
                      </button>
                    </div>
                  )}

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-dark-subtext mb-1.5">Location</label>
                    <input
                      type="text"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      placeholder="City, Region"
                      className="w-full px-4 py-2.5 bg-dark-bg border border-dark-hover rounded-xl text-sm outline-none focus:border-accent transition-colors"
                    />
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-sm font-medium text-dark-subtext mb-1.5">Country</label>
                    <CountrySelect
                      value={editCountry}
                      onChange={setEditCountry}
                    />
                  </div>

                  {/* Harvest Start / Season */}
                  <div>
                    <label className="block text-sm font-medium text-dark-subtext mb-1.5">
                      {sector === 'winery' ? 'Harvest Start' : 'Season'}
                    </label>
                    <input
                      type="text"
                      value={editHarvestSeason}
                      onChange={(e) => setEditHarvestSeason(e.target.value)}
                      placeholder={sector === 'winery' ? 'e.g. "finales de agosto"' : 'e.g. "Winter 2026"'}
                      className="w-full px-4 py-2.5 bg-dark-bg border border-dark-hover rounded-xl text-sm outline-none focus:border-accent transition-colors"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-dark-subtext mb-1.5">Status</label>
                    <div className="grid grid-cols-3 gap-2">
                      {statusOptions.map((status) => (
                        <button
                          key={status.label}
                          onClick={() => handleStatusChange(selectedWinery.id, status.label)}
                          className={`p-2 rounded-lg text-xs font-medium border transition-all ${
                            selectedWinery.status === status.label
                            ? `${status.color} border-transparent text-white`
                            : 'border-dark-hover bg-dark-surface hover:border-dark-subtext'
                          }`}
                        >
                          {status.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-dark-subtext mb-1.5">Notes</label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Did they reply? What did they say?"
                      rows={3}
                      className="w-full px-4 py-2.5 bg-dark-bg border border-dark-hover rounded-xl text-sm outline-none focus:border-accent transition-colors resize-none"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-dark-hover">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-accent text-black font-semibold rounded-full hover:bg-accent/90 transition-colors"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Company Modal */}
      <CreateCompanyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        sector={sector}
        onCreate={sector === 'winery' ? createWinery : createHousekeeping}
      />
    </div>
  );
};

export default TrackerView;