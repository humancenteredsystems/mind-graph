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
        style: [ // Basic default styles
          {
            selector: 'node',
            style: {
              'background-color': '#666',
              'label': 'data(label)', // Display the 'label' property
              'width': '20px',
              'height': '20px',
              'font-size': '10px',
              'color': '#fff',
              'text-valign': 'center',
              'text-halign': 'center',
            }
          },
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
      const cyNodes: ElementDefinition[] = nodes.map(node => ({
        data: { id: node.id, label: node.label || node.id, ...node } // Use label or ID if label is missing
      }));
      const cyEdges: ElementDefinition[] = edges.map(edge => ({
        data: { source: edge.source, target: edge.target, ...edge }
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
    border: '1px solid #ccc',
    display: 'block'
  };

  return <div ref={cyContainerRef} style={{ ...defaultStyle, ...style }} />;
};

export default GraphView;
