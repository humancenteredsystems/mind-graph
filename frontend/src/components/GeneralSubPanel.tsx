/**
 * GeneralSubPanel - General graph management tools
 * 
 * Contains data management and analysis tools that are not
 * specific to graph visualization or layout.
 */

import React from 'react';
import CollapsibleSection from './CollapsibleSection';
import { useUIContext } from '../hooks/useUI';
import { theme } from '../config';
import { buildDataToolsButtonStyle, buildGraphToolsSectionStyle } from '../utils/styleUtils';

export const GeneralSubPanel: React.FC = () => {
  const { openImportExportModal } = useUIContext();

  return (
    <div className="general-sub-panel">
      <h3 style={{ 
        fontSize: '14px', 
        fontWeight: 600, 
        marginBottom: '12px',
        color: theme.colors.text.primary 
      }}>
        General
      </h3>
      
      {/* Data Tools Section */}
      <CollapsibleSection 
        title="Data Tools" 
        icon="📊"
        defaultExpanded={true}
      >
        <div style={buildGraphToolsSectionStyle()}>
          <button
            onClick={openImportExportModal}
            style={buildDataToolsButtonStyle(false)}
            title="Import or export graph data"
          >
            📥📤 Import/Export
          </button>
          
          <button
            disabled
            style={buildDataToolsButtonStyle(true)}
            title="Coming soon: Bulk operations for selected nodes"
          >
            🔧 Bulk Operations
          </button>
        </div>
      </CollapsibleSection>

      {/* Analysis Section */}
      <CollapsibleSection 
        title="Analysis" 
        icon="📈"
        defaultExpanded={false}
      >
        <div style={buildGraphToolsSectionStyle()}>
          <button
            disabled
            style={buildDataToolsButtonStyle(true)}
            title="Coming soon: Graph metrics and analysis tools"
          >
            📊 Graph Metrics
          </button>
          
          <button
            disabled
            style={buildDataToolsButtonStyle(true)}
            title="Coming soon: Path finding and analysis"
          >
            🔍 Path Analysis
          </button>
        </div>
      </CollapsibleSection>
    </div>
  );
};

export default GeneralSubPanel;
