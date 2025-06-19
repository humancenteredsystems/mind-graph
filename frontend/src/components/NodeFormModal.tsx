import React, { FC, useState, useEffect, useMemo } from 'react';
import { NodeData } from '../types/graph';
import { useHierarchyContext } from '../hooks/useHierarchy';
import { useGraphState } from '../hooks/useGraphState';
import { resolveNodeHierarchyAssignment } from '../utils/graphUtils';
import ModalOverlay from './ModalOverlay';
import ModalContainer, { ModalHeader, ModalContent } from './ModalContainer';
import { 
  buildFormFieldStyle, 
  buildFormLabelStyle, 
  buildInputStyle, 
  buildButtonStyle,
  buildFormErrorStyle,
  buildFormActionsStyle 
} from '../utils/styleUtils';

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

  // Use the new utility function to resolve parent hierarchy assignment
  const parentInfo = useMemo(() => {
    return parentId ? resolveNodeHierarchyAssignment(parentId, nodes, hierarchyId) : { levelNumber: 0 };
  }, [parentId, nodes, hierarchyId]);

  const parentLevelNum = useMemo(() => {
    return parentInfo.levelNumber;
  }, [parentInfo.levelNumber]);

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
    <ModalOverlay isOpen={open} onClose={onCancel}>
      <ModalContainer width={600}>
        <ModalHeader 
          title={initialValues ? 'Edit Node' : 'Add Node'}
          onClose={onCancel}
        />
        
        <ModalContent>
          <div style={buildFormFieldStyle()}>
            <label htmlFor="node-label" style={buildFormLabelStyle()}>Label</label>
            <input
              id="node-label"
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              style={buildInputStyle()}
            />
          </div>
          
          <div style={buildFormFieldStyle()}>
            <label htmlFor="node-type" style={buildFormLabelStyle()}>Type</label>
            <select
              id="node-type"
              value={type}
              onChange={e => setType(e.target.value)}
              style={buildInputStyle()}
            >
              {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          
          <div style={buildFormFieldStyle()}>
            <label htmlFor="node-hierarchy" style={buildFormLabelStyle()}>Hierarchy</label>
            <select
              id="node-hierarchy"
              value={hierarchyId}
              onChange={e => setHierarchyId(e.target.value)}
              style={buildInputStyle()}
            >
              {hierarchies.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          
          <div style={buildFormFieldStyle()}>
            <label htmlFor="node-level" style={buildFormLabelStyle()}>Level</label>
            <select
              id="node-level"
              value={parentId && childLevel ? childLevel.id : selectedLevelId}
              onChange={e => setSelectedLevelId(e.target.value)}
              style={buildInputStyle()}
              disabled={parentId && childLevel ? true : false}
            >
              {levels.map(l => (
                <option key={l.id} value={l.id}>
                  L{l.levelNumber}{l.label ? `: ${l.label}` : ''}
                </option>
              ))}
            </select>
          </div>
          
          {errorMessage && (
            <div style={buildFormErrorStyle()}>{errorMessage}</div>
          )}

          <div style={buildFormActionsStyle()}>
            <button 
              onClick={onCancel} 
              style={buildButtonStyle('secondary')}
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={!isValid}
              style={buildButtonStyle(isValid ? 'primary' : 'secondary')}
            >
              Save
            </button>
          </div>
        </ModalContent>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default NodeFormModal;
