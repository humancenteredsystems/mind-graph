import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from 'react';

export type MenuType = 'background' | 'node' | 'multi-node';

export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

interface ContextMenuState {
  open: boolean;
  type?: MenuType;
  position: { x: number; y: number };
  items: MenuItem[];
}

interface ContextMenuContextValue extends ContextMenuState {
  openMenu: (
    type: MenuType,
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
    // Build items based on menuType
    let menuItems: MenuItem[] = [];

    if (menuType === 'background') {
      menuItems = [
        {
          id: 'add-node',
          label: 'Add Node',
          icon: '➕',
          shortcut: 'A',
          action: () =>
            payload.onAddNode
              ? payload.onAddNode()
              : console.log('TODO: implement Add Node'),
        },
        {
          id: 'load-graph',
          label: 'Load Complete Graph',
          icon: '📂',
          shortcut: 'L',
          action: () =>
            payload.loadInitialGraph
              ? payload.loadInitialGraph()
              : console.log('TODO: implement Load Complete Graph'),
        },
        {
          id: 'clear-graph',
          label: 'Clear Graph',
          icon: '🗑️',
          shortcut: 'Ctrl + Del',
          action: () =>
            payload.resetGraph
              ? payload.resetGraph()
              : console.log('TODO: implement Clear Graph'),
        },
      ];
    } else if (menuType === 'node') {
      const id = payload.nodeId as string;
      menuItems = [
        {
          id: 'add-connected',
          label: 'Add Connected Node',
          icon: '➕',
          shortcut: 'A',
          action: () =>
            payload.onAddNode
              ? payload.onAddNode(id, payload.position)
              : console.log('TODO: implement Add Connected Node'),
        },
        {
          id: 'delete-node',
          label: 'Delete Node',
          icon: '🗑️',
          shortcut: 'Del',
          action: () =>
            console.log('TODO: implement Delete Node', id),
        },
        {
          id: 'hide-node',
          label: 'Hide Node',
          icon: '👁️‍🗨️',
          shortcut: 'H',
          action: () =>
            console.log('TODO: implement Hide Node', id),
        },
        {
          id: 'expand-children',
          label: 'Expand Children',
          icon: '▶️',
          shortcut: 'E',
          action: () =>
            payload.onNodeExpand
              ? payload.onNodeExpand(id)
              : console.log('TODO: implement Expand Children', id),
        },
        {
          id: 'expand-desc',
          label: 'Expand Descendents',
          icon: '▶️▶️',
          shortcut: 'E, then E',
          action: () => console.log('TODO: implement Expand Descendents', id),
        },
        {
          id: 'collapse-desc',
          label: 'Collapse Descendents',
          icon: '◀️◀️',
          shortcut: 'C',
          action: () => console.log('TODO: implement Collapse Descendents', id),
        },
        {
          id: 'edit-node',
          label: 'Edit Node',
          icon: '✏️',
          shortcut: 'Ctrl + E',
          action: () => console.log('TODO: implement Edit Node', id),
        },
      ];
    } else if (menuType === 'multi-node') {
      const ids = (payload.nodeIds as string[]) || [];
      menuItems = [
        {
          id: 'add-multi',
          label: 'Add Connected Nodes',
          icon: '➕',
          shortcut: 'A',
          action: () => console.log('TODO: implement Add Connected Nodes', ids),
        },
        {
          id: 'delete-multi',
          label: 'Delete Nodes',
          icon: '🗑️',
          shortcut: 'Del',
          action: () => console.log('TODO: implement Delete Nodes', ids),
        },
        {
          id: 'hide-multi',
          label: 'Hide Nodes',
          icon: '👁️‍🗨️',
          shortcut: 'H',
          action: () => console.log('TODO: implement Hide Nodes', ids),
        },
        {
          id: 'expand-multi',
          label: 'Expand Children (All)',
          icon: '▶️',
          shortcut: 'E',
          action: () => console.log('TODO: implement Expand Children (All)', ids),
        },
        {
          id: 'expand-desc-multi',
          label: 'Expand Descendents (All)',
          icon: '▶️▶️',
          shortcut: 'E, then E',
          action: () =>
            console.log('TODO: implement Expand Descendents (All)', ids),
        },
        {
          id: 'collapse-desc-multi',
          label: 'Collapse Descendents (All)',
          icon: '◀️◀️',
          shortcut: 'C',
          action: () =>
            console.log('TODO: implement Collapse Descendents (All)', ids),
        },
      ];
    }

    setItems(menuItems);
    setOpen(true);
  };

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
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
  if (!ctx) {
    throw new Error('useContextMenu must be used within a ContextMenuProvider');
  }
  return ctx;
}
