import express, { Request, Response } from 'express';
import { authenticateAdmin } from '../middleware/auth';
import { sendErrorResponse, ErrorType } from '../utils/errorResponse';

const router = express.Router();

// GitHub Integration Routes
// All routes require admin authentication

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  labels: Array<{
    id: number;
    name: string;
    color: string;
    description: string | null;
  }>;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  html_url: string;
  comments: number;
}

interface GitHubComment {
  id: number;
  body: string;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
}

interface IssueAnalysis {
  affectedFiles: string[];
  relatedTests: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  complexity: 'simple' | 'moderate' | 'complex';
  category: 'bug' | 'enhancement' | 'documentation' | 'maintenance';
}

/**
 * List GitHub issues using MCP server
 */
router.get('/issues', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const state = req.query.state as 'open' | 'closed' | 'all' || 'open';
    
    // This would use the GitHub MCP server to list issues
    // For now, return mock data to demonstrate the UI
    const mockIssues: GitHubIssue[] = [
      {
        id: 1,
        number: 5,
        title: "Bug: Admin Modal shows 'failed' status for successful unit tests",
        body: "The Admin Modal's Tests tab displays a red \"failed\" status lozenge even when all unit tests pass successfully.",
        state: 'open',
        labels: [
          { id: 1, name: 'bug', color: 'd73a4a', description: 'Something isn\'t working' },
          { id: 2, name: 'frontend', color: 'ededed', description: null },
          { id: 3, name: 'ui', color: 'ededed', description: null }
        ],
        user: {
          login: 'heythisisgordon',
          avatar_url: 'https://avatars.githubusercontent.com/u/108655705?v=4'
        },
        created_at: '2025-06-09T01:54:26Z',
        updated_at: '2025-06-09T01:54:26Z',
        html_url: 'https://github.com/heythisisgordon/mind-graph/issues/5',
        comments: 0
      }
    ];
    
    res.json(mockIssues);
  } catch (error) {
    console.error('Error listing GitHub issues:', error);
    sendErrorResponse(res, ErrorType.SERVER_ERROR, 'Failed to list GitHub issues');
  }
});

/**
 * Get a specific GitHub issue with comments
 */
router.get('/issues/:issueNumber', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const issueNumber = parseInt(req.params.issueNumber);
    
    if (isNaN(issueNumber)) {
      sendErrorResponse(res, ErrorType.VALIDATION, 'Invalid issue number');
      return;
    }
    
    // This would use the GitHub MCP server to get issue details
    // For now, return mock data
    const mockIssue: GitHubIssue = {
      id: 1,
      number: issueNumber,
      title: "Bug: Admin Modal shows 'failed' status for successful unit tests",
      body: "The Admin Modal's Tests tab displays a red \"failed\" status lozenge even when all unit tests pass successfully.",
      state: 'open',
      labels: [
        { id: 1, name: 'bug', color: 'd73a4a', description: 'Something isn\'t working' },
        { id: 2, name: 'frontend', color: 'ededed', description: null }
      ],
      user: {
        login: 'heythisisgordon',
        avatar_url: 'https://avatars.githubusercontent.com/u/108655705?v=4'
      },
      created_at: '2025-06-09T01:54:26Z',
      updated_at: '2025-06-09T01:54:26Z',
      html_url: `https://github.com/heythisisgordon/mind-graph/issues/${issueNumber}`,
      comments: 0
    };
    
    const mockComments: GitHubComment[] = [];
    
    res.json({
      issue: mockIssue,
      comments: mockComments
    });
  } catch (error) {
    console.error('Error getting GitHub issue:', error);
    sendErrorResponse(res, ErrorType.SERVER_ERROR, 'Failed to get GitHub issue');
  }
});

/**
 * Analyze an issue to determine affected files and complexity
 */
router.get('/issues/:issueNumber/analyze', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const issueNumber = parseInt(req.params.issueNumber);
    
    if (isNaN(issueNumber)) {
      sendErrorResponse(res, ErrorType.VALIDATION, 'Invalid issue number');
      return;
    }
    
    // This would analyze the issue content to determine affected files
    // For now, return mock analysis
    const mockAnalysis: IssueAnalysis = {
      affectedFiles: [
        'frontend/src/components/AdminModal.tsx',
        'frontend/src/services/ApiService.ts',
        'api/services/testRunner.ts'
      ],
      relatedTests: [
        'frontend/tests/unit/components/AdminModal.test.tsx',
        'api/__tests__/unit/services/testRunner.test.ts'
      ],
      priority: 'medium',
      complexity: 'moderate',
      category: 'bug'
    };
    
    res.json(mockAnalysis);
  } catch (error) {
    console.error('Error analyzing GitHub issue:', error);
    sendErrorResponse(res, ErrorType.SERVER_ERROR, 'Failed to analyze GitHub issue');
  }
});

/**
 * Create a new Cline task with pre-populated context for an issue
 */
router.post('/create-cline-task', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { issueNumber } = req.body;
    
    if (!issueNumber || isNaN(parseInt(issueNumber))) {
      sendErrorResponse(res, ErrorType.VALIDATION, 'Invalid issue number');
      return;
    }
    
    // Get current date for context
    const currentDate = new Date().toLocaleDateString();
    
    // Create comprehensive task context for Cline
    const taskContext = `Fix GitHub Issue #${issueNumber}: Admin Modal Test Status Display Bug

## Issue Summary
The Admin Modal's Tests tab displays a red "failed" status lozenge even when all unit tests pass successfully (e.g., "56 passed, 0 failed"). This creates user confusion as tests actually succeeded.

## Project Context
You are working on MakeItMakeSense.io, a modular, open-source platform for collaboratively building a living, visual knowledge graph. The application uses:
- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript  
- **Database**: Dgraph (graph database)
- **Architecture**: Multi-tenant with hierarchical knowledge graphs

## Root Cause Analysis
The issue appears to be in the test status determination logic in the AdminModal component. The status is likely being set incorrectly when all tests pass.

## Files to Investigate
1. **frontend/src/components/AdminModal.tsx** - TestsTab component (primary)
2. **frontend/src/services/ApiService.ts** - API communication layer
3. **api/services/testRunner.ts** - Backend test execution service

## Task Steps
1. **Analyze the current logic**: Examine how test status is determined in AdminModal.tsx
2. **Identify the bug**: Find why successful tests show as "failed"
3. **Fix the status mapping**: Implement correct logic for status determination
4. **Test the fix**: Verify that successful tests show "completed" (green)
5. **Commit changes**: Create a descriptive commit message

## Expected Outcome
- When tests pass (e.g., "56 passed, 0 failed"), status should show "completed" with green lozenge
- When tests fail, status should show "failed" with red lozenge  
- Status should accurately reflect the actual test results

## Additional Context
- This is a UI/UX bug affecting the admin interface
- The underlying test execution works correctly
- Only the status display logic needs fixing
- Priority: Medium, Complexity: Moderate

---
Generated on ${currentDate} from GitHub Issue #${issueNumber}`;
    
    res.json({
      success: true,
      taskContext,
      message: `Task context prepared for issue #${issueNumber}`,
      instructions: 'Copy the task context to clipboard and create a new Cline task'
    });
  } catch (error) {
    console.error('Error creating Cline task:', error);
    sendErrorResponse(res, ErrorType.SERVER_ERROR, 'Failed to create Cline task');
  }
});

/**
 * Update a GitHub issue with progress or resolution
 */
router.post('/issues/:issueNumber/update', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const issueNumber = parseInt(req.params.issueNumber);
    const { comment, labels, state } = req.body;
    
    if (isNaN(issueNumber)) {
      sendErrorResponse(res, ErrorType.VALIDATION, 'Invalid issue number');
      return;
    }
    
    // This would use the GitHub MCP server to update the issue
    // For now, just return success
    res.json({
      success: true,
      message: `Issue #${issueNumber} updated successfully`
    });
  } catch (error) {
    console.error('Error updating GitHub issue:', error);
    sendErrorResponse(res, ErrorType.SERVER_ERROR, 'Failed to update GitHub issue');
  }
});

export default router;
