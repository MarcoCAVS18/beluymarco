import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import CountrySelect from './CountrySelect';

const STATUS_OPTIONS = [
  { label: 'Pending', color: 'bg-gray-600' },
  { label: 'Sent', color: 'bg-blue-600' },
  { label: 'Replied', color: 'bg-yellow-600' },
  { label: 'Interview', color: 'bg-purple-600' },
  { label: 'Offer', color: 'bg-green-600' },
  { label: 'Rejected', color: 'bg-red-600' },
];

const CreateCompanyModal = ({ isOpen, onClose, sector, onCreate }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    location: '',
    country: 'NZ',
    harvestStart: '',
    season: '',
    status: 'Pending',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Company name is required');
      return;
    }
    if (!formData.country) {
      setError('Country is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const email = formData.email.trim();
      const data = {
        name: formData.name.trim(),
        email: email,
        emailVerified: email ? false : null,
        location: formData.location.trim(),
        country: formData.country,
        status: formData.status,
        notes: formData.notes.trim(),
        hidden: false,
      };

      // Add sector-specific field
      if (sector === 'winery') {
        data.harvestStart = formData.harvestStart.trim();
      } else {
        data.season = formData.season.trim();
      }

      await onCreate(data);

      // Reset form
      setFormData({
        name: '',
        email: '',
        location: '',
        country: 'NZ',
        harvestStart: '',
        season: '',
        status: 'Pending',
        notes: '',
      });

      onClose();
    } catch (err) {
      console.error('Error creating company:', err);
      setError('Failed to create company. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      location: '',
      country: 'NZ',
      harvestStart: '',
      season: '',
      status: 'Pending',
      notes: '',
    });
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-sidebar w-full max-w-md rounded-2xl border border-dark-hover shadow-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-dark-hover sticky top-0 bg-dark-sidebar">
            <h3 className="text-xl font-bold">
              Create New {sector === 'winery' ? 'Winery' : 'Housekeeping'}
            </h3>
            <button
              type="button"
              onClick={handleClose}
              className="p-1 hover:bg-dark-surface rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form Fields */}
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-dark-subtext mb-1.5">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Enter company name..."
                className="w-full px-4 py-2.5 bg-dark-bg border border-dark-hover rounded-xl text-sm outline-none focus:border-accent transition-colors"
                autoFocus
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-dark-subtext mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="contact@example.com"
                className="w-full px-4 py-2.5 bg-dark-bg border border-dark-hover rounded-xl text-sm outline-none focus:border-accent transition-colors"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-dark-subtext mb-1.5">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="City, Region"
                className="w-full px-4 py-2.5 bg-dark-bg border border-dark-hover rounded-xl text-sm outline-none focus:border-accent transition-colors"
              />
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-dark-subtext mb-1.5">
                Country <span className="text-red-400">*</span>
              </label>
              <CountrySelect
                value={formData.country}
                onChange={(value) => handleChange('country', value)}
              />
            </div>

            {/* Harvest Start / Season */}
            <div>
              <label className="block text-sm font-medium text-dark-subtext mb-1.5">
                {sector === 'winery' ? 'Harvest Start' : 'Season'}
              </label>
              <input
                type="text"
                value={sector === 'winery' ? formData.harvestStart : formData.season}
                onChange={(e) => handleChange(sector === 'winery' ? 'harvestStart' : 'season', e.target.value)}
                placeholder={sector === 'winery' ? 'e.g. "finales de agosto"' : 'e.g. "Winter 2026"'}
                className="w-full px-4 py-2.5 bg-dark-bg border border-dark-hover rounded-xl text-sm outline-none focus:border-accent transition-colors"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-dark-subtext mb-1.5">
                Status
              </label>
              <div className="grid grid-cols-3 gap-2">
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status.label}
                    type="button"
                    onClick={() => handleChange('status', status.label)}
                    className={`p-2 rounded-lg text-xs font-medium border transition-all ${
                      formData.status === status.label
                        ? `${status.color} border-transparent text-white`
                        : 'border-dark-hover bg-dark-surface hover:border-dark-subtext text-dark-text'
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-dark-subtext mb-1.5">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Additional notes..."
                rows={3}
                className="w-full px-4 py-2.5 bg-dark-bg border border-dark-hover rounded-xl text-sm outline-none focus:border-accent transition-colors resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-dark-hover">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-dark-surface text-dark-text font-medium rounded-full hover:bg-dark-hover transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-accent text-black font-semibold rounded-full hover:bg-accent/90 transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating...
                </>
              ) : (
                'Create'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCompanyModal;
