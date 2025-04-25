import React, { useRef, useEffect, useMemo } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape, { Core, StylesheetCSS, ElementDefinition } from 'cytoscape';
import klay from 'cytoscape-klay';
import { NodeData, EdgeData } from '../types/graph';
import { log } from '../utils/logger';

// Register Klay layout extension
cytoscape.use(klay);

interface GraphViewProps {
  nodes: NodeData[];
  edges: EdgeData[];
  style?: React.CSSProperties;
  onNodeExpand?: (nodeId: string) => void;
  onAddNode?: (parentId?: string, position?: { x: number; y: number }) => void;
}

const GraphView: React.FC<GraphViewProps> = ({
  nodes,
  edges,
  style,
  onNodeExpand,
  onAddNode,
}) => {
  const cyRef = useRef<Core | null>(null);

  const elements = useMemo<ElementDefinition[]>(() => {
    const nodeElements = nodes.map(({ id, label, ...rest }) => ({
      data: { id, label: label ?? id, ...rest },
    }));
    const edgeElements = edges.map(({ source, target, ...rest }) => ({
      data: { source, target, ...rest },
    }));
    return [...nodeElements, ...edgeElements];
  }, [nodes, edges]);

  const stylesheet: StylesheetCSS[] = [
    {
      selector: 'node',
      css: {
        'background-color': '#888',
        label: 'data(label)',
        width: '40px',
        height: '40px',
        'font-size': '8px',
        color: '#333',
        'text-valign': 'center',
        'text-halign': 'center',
        'text-wrap': 'wrap',
        'text-max-width': '50px',
        'border-width': 1,
        'border-color': '#555',
      },
    },
    {
      selector: "node[type='concept']",
      css: {
        'background-color': '#3498db',
        'border-color': '#2980b9',
      },
    },
    {
      selector: "node[type='example']",
      css: {
        'background-color': '#2ecc71',
        'border-color': '#27ae60',
      },
    },
    {
      selector: "node[type='question']",
      css: {
        'background-color': '#f1c40f',
        'border-color': '#f39c12',
      },
    },
    {
      selector: 'edge',
      css: {
        width: 1,
        'line-color': '#ccc',
        'target-arrow-color': '#ccc',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
      },
    },
  ];

  // Listen for context tap within Cytoscape
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.on('cxttap', (event: any) => {
      const target = event.target;
      const position = event.position || event.renderedPosition;
      if (target === cy) {
        // Background right-click: add node
        if (onAddNode) onAddNode(undefined, position);
      } else if (target.isNode && onNodeExpand) {
        // Node right-click: expand
        onNodeExpand(target.id());
      }
    });
  }, [onNodeExpand, onAddNode]);

  // Run layout on elements update
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const layout = cy.layout({
      name: 'klay',
      klay: { spacing: 40, nodePlacement: 'LINEAR_SEGMENTS', layoutHierarchy: true },
      animate: true,
      animationDuration: 300,
    } as any);
    layout.run();
  }, [elements]);

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
    ...style,
  };

  return (
    <div data-testid="graph-container" style={containerStyle}>
      <CytoscapeComponent
        elements={elements}
        stylesheet={stylesheet}
        style={{ width: '100%', height: '100%' }}
        cy={(cy: Core) => {
          cyRef.current = cy;
          if (import.meta.env.DEV) {
            (window as any).cyInstance = cy;
            log('GraphView', 'Cytoscape instance exposed as window.cyInstance');
          }
        }}
      />
    </div>
  );
};

export default GraphView;
