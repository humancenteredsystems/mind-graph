import React, { useRef, useEffect, useMemo } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape, { Core, StylesheetCSS, ElementDefinition } from 'cytoscape';
import klay from 'cytoscape-klay';
import contextMenus from 'cytoscape-context-menus';
import 'cytoscape-context-menus/cytoscape-context-menus.css';
import { NodeData, EdgeData } from '../types/graph';
import { log } from '../utils/logger';

// Register extensions
cytoscape.use(klay);
cytoscape.use(contextMenus);

interface GraphViewProps {
  nodes: NodeData[];
  edges: EdgeData[];
  style?: React.CSSProperties;
  onNodeExpand?: (nodeId: string) => void;
}

const GraphView: React.FC<GraphViewProps> = ({ nodes, edges, style, onNodeExpand }) => {
  const cyRef = useRef<Core | null>(null);

  const elements = useMemo<ElementDefinition[]>(() => {
    const nodeElements = nodes.map(({ id, label, ...rest }) => ({
      data: { id, label: label ?? id, ...rest }
    }));
    const edgeElements = edges.map(({ source, target, ...rest }) => ({
      data: { source, target, ...rest }
    }));
    return [...nodeElements, ...edgeElements];
  }, [nodes, edges]);

  const stylesheet: StylesheetCSS[] = [
    {
      selector: 'node',
      css: {
        'background-color': '#888',
        'label': 'data(label)',
        'width': '40px',
        'height': '40px',
        'font-size': '8px',
        'color': '#333',
        'text-valign': 'center',
        'text-halign': 'center',
        'text-wrap': 'wrap',
        'text-max-width': '50px',
        'border-width': 1,
        'border-color': '#555'
      }
    },
    {
      selector: "node[type='concept']",
      css: {
        'background-color': '#3498db',
        'border-color': '#2980b9'
      }
    },
    {
      selector: "node[type='example']",
      css: {
        'background-color': '#2ecc71',
        'border-color': '#27ae60'
      }
    },
    {
      selector: "node[type='question']",
      css: {
        'background-color': '#f1c40f',
        'border-color': '#f39c12'
      }
    },
    {
      selector: 'node[level = 2]',
      css: {
        'shape': 'round-rectangle'
      }
    },
    {
      selector: 'edge',
      css: {
        'width': 1,
        'line-color': '#ccc',
        'target-arrow-color': '#ccc',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier'
      }
    }
  ];

  // Initialize context menu and expose for testing on mount
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    if (typeof (cy as any).contextMenus === 'function') {
      (cy as any).contextMenus({
        menuItems: [
          {
            id: 'expand',
            content: 'Expand',
            tooltipText: 'Show children',
            selector: 'node',
            onClickFunction: (event: any) => {
              const nodeId = event.target.id();
              if (onNodeExpand) onNodeExpand(nodeId);
            }
          }
        ]
      });
    }

    if (import.meta.env.DEV) {
      (window as any).cyInstance = cy;
      log('GraphView', 'Cytoscape instance exposed as window.cyInstance');
    }
  }, []);

  // Run layout on any change to elements
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const layout = cy.layout({
      name: 'klay',
      klay: {
        spacing: 40,
        nodePlacement: 'LINEAR_SEGMENTS',
        layoutHierarchy: true
      },
      animate: true,
      animationDuration: 300
    } as any);

    layout.run();
  }, [elements]);

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
    ...style
  };

  return (
    <div data-testid="graph-container" style={containerStyle}>
      <CytoscapeComponent
        elements={elements}
        stylesheet={stylesheet}
        style={{ width: '100%', height: '100%' }}
        cy={(cy: Core) => { cyRef.current = cy; }}
      />
    </div>
  );
};

export default GraphView;
