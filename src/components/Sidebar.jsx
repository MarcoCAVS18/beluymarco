import { LayoutList, FileText, Map } from 'lucide-react';
import clsx from 'clsx';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'tracker', label: 'Tracker', icon: LayoutList },
    { id: 'map', label: 'Map', icon: Map },
    { id: 'resources', label: 'Resources', icon: FileText },
  ];

  return (
    <>
      {/* Desktop Sidebar (left) */}
      <aside className="hidden lg:flex bg-dark-sidebar border-r border-dark-hover w-64 h-full flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center font-bold text-white text-xs">
            MB
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-sm">Marco & Belu</span>
            <span className="text-xs text-dark-subtext">Work & Travel</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={clsx(
                "flex items-center w-full p-3 rounded-full transition-all duration-200 text-sm font-medium",
                activeTab === item.id
                  ? "bg-dark-surface text-accent"
                  : "text-dark-subtext hover:bg-dark-hover hover:text-dark-text"
              )}
            >
              <item.icon size={20} className="mr-3 min-w-[20px]" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile/Tablet Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-dark-sidebar border-t border-dark-hover z-30 safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16 px-4">
          {/* Tracker Button */}
          <button
            onClick={() => setActiveTab('tracker')}
            className={clsx(
              "flex flex-col items-center justify-center gap-1 px-6 py-2 rounded-lg transition-all duration-200",
              activeTab === 'tracker'
                ? "text-accent"
                : "text-dark-subtext hover:text-dark-text"
            )}
          >
            <LayoutList size={22} className="transition-transform duration-200 hover:scale-110" />
            <span className="text-xs font-medium">Tracker</span>
          </button>

          {/* Center Map Button */}
          <button
            onClick={() => setActiveTab('map')}
            className="flex flex-col items-center justify-center"
          >
            <div className={clsx(
              "w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-200",
              activeTab === 'map'
                ? "bg-accent text-black"
                : "bg-gradient-to-tr from-blue-500 to-purple-500 text-white"
            )}>
              <Map size={24} />
            </div>
            <span className={clsx(
              "text-[10px] font-medium mt-1",
              activeTab === 'map' ? "text-accent" : "text-dark-text"
            )}>Map</span>
          </button>

          {/* Resources Button */}
          <button
            onClick={() => setActiveTab('resources')}
            className={clsx(
              "flex flex-col items-center justify-center gap-1 px-6 py-2 rounded-lg transition-all duration-200",
              activeTab === 'resources'
                ? "text-accent"
                : "text-dark-subtext hover:text-dark-text"
            )}
          >
            <FileText size={22} className="transition-transform duration-200 hover:scale-110" />
            <span className="text-xs font-medium">Resources</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;