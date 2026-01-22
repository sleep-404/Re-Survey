import { useState } from 'react';
import { ToolPanel } from './ToolPanel';
import { LayerPanel } from './LayerPanel';
import { ParcelTypePanel } from './ParcelTypePanel';
import { LivePanel } from './LivePanel';
import { TopologyPanel } from './TopologyPanel';
import { AccuracyPanel } from './AccuracyPanel';
import { AreaComparisonPanel } from './AreaComparisonPanel';
import { RORPanel } from './RORPanel';
import { StatisticsPanel } from './StatisticsPanel';
import { ExportDialog } from '../Dialogs/ExportDialog';
import { Icon } from '../shared/Icon';

type MainTabId = 'tools' | 'layers' | 'classify' | 'live';
type SubTabId = 'validate' | 'ror' | 'stats';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className = '' }: SidebarProps) {
  const [activeMainTab, setActiveMainTab] = useState<MainTabId>('tools');
  const [activeSubTab, setActiveSubTab] = useState<SubTabId | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const handleMainTabClick = (tabId: MainTabId) => {
    setActiveMainTab(tabId);
    setActiveSubTab(null); // Clear sub-tab when main tab clicked
  };

  const handleSubTabClick = (tabId: SubTabId) => {
    setActiveSubTab(tabId);
  };

  // Determine what to show in content area
  const showSubTabContent = activeSubTab !== null;

  return (
    <div className={`flex h-full flex-col bg-[#111827] ${className}`}>
      {/* Header */}
      <div className="h-14 flex items-center px-5 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <span className="font-bold text-white tracking-tight">BoundaryAI</span>
        <span className="mx-2 text-gray-600">|</span>
        <span className="text-[10px] text-cyan-500 uppercase tracking-widest font-bold">
          Land Parcel Editor
        </span>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center w-full border-b border-gray-800 bg-[#111827]">
        <button
          onClick={() => handleMainTabClick('tools')}
          className={`flex-1 py-3 text-sm font-medium transition-colors text-center ${
            activeMainTab === 'tools' && !showSubTabContent
              ? 'text-cyan-400 border-b-2 border-cyan-500 bg-cyan-950/20'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800 border-b-2 border-transparent'
          }`}
        >
          Tools
        </button>
        <button
          onClick={() => handleMainTabClick('layers')}
          className={`flex-1 py-3 text-sm font-medium transition-colors text-center ${
            activeMainTab === 'layers' && !showSubTabContent
              ? 'text-cyan-400 border-b-2 border-cyan-500 bg-cyan-950/20'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800 border-b-2 border-transparent'
          }`}
        >
          Layers
        </button>
        <button
          onClick={() => handleMainTabClick('classify')}
          className={`flex-1 py-3 text-sm font-medium transition-colors text-center ${
            activeMainTab === 'classify' && !showSubTabContent
              ? 'text-cyan-400 border-b-2 border-cyan-500 bg-cyan-950/20'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800 border-b-2 border-transparent'
          }`}
        >
          Classify
        </button>
        <button
          onClick={() => handleMainTabClick('live')}
          className={`flex-1 py-3 text-sm font-medium transition-colors text-center ${
            activeMainTab === 'live' && !showSubTabContent
              ? 'text-purple-400 border-b-2 border-purple-500 bg-purple-950/20'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800 border-b-2 border-transparent'
          }`}
        >
          Live
        </button>
      </div>

      {/* Sub Tab Navigation */}
      <div className="flex items-center w-full border-b border-gray-800 bg-[#111827] px-2 gap-1 py-1">
        <button
          onClick={() => handleSubTabClick('validate')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            activeSubTab === 'validate'
              ? 'text-cyan-400 bg-cyan-950/30'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
          }`}
        >
          Validate
        </button>
        <button
          onClick={() => handleSubTabClick('ror')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            activeSubTab === 'ror'
              ? 'text-cyan-400 bg-cyan-950/30'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
          }`}
        >
          ROR
        </button>
        <button
          onClick={() => handleSubTabClick('stats')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            activeSubTab === 'stats'
              ? 'text-cyan-400 bg-cyan-950/30'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
          }`}
        >
          Stats
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Main tab content */}
        {!showSubTabContent && activeMainTab === 'tools' && (
          <div className="p-5">
            <ToolPanel />
          </div>
        )}
        {!showSubTabContent && activeMainTab === 'layers' && (
          <div className="p-5">
            <LayerPanel />
          </div>
        )}
        {!showSubTabContent && activeMainTab === 'classify' && (
          <div className="p-5">
            <ParcelTypePanel />
          </div>
        )}
        {!showSubTabContent && activeMainTab === 'live' && (
          <div className="p-5">
            <LivePanel />
          </div>
        )}

        {/* Sub tab content */}
        {activeSubTab === 'validate' && (
          <div>
            <AreaComparisonPanel />
            <TopologyPanel />
            <AccuracyPanel />
          </div>
        )}
        {activeSubTab === 'ror' && (
          <div className="p-5">
            <RORPanel />
          </div>
        )}
        {activeSubTab === 'stats' && <StatisticsPanel />}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800 p-4 bg-gray-900/50">
        <button
          onClick={() => setShowExportDialog(true)}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-500 shadow-lg shadow-cyan-900/30"
        >
          <Icon name="download" className="text-lg" />
          Export Shapefile
        </button>
      </div>

      {/* Export Dialog */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
      />
    </div>
  );
}
