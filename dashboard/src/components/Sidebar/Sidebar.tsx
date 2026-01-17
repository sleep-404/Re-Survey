import { useState } from 'react';
import { ToolPanel } from './ToolPanel';
import { LayerPanel } from './LayerPanel';
import { ParcelTypePanel } from './ParcelTypePanel';

type TabId = 'tools' | 'layers' | 'classify';

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: 'tools', label: 'Tools' },
  { id: 'layers', label: 'Layers' },
  { id: 'classify', label: 'Classify' },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className = '' }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<TabId>('tools');

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
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'tools' && <ToolPanel />}
        {activeTab === 'layers' && <LayerPanel />}
        {activeTab === 'classify' && <ParcelTypePanel />}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-700 p-3">
        <button className="w-full rounded bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700">
          Export Shapefile
        </button>
      </div>
    </div>
  );
}
