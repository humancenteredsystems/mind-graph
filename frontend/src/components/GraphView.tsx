import React, { useEffect, useRef } from 'react';
import cytoscape, { Core, ElementDefinition } from 'cytoscape';
import klay from 'cytoscape-klay';

// Register the Klay layout algorithm
cytoscape.use(klay);

// Basic interfaces for node and edge data (can be expanded)
interface NodeData {
  id: string;
  label?: string;
  type?: string;
  level?: number; // Add level field
  // Add other properties needed for styling or data
}

interface EdgeData {
  id?: string; // Optional edge ID
  source: string; // Source node ID
  target: string; // Target node ID
  type?: string;
  // Add other properties
}

interface GraphViewProps {
  nodes: NodeData[];
  edges: EdgeData[];
  style?: React.CSSProperties; // Allow passing custom styles
  onNodeExpand?: (nodeId: string) => void; // Add prop for expand handler
}

const GraphView: React.FC<GraphViewProps> = ({ nodes, edges, style, onNodeExpand }) => {
  const cyContainerRef = useRef<HTMLDivElement>(null);
  // Use a ref to hold the Cytoscape instance - persists across renders without causing re-renders
  const cyInstanceRef = useRef<Core | null>(null);

  // Effect to initialize Cytoscape instance on mount
  useEffect(() => {
    // Only initialize if the ref is null and the container exists
    if (cyContainerRef.current && !cyInstanceRef.current) {
      cyInstanceRef.current = cytoscape({ // Store instance in ref
        container: cyContainerRef.current,
        wheelSensitivity: 0.2, // Adjust zoom sensitivity (lower is less sensitive)
        style: [ // Updated styles
          {
            selector: 'node', // Default node style
            style: {
              'background-color': '#888', // Default color
              'label': 'data(label)',
              'width': '40px', // Slightly larger nodes
              'height': '40px',
              'font-size': '8px', // Smaller font size
              'color': '#333', // Darker text color
              'text-valign': 'center',
              'text-halign': 'center',
              'text-wrap': 'wrap', // Enable text wrapping
              'text-max-width': '50px', // Max width before wrapping
              'border-width': 1,
              'border-color': '#555'
            }
          },
          // Type-specific styles
          {
            selector: "node[type='concept']",
            style: {
              'background-color': '#3498db', // Blue for concepts
              'border-color': '#2980b9'
            }
          },
          {
            selector: "node[type='example']",
            style: {
              'background-color': '#2ecc71', // Green for examples
              'border-color': '#27ae60'
            }
          },
           {
            selector: "node[type='question']",
            style: {
              'background-color': '#f1c40f', // Yellow for questions
              'border-color': '#f39c12'
            }
          },
          // Add more type selectors as needed
          {
            selector: 'edge',
            style: {
              'width': 1,
              'line-color': '#ccc',
              'target-arrow-color': '#ccc',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier' // Or 'straight', 'haystack', etc.
            }
          }
        ],
        layout: {
          name: 'klay' // Use klay layout by default
          // Add klay options here if needed
        }
      });

      // --- Add Right-Click Handler ---
      if (onNodeExpand) {
        cyInstanceRef.current.on('cxttap', 'node', (event) => {
          event.preventDefault(); // Prevent default browser context menu
          const nodeId = event.target.id();
          console.log(`Right-clicked node: ${nodeId}. Triggering expand.`); // Log action
          onNodeExpand(nodeId); // Call the handler passed from App
        });
      }
      // --- End Right-Click Handler ---
    }

    // Store the current ref value in a variable for the cleanup function
    const cyInstance = cyInstanceRef.current;
    // Cleanup function to destroy instance and remove listeners on unmount
    return () => {
      // Remove listener if it was added
      if (cyInstance && onNodeExpand) {
        cyInstance.removeListener('cxttap', 'node');
      }
      cyInstance?.destroy(); // Use the captured instance from the ref
      cyInstanceRef.current = null; // Clear the ref on unmount
    };
  }, [onNodeExpand]); // Add onNodeExpand to dependency array

  // Effect to update graph elements when nodes or edges change
  useEffect(() => {
    const cyInstance = cyInstanceRef.current; // Get instance from ref
    if (cyInstance) {
      // Format nodes and edges for Cytoscape
      // Separate the core properties (id, source, target) from the rest
      const cyNodes: ElementDefinition[] = nodes.map(({ id, label, ...rest }) => ({
        data: { id, label: label || id, ...rest } // Use label or ID if label is missing
      }));
      const cyEdges: ElementDefinition[] = edges.map(({ source, target, ...rest }) => ({
        data: { source, target, ...rest } // Avoid duplicating source/target
      }));

      // Combine nodes and edges
      const elements = [...cyNodes, ...cyEdges];

      // Update elements and run layout
      cyInstance.batch(() => { // Use batch for performance
        cyInstance.elements().remove(); // Clear existing elements
        cyInstance.add(elements);     // Add new elements
      });

      // Run layout after adding elements
      const layout = cyInstance.layout({
          name: 'klay', // Restore klay layout
          // Klay layout options (adjust as needed)
          klay: {
              spacing: 40, // Adjust spacing between nodes
              nodePlacement: 'LINEAR_SEGMENTS', // Placement strategy
              layoutHierarchy: true // Try to arrange hierarchically
          },
          animate: true, // Optional animation
          animationDuration: 300
      } as any); // Use 'as any' if type definitions clash

      layout.run();

      // Delay resize/fit and use requestAnimationFrame
      const timer = setTimeout(() => {
        if (cyInstance && !cyInstance.destroyed()) { // Check if instance still exists
          requestAnimationFrame(() => { // Wrap in requestAnimationFrame
            if (cyInstance && !cyInstance.destroyed()) { // Double-check instance
               cyInstance.resize();
               cyInstance.fit();
            }
          });
        }
      }, 500); // Increased delay to 500ms

      // Cleanup timeout on effect cleanup or re-run
      return () => clearTimeout(timer);

    }
    // Dependency array only includes nodes and edges, as cyInstanceRef doesn't change
  }, [nodes, edges]);

  // Default style for the container div - updated for full height and clipping prevention
  const defaultStyle: React.CSSProperties = {
    width: '100%',
    // height: '600px', // Default height, can be overridden by props - REMOVED, use 100%
    height: '100%', // Make container fill parent height
    // border: '2px solid red', // Debug border - REMOVED
    // display: 'block', // REMOVED - let flexbox handle display
    overflow: 'hidden', // Prevent scrollbars on the container itself
    position: 'relative', // Helps with internal positioning if needed
    // backgroundColor: '#f0f0f0', // Debug background - REMOVED (or set to desired final background)
    flexGrow: 1 // Allow GraphView to take available space in flex container (.App)
  };

  // Add data-testid for easier testing selection
  return <div data-testid="graph-container" ref={cyContainerRef} style={{ ...defaultStyle, ...style }} />;
};

export default GraphView;
