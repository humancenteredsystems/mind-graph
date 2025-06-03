// Cytoscape event types for better type safety
export interface CytoscapeEvent {
  target: CytoscapeElement;
  originalEvent?: MouseEvent | TouchEvent;
  preventDefault: () => void;
  stopPropagation: () => void;
}

export interface CytoscapeElement {
  id: () => string;
  data: (key?: string) => unknown;
  isNode: () => boolean;
  isEdge: () => boolean;
}

export interface CytoscapeTapEvent extends CytoscapeEvent {
  target: CytoscapeElement;
}

export interface CytoscapeContextTapEvent extends CytoscapeEvent {
  originalEvent: MouseEvent;
}

export interface CytoscapeSelectEvent extends CytoscapeEvent {
  target: CytoscapeElement;
}

export interface CytoscapeRemoveEvent extends CytoscapeEvent {
  target: CytoscapeElement;
}

// Additional event types for GraphView handlers
export interface CytoscapeContextTapHandler {
  (event: CytoscapeContextEvent): void;
}

export interface CytoscapeContextEvent {
  target: CytoscapeElement | CytoscapeCore;
  originalEvent: MouseEvent;
  preventDefault: () => void;
  stopPropagation: () => void;
}

export interface CytoscapeCore {
  id?: never; // Core doesn't have id method
  isNode?: never;
  isEdge?: never;
}

export interface CytoscapeSelectHandler {
  (event: CytoscapeSelectEvent): void;
}

export interface CytoscapeUnselectHandler {
  (event: CytoscapeSelectEvent): void;
}

export interface CytoscapeRemoveHandler {
  (event: CytoscapeRemoveEvent): void;
}
