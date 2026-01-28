import { Wine, Hotel, Plus } from 'lucide-react';

const SectorToggle = ({ sector, onSectorChange, onAddNew, showAddButton = true }) => {
  return (
    <div className="flex justify-center">
      <div className="bg-dark-sidebar p-1 rounded-full border border-dark-hover inline-flex">
        <button
          onClick={() => onSectorChange('winery')}
          className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all ${
            sector === 'winery'
              ? 'bg-dark-surface text-white shadow-sm'
              : 'text-dark-subtext hover:text-white'
          }`}
        >
          <Wine size={16} />
          Wineries
        </button>
        <button
          onClick={() => onSectorChange('housekeeping')}
          className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all ${
            sector === 'housekeeping'
              ? 'bg-dark-surface text-white shadow-sm'
              : 'text-dark-subtext hover:text-white'
          }`}
        >
          <Hotel size={16} />
          Housekeeping
        </button>
        {showAddButton && onAddNew && (
          <button
            onClick={onAddNew}
            className="flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all bg-accent text-black hover:bg-accent/90"
          >
            <Plus size={16} />
            Add New
          </button>
        )}
      </div>
    </div>
  );
};

export default SectorToggle;
