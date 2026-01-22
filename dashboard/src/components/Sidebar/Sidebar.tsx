import { useState } from 'react';
import { ToolPanel } from './ToolPanel';
import { LayerPanel } from './LayerPanel';
import { ParcelTypePanel } from './ParcelTypePanel';
import { TopologyPanel } from './TopologyPanel';
import { AccuracyPanel } from './AccuracyPanel';
import { AreaComparisonPanel } from './AreaComparisonPanel';
import { RORPanel } from './RORPanel';
import { StatisticsPanel } from './StatisticsPanel';
import { ExportDialog } from '../Dialogs/ExportDialog';

type TabId = 'tools' | 'layers' | 'classify' | 'validate' | 'ror' | 'stats';

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: 'tools', label: 'Tools' },
  { id: 'layers', label: 'Layers' },
  { id: 'classify', label: 'Classify' },
  { id: 'validate', label: 'Validate' },
  { id: 'ror', label: 'ROR' },
  { id: 'stats', label: 'Stats' },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className = '' }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<TabId>('tools');
  const [showExportDialog, setShowExportDialog] = useState(false);

  return (
    <div className={`flex h-full flex-col bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-700 px-4 py-3">
        <h1 className="text-lg font-semibold text-gray-100">BoundaryAI</h1>
        <p className="text-xs text-gray-500">Land Parcel Editor</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-700">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-cyan-500 text-cyan-500'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'tools' && <div className="p-4"><ToolPanel /></div>}
        {activeTab === 'layers' && <div className="p-4"><LayerPanel /></div>}
        {activeTab === 'classify' && <div className="p-4"><ParcelTypePanel /></div>}
        {activeTab === 'validate' && (
          <div>
            <AreaComparisonPanel />
            <TopologyPanel />
            <AccuracyPanel />
          </div>
        )}
        {activeTab === 'ror' && <div className="p-4"><RORPanel /></div>}
        {activeTab === 'stats' && <StatisticsPanel />}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-700 p-3">
        <button
          onClick={() => setShowExportDialog(true)}
          className="w-full rounded bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700"
        >
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
