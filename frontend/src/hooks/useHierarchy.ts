import { useContext } from 'react';
import { HierarchyContext } from '../context/contexts';

export const useHierarchyContext = () => useContext(HierarchyContext);
