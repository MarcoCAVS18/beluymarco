import { useState } from 'react';
import { Briefcase, Loader2, LogOut } from 'lucide-react';
import Sidebar from './components/Sidebar';
import ResourcesView from './components/ResourcesView';
import TrackerView from './components/TrackerView';
import MapView from './components/MapView';
import LoginScreen from './components/LoginScreen';
import { useAuth } from './hooks/useAuth';

function App() {
  const [activeTab, setActiveTab] = useState('tracker'); // 'tracker', 'map', or 'resources'
  const { user, loading, isAuthorized, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-dark-bg">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user || !isAuthorized) {
    return <LoginScreen />;
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-dark-bg text-dark-text font-sans selection:bg-accent selection:text-black overflow-hidden">

      {/* Sidebar - Desktop (left) / Mobile (bottom) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-dark-hover bg-dark-bg z-10">
          <div className="flex items-center gap-2">
            <Briefcase className="text-accent w-5 h-5" />
            <h1 className="text-xl font-medium tracking-tight">Job Application Assistant</h1>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-xs text-dark-subtext hover:text-accent transition-colors"
            title={user.email}
          >
            <LogOut size={14} />
            Cerrar sesión
          </button>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 lg:pb-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'tracker' && <TrackerView />}
            {activeTab === 'map' && <MapView />}
            {activeTab === 'resources' && <ResourcesView />}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;