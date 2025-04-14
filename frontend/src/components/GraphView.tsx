import React, { useEffect, useRef, useState } from 'react';
import cytoscape, { Core, ElementDefinition, Layouts } from 'cytoscape';
import klay from 'cytoscape-klay';

// Register the Klay layout algorithm
cytoscape.use(klay);

// Basic interfaces for node and edge data (can be expanded)
interface NodeData {
  id: string;
  label?: string;
  type?: string;
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
}

const GraphView: React.FC<GraphViewProps> = ({ nodes, edges, style }) => {
  const cyContainerRef = useRef<HTMLDivElement>(null);
  // Use state to hold the Cytoscape instance, ensuring it's stable across renders
  const [cyInstance, setCyInstance] = useState<Core | null>(null);

  // Effect to initialize Cytoscape instance on mount
  useEffect(() => {
    if (cyContainerRef.current && !cyInstance) {
      const cy = cytoscape({
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
      setCyInstance(cy);
    }

    // Cleanup function to destroy instance on unmount
    return () => {
      cyInstance?.destroy();
      setCyInstance(null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Effect to update graph elements when nodes or edges change
  useEffect(() => {
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
          name: 'klay',
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

      // Optional: Fit the graph to the viewport after layout
      // cyInstance.fit();

    }
  }, [nodes, edges, cyInstance]); // Re-run when data or instance changes

  // Default style for the container div
  const defaultStyle: React.CSSProperties = {
    width: '100%',
    height: '600px', // Default height, can be overridden by props
    border: '1px solid #999', // Slightly darker border
    display: 'block',
    backgroundColor: '#f0f0f0' // Add a light background color to visualize container bounds
  };

  return <div ref={cyContainerRef} style={{ ...defaultStyle, ...style }} />;
};

export default GraphView;
