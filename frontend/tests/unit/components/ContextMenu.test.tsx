import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ContextMenu from '../../../src/components/ContextMenu';

// Define menu item interface
interface MockMenuItem {
  id: string;
  label: string;
  icon: string;
  action: () => void;
  shortcut?: string;
  disabled?: boolean;
}

// Mock the context modules with correct interface
const mockUIContext = {
  isAddModalOpen: false,
  isEditDrawerOpen: false,
  editingNode: null,
  openAddModal: vi.fn(),
  closeAddModal: vi.fn(),
  openEditDrawer: vi.fn(),
  closeEditDrawer: vi.fn(),
};

const mockContextMenuState = {
  open: true,
  position: { x: 100, y: 100 },
  items: [] as MockMenuItem[],
  openMenu: vi.fn(),
  closeMenu: vi.fn(),
};

vi.mock('../../../src/context/UIContext', () => ({
  useUIContext: () => mockUIContext,
}));

vi.mock('../../../src/context/ContextMenuContext', () => ({
  useContextMenu: () => mockContextMenuState,
}));

describe('ContextMenu Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContextMenuState.open = true;
    mockContextMenuState.position = { x: 100, y: 100 };
    mockContextMenuState.items = [];
  });

  describe('Rendering', () => {
    it('renders menu when open is true', () => {
      mockContextMenuState.items = [
        { id: 'test-item', label: 'Test Item', icon: '🔧', action: vi.fn() }
      ];
      
      render(<ContextMenu />);
      
      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(screen.getByText('🔧 Test Item')).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      mockContextMenuState.open = false;
      
      render(<ContextMenu />);
      
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('positions menu correctly', () => {
      mockContextMenuState.items = [
        { id: 'test-item', label: 'Test Item', icon: '🔧', action: vi.fn() }
      ];
      
      render(<ContextMenu />);
      
      const menu = screen.getByRole('menu');
      expect(menu).toHaveStyle({
        left: '100px',
        top: '100px',
      });
    });
  });

  describe('Menu Items', () => {
    it('renders multiple menu items', () => {
      mockContextMenuState.items = [
        { id: 'item1', label: 'Item 1', icon: '🔧', action: vi.fn() },
        { id: 'item2', label: 'Item 2', icon: '⚙️', action: vi.fn() },
        { id: 'item3', label: 'Item 3', icon: '🛠️', action: vi.fn() }
      ];
      
      render(<ContextMenu />);
      
      expect(screen.getByText('🔧 Item 1')).toBeInTheDocument();
      expect(screen.getByText('⚙️ Item 2')).toBeInTheDocument();
      expect(screen.getByText('🛠️ Item 3')).toBeInTheDocument();
    });

    it('calls action when menu item is clicked', () => {
      const mockAction = vi.fn();
      mockContextMenuState.items = [
        { id: 'test-item', label: 'Test Item', icon: '🔧', action: mockAction }
      ];
      
      render(<ContextMenu />);
      
      fireEvent.click(screen.getByText('🔧 Test Item'));
      expect(mockAction).toHaveBeenCalled();
      expect(mockContextMenuState.closeMenu).toHaveBeenCalled();
    });

    it('shows shortcuts when provided', () => {
      mockContextMenuState.items = [
        { id: 'test-item', label: 'Test Item', icon: '🔧', shortcut: 'Ctrl+T', action: vi.fn() }
      ];
      
      render(<ContextMenu />);
      
      expect(screen.getByText('Ctrl+T')).toBeInTheDocument();
    });

    it('handles disabled items correctly', () => {
      const mockAction = vi.fn();
      mockContextMenuState.items = [
        { id: 'test-item', label: 'Test Item', icon: '🔧', action: mockAction, disabled: true }
      ];
      
      render(<ContextMenu />);
      
      const menuItem = screen.getByText('🔧 Test Item').closest('li');
      expect(menuItem).toHaveStyle({ cursor: 'not-allowed' });
      
      fireEvent.click(screen.getByText('🔧 Test Item'));
      expect(mockAction).not.toHaveBeenCalled();
      expect(mockContextMenuState.closeMenu).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation', () => {
    it('calls action when Enter key is pressed on menu item', () => {
      const mockAction = vi.fn();
      mockContextMenuState.items = [
        { id: 'test-item', label: 'Test Item', icon: '🔧', action: mockAction }
      ];
      
      render(<ContextMenu />);
      
      const menuItem = screen.getByText('🔧 Test Item').closest('li');
      fireEvent.keyDown(menuItem!, { key: 'Enter' });
      
      expect(mockAction).toHaveBeenCalled();
      expect(mockContextMenuState.closeMenu).toHaveBeenCalled();
    });

    it('does not call action when Enter is pressed on disabled item', () => {
      const mockAction = vi.fn();
      mockContextMenuState.items = [
        { id: 'test-item', label: 'Test Item', icon: '🔧', action: mockAction, disabled: true }
      ];
      
      render(<ContextMenu />);
      
      const menuItem = screen.getByText('🔧 Test Item').closest('li');
      fireEvent.keyDown(menuItem!, { key: 'Enter' });
      
      expect(mockAction).not.toHaveBeenCalled();
      expect(mockContextMenuState.closeMenu).not.toHaveBeenCalled();
    });
  });

  describe('Click Outside Behavior', () => {
    it('closes menu when clicking outside', () => {
      mockContextMenuState.items = [
        { id: 'test-item', label: 'Test Item', icon: '🔧', action: vi.fn() }
      ];
      
      render(<ContextMenu />);
      
      // Simulate clicking outside the menu
      fireEvent.mouseDown(document.body);
      expect(mockContextMenuState.closeMenu).toHaveBeenCalled();
    });

    it('does not close menu when clicking inside', () => {
      mockContextMenuState.items = [
        { id: 'test-item', label: 'Test Item', icon: '🔧', action: vi.fn() }
      ];
      
      render(<ContextMenu />);
      
      const menu = screen.getByRole('menu');
      fireEvent.mouseDown(menu);
      expect(mockContextMenuState.closeMenu).not.toHaveBeenCalled();
    });
  });
});
