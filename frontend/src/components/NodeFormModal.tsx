import React, { useState, useEffect } from 'react';
import { NodeData } from '../types/graph';
import { useHierarchyContext } from '../context/HierarchyContext';
import { useGraphState } from '../hooks/useGraphState';

export interface NodeFormValues {
  label: string;
  type: string;
  hierarchyId: string;
  levelId: string;
}

interface NodeFormModalProps {
  open: boolean;
  initialValues?: NodeData;
  parentId?: string;
  onSubmit: (values: NodeFormValues) => void;
  onCancel: () => void;
}

const NODE_TYPES = ['concept', 'example', 'question'];

const NodeFormModal: React.FC<NodeFormModalProps> = ({
  open,
  initialValues,
  parentId,
  onSubmit,
  onCancel,
}) => {
  const { hierarchies, hierarchyId, levels, setHierarchyId } = useHierarchyContext();
  const { nodes } = useGraphState();
  const [label, setLabel] = useState(initialValues?.label || '');
  const [type, setType] = useState(initialValues?.type || NODE_TYPES[0]);
  const [selectedLevelId, setSelectedLevelId] = useState(levels[0]?.id || '');

  useEffect(() => {
    // This effect runs when the modal opens or when dependencies change,
    // to set initial form values and determine the default selected level.
    if (open) {
      // Set initial label and type
      setLabel(initialValues?.label || '');
      setType(initialValues?.type || NODE_TYPES[0]);

      // Logic for determining the default selected level ID
      let defaultLevelId: string | undefined;

      // Case 1: Editing an existing node (initialValues are provided)
      if (initialValues && initialValues.assignments) {
        // Find the assignment corresponding to the currently active hierarchy
        const assign = initialValues.assignments.find(a => a.hierarchyId === hierarchyId);
        defaultLevelId = assign?.levelId; // Use the levelId from that assignment
      }
      // Case 2: Adding a new node as a child of another node (parentId is provided)
      else if (parentId) {
        const parent = nodes.find(n => n.id === parentId);
        // Find the parent's assignment in the current hierarchy
        const parentAssign = parent?.assignments?.find(a => a.hierarchyId === hierarchyId);
        const parentLevelNum = parentAssign?.levelNumber;
        // Calculate the next level number (parent's level + 1)
        const nextLevelNum = (parentLevelNum !== undefined) ? parentLevelNum + 1 : undefined;
        // Find a level in the current hierarchy that matches this next level number
        defaultLevelId = levels.find(l => l.levelNumber === nextLevelNum)?.id;
      }

      // Case 3: Fallback - if no specific default was found (e.g., new standalone node, or parent not in hierarchy)
      if (!defaultLevelId) {
        // Default to the first available level in the current hierarchy
        defaultLevelId = levels[0]?.id;
      }

      // Set the determined default level ID (or undefined if no levels exist)
      setSelectedLevelId(defaultLevelId || ''); // Ensure it's a string for the select value
    }
  }, [open, initialValues, levels, parentId, nodes, hierarchyId]);

  if (!open) return null;

  // When user changes hierarchy, update hierarchy selection
  const onHierarchyChange = (hierId: string) => {
    setHierarchyId(hierId);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000,
    }}>
      <div style={{
        background: '#fff', padding: 20, borderRadius: 4,
        width: '300px', boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
      }}>
        <h2 style={{ marginTop: 0 }}>{initialValues ? 'Edit Node' : 'Add Node'}</h2>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Label</label>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            style={{ width: '100%', padding: 4 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Type</label>
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            style={{ width: '100%', padding: 4 }}
          >
            {NODE_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Hierarchy</label>
          <select
            value={hierarchyId}
            onChange={e => onHierarchyChange(e.target.value)}
            style={{ width: '100%', padding: 4 }}
          >
            {hierarchies.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Level</label>
          <select
            value={selectedLevelId}
            onChange={e => setSelectedLevelId(e.target.value)}
            style={{ width: '100%', padding: 4 }}
          >
            {levels.map(l => (
              <option key={l.id} value={l.id}>
                {l.levelNumber}{l.label ? `: ${l.label}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div style={{ textAlign: 'right' }}>
          <button onClick={onCancel} style={{ marginRight: 8, padding: '6px 12px' }}>
            Cancel
          </button>
          <button
            onClick={() => onSubmit({
              label,
              type,
              hierarchyId,
              levelId: selectedLevelId
            })}
            disabled={!label.trim()}
            style={{ padding: '6px 12px' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default NodeFormModal;
