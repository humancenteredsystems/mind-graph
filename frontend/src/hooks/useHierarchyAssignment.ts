import { useState, useCallback } from 'react';
import { useView } from '../context/ViewContext';
import { useGraphState } from './useGraphState';
import { 
  reassignNodeToLevel, 
  removeNodeFromHierarchy,
  findNodeAssignmentsInHierarchy 
} from '../services/ApiService';
import { log } from '../utils/logger';

interface AssignmentOperation {
  nodeId: string;
  hierarchyId: string;
  levelId: string;
  nodeLabel?: string;
}

interface UseHierarchyAssignment {
  isAssigning: boolean;
  assignmentError: string | null;
  assignNodeToLevel: (nodeId: string, levelId: string, nodeData?: any) => Promise<void>;
  removeNodeAssignment: (nodeId: string) => Promise<void>;
  getNodeAssignments: (nodeId: string) => Promise<any[]>;
  clearAssignmentError: () => void;
}

/**
 * Custom hook for hierarchy assignment operations
 * Follows the useGraphState pattern for consistent state management
 */
export const useHierarchyAssignment = (): UseHierarchyAssignment => {
  const { active } = useView();
  const { loadCompleteGraph } = useGraphState();
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  // Extract hierarchy ID from active view (follows existing pattern)
  const currentHierarchyId = active && active.startsWith('hierarchy-') 
    ? active.replace('hierarchy-', '') 
    : '';

  /**
   * Assign a node to a specific hierarchy level
   * Follows the pattern established in useGraphState operations
   */
  const assignNodeToLevel = useCallback(async (
    nodeId: string, 
    levelId: string, 
    nodeData?: any
  ): Promise<void> => {
    if (!currentHierarchyId) {
      const error = 'No active hierarchy selected';
      log('useHierarchyAssignment', error);
      setAssignmentError(error);
      return;
    }

    setIsAssigning(true);
    setAssignmentError(null);

    try {
      log('useHierarchyAssignment', `Assigning node ${nodeId} to level ${levelId} in hierarchy ${currentHierarchyId}`);
      
      // Use existing API service function
      const result = await reassignNodeToLevel(nodeId, currentHierarchyId, levelId);
      
      log('useHierarchyAssignment', `Successfully assigned node ${nodeId}:`, result);
      
      // Refresh graph using existing pattern from useGraphState
      await loadCompleteGraph();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to assign node to hierarchy level';
      log('useHierarchyAssignment', `Error assigning node ${nodeId}:`, error);
      setAssignmentError(errorMessage);
      throw error; // Re-throw for component-level error handling
    } finally {
      setIsAssigning(false);
    }
  }, [currentHierarchyId, loadCompleteGraph]);

  /**
   * Remove a node from the current hierarchy
   * Follows the pattern established in useGraphState operations
   */
  const removeNodeAssignment = useCallback(async (nodeId: string): Promise<void> => {
    if (!currentHierarchyId) {
      const error = 'No active hierarchy selected';
      log('useHierarchyAssignment', error);
      setAssignmentError(error);
      return;
    }

    setIsAssigning(true);
    setAssignmentError(null);

    try {
      log('useHierarchyAssignment', `Removing node ${nodeId} from hierarchy ${currentHierarchyId}`);
      
      // Use existing API service function
      const result = await removeNodeFromHierarchy(nodeId, currentHierarchyId);
      
      log('useHierarchyAssignment', `Successfully removed node ${nodeId}:`, result);
      
      // Refresh graph using existing pattern from useGraphState
      await loadCompleteGraph();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove node from hierarchy';
      log('useHierarchyAssignment', `Error removing node ${nodeId}:`, error);
      setAssignmentError(errorMessage);
      throw error; // Re-throw for component-level error handling
    } finally {
      setIsAssigning(false);
    }
  }, [currentHierarchyId, loadCompleteGraph]);

  /**
   * Get current assignments for a node in the active hierarchy
   * Follows the pattern established in other query operations
   */
  const getNodeAssignments = useCallback(async (nodeId: string): Promise<any[]> => {
    if (!currentHierarchyId) {
      log('useHierarchyAssignment', 'No active hierarchy selected for assignment query');
      return [];
    }

    try {
      log('useHierarchyAssignment', `Fetching assignments for node ${nodeId} in hierarchy ${currentHierarchyId}`);
      
      // Use existing API service function
      const assignments = await findNodeAssignmentsInHierarchy(nodeId, currentHierarchyId);
      
      log('useHierarchyAssignment', `Found ${assignments.length} assignments for node ${nodeId}`);
      return assignments;
      
    } catch (error) {
      log('useHierarchyAssignment', `Error fetching assignments for node ${nodeId}:`, error);
      return [];
    }
  }, [currentHierarchyId]);

  /**
   * Clear assignment error state
   * Follows the pattern established in other hooks
   */
  const clearAssignmentError = useCallback(() => {
    setAssignmentError(null);
  }, []);

  return {
    isAssigning,
    assignmentError,
    assignNodeToLevel,
    removeNodeAssignment,
    getNodeAssignments,
    clearAssignmentError,
  };
};
