import React, { useState, useEffect, useCallback } from 'react';
import { useUIContext } from '../hooks/useUI';
import * as ApiService from '../services/ApiService';

interface AdminLoginFormProps {
  onLogin: (key: string) => void;
  error?: string;
}

const AdminLoginForm: React.FC<AdminLoginFormProps> = ({ onLogin, error }) => {
  const [adminKey, setAdminKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminKey.trim()) return;
    
    setIsLoading(true);
    // Pass the key directly to parent - let parent handle API testing
    onLogin(adminKey);
    setIsLoading(false);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h3 style={{ margin: '0 0 20px 0', color: '#374151' }}>Admin Authentication</h3>
      <p style={{ margin: '0 0 30px 0', color: '#6b7280', fontSize: 14 }}>
        Enter the admin API key to access admin tools
      </p>
      
      <form onSubmit={handleSubmit}>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <input
            type={showPassword ? 'text' : 'password'}
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="Admin API Key"
            style={{
              width: '100%',
              padding: '12px 40px 12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 14,
              boxSizing: 'border-box'
            }}
            disabled={isLoading}
            autoFocus
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
              fontSize: 16,
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            disabled={isLoading}
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>
        
        {error && (
          <div style={{
            marginBottom: 16,
            padding: 12,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 4,
            color: '#dc2626',
            fontSize: 14,
          }}>
            {error}
          </div>
        )}
        
        <button
          type="submit"
          disabled={!adminKey.trim() || isLoading}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: !adminKey.trim() || isLoading ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 500,
            cursor: !adminKey.trim() || isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? 'Authenticating...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

interface TestsTabProps {
  adminKey: string;
}

interface TestResult {
  id: string;
  type: 'unit' | 'integration' | 'integration-real' | 'linting';
  status: 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  passed: number;
  failed: number;
  total: number;
  compilationErrors?: {
    count: number;
    files: string[];
    hasErrors: boolean;
  };
  lintResults?: {
    frontend: LintProjectResult;
    backend: LintProjectResult;
    summary: {
      totalErrors: number;
      totalWarnings: number;
      totalFiles: number;
    };
  };
}

interface LintProjectResult {
  errors: number;
  warnings: number;
  files: LintFile[];
  configured: boolean;
}

interface LintFile {
  filePath: string;
  errorCount: number;
  warningCount: number;
  issues: LintIssue[];
}

interface LintIssue {
  line: number;
  column: number;
  rule: string;
  severity: 'error' | 'warning';
  message: string;
}

const TestsTab: React.FC<TestsTabProps> = ({ adminKey }) => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());

  const generateTestId = (type: string) => `${type}-${Date.now()}`;

  // Reusable function to render test summary for all test types
  const renderTestSummary = (result: TestResult) => {
    if (result.status === 'running' || result.total === 0) {
      return null;
    }

    return (
      <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
        <strong>{result.passed} passed, {result.failed} failed</strong> ({result.total} total)
      </div>
    );
  };


  const startLinting = async () => {
    if (runningTests.has('linting')) {
      return; // Linting already running
    }

    const testId = generateTestId('linting');
    setRunningTests(prev => new Set(prev).add('linting'));
    setError(null);

    // Add running linting to results
    const runningResult: TestResult = {
      id: testId,
      type: 'linting',
      status: 'running',
      startTime: new Date(),
      passed: 0,
      failed: 0,
      total: 0
    };

    setTestResults(prev => [runningResult, ...prev]);

    try {
      console.log('Starting linting operation');
      const lintResult = await ApiService.runLinting(adminKey);
      
      // Calculate passed/failed based on linting results
      const hasErrors = lintResult.results.summary.totalErrors > 0;
      
      const completedResult: TestResult = {
        id: testId,
        type: 'linting',
        status: hasErrors ? 'failed' : 'completed',
        startTime: runningResult.startTime,
        endTime: new Date(),
        passed: hasErrors ? 0 : 1,
        failed: hasErrors ? 1 : 0,
        total: 1,
        lintResults: lintResult.results
      };
      
      // Update the result in the list
      setTestResults(prev => 
        prev.map(r => r.id === testId ? completedResult : r)
      );
      
      console.log('Linting completed:', lintResult.results.summary);
    } catch (error) {
      // Mark linting as failed
      setTestResults(prev => 
        prev.map(r => r.id === testId ? {
          ...r,
          status: 'failed' as const,
          endTime: new Date(),
          failed: 1,
          total: 1
        } : r)
      );
      setError('Failed to run linting');
      console.error('Error running linting:', error);
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete('linting');
        return newSet;
      });
    }
  };

  const startTest = async (type: 'unit' | 'integration' | 'integration-real') => {
    if (runningTests.has(type)) {
      return; // Test already running
    }

    const testId = generateTestId(type);
    setRunningTests(prev => new Set(prev).add(type));
    setError(null);

    // Add running test to results
    const runningResult: TestResult = {
      id: testId,
      type,
      status: 'running',
      startTime: new Date(),
      passed: 0,
      failed: 0,
      total: 0
    };

    setTestResults(prev => [runningResult, ...prev]);

    try {
      console.log(`Starting ${type} tests via API`);
      const apiResult = await ApiService.startTestRun({ type }, adminKey);
      console.log('Test run started:', apiResult);
      
      // Poll for test completion
      const pollInterval = setInterval(async () => {
        try {
          const testRun = await ApiService.getTestRun(apiResult.runId, adminKey);
          
          if (testRun.status === 'completed' || testRun.status === 'failed') {
            clearInterval(pollInterval);
            
            const completedResult: TestResult = {
              id: testId,
              type,
              status: testRun.status === 'completed' ? 'completed' : 'failed',
              startTime: runningResult.startTime,
              endTime: new Date(),
              passed: testRun.summary?.passed || 0,
              failed: testRun.summary?.failed || 0,
              total: testRun.summary?.total || 0,
              compilationErrors: testRun.compilationErrors
            };
            
            setTestResults(prev => 
              prev.map(r => r.id === testId ? completedResult : r)
            );
            
            setRunningTests(prev => {
              const newSet = new Set(prev);
              newSet.delete(type);
              return newSet;
            });
          }
        } catch (pollError) {
          console.error('Error polling test status:', pollError);
          clearInterval(pollInterval);
          
          // Mark as failed
          setTestResults(prev => 
            prev.map(r => r.id === testId ? {
              ...r,
              status: 'failed' as const,
              endTime: new Date()
            } : r)
          );
          
          setRunningTests(prev => {
            const newSet = new Set(prev);
            newSet.delete(type);
            return newSet;
          });
        }
      }, 2000); // Poll every 2 seconds
      
    } catch (error) {
      // Mark test as failed
      setTestResults(prev => 
        prev.map(r => r.id === testId ? {
          ...r,
          status: 'failed' as const,
          endTime: new Date()
        } : r)
      );
      setError(`Failed to start ${type} tests: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Error starting test:', error);
      
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(type);
        return newSet;
      });
    }
  };

  const getButtonState = (type: 'unit' | 'integration' | 'integration-real') => {
    const isRunning = runningTests.has(type);
    return {
      disabled: isRunning,
      text: isRunning ? 'Running...' : `${type.charAt(0).toUpperCase() + type.slice(1)} Tests`,
      opacity: isRunning ? 0.6 : 1
    };
  };

  const getLintingButtonState = () => {
    const isRunning = runningTests.has('linting');
    return {
      disabled: isRunning,
      text: isRunning ? 'Running...' : 'Linting',
      opacity: isRunning ? 0.6 : 1
    };
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#374151' }}>Start Tests</h4>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['unit', 'integration', 'integration-real'] as const).map((type) => {
            const buttonState = getButtonState(type);
            const colors = {
              unit: '#10b981',
              integration: '#3b82f6',
              'integration-real': '#dc2626'
            };
            
            return (
              <button
                key={type}
                onClick={() => startTest(type)}
                disabled={buttonState.disabled}
                style={{
                  padding: '8px 16px',
                  background: colors[type],
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: buttonState.disabled ? 'not-allowed' : 'pointer',
                  opacity: buttonState.opacity,
                }}
              >
                {buttonState.text}
              </button>
            );
          })}
          
          {/* Linting Button */}
          {(() => {
            const lintingButtonState = getLintingButtonState();
            return (
              <button
                onClick={startLinting}
                disabled={lintingButtonState.disabled}
                style={{
                  padding: '8px 16px',
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: lintingButtonState.disabled ? 'not-allowed' : 'pointer',
                  opacity: lintingButtonState.opacity,
                }}
              >
                {lintingButtonState.text}
              </button>
            );
          })()}
        </div>
      </div>

      {error && (
        <div style={{
          marginBottom: 16,
          padding: 12,
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 4,
          color: '#dc2626',
          fontSize: 14,
        }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#374151' }}>Test Results</h4>
        
        {testResults.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: 14, textAlign: 'center' }}>No test runs yet</p>
        ) : (
          <div style={{ maxHeight: 300, overflow: 'auto' }}>
            {testResults.map((result) => (
              <div
                key={result.id}
                style={{
                  padding: 12,
                  border: '1px solid #e5e7eb',
                  borderRadius: 4,
                  marginBottom: 8,
                  fontSize: 14,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 500 }}>{result.type} tests</span>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 500,
                    background: result.status === 'running' ? '#dbeafe' : 
                               result.status === 'completed' ? '#dcfce7' : '#fef2f2',
                    color: result.status === 'running' ? '#1d4ed8' : 
                           result.status === 'completed' ? '#166534' : '#dc2626',
                  }}>
                    {result.status}
                  </span>
                </div>
                <div style={{ color: '#6b7280', fontSize: 12 }}>
                  Started: {result.startTime.toLocaleTimeString()}
                  {result.endTime && ` • Completed: ${result.endTime.toLocaleTimeString()}`}
                </div>
                {/* Display detailed summary for all test types (unit, integration, integration-real) */}
                {result.type !== 'linting' && renderTestSummary(result)}
                
                {/* Display compilation errors if present */}
                {result.type !== 'linting' && result.compilationErrors?.hasErrors && (
                  <div style={{ color: '#f59e0b', fontSize: 12, marginTop: 4 }}>
                    ⚠️ <strong>{result.compilationErrors.count} test files skipped due to compilation errors</strong>
                    {result.compilationErrors.files.length > 0 && (
                      <div style={{ marginLeft: 16, marginTop: 2, fontSize: 11 }}>
                        {result.compilationErrors.files.slice(0, 3).map((file, index) => (
                          <div key={index} style={{ color: '#6b7280' }}>
                            📄 {file.replace(/^.*\/__tests__\//, '')}
                          </div>
                        ))}
                        {result.compilationErrors.files.length > 3 && (
                          <div style={{ color: '#6b7280', fontStyle: 'italic' }}>
                            ... and {result.compilationErrors.files.length - 3} more files
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Special display for linting results */}
                {result.type === 'linting' && result.status !== 'running' && result.lintResults && (
                  <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
                    <strong>
                      Frontend: {result.lintResults.frontend.configured 
                        ? `${result.lintResults.frontend.files.length} files checked`
                        : 'Not configured'
                      }
                    </strong>
                    <span> • </span>
                    <strong>
                      Backend: {result.lintResults.backend.configured 
                        ? `${result.lintResults.backend.files.length} files checked`
                        : 'Not configured'
                      }
                    </strong>
                  </div>
                )}
                
                {/* Linting Results Summary */}
                {result.type === 'linting' && result.lintResults && result.status !== 'running' && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: 4
                    }}>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>
                        <strong>
                          {result.lintResults.summary.totalErrors} errors, {result.lintResults.summary.totalWarnings} warnings
                        </strong>
                        {result.lintResults.summary.totalFiles > 0 && ` across ${result.lintResults.summary.totalFiles} files`}
                      </div>
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedResults);
                          if (newExpanded.has(result.id)) {
                            newExpanded.delete(result.id);
                          } else {
                            newExpanded.add(result.id);
                          }
                          setExpandedResults(newExpanded);
                        }}
                        style={{
                          background: 'none',
                          border: '1px solid #d1d5db',
                          borderRadius: 3,
                          padding: '2px 6px',
                          fontSize: 11,
                          cursor: 'pointer',
                          color: '#6b7280',
                        }}
                      >
                        {expandedResults.has(result.id) ? 'Hide Details' : 'Show Details'}
                      </button>
                    </div>
                    
                    {/* Expanded Linting Details */}
                    {expandedResults.has(result.id) && (
                      <div style={{
                        marginTop: 8,
                        padding: 12,
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 4,
                        fontSize: 12,
                      }}>
                        {/* Frontend Results */}
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontWeight: 500, marginBottom: 4, color: '#374151' }}>
                            Frontend: {result.lintResults.frontend.errors} errors, {result.lintResults.frontend.warnings} warnings
                          </div>
                          {result.lintResults.frontend.files.length > 0 ? (
                            <div style={{ marginLeft: 8 }}>
                              {result.lintResults.frontend.files.map((file, index) => (
                                <div key={index} style={{ marginBottom: 6 }}>
                                  <div style={{ fontWeight: 500, color: '#6b7280' }}>
                                    {file.filePath.replace(/^.*\/frontend\//, '')} 
                                    ({file.errorCount} errors, {file.warningCount} warnings)
                                  </div>
                                  {file.issues.slice(0, 3).map((issue, issueIndex) => (
                                    <div key={issueIndex} style={{ 
                                      marginLeft: 12, 
                                      marginTop: 2,
                                      color: issue.severity === 'error' ? '#dc2626' : '#f59e0b'
                                    }}>
                                      Line {issue.line}: {issue.message} ({issue.rule})
                                    </div>
                                  ))}
                                  {file.issues.length > 3 && (
                                    <div style={{ marginLeft: 12, color: '#6b7280', fontStyle: 'italic' }}>
                                      ... and {file.issues.length - 3} more issues
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ marginLeft: 8, color: '#10b981' }}>✓ No issues found</div>
                          )}
                        </div>
                        
                        {/* Backend Results */}
                        <div>
                          <div style={{ fontWeight: 500, marginBottom: 4, color: '#374151' }}>
                            Backend: {result.lintResults.backend.errors} errors, {result.lintResults.backend.warnings} warnings
                          </div>
                          {result.lintResults.backend.files.length > 0 ? (
                            <div style={{ marginLeft: 8 }}>
                              {result.lintResults.backend.files.map((file, index) => (
                                <div key={index} style={{ marginBottom: 6 }}>
                                  <div style={{ fontWeight: 500, color: '#6b7280' }}>
                                    {file.filePath.replace(/^.*\/api\//, '')} 
                                    ({file.errorCount} errors, {file.warningCount} warnings)
                                  </div>
                                  {file.issues.slice(0, 3).map((issue, issueIndex) => (
                                    <div key={issueIndex} style={{ 
                                      marginLeft: 12, 
                                      marginTop: 2,
                                      color: issue.severity === 'error' ? '#dc2626' : '#f59e0b'
                                    }}>
                                      Line {issue.line}: {issue.message} ({issue.rule})
                                    </div>
                                  ))}
                                  {file.issues.length > 3 && (
                                    <div style={{ marginLeft: 12, color: '#6b7280', fontStyle: 'italic' }}>
                                      ... and {file.issues.length - 3} more issues
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ marginLeft: 8, color: '#10b981' }}>✓ No issues found</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface TenantsTabProps {
  adminKey: string;
}

interface TenantInfo {
  tenantId: string;
  namespace: string;
  exists: boolean;
  isTestTenant: boolean;
  isDefaultTenant: boolean;
  health: 'healthy' | 'not-accessible' | 'error' | 'unknown';
  healthDetails?: string;
  nodeCount?: number;
  schemaInfo?: {
    id: string;
    name: string;
    isDefault: boolean;
  };
}

interface SystemStatus {
  dgraphEnterprise: boolean;
  multiTenantVerified: boolean;
  currentTenant: string;
  namespace: string | null;
  mode: 'multi-tenant' | 'single-tenant';
  detectedAt: string;
  version?: string;
  detectionError?: string;
  namespacesSupported?: boolean;
}


const TenantsTab: React.FC<TenantsTabProps> = ({ adminKey }) => {
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTenantId, setNewTenantId] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [schemaModal, setSchemaModal] = useState<{
    isOpen: boolean;
    tenantId: string;
    schemaInfo?: { id: string; name: string; isDefault: boolean; };
    content?: string;
    loading: boolean;
  }>({
    isOpen: false,
    tenantId: '',
    loading: false
  });

  const loadSystemStatus = async () => {
    try {
      const status = await ApiService.fetchSystemStatus();
      setSystemStatus(status);
    } catch (error) {
      console.error('Error loading system status:', error);
    }
  };

  const loadTenants = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await ApiService.listTenants(adminKey);
      setTenants(result.tenants);
      setError(null);
    } catch (error) {
      setError('Failed to load tenants');
      console.error('Error loading tenants:', error);
    } finally {
      setIsLoading(false);
    }
  }, [adminKey]);

  const validateTenantId = (tenantId: string): string | null => {
    if (!tenantId.trim()) {
      return 'Tenant ID is required';
    }
    if (tenantId.length < 3 || tenantId.length > 50) {
      return 'Tenant ID must be 3-50 characters';
    }
    if (!/^[a-zA-Z0-9-_]+$/.test(tenantId)) {
      return 'Tenant ID can only contain letters, numbers, hyphens, and underscores';
    }
    if (tenants.some(t => t.tenantId === tenantId)) {
      return 'Tenant ID already exists';
    }
    return null;
  };

  const createTenant = async () => {
    const validationError = validateTenantId(newTenantId);
    if (validationError) {
      setCreateError(validationError);
      return;
    }

    try {
      setIsLoading(true);
      setCreateError(null);
      await ApiService.createTenant(newTenantId, adminKey);
      await loadTenants(); // Refresh the list
      setNewTenantId('');
      setShowCreateForm(false);
      setError(null);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      const errorMessage = err?.response?.data?.error || err?.message || 'Failed to create tenant';
      setCreateError(errorMessage);
      console.error('Error creating tenant:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTenant = async (tenantId: string) => {
    if (tenantId === 'default' || tenantId === 'test-tenant') {
      setError('Cannot delete system tenants');
      return;
    }

    if (!confirm(`Are you sure you want to DELETE tenant "${tenantId}"? This will permanently remove all data and cannot be undone.`)) {
      return;
    }

    try {
      setIsLoading(true);
      await ApiService.deleteTenant(tenantId, adminKey);
      await loadTenants(); // Refresh the list
      setError(null);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      const errorMessage = err?.response?.data?.error || err?.message || `Failed to delete tenant ${tenantId}`;
      setError(errorMessage);
      console.error('Error deleting tenant:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetTenant = async (tenantId: string) => {
    if (!confirm(`Are you sure you want to reset tenant "${tenantId}"? This will delete all data.`)) {
      return;
    }

    try {
      setIsLoading(true);
      await ApiService.resetTenant(tenantId, adminKey);
      await loadTenants(); // Refresh the list
      setError(null);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      const errorMessage = err?.response?.data?.error || err?.message || `Failed to reset tenant ${tenantId}`;
      setError(errorMessage);
      console.error('Error resetting tenant:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearTenantData = async (tenantId: string) => {
    if (!confirm(`Are you sure you want to clear all data from tenant "${tenantId}"? This will keep the schema but remove all nodes and edges.`)) {
      return;
    }

    try {
      setIsLoading(true);
      await ApiService.clearTenantData(tenantId, adminKey);
      await loadTenants(); // Refresh the list
      setError(null);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      const errorMessage = err?.response?.data?.error || err?.message || `Failed to clear data for tenant ${tenantId}`;
      setError(errorMessage);
      console.error('Error clearing tenant data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearTenantSchema = async (tenantId: string) => {
    if (!confirm(`Are you sure you want to clear the schema from tenant "${tenantId}"? This will push a minimal schema and remove all type definitions.`)) {
      return;
    }

    try {
      setIsLoading(true);
      await ApiService.clearTenantSchema(tenantId, adminKey);
      await loadTenants(); // Refresh the list
      setError(null);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      const errorMessage = err?.response?.data?.error || err?.message || `Failed to clear schema for tenant ${tenantId}`;
      setError(errorMessage);
      console.error('Error clearing tenant schema:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const pushFreshSchema = async (tenantId: string) => {
    if (!confirm(`Are you sure you want to push a fresh default schema to tenant "${tenantId}"? This will overwrite the current schema.`)) {
      return;
    }

    try {
      setIsLoading(true);
      await ApiService.pushSchema(tenantId, 'default', adminKey);
      await loadTenants(); // Refresh the list
      setError(null);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      const errorMessage = err?.response?.data?.error || err?.message || `Failed to push schema to tenant ${tenantId}`;
      setError(errorMessage);
      console.error('Error pushing schema:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fullReset = async (tenantId: string) => {
    if (!confirm(`Are you sure you want to perform a FULL RESET of tenant "${tenantId}"? This will:\n\n1. Clear all data\n2. Push fresh default schema\n3. Seed test data\n\nThis cannot be undone.`)) {
      return;
    }

    try {
      setIsLoading(true);
      const result = await ApiService.fullTenantReset(tenantId, adminKey, true);
      
      if (result.success) {
        console.log('Full reset completed:', result.steps);
        await loadTenants(); // Refresh the list
        setError(null);
      } else {
        setError(`Full reset failed: ${result.message}`);
        console.error('Full reset errors:', result.errors);
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      const errorMessage = err?.response?.data?.error || err?.message || `Failed to perform full reset for tenant ${tenantId}`;
      setError(errorMessage);
      console.error('Error performing full reset:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSystemStatus();
    loadTenants();
  }, [adminKey, loadTenants]);

  const isMultiTenantMode = systemStatus?.multiTenantVerified === true;

  return (
    <div style={{ padding: 20 }}>
      {/* Header with mode indicator and actions */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h4 style={{ margin: 0, color: '#374151' }}>Tenants</h4>
          <div style={{ display: 'flex', gap: 8 }}>
            {isMultiTenantMode && (
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                disabled={isLoading}
                style={{
                  padding: '6px 12px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 12,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                {showCreateForm ? 'Cancel' : 'Add Tenant'}
              </button>
            )}
            <button
              onClick={loadTenants}
              disabled={isLoading}
              style={{
                padding: '6px 12px',
                background: 'transparent',
                border: '1px solid #d1d5db',
                borderRadius: 4,
                fontSize: 12,
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              Refresh
            </button>
          </div>
        </div>
        
        {/* Mode indicator */}
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
          Mode: {isMultiTenantMode ? 'Multi-tenant (Dgraph Enterprise)' : 'Single-tenant (Dgraph OSS)'}
          {!isMultiTenantMode && (
            <span style={{ color: '#f59e0b' }}> • Tenant management requires Dgraph Enterprise</span>
          )}
        </div>
      </div>

      {/* Create tenant form */}
      {showCreateForm && isMultiTenantMode && (
        <div style={{
          marginBottom: 16,
          padding: 16,
          border: '1px solid #e5e7eb',
          borderRadius: 6,
          background: '#f9fafb',
        }}>
          <h5 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: 14 }}>Create New Tenant</h5>
          <div style={{ marginBottom: 12 }}>
            <input
              type="text"
              value={newTenantId}
              onChange={(e) => {
                setNewTenantId(e.target.value);
                setCreateError(null);
              }}
              placeholder="Enter tenant ID (3-50 chars, alphanumeric, -, _)"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 4,
                fontSize: 14,
                boxSizing: 'border-box',
              }}
              disabled={isLoading}
            />
          </div>
          
          {createError && (
            <div style={{
              marginBottom: 12,
              padding: 8,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 4,
              color: '#dc2626',
              fontSize: 12,
            }}>
              {createError}
            </div>
          )}
          
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={createTenant}
              disabled={isLoading || !newTenantId.trim()}
              style={{
                padding: '8px 16px',
                background: !newTenantId.trim() || isLoading ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                fontSize: 12,
                cursor: !newTenantId.trim() || isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? 'Creating...' : 'Create Tenant'}
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewTenantId('');
                setCreateError(null);
              }}
              disabled={isLoading}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid #d1d5db',
                borderRadius: 4,
                fontSize: 12,
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={{
          marginBottom: 16,
          padding: 12,
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 4,
          color: '#dc2626',
          fontSize: 14,
        }}>
          {error}
        </div>
      )}

      {isLoading && tenants.length === 0 ? (
        <p style={{ color: '#6b7280', fontSize: 14, textAlign: 'center' }}>Loading...</p>
      ) : (
        <div style={{ maxHeight: 400, overflow: 'auto' }}>
          {tenants.map((tenant) => (
            <div
              key={tenant.tenantId}
              style={{
                padding: 16,
                border: '1px solid #e5e7eb',
                borderRadius: 6,
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{tenant.tenantId}</div>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>Namespace: {tenant.namespace}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span 
                    style={{
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 500,
                      background: tenant.health === 'healthy' ? '#dcfce7' : 
                                 tenant.health === 'not-accessible' ? '#fef2f2' :
                                 tenant.health === 'error' ? '#fef2f2' : '#f3f4f6',
                      color: tenant.health === 'healthy' ? '#166534' : 
                             tenant.health === 'not-accessible' ? '#dc2626' :
                             tenant.health === 'error' ? '#dc2626' : '#6b7280',
                      cursor: tenant.healthDetails ? 'help' : 'default',
                    }}
                    title={tenant.healthDetails || `Status: ${tenant.health}`}
                  >
                    {tenant.health}
                  </span>
                  
                  {/* Action buttons - show for all tenants, but limit multi-tenant operations */}
                  <>
                    <button
                      onClick={() => clearTenantData(tenant.tenantId)}
                      disabled={isLoading}
                      style={{
                        padding: '4px 8px',
                        background: '#8b5cf6',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        fontSize: 11,
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.6 : 1,
                      }}
                      title="Clear nodes & edges (safe deletion)"
                    >
                      Clear Data
                    </button>
                    
                    <button
                      onClick={() => clearTenantSchema(tenant.tenantId)}
                      disabled={isLoading}
                      style={{
                        padding: '4px 8px',
                        background: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        fontSize: 11,
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.6 : 1,
                      }}
                      title="Clear schema (push minimal schema)"
                    >
                      Clear Schema
                    </button>
                    
                    <button
                      onClick={() => pushFreshSchema(tenant.tenantId)}
                      disabled={isLoading}
                      style={{
                        padding: '4px 8px',
                        background: '#06b6d4',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        fontSize: 11,
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.6 : 1,
                      }}
                      title="Push fresh default schema"
                    >
                      Push Schema
                    </button>
                    
                    <button
                      onClick={() => ApiService.seedTenantData(tenant.tenantId, 'test', false, adminKey).then(() => loadTenants()).catch((error) => setError(`Failed to seed data: ${error.message}`))}
                      disabled={isLoading}
                      style={{
                        padding: '4px 8px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        fontSize: 11,
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.6 : 1,
                      }}
                      title="Seed hierarchy data and sample nodes"
                    >
                      Seed Data
                    </button>

                    {/* Multi-tenant specific operations */}
                    {isMultiTenantMode && tenant.tenantId !== 'default' && (
                      <button
                        onClick={() => resetTenant(tenant.tenantId)}
                        disabled={isLoading}
                        style={{
                          padding: '4px 8px',
                          background: '#f59e0b',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          fontSize: 11,
                          cursor: isLoading ? 'not-allowed' : 'pointer',
                          opacity: isLoading ? 0.6 : 1,
                        }}
                      >
                        Reset
                      </button>
                    )}
                    
                    {isMultiTenantMode && tenant.tenantId !== 'default' && tenant.tenantId !== 'test-tenant' && (
                      <button
                        onClick={() => deleteTenant(tenant.tenantId)}
                        disabled={isLoading}
                        style={{
                          padding: '4px 8px',
                          background: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          fontSize: 11,
                          cursor: isLoading ? 'not-allowed' : 'pointer',
                          opacity: isLoading ? 0.6 : 1,
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </>
                </div>
              </div>
              
              {/* Enhanced tenant information */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>
                    Node Count: <strong>{tenant.nodeCount !== undefined ? tenant.nodeCount.toLocaleString() : 'Loading...'}</strong>
                  </span>
                  {tenant.schemaInfo && (
                    <button
                      onClick={async () => {
                        setSchemaModal({
                          isOpen: true,
                          tenantId: tenant.tenantId,
                          schemaInfo: tenant.schemaInfo,
                          loading: true
                        });
                        
                        try {
                          const schemaData = await ApiService.getTenantSchema(tenant.tenantId, adminKey);
                          setSchemaModal(prev => ({
                            ...prev,
                            content: schemaData.content,
                            loading: false
                          }));
        } catch {
          setSchemaModal(prev => ({
            ...prev,
            content: 'Error loading schema content',
            loading: false
          }));
        }
                      }}
                      style={{
                        padding: '2px 6px',
                        background: 'transparent',
                        border: '1px solid #d1d5db',
                        borderRadius: 3,
                        fontSize: 11,
                        cursor: 'pointer',
                        color: '#374151',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      📄 {tenant.schemaInfo.name}
                    </button>
                  )}
                </div>
              </div>
              
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                {tenant.isTestTenant && <span>Test Tenant • </span>}
                {tenant.isDefaultTenant && <span>Default Tenant • </span>}
                {tenant.exists ? 'Accessible' : 'Not Accessible'}
                {!isMultiTenantMode && <span> • OSS mode</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schema Modal */}
      {schemaModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 8,
            width: '80%',
            maxWidth: 800,
            height: '80%',
            overflow: 'hidden',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Schema Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid #e5e7eb',
              background: '#f9fafb',
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                  Schema for Tenant: {schemaModal.tenantId}
                </h3>
                {schemaModal.schemaInfo && (
                  <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#6b7280' }}>
                    {schemaModal.schemaInfo.name} • {schemaModal.schemaInfo.isDefault ? 'Default Schema' : 'Custom Schema'}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {schemaModal.content && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(schemaModal.content || '');
                      // Could add a toast notification here
                    }}
                    style={{
                      padding: '6px 12px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    Copy
                  </button>
                )}
                <button
                  onClick={() => setSchemaModal({ isOpen: false, tenantId: '', loading: false })}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 20,
                    cursor: 'pointer',
                    color: '#6b7280',
                    padding: 4,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            </div>
            
            {/* Schema Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
              {schemaModal.loading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <p style={{ color: '#6b7280' }}>Loading schema content...</p>
                </div>
              ) : (
                <pre style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  padding: 16,
                  fontSize: 13,
                  lineHeight: 1.5,
                  overflow: 'auto',
                  margin: 0,
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                  color: '#374151',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {schemaModal.content || 'No schema content available'}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminModal: React.FC = () => {
  const { 
    adminModalOpen, 
    closeAdminModal, 
    adminAuthenticated, 
    authenticateAdmin, 
    logoutAdmin 
  } = useUIContext();
  
  const [activeTab, setActiveTab] = useState('tests');
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async (key: string) => {
    try {
      // Test the admin key
      await ApiService.listTenants(key);
      
      // If successful, authenticate
      const success = authenticateAdmin();
      if (success) {
        setAdminKey(key);
        setLoginError(null);
      } else {
        setLoginError('Authentication failed');
      }
    } catch {
      setLoginError('Invalid admin key');
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    setAdminKey(null);
    setLoginError(null);
  };

  if (!adminModalOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 8,
        width: 600,
        height: '70vh',
        overflow: 'hidden',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Admin Tools</h2>
            {adminAuthenticated && (
              <button
                onClick={handleLogout}
                style={{
                  padding: '4px 8px',
                  background: 'transparent',
                  border: '1px solid #d1d5db',
                  borderRadius: 4,
                  fontSize: 12,
                  cursor: 'pointer',
                  color: '#6b7280',
                }}
              >
                Logout
              </button>
            )}
          </div>
          <button
            onClick={closeAdminModal}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: '#6b7280',
              padding: 4,
              lineHeight: 1,
            }}
            aria-label="Close Admin Tools"
          >
            ×
          </button>
        </div>
        
        {!adminAuthenticated ? (
          <AdminLoginForm onLogin={handleLogin} error={loginError || undefined} />
        ) : (
          <>
            {/* Tab Navigation */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid #e5e7eb',
            }}>
              <button
                onClick={() => setActiveTab('tests')}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: 'none',
                  background: activeTab === 'tests' ? '#f3f4f6' : 'transparent',
                  cursor: 'pointer',
                  fontWeight: activeTab === 'tests' ? 600 : 400,
                  borderBottom: activeTab === 'tests' ? '2px solid #3b82f6' : '2px solid transparent',
                }}
              >
                Tests
              </button>
              <button
                onClick={() => setActiveTab('tenants')}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: 'none',
                  background: activeTab === 'tenants' ? '#f3f4f6' : 'transparent',
                  cursor: 'pointer',
                  fontWeight: activeTab === 'tenants' ? 600 : 400,
                  borderBottom: activeTab === 'tenants' ? '2px solid #3b82f6' : '2px solid transparent',
                }}
              >
                Tenants
              </button>
            </div>
            
            {/* Tab Content */}
            <div 
              style={{ 
                flex: 1, 
                overflow: 'auto',
                position: 'relative'
              }}
              className="admin-modal-content"
            >
              {activeTab === 'tests' && adminKey && (
                <TestsTab adminKey={adminKey} />
              )}
              
              
              {activeTab === 'tenants' && adminKey && (
                <TenantsTab adminKey={adminKey} />
              )}
            </div>
          </>
        )}
        
        {/* Styled scrollbar CSS */}
        <style>{`
          .admin-modal-content {
            /* Webkit browsers (Chrome, Safari, Edge) */
            scrollbar-width: thin;
            scrollbar-color: #9ca3af #f3f4f6;
          }
          
          .admin-modal-content::-webkit-scrollbar {
            width: 8px;
          }
          
          .admin-modal-content::-webkit-scrollbar-track {
            background: #f3f4f6;
            border-radius: 4px;
          }
          
          .admin-modal-content::-webkit-scrollbar-thumb {
            background: #9ca3af;
            border-radius: 4px;
            transition: background 0.2s ease;
          }
          
          .admin-modal-content::-webkit-scrollbar-thumb:hover {
            background: #6b7280;
          }
          
          /* Firefox */
          .admin-modal-content {
            scrollbar-width: thin;
            scrollbar-color: #9ca3af #f3f4f6;
          }
        `}</style>
      </div>
    </div>
  );
};

export default AdminModal;
