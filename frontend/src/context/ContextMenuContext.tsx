import React, { useState, ReactNode, useEffect } from 'react';
import { useUIContext } from '../hooks/useUI';
import { MenuType, MenuItem } from '../types/contextMenu';
import { NodeData } from '../types/graph';
import { showComingSoonAlert } from '../utils/uiUtils';
import { ContextMenuContext } from './contexts';

export const ContextMenuProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const ui = useUIContext();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<MenuType>();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [items, setItems] = useState<MenuItem[]>([]);

  const closeMenu = () => setOpen(false);

  const openMenu = (
    menuType: MenuType,
    pos: { x: number; y: number },
    payload: Record<string, unknown> = {}
  ) => {
    setType(menuType);
    setPosition(pos);

    // Use type assertion for internal implementation to handle dynamic payload
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = payload as Record<string, any>;

    let menuItems: MenuItem[] = [];

    switch (menuType) {
      case 'background':
        menuItems = [
          { id: 'add-node', label: 'Add Node', icon: '➕', shortcut: 'A', action: () => ui.openAddModal() },
          { id: 'load-graph', label: 'Load Complete Graph', icon: '📂', shortcut: 'L', action: () => p.loadInitialGraph?.() },
          { id: 'clear-graph', label: 'Clear Graph', icon: '🗑️', shortcut: 'Ctrl+Del', action: () => p.resetGraph?.() },
        ];
        break;

      case 'node': {
        const node: NodeData = p.node;
        
        menuItems = [
          { id: 'add-connected', label: 'Add Connected Node', icon: '➕', shortcut: 'A', action: () => ui.openAddModal(node.id) },
          { id: 'edit-node', label: 'Edit Node', icon: '✏️', shortcut: 'Ctrl+E', action: () => p.onEditNode?.(node) },
          { id: 'delete-node', label: 'Delete Node', icon: '🗑️', shortcut: 'Del', action: () => p.onDeleteNode?.(node.id) },
          { id: 'hide-node', label: 'Hide Node', icon: '👁️‍🗨️', shortcut: 'H', action: () => p.onHideNode?.(node.id) },
          { id: 'expand-children', label: 'Expand Children', icon: '▶️', shortcut: 'E', action: () => p.onExpandChildren?.(node.id) },
          { id: 'expand-descendants', label: 'Expand Descendants', icon: '▶️▶️', shortcut: 'Shift+E', action: () => p.onExpandAll?.(node.id) },
          { id: 'collapse-descendants', label: 'Collapse Descendants', icon: '◀️◀️', shortcut: 'C', action: () => p.onCollapseNode?.(node.id) }
        ];
        break;
      }

      case 'edge': {
        const ids: string[] = p.edgeIds || [];
        menuItems = [
          { id: 'delete-edge', label: 'Delete Edge', icon: '🗑️', shortcut: 'Del', action: () => p.onDeleteEdge?.(ids[0]) },
        ];
        break;
      }

      case 'multi-edge': {
        const ids: string[] = p.edgeIds || [];
        menuItems = [
          { id: 'delete-edges', label: 'Delete Edges', icon: '🗑️', shortcut: 'Del', action: () => p.onDeleteEdges?.(ids) },
        ];
        break;
      }

      case 'multi-node': {
        const ids: string[] = p.nodeIds || [];
        if (ids.length === 2 && p.onConnect) {
          if (p.canConnect) {
            menuItems = [
              { id: 'connect', label: 'Connect Nodes', icon: '🔗', shortcut: '', action: () => p.onConnect?.(p.connectFrom, p.connectTo) },
            ];
          } else {
            menuItems = [
              { id: 'connect', label: 'Connect Nodes', icon: '🔗', shortcut: '', action: () => {}, disabled: true },
            ];
          }
        } else {
          menuItems = [
            { id: 'add-multi', label: 'Add Connected Nodes', icon: '➕', shortcut: 'A', action: () => ids.forEach(id => ui.openAddModal(id)) },
            { id: 'edit-multi', label: 'Edit Nodes', icon: '✏️', shortcut: 'Ctrl+E', action: () => ids.forEach(id => ui.openEditDrawer({ id } as NodeData)) },
            { id: 'delete-multi', label: 'Delete Nodes', icon: '🗑️', shortcut: 'Del', action: () => p.onDeleteNodes?.(ids) },
            { id: 'hide-multi', label: 'Hide Nodes', icon: '👁️‍🗨️', shortcut: 'H', action: () => p.onHideNodes?.(ids) },
            { id: 'expand-multi', label: 'Expand Children (All)', icon: '▶️', shortcut: 'E', action: () => showComingSoonAlert() },
            { id: 'expand-desc-multi', label: 'Expand All (All)', icon: '▶️▶️', shortcut: 'Shift+E', action: () => showComingSoonAlert() },
            { id: 'collapse-multi', label: 'Collapse (All)', icon: '◀️', shortcut: 'C', action: () => showComingSoonAlert() },
          ];
        }
        break;
      }

      default:
        menuItems = [];
        break;
    }

    setItems(menuItems);
    setOpen(true);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && closeMenu();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <ContextMenuContext.Provider value={{ open, type, position, items, openMenu, closeMenu }}>
      {children}
    </ContextMenuContext.Provider>
  );
};
