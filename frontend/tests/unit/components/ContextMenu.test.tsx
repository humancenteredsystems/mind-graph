import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ContextMenu from '../../../src/components/ContextMenu';

// Mock the context modules
const mockUIContext = {
  isAddModalOpen: false,
  isEditDrawerOpen: false,
  editingNode: null,
  openAddModal: vi.fn(),
  closeAddModal: vi.fn(),
  openEditDrawer: vi.fn(),
  closeEditDrawer: vi.fn(),
};

let mockContextMenuState = {
  isVisible: true,
  position: { x: 100, y: 100 },
  menuType: 'background' as 'background' | 'node' | 'multi-node',
  selectedNodes: [] as string[],
  showMenu: vi.fn(),
  hideMenu: vi.fn(),
};

const mockGraphState = {
  nodes: [],
  edges: [],
  isLoading: false,
  error: null,
  loadCompleteGraph: vi.fn(),
  resetGraph: vi.fn(),
  addNode: vi.fn(),
  deleteNode: vi.fn(),
  expandNode: vi.fn(),
  hideNode: vi.fn(),
};

vi.mock('../../../src/context/UIContext', () => ({
  useUIContext: () => mockUIContext,
}));

vi.mock('../../../src/context/ContextMenuContext', () => ({
  useContextMenu: () => mockContextMenuState,
}));

vi.mock('../../../src/hooks/useGraphState', () => ({
  useGraphState: () => mockGraphState,
}));

describe('ContextMenu Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContextMenuState.isVisible = true;
    mockContextMenuState.menuType = 'background';
    mockContextMenuState.selectedNodes = [];
  });

  describe('Background Context Menu', () => {
    it('renders background menu when visible', () => {
      render(<ContextMenu />);
      
      expect(screen.getByText('Add Node')).toBeInTheDocument();
      expect(screen.getByText('Load Complete Graph')).toBeInTheDocument();
      expect(screen.getByText('Clear Graph')).toBeInTheDocument();
    });

    it('does not render when not visible', () => {
      mockContextMenuState.isVisible = false;
      
      render(<ContextMenu />);
      
      expect(screen.queryByText('Add Node')).not.toBeInTheDocument();
    });

    it('positions menu correctly', () => {
      render(<ContextMenu />);
      
      const menu = screen.getByRole('menu');
      expect(menu).toHaveStyle({
        left: '100px',
        top: '100px',
      });
    });

    it('calls openAddModal when Add Node is clicked', () => {
      render(<ContextMenu />);
      
      fireEvent.click(screen.getByText('Add Node'));
      expect(mockUIContext.openAddModal).toHaveBeenCalled();
    });

    it('calls loadCompleteGraph when Load Complete Graph is clicked', () => {
      render(<ContextMenu />);
      
      fireEvent.click(screen.getByText('Load Complete Graph'));
      expect(mockGraphState.loadCompleteGraph).toHaveBeenCalled();
    });

    it('calls resetGraph when Clear Graph is clicked', () => {
      render(<ContextMenu />);
      
      fireEvent.click(screen.getByText('Clear Graph'));
      expect(mockGraphState.resetGraph).toHaveBeenCalled();
    });
  });

  describe('Node Context Menu', () => {
    beforeEach(() => {
      mockContextMenuState.menuType = 'node';
      mockContextMenuState.selectedNodes = ['node1'];
    });

    it('renders node menu when visible', () => {
      render(<ContextMenu />);
      
      expect(screen.getByText('Add Connected Node')).toBeInTheDocument();
      expect(screen.getByText('Edit Node')).toBeInTheDocument();
      expect(screen.getByText('Delete Node')).toBeInTheDocument();
    });

    it('calls openAddModal with parent ID when Add Connected Node is clicked', () => {
      render(<ContextMenu />);
      
      fireEvent.click(screen.getByText('Add Connected Node'));
      expect(mockUIContext.openAddModal).toHaveBeenCalledWith('node1');
    });

    it('calls openEditDrawer when Edit Node is clicked', () => {
      render(<ContextMenu />);
      
      fireEvent.click(screen.getByText('Edit Node'));
      expect(mockUIContext.openEditDrawer).toHaveBeenCalled();
    });

    it('calls deleteNode when Delete Node is clicked', () => {
      render(<ContextMenu />);
      
      fireEvent.click(screen.getByText('Delete Node'));
      expect(mockGraphState.deleteNode).toHaveBeenCalledWith('node1');
    });
  });

  describe('Multi-Node Context Menu', () => {
    beforeEach(() => {
      mockContextMenuState.menuType = 'multi-node';
      mockContextMenuState.selectedNodes = ['node1', 'node2'];
    });

    it('renders multi-node menu when multiple nodes selected', () => {
      render(<ContextMenu />);
      
      expect(screen.getByText('Delete Nodes')).toBeInTheDocument();
    });

    it('calls deleteNode for each selected node when Delete Nodes is clicked', () => {
      render(<ContextMenu />);
      
      fireEvent.click(screen.getByText('Delete Nodes'));
      expect(mockGraphState.deleteNode).toHaveBeenCalledWith('node1');
      expect(mockGraphState.deleteNode).toHaveBeenCalledWith('node2');
    });
  });

  describe('Keyboard Navigation', () => {
    it('closes menu when Escape key is pressed', () => {
      render(<ContextMenu />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(mockContextMenuState.hideMenu).toHaveBeenCalled();
    });
  });

  describe('Click Outside Behavior', () => {
    it('closes menu when clicking outside', () => {
      render(<ContextMenu />);
      
      fireEvent.mouseDown(document.body);
      expect(mockContextMenuState.hideMenu).toHaveBeenCalled();
    });
  });
});
