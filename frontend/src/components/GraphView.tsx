import React, { useRef, useEffect, useMemo } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape, { Core, StylesheetCSS, ElementDefinition } from 'cytoscape';
import klay from 'cytoscape-klay';
import { NodeData, EdgeData } from '../types/graph';
import { useContextMenu } from '../context/ContextMenuContext';
import { log } from '../utils/logger';

// Register Klay layout extension
cytoscape.use(klay);

interface GraphViewProps {
  nodes: NodeData[];
  edges: EdgeData[];
  style?: React.CSSProperties;
  onNodeExpand?: (nodeId: string) => void;
  onAddNode?: (parentId?: string, position?: { x: number; y: number }) => void;
  onEditNode?: (nodeId: string) => void;
}

const GraphView: React.FC<GraphViewProps> = ({
  nodes,
  edges,
  style,
  onNodeExpand,
  onAddNode,
  onEditNode,
}) => {
  const cyRef = useRef<Core | null>(null);
  const { openMenu } = useContextMenu();

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

  // Context menu handling with accurate cursor positioning
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const handler = (event: any) => {
      const target = event.target;
      // Compute position from mouse event
      const origEvent = event.originalEvent as MouseEvent;
      const position = { x: origEvent.clientX, y: origEvent.clientY };
      if (target === cy) {
        openMenu('background', position, { onAddNode });
        } else if (target.isNode) {
          const selectedIds = cy.nodes(':selected').map((el) => el.id());
          const menuType = selectedIds.length > 1 ? 'multi-node' : 'node';
          const nodeData = target.data() as NodeData;
          openMenu(menuType, position, {
            node: nodeData,
            nodeIds: selectedIds,
            onAddNode,
            onNodeExpand,
            onEditNode,
          });
      }
      event.originalEvent.preventDefault();
    };
    cy.on('cxttap', handler);
    return () => {
      if (cy.removeListener) {
        cy.removeListener('cxttap', handler);
      }
    };
  }, [onAddNode, onNodeExpand, openMenu]);

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
