import React, { useEffect, useRef } from 'react';
import cytoscape, { Core, ElementDefinition, NodeSingular } from 'cytoscape'; // Import NodeSingular
import klay from 'cytoscape-klay';
import contextMenus from 'cytoscape-context-menus';
import 'cytoscape-context-menus/cytoscape-context-menus.css'; // Import the CSS

// Register extensions
cytoscape.use(klay);
cytoscape.use(contextMenus);

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

      // --- Initialize Context Menu ---
      // Type assertion needed as the extension might not be perfectly typed
      const cmInstance = (cyInstanceRef.current as any).contextMenus({
        menuItems: [
          {
            id: 'expand',
            content: 'Expand',
            tooltipText: 'Show children',
            selector: 'node', // Show only for nodes
            onClickFunction: (event: any) => {
              const targetNode: NodeSingular = event.target || event.cyTarget;
              const nodeId = targetNode.id();
              console.log(`Context menu: Expand clicked on node ${nodeId}`);
              if (onNodeExpand) {
                onNodeExpand(nodeId);
              }
            },
            // enabled: true // Default is true
          },
          // Add more menu items here if needed (e.g., Collapse, Details)
        ],
        // Other options like menuRadius, menuItemClasses, etc.
      });
      // --- End Context Menu ---

    } // End of if (!cyInstanceRef.current)

    // Store the current ref value in a variable for the cleanup function
    const cyInstance = cyInstanceRef.current;
    // Cleanup function to destroy instance and context menu on unmount
    return () => {
      // Destroy context menu instance if it exists
      // Accessing the internal API, might be fragile
      const cmApi = (cyInstance as any)?.contextMenus?.('get');
      cmApi?.destroy();

      cyInstance?.destroy(); // Destroy Cytoscape instance
      cyInstanceRef.current = null; // Clear the ref on unmount
    };
  }, [onNodeExpand]); // Dependency array includes onNodeExpand

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
      // --- Optimized Element Update ---
      // Get IDs of elements currently in Cytoscape
      const existingCyNodeIds = new Set(cyInstance.nodes().map(n => n.id()));
      const existingCyEdgeIds = new Set(cyInstance.edges().map(e => `${e.source().id()}-${e.target().id()}-${e.data('type') ?? ''}`)); // Match App.tsx logic
 
       // Filter incoming elements to find only the new ones
       // Add explicit check for n.data.id to satisfy TS compiler
       const newCyNodes = cyNodes.filter(n => n.data.id && !existingCyNodeIds.has(n.data.id));
       const newCyEdges = cyEdges.filter(e => !existingCyEdgeIds.has(`${e.data.source}-${e.data.target}-${e.data.type ?? ''}`));
 
       let layoutNeeded = false; // Flag to track if layout needs to run

      // Add only new elements
      if (newCyNodes.length > 0 || newCyEdges.length > 0) {
        console.log(`[GraphView] Adding ${newCyNodes.length} new nodes and ${newCyEdges.length} new edges.`);
        cyInstance.add([...newCyNodes, ...newCyEdges]);
        layoutNeeded = true;
      } else {
        console.log("[GraphView] No new elements to add.");
      }

      // TODO: Implement removal of elements if nodes/edges props can shrink

      // Run layout only if new elements were added
      if (layoutNeeded) {
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

        // Delay resize/fit only when layout runs
        const timer = setTimeout(() => {
          if (cyInstance && !cyInstance.destroyed()) { // Check if instance still exists
            requestAnimationFrame(() => { // Wrap in requestAnimationFrame
              if (cyInstance && !cyInstance.destroyed()) { // Double-check instance
                 cyInstance.resize();
                 cyInstance.fit(); // Fit view to the updated graph
              }
            });
          }
        }, 500); // Keep delay

        // Cleanup timeout on effect cleanup or re-run
        return () => clearTimeout(timer);
      } else {
        // If no layout ran, return an empty cleanup function
        return () => {};
      }
      // --- End Optimized Element Update ---

    } // End if (cyInstance)
  }, [nodes, edges]); // Dependency array remains the same

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
