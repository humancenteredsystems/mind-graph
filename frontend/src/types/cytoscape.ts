// Cytoscape event types for better type safety
export interface CytoscapeEvent {
  target: CytoscapeElement;
  originalEvent?: MouseEvent | TouchEvent;
  preventDefault: () => void;
  stopPropagation: () => void;
}

export interface CytoscapeElement {
  id: () => string;
  data: (key?: string) => any;
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
