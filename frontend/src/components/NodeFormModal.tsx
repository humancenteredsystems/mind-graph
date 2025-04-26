import React, { useState, useEffect } from 'react';
import { NodeData } from '../types/graph';

export interface NodeFormValues {
  label: string;
  type: string;
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
  const [label, setLabel] = useState(initialValues?.label || '');
  const [type, setType] = useState(initialValues?.type || NODE_TYPES[0]);

  useEffect(() => {
    if (open) {
      setLabel(initialValues?.label || '');
      setType(initialValues?.type || NODE_TYPES[0]);
    }
  }, [open, initialValues]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
    >
      <div
        style={{
          background: '#fff',
          padding: 20,
          borderRadius: 4,
          width: '300px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        }}
      >
        <h2 style={{ marginTop: 0 }}>
          {initialValues ? 'Edit Node' : 'Add Node'}
        </h2>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            style={{ width: '100%', padding: 4 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{ width: '100%', padding: 4 }}
          >
            {NODE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div style={{ textAlign: 'right' }}>
          <button
            onClick={onCancel}
            style={{ marginRight: 8, padding: '6px 12px' }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit({ label, type })}
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
