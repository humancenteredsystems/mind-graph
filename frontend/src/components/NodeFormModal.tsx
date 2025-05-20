import React, { FC, useState, useEffect } from 'react';
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

  // Compute parent and child level context
  const parentAssign = parentId
    ? nodes.find(n => n.id === parentId)?.assignments?.find(a => a.hierarchyId === hierarchyId)
    : undefined;
  const parentLevelNum = parentAssign?.levelNumber ?? 0;
  const childLevelNum = parentLevelNum > 0 ? parentLevelNum + 1 : undefined;
  const childLevel = childLevelNum
    ? levels.find(l => l.levelNumber === childLevelNum)
    : undefined;
  const maxLevelNum = levels.reduce((max, l) => Math.max(max, l.levelNumber), 0);

  // Form state
  const [label, setLabel] = useState('');
  const [type, setType] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);

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

  if (!open) return null;

  // Determine types for dropdown
  const effectiveLevel = childLevel ? childLevel.levelNumber : levels.find(l => l.id === selectedLevelId)?.levelNumber;
  const typeKey = `${hierarchyId}l${effectiveLevel}`;
  // If allowedTypesMap has an entry for this level (even empty), use its values (empty ⇒ no restriction)
  const availableTypes = typeKey in allowedTypesMap
    ? (allowedTypesMap[typeKey].length > 0 ? allowedTypesMap[typeKey] : allNodeTypes)
    : allNodeTypes;

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

          <div style={{ marginBottom: 12 }}>
            <label>Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              style={{ width: '100%', padding: 4 }}
            >
              {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>Hierarchy</label>
            <select
              value={hierarchyId}
              onChange={e => setHierarchyId(e.target.value)}
              style={{ width: '100%', padding: 4 }}
            >
              {hierarchies.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>Level</label>
            <select
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
