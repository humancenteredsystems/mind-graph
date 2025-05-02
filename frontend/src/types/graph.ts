export interface NodeData {
  id: string;
  label?: string;
  type?: string;
  assignments?: string[];
  status?: string;
  branch?: string;
}

export interface EdgeData {
  id?: string;
  source: string;
  target: string;
  type?: string;
}
