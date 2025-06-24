import React, { useState, useEffect } from 'react';
import ModalOverlay from './ModalOverlay';
import ModalContainer, { ModalHeader, ModalContent } from './ModalContainer';
import NodeStylePreview from './NodeStylePreview';
import { 
  buildFormFieldStyle, 
  buildFormLabelStyle, 
  buildInputStyle, 
  buildButtonStyle,
  buildFormActionsStyle 
} from '../utils/styleUtils';
import { theme } from '../config/theme';
import { 
  NodeTypeStyleModalProps, 
  NodeTypeStyle,
  SHAPE_OPTIONS,
  BORDER_STYLE_OPTIONS,
  TEXT_ALIGN_OPTIONS,
  getDefaultStyleForType
} from '../types/nodeStyle';

/**
 * NodeTypeStyleModal - Modal for customizing node type styling within hierarchy levels
 * Follows the same pattern as NodeFormModal with form fields and validation
 */
const NodeTypeStyleModal: React.FC<NodeTypeStyleModalProps> = ({
  open,
  hierarchyId,
  levelId,
  nodeType,
  currentStyle,
  onSave,
  onCancel,
}) => {
  // Form state - initialize with current style or defaults
  const [style, setStyle] = useState<NodeTypeStyle>(() => 
    currentStyle || getDefaultStyleForType(nodeType)
  );

  // Reset form when modal opens or props change
  useEffect(() => {
    if (open) {
      setStyle(currentStyle || getDefaultStyleForType(nodeType));
    }
  }, [open, currentStyle, nodeType]);

  // Early return if not open (after hooks)
  if (!open) return null;

  const handleSave = () => {
    onSave(style);
  };

  const handleStyleChange = (field: keyof NodeTypeStyle, value: any) => {
    setStyle(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Preview wrapper component for the modal
  const ModalPreviewWrapper: React.FC = () => {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px',
        backgroundColor: theme.colors.background.secondary,
        borderRadius: '8px',
        border: `1px solid ${theme.colors.border.light}`,
      }}>
        <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: theme.colors.text.primary }}>
          Preview
        </div>
        <NodeStylePreview
          style={style}
          nodeType={nodeType}
          size={{ width: 80, height: 40 }}
          fontSize={12}
        />
        <div style={{ fontSize: '12px', color: theme.colors.text.secondary, marginTop: '4px' }}>
          {SHAPE_OPTIONS.find(opt => opt.value === style.shape)?.label}
        </div>
      </div>
    );
  };

  return (
    <ModalOverlay isOpen={open} onClose={onCancel}>
      <ModalContainer width={600}>
        <ModalHeader 
          title={`Customize ${nodeType} Style`}
          subtitle={`Level ${levelId} in Hierarchy ${hierarchyId}`}
          onClose={onCancel}
        />
        
        <ModalContent>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '24px' }}>
            {/* Form Fields */}
            <div>
              <div style={buildFormFieldStyle()}>
                <label htmlFor="shape" style={buildFormLabelStyle()}>Shape</label>
                <select
                  id="shape"
                  value={style.shape}
                  onChange={e => handleStyleChange('shape', e.target.value)}
                  style={buildInputStyle()}
                >
                  {SHAPE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={buildFormFieldStyle()}>
                <label htmlFor="backgroundColor" style={buildFormLabelStyle()}>Background Color</label>
                <input
                  id="backgroundColor"
                  type="color"
                  value={style.backgroundColor}
                  onChange={e => handleStyleChange('backgroundColor', e.target.value)}
                  style={{
                    ...buildInputStyle(),
                    height: '40px',
                    padding: '4px',
                  }}
                />
              </div>

              <div style={buildFormFieldStyle()}>
                <label htmlFor="textColor" style={buildFormLabelStyle()}>Text Color</label>
                <input
                  id="textColor"
                  type="color"
                  value={style.textColor}
                  onChange={e => handleStyleChange('textColor', e.target.value)}
                  style={{
                    ...buildInputStyle(),
                    height: '40px',
                    padding: '4px',
                  }}
                />
              </div>

              <div style={buildFormFieldStyle()}>
                <label htmlFor="textAlign" style={buildFormLabelStyle()}>Text Alignment</label>
                <select
                  id="textAlign"
                  value={style.textAlign}
                  onChange={e => handleStyleChange('textAlign', e.target.value)}
                  style={buildInputStyle()}
                >
                  {TEXT_ALIGN_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={buildFormFieldStyle()}>
                <label htmlFor="borderColor" style={buildFormLabelStyle()}>Border Color</label>
                <input
                  id="borderColor"
                  type="color"
                  value={style.borderColor}
                  onChange={e => handleStyleChange('borderColor', e.target.value)}
                  style={{
                    ...buildInputStyle(),
                    height: '40px',
                    padding: '4px',
                  }}
                />
              </div>

              <div style={buildFormFieldStyle()}>
                <label htmlFor="borderWidth" style={buildFormLabelStyle()}>Border Width (px)</label>
                <input
                  id="borderWidth"
                  type="number"
                  min="0"
                  max="10"
                  value={style.borderWidth}
                  onChange={e => handleStyleChange('borderWidth', parseInt(e.target.value) || 0)}
                  style={buildInputStyle()}
                />
              </div>

              <div style={buildFormFieldStyle()}>
                <label htmlFor="borderStyle" style={buildFormLabelStyle()}>Border Style</label>
                <select
                  id="borderStyle"
                  value={style.borderStyle}
                  onChange={e => handleStyleChange('borderStyle', e.target.value)}
                  style={buildInputStyle()}
                >
                  {BORDER_STYLE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Preview Panel */}
            <div>
              <ModalPreviewWrapper />
            </div>
          </div>

          <div style={buildFormActionsStyle()}>
            <button 
              onClick={onCancel} 
              style={buildButtonStyle('secondary')}
            >
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              style={buildButtonStyle('primary')}
            >
              Save Style
            </button>
          </div>
        </ModalContent>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default NodeTypeStyleModal;
