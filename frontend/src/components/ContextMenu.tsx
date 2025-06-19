import React, { useRef, useEffect } from 'react';
import { useContextMenu } from '../hooks/useContextMenu';
import { theme } from '../config';

const ContextMenu: React.FC = () => {
  const { open, position, items, closeMenu } = useContextMenu();
  const menuRef = useRef<HTMLUListElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    if (open) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [open, closeMenu]);

  if (!open) return null;

  return (
    <ul
      ref={menuRef}
      role="menu"
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        listStyle: 'none',
        padding: 0,
        margin: 0,
        background: theme.components.contextMenu.background,
        border: `1px solid ${theme.components.contextMenu.border}`,
        borderRadius: theme.components.contextMenu.borderRadius,
        boxShadow: theme.components.contextMenu.shadow,
        zIndex: theme.zIndex.dropdown,
        minWidth: 160,
      }}
    >
      {items.map((item) => (
        <li
          key={item.id}
          role="menuitem"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: `${theme.components.contextMenu.item.padding}px`,
            cursor: item.disabled ? 'not-allowed' : 'pointer',
            color: item.disabled ? theme.components.contextMenu.item.disabledColor : 'inherit',
          }}
          onClick={() => {
            if (item.disabled) return;
            item.action();
            closeMenu();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !item.disabled) {
              item.action();
              closeMenu();
            }
          }}
          tabIndex={0}
        >
          <span>
            {item.icon} {item.label}
          </span>
          {item.shortcut && (
            <span style={{ 
              marginLeft: 8, 
              color: theme.components.contextMenu.item.shortcutColor, 
              fontSize: `${theme.components.contextMenu.item.fontSize}px` 
            }}>
              {item.shortcut}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
};

export default ContextMenu;
