import { lazy, Suspense, useCallback, useRef, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import Navigation from './components/Navigation';
import HomeView from './components/HomeView';
import CompaniesView from './components/CompaniesView';
import ResourcesView from './components/ResourcesView';
import LoginScreen from './components/LoginScreen';
import CompanyDetailSheet from './components/CompanyDetailSheet';
import CreateCompanyModal from './components/CreateCompanyModal';
import EmailSendModal from './components/EmailSendModal';
import Onboarding from './components/Onboarding';
import { DataProvider } from './contexts/DataContext';
import { ResourcesProvider } from './contexts/ResourcesContext';
import { useAuth } from './hooks/useAuth';
import { useData } from './hooks/useFirebaseData';
import { useResources } from './hooks/useResources';
import { SECTOR_IDS } from './data/sectors';

// El mapa (Leaflet + tabla de ciudades) se baja recién cuando se abre esa pestaña
const MapView = lazy(() => import('./components/MapView'));
// El panel de admin solo lo baja la cuenta admin
const AdminView = lazy(() => import('./components/AdminView'));

const TABS = ['home', 'companies', 'map', 'resources', 'admin'];
const EMPTY_FILTERS = { search: '', country: null, status: null, showHidden: false, mode: 'list' };

// Recuerda la última pestaña y rubro en el navegador (comodidad, no es crítico)
const remembered = (key, allowed, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
};
const remember = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // modo privado o almacenamiento bloqueado: no pasa nada
  }
};

function Shell() {
  const { user, isAdmin, signOut } = useAuth();
  const { findCompany, selected, setSelected, sectors, loading, error, reload, update } = useData();

  const [tab, setTabState] = useState(() => remembered('tab', TABS, 'home'));
  const [sectorState, setSectorState] = useState(() => remembered('sector', SECTOR_IDS, 'housekeeping'));
  // Siempre un rubro que esta cuenta puede ver
  const sector = sectors.includes(sectorState) ? sectorState : sectors[0];
  const currentTab = tab === 'admin' && !isAdmin ? 'home' : tab;
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [open, setOpen] = useState(null); // { sector, id } de la empresa abierta
  const [emailTarget, setEmailTarget] = useState(null); // { sector, company }
  const [creating, setCreating] = useState(false);

  // La que scrollea es la zona principal (no la ventana): al cambiar de pestaña vuelve arriba
  const mainRef = useRef(null);
  const setTab = useCallback((t) => {
    setTabState(t);
    remember('tab', t);
    mainRef.current?.scrollTo({ top: 0 });
  }, []);

  const setSector = useCallback((s) => {
    setSectorState(s);
    remember('sector', s);
    setFilters((f) => ({ ...EMPTY_FILTERS, mode: f.mode }));
  }, []);

  // Desde el inicio: abre Empresas con un rubro y filtros puntuales
  const goToCompanies = useCallback(
    (s, patch = {}) => {
      if (s) {
        setSectorState(s);
        remember('sector', s);
      }
      // Si se pide un país que no está cargado, se suma a los elegidos del rubro
      const target = s || sector;
      if (patch.country && !selected[target].includes(patch.country)) {
        setSelected(target, [...selected[target], patch.country]);
      }
      setFilters({ ...EMPTY_FILTERS, ...patch });
      setTab('companies');
    },
    [setTab, sector, selected, setSelected]
  );

  const openCompany = useCallback((s, id) => setOpen({ sector: s, id }), []);


  // La ficha abierta se busca en los datos vivos, así refleja cada cambio al instante
  const openCompanyData = open ? findCompany(open.sector, open.id) : null;

  if (!sector) {
    return (
      <div className="min-h-dvh bg-bg flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="font-semibold">Tu invitación no tiene rubros habilitados todavía.</p>
        <button onClick={signOut} className="px-4 py-2.5 rounded-xl bg-card border border-line text-sm font-medium">Salir</button>
      </div>
    );
  }

  return (
    <div className="flex h-dvh bg-bg text-ink">
      <Navigation tab={currentTab} setTab={setTab} isAdmin={isAdmin} onAdd={isAdmin ? () => setCreating(true) : null} onSignOut={signOut} userEmail={user?.email} />

      <main ref={mainRef} className="flex-1 min-w-0 h-full overflow-y-auto">
        <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 pt-[max(1rem,env(safe-area-inset-top))] lg:pt-8 ${currentTab === 'map' ? 'pb-0 lg:pb-8' : 'pb-28 lg:pb-10'}`}>
          {loading ? (
            <div className="flex items-center justify-center h-[60vh]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="max-w-sm mx-auto text-center py-20">
              <p className="font-semibold">No se pudieron cargar los datos</p>
              <p className="text-sm text-muted mt-1 break-words">{error}</p>
              <p className="text-xs text-muted mt-3">Si dice "quota exceeded", se agotaron las lecturas gratis del día de Firestore; se reinician a la medianoche del Pacífico.</p>
              <button onClick={reload} className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium">
                <RefreshCw size={16} />
                Reintentar
              </button>
            </div>
          ) : (
            <>
              {currentTab === 'home' && (
                <HomeView goToCompanies={goToCompanies} goToResources={() => setTab('resources')} goToAdmin={() => setTab('admin')} onOpenCompany={openCompany} />
              )}
              {currentTab === 'companies' && (
                <CompaniesView sector={sector} setSector={setSector} filters={filters} setFilters={setFilters} onOpenCompany={openCompany} />
              )}
              {currentTab === 'map' && (
                <Suspense fallback={<div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
                  <MapView sector={sector} setSector={setSector} onOpenCompany={openCompany} />
                </Suspense>
              )}
              {currentTab === 'resources' && <ResourcesView sector={sector} setSector={setSector} />}
              {currentTab === 'admin' && isAdmin && (
                <Suspense fallback={<div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
                  <AdminView />
                </Suspense>
              )}
            </>
          )}
        </div>
      </main>

      {openCompanyData && (
        <CompanyDetailSheet
          company={openCompanyData}
          sector={open.sector}
          onClose={() => setOpen(null)}
          onSendEmail={(company) => setEmailTarget({ sector: open.sector, company })}
        />
      )}

      {isAdmin && (
        <CreateCompanyModal
          isOpen={creating}
          onClose={() => setCreating(false)}
          sector={sector}
          onCreated={(s, created) => setOpen({ sector: s, id: created.id })}
        />
      )}

      <EmailSendModal
        isOpen={!!emailTarget}
        company={emailTarget?.company}
        sector={emailTarget?.sector}
        onClose={() => setEmailTarget(null)}
        onSent={async (company) => {
          // El email ya salió: si esto falla solo queda el estado sin actualizar
          try {
            await update(emailTarget.sector, company.id, { status: 'Sent' });
          } catch (err) {
            console.error('Error marcando como enviada:', err);
          }
        }}
      />
    </div>
  );
}

function App() {
  const { user, loading, isAuthorized } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-dvh bg-bg">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAuthorized) return <LoginScreen />;

  // Los datos se cargan recién con la sesión iniciada (las rules de Firestore lo exigen)
  return (
    <DataProvider>
      <ResourcesProvider>
        <Gate />
      </ResourcesProvider>
    </DataProvider>
  );
}

// Los invitados pasan primero por el paso a paso (perfil, CVs, email, Gmail)
function Gate() {
  const { isAdmin } = useAuth();
  const { loading, profile } = useResources();
  if (!isAdmin && loading) {
    return (
      <div className="flex items-center justify-center h-dvh bg-bg">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!isAdmin && !profile?.onboarded) return <Onboarding />;
  return <Shell />;
}

export default App;
