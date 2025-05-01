import React, { useState, useEffect, useRef } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape, { Core } from 'cytoscape';
import dblclick from 'cytoscape-dblclick';

// Register the plugin
cytoscape.use(dblclick);

interface DebugEvent {
  type: string;
  target: string;
  timestamp: number;
  timeSinceLast: number;
}

const CytoscapeDebugger: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const cyRef = useRef<Core | null>(null);
  const lastEventTimeRef = useRef<number>(0);

  // Create a simple graph with one node for testing
  const elements = [
    { data: { id: 'test1', label: 'Test Node 1' } },
    { data: { id: 'test2', label: 'Test Node 2' } },
    { data: { id: 'e1', source: 'test1', target: 'test2' } }
  ];

  const stylesheet = [
    {
      selector: 'node',
      style: {
        selectable: 'no',
        'background-color': '#2ecc71',
        label: 'data(label)',
        width: '80px',
        height: '80px',
        'font-size': '12px',
        'text-valign': 'center',
        'text-halign': 'center',
      }
    },
    {
      selector: 'edge',
      style: {
        width: 2,
        'line-color': '#ccc',
        'target-arrow-color': '#ccc',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
      }
    }
  ];

  // Handle node click
  const handleNodeClick = (id: string) => {
    console.log(`Opening drawer for node: ${id}`);
    setActiveNode(id);
    setDrawerOpen(true);
  };

  // Log an event
  const logEvent = (type: string, target: string) => {
    const now = Date.now();
    const timeSinceLast = now - lastEventTimeRef.current;
    lastEventTimeRef.current = now;
    
    const newEvent: DebugEvent = {
      type,
      target,
      timestamp: now,
      timeSinceLast
    };
    
    setEvents(prev => [newEvent, ...prev].slice(0, 20)); // Keep last 20 events
  };

  // Attach Cytoscape
  const attachCy = (cy: Core) => {
    cyRef.current = cy;
    cy.autounselectify(true);
    
    // Clear events on mount
    setEvents([]);
    lastEventTimeRef.current = Date.now();
    
    // Add single-tap handler that prevents default
    cy.on('tap', 'node', (e) => {
      const nodeId = e.target.id();
      logEvent('tap', nodeId);
      e.preventDefault();
      return false;
    });
    
    // Add double-click handler
    cy.on('dblclick', 'node', (e) => {
      const nodeId = e.target.id();
      logEvent('dblclick', nodeId);
      handleNodeClick(nodeId);
    });
    
    // Add doubleTap for mobile
    cy.on('doubleTap', 'node', (e) => {
      const nodeId = e.target.id();
      logEvent('doubleTap', nodeId);
      handleNodeClick(nodeId);
    });
  };

  // Reset button handler
  const handleReset = () => {
    setDrawerOpen(false);
    setActiveNode(null);
    setEvents([]);
    lastEventTimeRef.current = Date.now();
  };

  return (
    <div style={{ display: 'flex', height: '500px', border: '1px solid #ccc' }}>
      <div style={{ width: '60%', height: '100%', position: 'relative' }}>
        <h3>Cytoscape Test Area</h3>
        <p>Try clicking or double-clicking on nodes</p>
        <div style={{ height: '300px', border: '1px solid #eee' }}>
          <CytoscapeComponent
            elements={elements}
            stylesheet={stylesheet}
            style={{ width: '100%', height: '100%' }}
            cy={attachCy}
          />
        </div>
        <button 
          onClick={handleReset}
          style={{ 
            margin: '10px', 
            padding: '5px 10px', 
            background: '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '3px'
          }}
        >
          Reset All
        </button>
      </div>
      
      <div style={{ width: '40%', padding: '10px', borderLeft: '1px solid #ccc' }}>
        <div style={{ 
          padding: '10px', 
          background: drawerOpen ? '#3498db' : '#95a5a6',
          color: 'white',
          marginBottom: '10px'
        }}>
          <h3 style={{ margin: '0 0 5px 0' }}>
            Drawer {drawerOpen ? 'OPEN' : 'CLOSED'}
          </h3>
          {drawerOpen && activeNode && (
            <div>Active Node: {activeNode}</div>
          )}
        </div>
        
        <h4>Event Log</h4>
        <div style={{ 
          height: '300px', 
          overflowY: 'auto', 
          border: '1px solid #eee',
          padding: '5px',
          fontSize: '12px'
        }}>
          {events.map((event, i) => (
            <div key={i} style={{ 
              padding: '3px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>
                <b>{event.type}</b> on {event.target}
              </span>
              <span style={{ color: '#7f8c8d' }}>
                +{event.timeSinceLast}ms
              </span>
            </div>
          ))}
          {events.length === 0 && (
            <div style={{ color: '#95a5a6', fontStyle: 'italic' }}>
              No events yet. Try interacting with the graph.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CytoscapeDebugger;
