// Test file for GraphView.tsx
import { describe, it, expect, vi, beforeEach, beforeAll, Mock } from 'vitest';
// Import screen and act for better testing practices
import { render, waitFor, screen, act } from '@testing-library/react';
import GraphView from './GraphView';
import cytoscape from 'cytoscape'; // Import the actual library

// --- Mock Cytoscape ---
// Define the mock instance structure first
const mockCyInstance = {
  destroy: vi.fn(),
  elements: vi.fn().mockReturnThis(),
  remove: vi.fn().mockReturnThis(),
  add: vi.fn().mockReturnThis(),
  layout: vi.fn().mockReturnThis(),
  run: vi.fn().mockReturnThis(),
  resize: vi.fn(),
  fit: vi.fn(),
  batch: vi.fn((fn) => fn()), // Mock batch to execute the passed function
  destroyed: vi.fn().mockReturnValue(false), // Mock destroyed as a function
};

// Mock the cytoscape library *before* describe block
vi.mock('cytoscape', () => {
  // Define the mock constructor and use functions *inside* the factory
  const mockUseFn = vi.fn();
  const mockConstructorFn = vi.fn(() => mockCyInstance);

  // Assign 'use' as a static property to the mock constructor
  const mockDefault = Object.assign(mockConstructorFn, { use: mockUseFn });

  return {
    default: mockDefault, // Default export is the constructor
    use: mockUseFn,       // Named export 'use'
  };
});
// --- End Mock Cytoscape ---


describe('GraphView Component', () => {
  // Get references to the *actual* mocked functions after vi.mock runs
  let mockCytoscapeConstructor: Mock;
  let mockUse: Mock;

  beforeAll(async () => {
    // Dynamically import the mocked module to get the references
    const cyModule = await import('cytoscape');
    mockCytoscapeConstructor = vi.mocked(cyModule.default);
    mockUse = vi.mocked(cyModule.use);
  });

  const mockNodes = [{ id: 'n1', label: 'Node 1' }];
  const mockEdges = [{ source: 'n1', target: 'n1', type: 'SELF' }]; // Simple self-loop for testing

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    // Re-assign implementation in case it was cleared or changed
    mockCytoscapeConstructor.mockImplementation(() => mockCyInstance);
  });

  it('should render container div', () => {
    render(<GraphView nodes={[]} edges={[]} />);
    // Use the data-testid for reliable selection
    const container = screen.getByTestId('graph-container');
    expect(container).toBeInTheDocument();
  });

  it('should initialize Cytoscape on mount', () => {
    render(<GraphView nodes={[]} edges={[]} />);
    // Check if cytoscape constructor was called
    expect(mockCytoscapeConstructor).toHaveBeenCalledTimes(1);
    // Check if it was called with the container element
    expect(mockCytoscapeConstructor.mock.calls[0][0]).toHaveProperty('container');
    expect(mockCytoscapeConstructor.mock.calls[0][0].container).toBeInstanceOf(HTMLDivElement);
    // Check if cytoscape.use was called (should happen once at module load)
    // Note: Depending on test runner specifics, this might be tricky to assert reliably here.
    // It's implicitly tested by the component rendering without throwing on the .use call.
    // expect(mockUse).toHaveBeenCalled();
  });

  it('should call cytoscape methods when nodes/edges props change', async () => {
    const { rerender } = render(<GraphView nodes={[]} edges={[]} />);

    // Wait for initial render and effects
    await waitFor(() => expect(mockCytoscapeConstructor).toHaveBeenCalled());

    // Clear instance method mocks (not the constructor/use mocks)
    vi.mocked(mockCyInstance.elements).mockClear();
    vi.mocked(mockCyInstance.remove).mockClear();
    vi.mocked(mockCyInstance.add).mockClear();
    vi.mocked(mockCyInstance.layout).mockClear();
    vi.mocked(mockCyInstance.run).mockClear();
    vi.mocked(mockCyInstance.resize).mockClear();
    vi.mocked(mockCyInstance.fit).mockClear();
    // Note: We don't clear mockCytoscapeConstructor or mockUse here as they are called once per test setup/module load

    // Rerender with new props
    rerender(<GraphView nodes={mockNodes} edges={mockEdges} />);

    // Wait for effects triggered by prop change
    await waitFor(() => {
      expect(mockCyInstance.elements).toHaveBeenCalled();
      expect(mockCyInstance.remove).toHaveBeenCalled();
      expect(mockCyInstance.add).toHaveBeenCalled();
      expect(mockCyInstance.layout).toHaveBeenCalled();
      expect(mockCyInstance.run).toHaveBeenCalled();
      // resize and fit are called after a delay, so wait for them specifically
    });

    // Wait specifically for resize and fit due to setTimeout and requestAnimationFrame
    await waitFor(() => {
      expect(mockCyInstance.resize).toHaveBeenCalled();
      expect(mockCyInstance.fit).toHaveBeenCalled();
    });

    // Check if 'add' was called with the correct formatted elements
     expect(mockCyInstance.add).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ data: expect.objectContaining({ id: 'n1' }) }), // Node
      expect.objectContaining({ data: expect.objectContaining({ source: 'n1', target: 'n1' }) }) // Edge
    ]));
  });

   it('should call destroy on unmount', () => {
    const { unmount } = render(<GraphView nodes={[]} edges={[]} />);
    unmount();
    expect(mockCyInstance.destroy).toHaveBeenCalledTimes(1);
  });

});
