import React, { useState } from 'react';
import { NodeData } from '../types/graph';
import { NodeFormValues } from './NodeFormModal';

interface NodeDrawerProps {
  open: boolean;
  node?: NodeData;
  onSave: (values: NodeFormValues) => void;
  onClose: () => void;
}

const TABS = ['Info', 'Links', 'History'] as const;
type Tab = typeof TABS[number];

const NodeDrawer: React.FC<NodeDrawerProps> = ({ open, node, onSave, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('Info');
  const [formValues, setFormValues] = useState<NodeFormValues>({
    label: node?.label || '',
    type: node?.type || 'concept',
  });

  React.useEffect(() => {
    if (open && node) {
      setFormValues({
        label: node.label || '',
        type: node.type || 'concept',
      });
      setActiveTab('Info');
    }
  }, [open, node]);

  if (!open || !node) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 320,
        background: '#fff',
        borderLeft: '1px solid #ccc',
        boxShadow: '-2px 0 5px rgba(0,0,0,0.1)',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: 12, borderBottom: '1px solid #eee' }}>
        <button onClick={onClose} style={{ float: 'right' }}>×</button>
        <h3 style={{ margin: 0 }}>Node: {node.id}</h3>
      </div>
      <div style={{ display: 'flex', borderBottom: '1px solid #eee' }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '8px',
              background: activeTab === tab ? '#f0f0f0' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #007bff' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            {tab}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {activeTab === 'Info' && (
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>Label</label>
            <input
              type="text"
              value={formValues.label}
              onChange={(e) => setFormValues({ ...formValues, label: e.target.value })}
              style={{ width: '100%', marginBottom: 12, padding: 4 }}
            />
            <label style={{ display: 'block', marginBottom: 4 }}>Type</label>
            <select
              value={formValues.type}
              onChange={(e) => setFormValues({ ...formValues, type: e.target.value })}
              style={{ width: '100%', marginBottom: 12, padding: 4 }}
            >
              <option value="concept">concept</option>
              <option value="example">example</option>
              <option value="question">question</option>
            </select>
            <div style={{ textAlign: 'right' }}>
              <button onClick={onClose} style={{ marginRight: 8 }}>Cancel</button>
              <button
                onClick={() => onSave(formValues)}
                disabled={!formValues.label.trim()}
              >
                Save
              </button>
            </div>
          </div>
        )}
        {activeTab === 'Links' && <p>Links editing coming soon.</p>}
        {activeTab === 'History' && <p>History view coming soon.</p>}
      </div>
    </div>
  );
};

export default NodeDrawer;
