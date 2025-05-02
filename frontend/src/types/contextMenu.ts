export type MenuType = 'background' | 'node' | 'multi-node';

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  shortcut?: string;
  action: () => void;
  disabled?: boolean;
}
