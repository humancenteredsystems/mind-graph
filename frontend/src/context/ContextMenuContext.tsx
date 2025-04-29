import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from 'react';
import { useUIContext } from './UIContext';
import { MenuType, MenuItem } from '../types/contextMenu';
import { NodeData } from '../types/graph';
import { showComingSoonAlert } from '../utils/uiUtils';

interface ContextMenuContextValue {
  open: boolean;
  type?: MenuType;
  position: { x: number; y: number };
  items: MenuItem[];
  openMenu: (
    menuType: MenuType,
    position: { x: number; y: number },
    payload?: Record<string, any>
  ) => void;
  closeMenu: () => void;
}

const ContextMenuContext = createContext<ContextMenuContextValue | undefined>(
  undefined
);

export const ContextMenuProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const ui = useUIContext();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<MenuType>();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [items, setItems] = useState<MenuItem[]>([]);

  const closeMenu = () => setOpen(false);

  const openMenu = (
    menuType: MenuType,
    pos: { x: number; y: number },
    payload: Record<string, any> = {}
  ) => {
    setType(menuType);
    setPosition(pos);

    let menuItems: MenuItem[] = [];

    switch (menuType) {
      case 'background':
        menuItems = [
          {
            id: 'add-node',
            label: 'Add Node',
            icon: '➕',
            shortcut: 'A',
            action: () => ui.openAddModal(),
          },
          {
            id: 'load-graph',
            label: 'Load Complete Graph',
            icon: '📂',
            shortcut: 'L',
            action: () =>
              payload.loadInitialGraph
                ? payload.loadInitialGraph()
                : console.log('Load Graph not available'),
          },
          {
            id: 'clear-graph',
            label: 'Clear Graph',
            icon: '🗑️',
            shortcut: 'Ctrl + Del',
            action: () =>
              payload.resetGraph
                ? payload.resetGraph()
                : console.log('Clear Graph not available'),
          },
        ];
        break;

      case 'node': {
        const node: NodeData = payload.node;
        menuItems = [
          {
            id: 'add-connected',
            label: 'Add Connected Node',
            icon: '➕',
            shortcut: 'A',
            action: () => ui.openAddModal(node.id),
          },
          {
            id: 'edit-node',
            label: 'Edit Node',
            icon: '✏️',
            shortcut: 'Ctrl + E',
            action: () => ui.openEditDrawer(node),
          },
          {
            id: 'delete-node',
            label: 'Delete Node',
            icon: '🗑️',
            shortcut: 'Del',
            action: () =>
              payload.onDeleteNode
                ? payload.onDeleteNode(node.id)
                : console.log('Delete Node not available'),
          },
          {
            id: 'hide-node',
            label: 'Hide Node',
            icon: '👁️‍🗨️',
            shortcut: 'H',
            action: () =>
              payload.onHideNode
                ? payload.onHideNode(node.id)
                : console.log('Hide Node not available'),
          },
          {
            id: 'expand-children',
            label: 'Expand Children',
            icon: '▶️',
            shortcut: 'E',
            action: () => showComingSoonAlert(),
          },
          {
            id: 'expand-desc',
            label: 'Expand Descendents',
            icon: '▶️▶️',
            shortcut: 'E, then E',
            action: () => showComingSoonAlert(),
          },
          {
            id: 'collapse-desc',
            label: 'Collapse Descendents',
            icon: '◀️◀️',
            shortcut: 'C',
            action: () => showComingSoonAlert(),
          },
        ];
        break;
      }

      case 'multi-node': {
        const ids: string[] = payload.nodeIds || [];
        menuItems = [
          {
            id: 'add-multi',
            label: 'Add Connected Nodes',
            icon: '➕',
            shortcut: 'A',
            action: () => ids.forEach((id) => ui.openAddModal(id)),
          },
          {
            id: 'edit-multi',
            label: 'Edit Nodes',
            icon: '✏️',
            shortcut: 'Ctrl + E',
            action: () =>
              ids.forEach((id) =>
                ui.openEditDrawer({ id } as NodeData)
              ),
          },
          {
            id: 'delete-multi',
            label: 'Delete Nodes',
            icon: '🗑️',
            shortcut: 'Del',
            action: () =>
              payload.onDeleteNodes
                ? payload.onDeleteNodes(ids)
                : console.log('Delete Nodes not available'),
          },
          {
            id: 'hide-multi',
            label: 'Hide Nodes',
            icon: '👁️‍🗨️',
            shortcut: 'H',
            action: () =>
              payload.onHideNodes
                ? payload.onHideNodes(ids)
                : console.log('Hide Nodes not available'),
          },
          {
            id: 'expand-multi',
            label: 'Expand Children (All)',
            icon: '▶️',
            shortcut: 'E',
            action: () => showComingSoonAlert(),
          },
          {
            id: 'expand-desc-multi',
            label: 'Expand Descendents (All)',
            icon: '▶️▶️',
            shortcut: 'E, then E',
            action: () => showComingSoonAlert(),
          },
          {
            id: 'collapse-desc-multi',
            label: 'Collapse Descendents (All)',
            icon: '◀️◀️',
            shortcut: 'C',
            action: () => showComingSoonAlert(),
          },
        ];
        break;
      }

      default:
        menuItems = [];
    }

    setItems(menuItems);
    setOpen(true);
  };

  // close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <ContextMenuContext.Provider
      value={{ open, type, position, items, openMenu, closeMenu }}
    >
      {children}
    </ContextMenuContext.Provider>
  );
};

export function useContextMenu(): ContextMenuContextValue {
  const ctx = useContext(ContextMenuContext);
  if (!ctx) throw new Error('useContextMenu must be used within ContextMenuProvider');
  return ctx;
}
