import { useContext } from 'react';
import { ContextMenuContext } from '../context/contexts';

export function useContextMenu() {
  const ctx = useContext(ContextMenuContext);
  if (!ctx) throw new Error('useContextMenu must be used within ContextMenuProvider');
  return ctx;
}
