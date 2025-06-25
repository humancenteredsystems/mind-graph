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
import { useHierarchyStyleContext } from '../context/HierarchyStyleContext';
import { executeQuery } from '../services/ApiService';
import { GET_LEVELS_FOR_HIERARCHY } from '../graphql/queries';
import { HierarchyLevel, HierarchyLevelType, GraphQLError } from '../types/hierarchy';
import { NodeTypeStyle } from '../types/nodeStyle';
import { theme } from '../config';
import { buildButtonStyle, buildGraphToolsSectionStyle } from '../utils/styleUtils';
import { deduplicateHierarchyLevels, logLevelDeduplication, getNodeTypeShape } from '../utils/graphUtils';
import NodeTypeStyleModal from './NodeTypeStyleModal';
import NodeStylePreview from './NodeStylePreview';
import AddNodeTypeModal from './AddNodeTypeModal';

interface DropZoneProps {
  levelId: string;
  levelNumber: number;
  levelLabel: string;
  nodeType: string;
  onDrop: (levelId: string, nodeType: string, nodeData?: any) => void;
  isDragOver: boolean;
  onDragOver: (over: boolean) => void;
}

interface DropZonePropsExtended extends DropZoneProps {
  hierarchyId: string;
  onOpenStyleModal: (hierarchyId: string, levelId: string, nodeType: string) => void;
}

const DropZone: React.FC<DropZonePropsExtended> = ({
  levelId,
  levelNumber,
  levelLabel,
  nodeType,
  hierarchyId,
  onDrop,
  isDragOver,
  onDragOver,
  onOpenStyleModal
}) => {
  const { getStyleForType, hasCustomStyle } = useHierarchyStyleContext();

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

  const handleStyleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenStyleModal(hierarchyId, levelId, nodeType);
  };

  // Get current style for this node type
  const currentStyle = getStyleForType(hierarchyId, levelId, nodeType);
  const isCustomized = hasCustomStyle(hierarchyId, levelId, nodeType);

  // Add preview styling based on node type
  const typeShape = getNodeTypeShape(nodeType);
  const shapeName = typeShape === 'round-rectangle' ? 'Rectangle' : 
                   typeShape === 'ellipse' ? 'Circle' :
                   typeShape.charAt(0).toUpperCase() + typeShape.slice(1);

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
    minHeight: '70px', // Increased to accommodate larger preview
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px', // Increased gap for better spacing
    position: 'relative' as const,
    // Enhanced hover and active states
    ...(isDragOver && {
      backgroundColor: theme.colors.background.secondary,
      borderColor: theme.colors.border.active,
      boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)',
      transform: 'scale(1.02)',
    }),
  };

  const styleButtonStyle = {
    position: 'absolute' as const,
    top: '4px',
    right: '4px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '2px',
    borderRadius: '3px',
    color: isCustomized ? theme.colors.border.active : theme.colors.text.secondary,
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
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
      title={`Drop nodes here to assign to Level ${levelNumber} as ${nodeType} (${shapeName} shape)`}
    >
      <button
        style={styleButtonStyle}
        onClick={handleStyleClick}
        title={`Customize ${nodeType} style${isCustomized ? ' (customized)' : ''}`}
      >
        🎨
      </button>
      
      <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
        {nodeType}
      </div>
      
      <NodeStylePreview
        style={currentStyle}
        nodeType={nodeType}
        size={{ width: 60, height: 30 }}
        fontSize={11}
      />
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
  hierarchyId: string;
  onDrop: (levelId: string, nodeType: string) => void;
  onOpenStyleModal: (hierarchyId: string, levelId: string, nodeType: string) => void;
  onAddNodeType?: (hierarchyId: string, levelId: string) => void;
}


const LevelSection: React.FC<LevelSectionProps> = ({ level, hierarchyId, onDrop, onOpenStyleModal, onAddNodeType }) => {
  const [dragOverZones, setDragOverZones] = useState<Record<string, boolean>>({});

  const handleDragOver = (nodeType: string, over: boolean) => {
    setDragOverZones(prev => ({
      ...prev,
      [nodeType]: over
    }));
  };

  const levelColor = (theme.colors.levels as any)[level.levelNumber] || theme.colors.node.default;

  const levelHeaderStyle = {
    padding: '12px 16px',
    backgroundColor: theme.colors.background.secondary,
    borderBottom: `1px solid ${theme.colors.border.default}`,
    borderLeft: `4px solid ${levelColor}`, // Add level color indicator
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
        {level.allowedTypes.map((allowedType) => (
          <DropZone
            key={allowedType.id}
            levelId={level.id}
            levelNumber={level.levelNumber}
            levelLabel={level.label || 'Unlabeled'}
            nodeType={allowedType.typeName}
            hierarchyId={hierarchyId}
            onDrop={onDrop}
            isDragOver={dragOverZones[allowedType.typeName] || false}
            onDragOver={(over) => handleDragOver(allowedType.typeName, over)}
            onOpenStyleModal={onOpenStyleModal}
          />
        ))}
        
        {/* Add Node Type button for h0 hierarchy */}
        {hierarchyId === 'h0' && level.levelNumber === 1 && onAddNodeType && (
          <button
            onClick={() => onAddNodeType(hierarchyId, level.id)}
            style={{
              padding: '8px 12px',
              margin: '4px',
              border: `2px dashed ${theme.colors.border.default}`,
              borderRadius: '4px',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500,
              color: theme.colors.text.secondary,
              textAlign: 'center' as const,
              minHeight: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = theme.colors.border.active;
              e.currentTarget.style.backgroundColor = theme.colors.background.secondary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = theme.colors.border.default;
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Add a new node type category"
          >
            + Add Node Type
          </button>
        )}
        
        {level.allowedTypes.length === 0 && hierarchyId !== 'h0' && (
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
  const { updateStyle, getStyleForType } = useHierarchyStyleContext();
  const [levels, setLevels] = useState<
    { id: string; levelNumber: number; label?: string; allowedTypes: { id: string; typeName: string }[] }[]
  >([]);

  // Unassignment state
  const [isUnassigning, setIsUnassigning] = useState(false);
  const [unassignmentError, setUnassignmentError] = useState<string | null>(null);

  // Style modal state
  const [styleModalOpen, setStyleModalOpen] = useState(false);
  const [styleModalProps, setStyleModalProps] = useState<{
    hierarchyId: string;
    levelId: string;
    nodeType: string;
  } | null>(null);

  // Add Node Type modal state
  const [addNodeTypeModalOpen, setAddNodeTypeModalOpen] = useState(false);
  const [addNodeTypeModalProps, setAddNodeTypeModalProps] = useState<{
    hierarchyId: string;
    levelId: string;
  } | null>(null);

  // Extract hierarchy ID from active view (including h0)
  const currentHierarchyId = active && active.startsWith('hierarchy-') 
    ? active.replace('hierarchy-', '') 
    : '';

  // Check if we're in h0 mode (categorization mode)
  const isH0Mode = currentHierarchyId === 'h0';
  const isHierarchyMode = active && active.startsWith('hierarchy-');

  // Auto-open panel when hierarchy is selected (including h0)
  useEffect(() => {
    if (isHierarchyMode) {
      setHierarchyPanelOpen(true);
    } else {
      setHierarchyPanelOpen(false);
    }
  }, [active, setHierarchyPanelOpen, isHierarchyMode]);

  // Fetch levels when hierarchy changes (including h0)
  useEffect(() => {
    if (!currentHierarchyId) {
      setLevels([]);
      return;
    }

    executeQuery(GET_LEVELS_FOR_HIERARCHY, { h: currentHierarchyId })
      .then((res) => {
        const rawLevels: HierarchyLevel[] = res.queryHierarchy?.[0]?.levels || [];
        const deduplicatedLevels = deduplicateHierarchyLevels(rawLevels);
        logLevelDeduplication(rawLevels.length, deduplicatedLevels.length, currentHierarchyId);
        setLevels(deduplicatedLevels);
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

  const handleUnassignDrop = async (nodeData?: any) => {
    console.log(`[HierarchyLandingPad] Unassign drop received:`, nodeData);
    
    // Clear any previous unassignment errors
    setUnassignmentError(null);
    
    if (nodeData && nodeData.id) {
      setIsUnassigning(true);
      try {
        console.log(`[HierarchyLandingPad] Unassigning node ${nodeData.id} from all hierarchies`);
        
        // TODO: Implement unassignment API call
        // For now, we'll use a placeholder that simulates the API call
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
        
        console.log(`[HierarchyLandingPad] Successfully unassigned node ${nodeData.id}`);
        
        // TODO: Trigger graph refresh to update node appearance
        
      } catch (error) {
        console.error(`[HierarchyLandingPad] Failed to unassign node ${nodeData.id}:`, error);
        setUnassignmentError(error instanceof Error ? error.message : 'Failed to unassign node');
      } finally {
        setIsUnassigning(false);
      }
    } else {
      console.warn('[HierarchyLandingPad] Unassign drop received but no valid node data provided');
    }
  };

  const clearUnassignmentError = () => {
    setUnassignmentError(null);
  };

  const handleToggle = () => {
    setHierarchyPanelOpen(!hierarchyPanelOpen);
  };

  const handleOpenStyleModal = (hierarchyId: string, levelId: string, nodeType: string) => {
    setStyleModalProps({ hierarchyId, levelId, nodeType });
    setStyleModalOpen(true);
  };

  const handleStyleSave = (style: NodeTypeStyle) => {
    if (styleModalProps) {
      updateStyle(styleModalProps.hierarchyId, styleModalProps.levelId, styleModalProps.nodeType, style);
      setStyleModalOpen(false);
      setStyleModalProps(null);
    }
  };

  const handleStyleCancel = () => {
    setStyleModalOpen(false);
    setStyleModalProps(null);
  };

  const handleAddNodeType = (hierarchyId: string, levelId: string) => {
    setAddNodeTypeModalProps({ hierarchyId, levelId });
    setAddNodeTypeModalOpen(true);
  };

  const handleAddNodeTypeSave = async (nodeTypeName: string, style: NodeTypeStyle) => {
    if (addNodeTypeModalProps) {
      try {
        // Call API to add new hierarchy level type
        const response = await fetch(`/api/hierarchy/${addNodeTypeModalProps.hierarchyId}/level/${addNodeTypeModalProps.levelId}/hierarchyLevelTypes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ typeName: nodeTypeName }),
        });

        if (!response.ok) {
          throw new Error(`Failed to add node type: ${response.statusText}`);
        }

        // Save the custom style
        updateStyle(addNodeTypeModalProps.hierarchyId, addNodeTypeModalProps.levelId, nodeTypeName, style);

        // Refresh levels to show the new node type
        executeQuery(GET_LEVELS_FOR_HIERARCHY, { h: addNodeTypeModalProps.hierarchyId })
          .then((res) => {
            const rawLevels: HierarchyLevel[] = res.queryHierarchy?.[0]?.levels || [];
            const deduplicatedLevels = deduplicateHierarchyLevels(rawLevels);
            setLevels(deduplicatedLevels);
          })
          .catch((err) => {
            console.error('[HierarchyLandingPad] Error refreshing levels after adding node type:', err);
          });

        setAddNodeTypeModalOpen(false);
        setAddNodeTypeModalProps(null);
      } catch (error) {
        console.error('[HierarchyLandingPad] Failed to add node type:', error);
        // TODO: Show error to user
      }
    }
  };

  const handleAddNodeTypeCancel = () => {
    setAddNodeTypeModalOpen(false);
    setAddNodeTypeModalProps(null);
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
              {isH0Mode ? (
                'Drag nodes from the graph to categorize them'
              ) : (
                isAssigning ? 'Assigning node...' : 'Drag grayed-out nodes from the graph to assign them to hierarchy levels'
              )}
            </div>
            {(assignmentError || unassignmentError) && (
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
                <span>Error: {assignmentError || unassignmentError}</span>
                <button
                  onClick={assignmentError ? clearAssignmentError : clearUnassignmentError}
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
                  hierarchyId={currentHierarchyId}
                  onDrop={handleDrop}
                  onOpenStyleModal={handleOpenStyleModal}
                  onAddNodeType={handleAddNodeType}
                />
              ))}
          </div>
        )}
      </div>

      {/* Style Modal */}
      {styleModalProps && (
        <NodeTypeStyleModal
          open={styleModalOpen}
          hierarchyId={styleModalProps.hierarchyId}
          levelId={styleModalProps.levelId}
          nodeType={styleModalProps.nodeType}
          currentStyle={getStyleForType(styleModalProps.hierarchyId, styleModalProps.levelId, styleModalProps.nodeType)}
          onSave={handleStyleSave}
          onCancel={handleStyleCancel}
        />
      )}

      {/* Add Node Type Modal */}
      {addNodeTypeModalProps && (
        <AddNodeTypeModal
          open={addNodeTypeModalOpen}
          hierarchyId={addNodeTypeModalProps.hierarchyId}
          levelId={addNodeTypeModalProps.levelId}
          onSave={handleAddNodeTypeSave}
          onCancel={handleAddNodeTypeCancel}
        />
      )}
    </div>
  );
};

export default HierarchyLandingPad;
