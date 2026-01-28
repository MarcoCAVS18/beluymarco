import { useState } from 'react';
import { Briefcase } from 'lucide-react';
import Sidebar from './components/Sidebar';
import ResourcesView from './components/ResourcesView';
import TrackerView from './components/TrackerView';
import MapView from './components/MapView';

function App() {
  const [activeTab, setActiveTab] = useState('tracker'); // 'tracker', 'map', or 'resources'

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
        <header className="h-16 flex items-center px-6 border-b border-dark-hover bg-dark-bg z-10">
          <div className="flex items-center gap-2">
            <Briefcase className="text-accent w-5 h-5" />
            <h1 className="text-xl font-medium tracking-tight">Job Application Assistant</h1>
          </div>
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