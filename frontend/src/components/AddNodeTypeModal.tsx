/**
 * AddNodeTypeModal - Modal for adding new node types to h0 hierarchy
 * Combines node type creation with styling configuration
 */

import React, { useState, useEffect } from 'react';
import { NodeTypeStyle, getDefaultStyleForType, SHAPE_OPTIONS, BORDER_STYLE_OPTIONS, TEXT_ALIGN_OPTIONS } from '../types/nodeStyle';
import { theme } from '../config';
import NodeStylePreview from './NodeStylePreview';
import { ModalOverlay, ModalContainer } from './index';

interface AddNodeTypeModalProps {
  open: boolean;
  hierarchyId: string;
  levelId: string;
  onSave: (nodeTypeName: string, style: NodeTypeStyle) => void;
  onCancel: () => void;
}

const AddNodeTypeModal: React.FC<AddNodeTypeModalProps> = ({
  open,
  hierarchyId,
  levelId,
  onSave,
  onCancel
}) => {
  const [nodeTypeName, setNodeTypeName] = useState('');
  const [style, setStyle] = useState<NodeTypeStyle>(getDefaultStyleForType('default'));
  const [nameError, setNameError] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setNodeTypeName('');
      setStyle(getDefaultStyleForType('default'));
      setNameError('');
    }
  }, [open]);

  const handleSave = () => {
    // Validate node type name
    const trimmedName = nodeTypeName.trim();
    if (!trimmedName) {
      setNameError('Node type name is required');
      return;
    }
    
    if (trimmedName.length < 2) {
      setNameError('Node type name must be at least 2 characters');
      return;
    }
    
    if (trimmedName.length > 50) {
      setNameError('Node type name must be 50 characters or less');
      return;
    }
    
    // Check for invalid characters (basic validation)
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmedName)) {
      setNameError('Node type name can only contain letters, numbers, spaces, hyphens, and underscores');
      return;
    }

    onSave(trimmedName, style);
  };

  const handleStyleChange = (field: keyof NodeTypeStyle, value: any) => {
    setStyle(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNodeTypeName(e.target.value);
    if (nameError) {
      setNameError(''); // Clear error when user starts typing
    }
  };

  if (!open) return null;

  const modalStyle = {
    width: '500px',
    maxHeight: '80vh',
    overflow: 'auto',
  };

  const headerStyle = {
    padding: '20px 24px 16px',
    borderBottom: `1px solid ${theme.colors.border.default}`,
  };

  const titleStyle = {
    fontSize: '18px',
    fontWeight: 600,
    color: theme.colors.text.primary,
    margin: 0,
  };

  const contentStyle = {
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  };

  const sectionStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  };

  const labelStyle = {
    fontSize: '14px',
    fontWeight: 500,
    color: theme.colors.text.primary,
  };

  const inputStyle = {
    padding: '8px 12px',
    border: `1px solid ${nameError ? theme.colors.text.error : theme.colors.border.default}`,
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: theme.colors.background.primary,
    color: theme.colors.text.primary,
  };

  const selectStyle = {
    padding: '8px 12px',
    border: `1px solid ${theme.colors.border.default}`,
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: theme.colors.background.primary,
    color: theme.colors.text.primary,
  };

  const colorInputStyle = {
    width: '60px',
    height: '36px',
    border: `1px solid ${theme.colors.border.default}`,
    borderRadius: '4px',
    cursor: 'pointer',
  };

  const numberInputStyle = {
    ...inputStyle,
    width: '80px',
  };

  const previewSectionStyle = {
    padding: '16px',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '12px',
  };

  const errorStyle = {
    fontSize: '12px',
    color: theme.colors.text.error,
    marginTop: '4px',
  };

  const footerStyle = {
    padding: '16px 24px',
    borderTop: `1px solid ${theme.colors.border.default}`,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  };

  const buttonStyle = {
    padding: '8px 16px',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none',
  };

  const cancelButtonStyle = {
    ...buttonStyle,
    backgroundColor: theme.colors.background.secondary,
    color: theme.colors.text.primary,
    border: `1px solid ${theme.colors.border.default}`,
  };

  const saveButtonStyle = {
    ...buttonStyle,
    backgroundColor: theme.colors.border.active,
    color: '#ffffff',
  };

  return (
    <ModalOverlay isOpen={open} onClose={onCancel}>
      <ModalContainer width="500px" maxHeight="80vh">
        <div style={headerStyle}>
          <h2 style={titleStyle}>Add Node Type</h2>
        </div>

        <div style={contentStyle}>
          {/* Node Type Name */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Node Type Name</label>
            <input
              type="text"
              value={nodeTypeName}
              onChange={handleNameChange}
              placeholder="e.g., Animal, Vegetable, Mineral"
              style={inputStyle}
              autoFocus
            />
            {nameError && <div style={errorStyle}>{nameError}</div>}
          </div>

          {/* Style Configuration */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Node Appearance</label>
            
            {/* Shape */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ minWidth: '80px', fontSize: '13px' }}>Shape:</span>
              <select
                value={style.shape}
                onChange={(e) => handleStyleChange('shape', e.target.value)}
                style={selectStyle}
              >
                {SHAPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Colors */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ minWidth: '80px', fontSize: '13px' }}>Background:</span>
              <input
                type="color"
                value={style.backgroundColor}
                onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                style={colorInputStyle}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ minWidth: '80px', fontSize: '13px' }}>Text Color:</span>
              <input
                type="color"
                value={style.textColor}
                onChange={(e) => handleStyleChange('textColor', e.target.value)}
                style={colorInputStyle}
              />
            </div>

            {/* Text Alignment */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ minWidth: '80px', fontSize: '13px' }}>Text Align:</span>
              <select
                value={style.textAlign}
                onChange={(e) => handleStyleChange('textAlign', e.target.value)}
                style={selectStyle}
              >
                {TEXT_ALIGN_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Border */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ minWidth: '80px', fontSize: '13px' }}>Border:</span>
              <input
                type="color"
                value={style.borderColor}
                onChange={(e) => handleStyleChange('borderColor', e.target.value)}
                style={colorInputStyle}
              />
              <input
                type="number"
                min="0"
                max="10"
                value={style.borderWidth}
                onChange={(e) => handleStyleChange('borderWidth', parseInt(e.target.value) || 0)}
                style={numberInputStyle}
              />
              <select
                value={style.borderStyle}
                onChange={(e) => handleStyleChange('borderStyle', e.target.value)}
                style={selectStyle}
              >
                {BORDER_STYLE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview */}
          <div style={previewSectionStyle}>
            <span style={{ fontSize: '13px', color: theme.colors.text.secondary }}>Preview:</span>
            <NodeStylePreview
              style={style}
              nodeType={nodeTypeName || 'New Type'}
              size={{ width: 120, height: 60 }}
              fontSize={14}
            />
          </div>
        </div>

        <div style={footerStyle}>
          <button onClick={onCancel} style={cancelButtonStyle}>
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            style={saveButtonStyle}
            disabled={!nodeTypeName.trim()}
          >
            Add Node Type
          </button>
        </div>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default AddNodeTypeModal;
