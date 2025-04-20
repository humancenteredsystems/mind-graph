export interface NodeData {
  id: string;
  label?: string;
  type?: string;
  level?: number;
}

export interface EdgeData {
  id?: string;
  source: string;
  target: string;
  type?: string;
}
