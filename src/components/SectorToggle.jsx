import { Wine, Hotel, Fingerprint, Plus } from 'lucide-react';

const SECTORS = [
  { id: 'winery', label: 'Wineries', icon: Wine },
  { id: 'housekeeping', label: 'Housekeeping', icon: Hotel },
  { id: 'kyc', label: 'KYC', icon: Fingerprint, optional: true },
];

const SectorToggle = ({ sector, onSectorChange, onAddNew, showAddButton = true, includeKyc = false }) => {
  return (
    <div className="flex justify-center">
      <div className="bg-dark-sidebar p-1 rounded-full border border-dark-hover inline-flex max-w-full overflow-x-auto">
        {SECTORS.filter((s) => !s.optional || includeKyc).map(({ id, label, ...s }) => {
          const Icon = s.icon;
          const isActive = sector === id;
          return (
            <button
              key={id}
              onClick={() => onSectorChange(id)}
              aria-label={label}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-dark-surface text-white shadow-sm'
                  : 'text-dark-subtext hover:text-white'
              }`}
            >
              <Icon size={16} className="shrink-0" />
              <span className={isActive ? 'inline' : 'hidden min-[480px]:inline'}>{label}</span>
            </button>
          );
        })}
        {showAddButton && onAddNew && (
          <button
            onClick={onAddNew}
            aria-label="Add New"
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-medium transition-all bg-accent text-black hover:bg-accent/90 whitespace-nowrap shrink-0"
          >
            <Plus size={16} className="shrink-0" />
            <span className="hidden min-[480px]:inline">Add New</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default SectorToggle;
