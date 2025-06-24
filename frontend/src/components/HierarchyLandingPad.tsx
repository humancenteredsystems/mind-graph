/**
 * HierarchyLandingPad - Drag-and-drop interface for hierarchy assignment
 * 
 * Displays hierarchy levels vertically with node type drop zones.
 * Allows users to drag nodes from the graph to assign them to specific
 * hierarchy levels and types.
 */

import React, { useState, useEffect } from 'react';
import { useView } from '../context/ViewContext';
import { useHierarchyContext } from '../hooks/useHierarchy';
import { useHierarchyAssignment } from '../hooks/useHierarchyAssignment';
import { executeQuery } from '../services/ApiService';
import { GET_LEVELS_FOR_HIERARCHY } from '../graphql/queries';
import { HierarchyLevel, AllowedType, GraphQLError } from '../types/hierarchy';
import { theme } from '../config';
import { buildButtonStyle, buildGraphToolsSectionStyle } from '../utils/styleUtils';

interface DropZoneProps {
  levelId: string;
  levelNumber: number;
  levelLabel: string;
  nodeType: string;
  onDrop: (levelId: string, nodeType: string, nodeData?: any) => void;
  isDragOver: boolean;
  onDragOver: (over: boolean) => void;
}

const DropZone: React.FC<DropZoneProps> = ({
  levelId,
  levelNumber,
  levelLabel,
  nodeType,
  onDrop,
  isDragOver,
  onDragOver
}) => {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    onDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    onDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDragOver(false);
    
    try {
      const dragDataStr = e.dataTransfer.getData('text/plain');
      if (dragDataStr) {
        const dragData = JSON.parse(dragDataStr);
        if (dragData.sourceType === 'graph-node') {
          console.log(`[HierarchyLandingPad] Node ${dragData.nodeId} dropped on level ${levelId}, type ${nodeType}`);
          onDrop(levelId, nodeType, dragData.nodeData);
          return;
        }
      }
    } catch (error) {
      console.error('[HierarchyLandingPad] Error processing drop:', error);
    }
    
    // Fallback for non-HTML5 drops
    onDrop(levelId, nodeType);
  };

  const dropZoneStyle = {
    padding: '8px 12px',
    margin: '4px',
    border: `2px dashed ${isDragOver ? theme.colors.border.active : theme.colors.border.default}`,
    borderRadius: '4px',
    backgroundColor: isDragOver 
      ? theme.colors.background.secondary 
      : 'transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '12px',
    fontWeight: 500,
    color: theme.colors.text.primary,
    textAlign: 'center' as const,
    minHeight: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    // Enhanced hover and active states
    ...(isDragOver && {
      backgroundColor: theme.colors.background.secondary,
      borderColor: theme.colors.border.active,
      boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)',
      transform: 'scale(1.02)',
    }),
  };

  return (
    <div
      style={dropZoneStyle}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-drop-zone="true"
      data-level-id={levelId}
      data-node-type={nodeType}
      title={`Drop nodes here to assign to Level ${levelNumber} as ${nodeType}`}
    >
      {nodeType}
    </div>
  );
};

interface LevelSectionProps {
  level: {
    id: string;
    levelNumber: number;
    label?: string;
    allowedTypes: { id: string; typeName: string }[];
  };
  onDrop: (levelId: string, nodeType: string) => void;
}

const LevelSection: React.FC<LevelSectionProps> = ({ level, onDrop }) => {
  const [dragOverZones, setDragOverZones] = useState<Record<string, boolean>>({});

  const handleDragOver = (nodeType: string, over: boolean) => {
    setDragOverZones(prev => ({
      ...prev,
      [nodeType]: over
    }));
  };

  const levelHeaderStyle = {
    padding: '12px 16px',
    backgroundColor: theme.colors.background.secondary,
    borderBottom: `1px solid ${theme.colors.border.default}`,
    fontSize: '14px',
    fontWeight: 600,
    color: theme.colors.text.primary,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const levelContentStyle = {
    padding: '8px 16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  };

  const levelColor = (theme.colors.levels as any)[level.levelNumber] || theme.colors.node.default;

  return (
    <div style={{ borderBottom: `1px solid ${theme.colors.border.default}` }}>
      <div style={levelHeaderStyle}>
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: levelColor,
          }}
        />
        <span>Level {level.levelNumber}: {level.label || 'Unlabeled'}</span>
      </div>
      <div style={levelContentStyle}>
        {level.allowedTypes.length > 0 ? (
          level.allowedTypes.map((allowedType) => (
            <DropZone
              key={allowedType.id}
              levelId={level.id}
              levelNumber={level.levelNumber}
              levelLabel={level.label || 'Unlabeled'}
              nodeType={allowedType.typeName}
              onDrop={onDrop}
              isDragOver={dragOverZones[allowedType.typeName] || false}
              onDragOver={(over) => handleDragOver(allowedType.typeName, over)}
            />
          ))
        ) : (
          <div style={{
            padding: '8px',
            fontSize: '12px',
            color: theme.colors.text.secondary,
            fontStyle: 'italic',
            textAlign: 'center' as const,
          }}>
            No node types configured for this level
          </div>
        )}
      </div>
    </div>
  );
};

export const HierarchyLandingPad: React.FC = () => {
  const { hierarchyPanelOpen, setHierarchyPanelOpen, active } = useView();
  const { hierarchies } = useHierarchyContext();
  const { assignNodeToLevel, isAssigning, assignmentError, clearAssignmentError } = useHierarchyAssignment();
  const [levels, setLevels] = useState<
    { id: string; levelNumber: number; label?: string; allowedTypes: { id: string; typeName: string }[] }[]
  >([]);

  // Extract hierarchy ID from active view
  const currentHierarchyId = active && active.startsWith('hierarchy-') 
    ? active.replace('hierarchy-', '') 
    : '';

  // Auto-open panel when hierarchy is selected
  useEffect(() => {
    if (active && active !== 'none') {
      setHierarchyPanelOpen(true);
    } else {
      setHierarchyPanelOpen(false);
    }
  }, [active, setHierarchyPanelOpen]);

  // Fetch levels when hierarchy changes
  useEffect(() => {
    if (!currentHierarchyId) {
      setLevels([]);
      return;
    }

    executeQuery(GET_LEVELS_FOR_HIERARCHY, { h: currentHierarchyId })
      .then((res) => {
        const lvl: HierarchyLevel[] = res.queryHierarchy?.[0]?.levels || [];
        setLevels(lvl);
      })
      .catch((err: GraphQLError | Error) => {
        console.error('[HierarchyLandingPad] Error fetching levels:', err);
        setLevels([]);
      });
  }, [currentHierarchyId]);

  const handleDrop = async (levelId: string, nodeType: string, nodeData?: any) => {
    console.log(`[HierarchyLandingPad] Drop received: levelId=${levelId}, nodeType=${nodeType}`, nodeData);
    
    // Clear any previous assignment errors
    clearAssignmentError();
    
    if (nodeData && nodeData.id) {
      try {
        console.log(`[HierarchyLandingPad] Assigning node ${nodeData.id} to level ${levelId}`);
        await assignNodeToLevel(nodeData.id, levelId, nodeData);
        console.log(`[HierarchyLandingPad] Successfully assigned node ${nodeData.id} to level ${levelId}`);
      } catch (error) {
        console.error(`[HierarchyLandingPad] Failed to assign node ${nodeData.id}:`, error);
        // Error is already handled by the hook and will be displayed in UI
      }
    } else {
      console.warn('[HierarchyLandingPad] Drop received but no valid node data provided');
    }
  };

  const handleToggle = () => {
    setHierarchyPanelOpen(!hierarchyPanelOpen);
  };

  const currentHierarchy = hierarchies.find(h => `hierarchy-${h.id}` === active);

  const containerStyle = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: theme.colors.background.primary,
  };

  const headerStyle = {
    padding: '12px 16px',
    borderBottom: `1px solid ${theme.colors.border.default}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background.secondary,
  };

  const titleStyle = {
    fontSize: '14px',
    fontWeight: 600,
    color: theme.colors.text.primary,
    flex: 1,
  };

  const contentStyle = {
    flex: 1,
    overflow: 'auto',
  };

  const emptyStateStyle = {
    padding: '32px 16px',
    textAlign: 'center' as const,
    color: theme.colors.text.secondary,
    fontSize: '14px',
  };

  if (!hierarchyPanelOpen) {
    return null;
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={titleStyle}>
          {currentHierarchy ? currentHierarchy.name : 'Hierarchy Assignment'}
        </div>
        <button
          onClick={handleToggle}
          style={{
            ...buildButtonStyle('secondary'),
            padding: '4px 8px',
            fontSize: '12px',
            minWidth: 'auto',
          }}
          title="Collapse hierarchy panel"
        >
          ←
        </button>
      </div>

      <div style={contentStyle}>
        {!currentHierarchy ? (
          <div style={emptyStateStyle}>
            Select a hierarchy to begin assigning nodes
          </div>
        ) : levels.length === 0 ? (
          <div style={emptyStateStyle}>
            No levels configured for this hierarchy
          </div>
        ) : (
          <div>
            <div style={{
              padding: '12px 16px',
              fontSize: '12px',
              color: theme.colors.text.secondary,
              borderBottom: `1px solid ${theme.colors.border.default}`,
              backgroundColor: theme.colors.background.secondary,
            }}>
              {isAssigning ? 'Assigning node...' : 'Drag grayed-out nodes from the graph to assign them to hierarchy levels'}
            </div>
            {assignmentError && (
              <div style={{
                padding: '8px 16px',
                fontSize: '12px',
                color: theme.colors.text.error,
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderBottom: `1px solid ${theme.colors.border.default}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span>Error: {assignmentError}</span>
                <button
                  onClick={clearAssignmentError}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: theme.colors.text.error,
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: '2px 4px',
                  }}
                  title="Dismiss error"
                >
                  ×
                </button>
              </div>
            )}
            {levels
              .sort((a, b) => a.levelNumber - b.levelNumber)
              .map((level) => (
                <LevelSection
                  key={level.id}
                  level={level}
                  onDrop={handleDrop}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HierarchyLandingPad;
