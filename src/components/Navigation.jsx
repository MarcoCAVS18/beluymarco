import { Home, Building2, Map, FileText, Plus, LogOut } from 'lucide-react';

const ITEMS = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'companies', label: 'Empresas', icon: Building2 },
  { id: 'map', label: 'Mapa', icon: Map },
  { id: 'resources', label: 'Recursos', icon: FileText },
];

// Barra lateral en pantallas grandes y barra inferior con botón "+" central en el celular
const Navigation = ({ tab, setTab, onAdd, onSignOut, userEmail }) => {
  return (
    <>
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-card border-r border-line h-full">
        <div className="p-6 flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-housekeeping text-white font-semibold flex items-center justify-center ring-4 ring-housekeeping/20">MB</span>
          <div className="min-w-0">
            <div className="font-semibold text-sm">Marco y Belu</div>
            <div className="text-xs text-muted">Work & Travel</div>
          </div>
        </div>
        <div className="px-4">
          <button onClick={onAdd} className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-white text-sm font-semibold hover:bg-primary-strong">
            <Plus size={18} />
            Nueva empresa
          </button>
        </div>
        <nav className="flex-1 px-3 py-5 space-y-1">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  tab === item.id ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-surface hover:text-ink'
                }`}
              >
                <Icon size={20} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-line">
          <div className="text-xs text-muted truncate px-2 mb-2">{userEmail}</div>
          <button onClick={onSignOut} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted hover:bg-surface hover:text-red-600">
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-line pb-safe">
        <div className="grid grid-cols-5 h-[4.5rem] max-w-lg mx-auto">
          {ITEMS.slice(0, 2).map((item) => (
            <NavButton key={item.id} item={item} active={tab === item.id} onClick={() => setTab(item.id)} />
          ))}
          <button onClick={onAdd} className="flex flex-col items-center justify-center gap-1" aria-label="Nueva empresa">
            <span className="w-12 h-12 -mt-1 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30">
              <Plus size={24} />
            </span>
          </button>
          {ITEMS.slice(2).map((item) => (
            <NavButton key={item.id} item={item} active={tab === item.id} onClick={() => setTab(item.id)} />
          ))}
        </div>
      </nav>
    </>
  );
};

const NavButton = ({ item, active, onClick }) => {
  const Icon = item.icon;
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium ${active ? 'text-primary' : 'text-muted'}`}>
      <span className={`w-11 h-8 rounded-xl flex items-center justify-center transition-colors ${active ? 'bg-primary text-white' : ''}`}>
        <Icon size={20} />
      </span>
      {item.label}
    </button>
  );
};

export default Navigation;
