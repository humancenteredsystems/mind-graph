import React, { FC, useState, useEffect, useMemo } from 'react';
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

const NodeFormModal: FC<NodeFormModalProps> = ({
  open,
  initialValues,
  parentId,
  onSubmit,
  onCancel,
}) => {
  const {
    hierarchies,
    hierarchyId,
    levels,
    allowedTypesMap,
    allNodeTypes,
    setHierarchyId,
  } = useHierarchyContext();
  const { nodes } = useGraphState();

  // Form state
  const [label, setLabel] = useState('');
  const [type, setType] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);

  // Memoize calculated values to prevent unnecessary re-renders
  const parentAssign = useMemo(() => {
    return parentId
      ? nodes.find(n => n.id === parentId)?.assignments?.find(a => a.hierarchyId === hierarchyId)
      : undefined;
  }, [parentId, nodes, hierarchyId]);

  const parentLevelNum = useMemo(() => {
    return parentAssign?.levelNumber ?? 0;
  }, [parentAssign]);

  const childLevelNum = useMemo(() => {
    return parentLevelNum > 0 ? parentLevelNum + 1 : undefined;
  }, [parentLevelNum]);

  const childLevel = useMemo(() => {
    return childLevelNum ? levels.find(l => l.levelNumber === childLevelNum) : undefined;
  }, [childLevelNum, levels]);

  const maxLevelNum = useMemo(() => {
    return levels.reduce((max, l) => Math.max(max, l.levelNumber), 0);
  }, [levels]);

  // Memoize available types calculation
  const availableTypes = useMemo(() => {
    const effectiveLevel = childLevel ? childLevel.levelNumber : levels.find(l => l.id === selectedLevelId)?.levelNumber;
    if (effectiveLevel === undefined) return allNodeTypes;
    
    const typeKey = `${hierarchyId}l${effectiveLevel}`;
    // If allowedTypesMap has an entry for this level (even empty), use its values (empty ⇒ no restriction)
    return typeKey in allowedTypesMap
      ? (allowedTypesMap[typeKey].length > 0 ? allowedTypesMap[typeKey] : allNodeTypes)
      : allNodeTypes;
  }, [childLevel, levels, selectedLevelId, hierarchyId, allowedTypesMap, allNodeTypes]);

  // Initialize form values
  useEffect(() => {
    if (!open) return;
    setLabel(initialValues?.label ?? '');
    setType(initialValues?.type ?? allNodeTypes[0] ?? '');
    let defaultLevel = levels[0]?.id ?? '';
    if (parentId && childLevel) {
      defaultLevel = childLevel.id;
    } else if (initialValues?.assignments?.length) {
      const assign = initialValues.assignments.find(a => a.hierarchyId === hierarchyId);
      if (assign) defaultLevel = assign.levelId;
    }
    setSelectedLevelId(defaultLevel);
    setErrorMessage(null);
  }, [open, initialValues, levels, hierarchyId, allNodeTypes, parentId, childLevel]);

  // Validate
  useEffect(() => {
    if (!open) return;
    let valid = true;
    let err: string | null = null;
    if (!label.trim()) {
      valid = false;
      err = 'Label is required.';
    }
    if (parentId && parentLevelNum >= maxLevelNum) {
      valid = false;
      err = `Cannot add child: already at deepest level (${parentLevelNum}).`;
    }
    setErrorMessage(err);
    setIsValid(valid);
  }, [open, label, parentId, parentLevelNum, maxLevelNum]);

  // Sync type with available types when they change
  useEffect(() => {
    if (!open || availableTypes.length === 0) return;
    
    // If current type is not in available types, select the first available
    if (!availableTypes.includes(type)) {
      setType(availableTypes[0]);
    }
  }, [open, availableTypes, type]);

  // Early return AFTER all hooks
  if (!open) return null;

  const handleSubmit = () => {
    const levelId = parentId && childLevel ? childLevel.id : selectedLevelId;
    onSubmit({ label: label.trim(), type, hierarchyId, levelId });
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
        width: 600, boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        display: 'flex',
      }}>
        <div style={{ flex: 1, paddingRight: 16 }}>
          <h2>{initialValues ? 'Edit Node' : 'Add Node'}</h2>

          <div style={{ marginBottom: 12 }}>
            <label htmlFor="node-label">Label</label>
            <input
              id="node-label"
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              style={{ width: '100%', padding: 4 }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="node-type">Type</label>
            <select
              id="node-type"
              value={type}
              onChange={e => setType(e.target.value)}
              style={{ width: '100%', padding: 4 }}
            >
              {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="node-hierarchy">Hierarchy</label>
            <select
              id="node-hierarchy"
              value={hierarchyId}
              onChange={e => setHierarchyId(e.target.value)}
              style={{ width: '100%', padding: 4 }}
            >
              {hierarchies.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="node-level">Level</label>
            <select
              id="node-level"
              value={parentId && childLevel ? childLevel.id : selectedLevelId}
              onChange={e => setSelectedLevelId(e.target.value)}
              style={{ width: '100%', padding: 4 }}
              disabled={!!parentId}
            >
              {levels.map(l => (
                <option key={l.id} value={l.id}>
                  L{l.levelNumber}{l.label ? `: ${l.label}` : ''}
                </option>
              ))}
            </select>
          </div>
          {errorMessage && (
            <div style={{ color: 'red', marginBottom: 12 }}>{errorMessage}</div>
          )}

          <div style={{ textAlign: 'right' }}>
            <button onClick={onCancel} style={{ marginRight: 8 }}>Cancel</button>
            <button onClick={handleSubmit} disabled={!isValid}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NodeFormModal;
