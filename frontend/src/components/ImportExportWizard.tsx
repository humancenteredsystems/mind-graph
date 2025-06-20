import React, { useState, useEffect } from 'react';
import { theme } from '../config/theme';
import { 
  uploadImportFile, 
  generateImportPreview, 
  executeImport, 
  getImportJobStatus,
  getExportFormats,
  executeExport,
  getExportJobStatus,
  downloadExportFile,
  cancelJob,
  type ImportFileAnalysis,
  type ImportPreview,
  type JobStatus,
  type ExportFormat
} from '../services/ApiService';
import { log } from '../utils/logger';

interface ImportExportWizardProps {
  onClose: () => void;
}

type WizardMode = 'select' | 'import' | 'export';
type ImportStep = 'upload' | 'preview' | 'execute' | 'progress';
type ExportStep = 'format' | 'options' | 'execute' | 'progress';

const ImportExportWizard: React.FC<ImportExportWizardProps> = ({ onClose }) => {
  const [mode, setMode] = useState<WizardMode>('select');
  const [importStep, setImportStep] = useState<ImportStep>('upload');
  const [exportStep, setExportStep] = useState<ExportStep>('format');
  
  // Import state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileAnalysis, setFileAnalysis] = useState<ImportFileAnalysis | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importJobId, setImportJobId] = useState<string | null>(null);
  const [importJobStatus, setImportJobStatus] = useState<JobStatus | null>(null);
  
  // Export state
  const [exportFormats, setExportFormats] = useState<ExportFormat[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<string>('json');
  const [exportFilters, setExportFilters] = useState<any>({});
  const [exportOptions, setExportOptions] = useState<any>({});
  const [exportJobId, setExportJobId] = useState<string | null>(null);
  const [exportJobStatus, setExportJobStatus] = useState<JobStatus | null>(null);
  
  // Common state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load export formats when entering export mode
  useEffect(() => {
    if (mode === 'export' && exportFormats.length === 0) {
      loadExportFormats();
    }
  }, [mode]);

  // Poll job status when jobs are running
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (importJobId && importJobStatus?.status === 'running') {
      interval = setInterval(() => {
        pollImportJobStatus();
      }, 2000);
    }
    
    if (exportJobId && exportJobStatus?.status === 'running') {
      interval = setInterval(() => {
        pollExportJobStatus();
      }, 2000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [importJobId, importJobStatus?.status, exportJobId, exportJobStatus?.status]);

  const loadExportFormats = async () => {
    try {
      setLoading(true);
      const result = await getExportFormats();
      setExportFormats(result.formats);
      if (result.formats.length > 0) {
        setSelectedFormat(result.formats[0].id);
      }
    } catch (error) {
      setError(`Failed to load export formats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setLoading(true);
      setError(null);
      
      log('ImportExportWizard', 'Uploading file:', file.name);
      const result = await uploadImportFile(file);
      
      setSelectedFile(file);
      setFileAnalysis(result.analysis);
      setImportStep('preview');
      
    } catch (error) {
      setError(`File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePreview = async () => {
    if (!fileAnalysis) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await generateImportPreview(fileAnalysis.fileId, {});
      setImportPreview(result.preview);
      setImportStep('execute');
      
    } catch (error) {
      setError(`Preview generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!fileAnalysis) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await executeImport(fileAnalysis.fileId, {});
      setImportJobId(result.jobId);
      setImportStep('progress');
      
      // Start polling immediately
      setTimeout(pollImportJobStatus, 1000);
      
    } catch (error) {
      setError(`Import execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const pollImportJobStatus = async () => {
    if (!importJobId) return;
    
    try {
      const result = await getImportJobStatus(importJobId);
      setImportJobStatus(result.job);
    } catch (error) {
      log('ImportExportWizard', 'Error polling import job status:', error);
    }
  };

  const handleExecuteExport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await executeExport(selectedFormat, exportFilters, exportOptions);
      setExportJobId(result.jobId);
      setExportStep('progress');
      
      // Start polling immediately
      setTimeout(pollExportJobStatus, 1000);
      
    } catch (error) {
      setError(`Export execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const pollExportJobStatus = async () => {
    if (!exportJobId) return;
    
    try {
      const result = await getExportJobStatus(exportJobId);
      setExportJobStatus(result.job);
    } catch (error) {
      log('ImportExportWizard', 'Error polling export job status:', error);
    }
  };

  const handleDownloadExport = async () => {
    if (!exportJobId) return;
    
    try {
      setLoading(true);
      await downloadExportFile(exportJobId);
    } catch (error) {
      setError(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      await cancelJob(jobId);
      if (importJobId === jobId) {
        setImportJobStatus(prev => prev ? { ...prev, status: 'cancelled' } : null);
      }
      if (exportJobId === jobId) {
        setExportJobStatus(prev => prev ? { ...prev, status: 'cancelled' } : null);
      }
    } catch (error) {
      setError(`Failed to cancel job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const resetWizard = () => {
    setMode('select');
    setImportStep('upload');
    setExportStep('format');
    setSelectedFile(null);
    setFileAnalysis(null);
    setImportPreview(null);
    setImportJobId(null);
    setImportJobStatus(null);
    setExportJobId(null);
    setExportJobStatus(null);
    setError(null);
  };

  const renderModeSelection = () => (
    <div style={{ padding: 20, textAlign: 'center' }}>
      <h3 style={{ margin: '0 0 20px 0', color: theme.colors.text.primary }}>
        Import/Export Data
      </h3>
      <p style={{ margin: '0 0 30px 0', color: theme.colors.text.secondary }}>
        Choose whether to import data from a file or export your current data.
      </p>
      
      <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
        <button
          onClick={() => setMode('import')}
          style={{
            padding: '20px 30px',
            background: theme.colors.admin.button.primary,
            color: 'white',
            border: 'none',
            borderRadius: theme.components.modal.borderRadius,
            fontSize: 16,
            fontWeight: 500,
            cursor: 'pointer',
            minWidth: 150
          }}
        >
          📥 Import Data
        </button>
        
        <button
          onClick={() => setMode('export')}
          style={{
            padding: '20px 30px',
            background: theme.colors.admin.button.success,
            color: 'white',
            border: 'none',
            borderRadius: theme.components.modal.borderRadius,
            fontSize: 16,
            fontWeight: 500,
            cursor: 'pointer',
            minWidth: 150
          }}
        >
          📤 Export Data
        </button>
      </div>
    </div>
  );

  const renderImportUpload = () => (
    <div style={{ padding: 20 }}>
      <h3 style={{ margin: '0 0 20px 0', color: theme.colors.text.primary }}>
        Upload Import File
      </h3>
      
      <div style={{
        border: '2px dashed #d1d5db',
        borderRadius: 8,
        padding: 40,
        textAlign: 'center',
        marginBottom: 20
      }}>
        <input
          type="file"
          accept=".json,.csv,.graphml,.xml"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
          style={{ display: 'none' }}
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: theme.colors.admin.button.primary,
            color: 'white',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500
          }}
        >
          Choose File
        </label>
        <p style={{ margin: '16px 0 0 0', color: theme.colors.text.secondary, fontSize: 14 }}>
          Supported formats: JSON, CSV, GraphML
        </p>
      </div>
      
      {selectedFile && (
        <div style={{
          padding: 12,
          background: theme.colors.background.secondary,
          borderRadius: 6,
          marginBottom: 20
        }}>
          <strong>Selected file:</strong> {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
        </div>
      )}
    </div>
  );

  const renderImportPreview = () => (
    <div style={{ padding: 20 }}>
      <h3 style={{ margin: '0 0 20px 0', color: theme.colors.text.primary }}>
        Import Preview
      </h3>
      
      {fileAnalysis && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 12,
            marginBottom: 16
          }}>
            <div style={{ textAlign: 'center', padding: 12, background: theme.colors.background.secondary, borderRadius: 6 }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: theme.colors.admin.button.primary }}>
                {fileAnalysis.nodeCount}
              </div>
              <div style={{ fontSize: 12, color: theme.colors.text.secondary }}>Nodes</div>
            </div>
            <div style={{ textAlign: 'center', padding: 12, background: theme.colors.background.secondary, borderRadius: 6 }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: theme.colors.admin.button.success }}>
                {fileAnalysis.edgeCount}
              </div>
              <div style={{ fontSize: 12, color: theme.colors.text.secondary }}>Edges</div>
            </div>
            <div style={{ textAlign: 'center', padding: 12, background: theme.colors.background.secondary, borderRadius: 6 }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: theme.colors.admin.button.warning }}>
                {fileAnalysis.hierarchyCount}
              </div>
              <div style={{ fontSize: 12, color: theme.colors.text.secondary }}>Hierarchies</div>
            </div>
          </div>
          
          {fileAnalysis.validation.errors.length > 0 && (
            <div style={{
              padding: 12,
              background: theme.colors.admin.error.background,
              border: `1px solid ${theme.colors.admin.error.border}`,
              borderRadius: 6,
              marginBottom: 12
            }}>
              <strong style={{ color: theme.colors.admin.error.text }}>Validation Errors:</strong>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                {fileAnalysis.validation.errors.map((error, index) => (
                  <li key={index} style={{ color: theme.colors.admin.error.text }}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {fileAnalysis.validation.warnings.length > 0 && (
            <div style={{
              padding: 12,
              background: '#fef3c7',
              border: '1px solid #fbbf24',
              borderRadius: 6,
              marginBottom: 12
            }}>
              <strong style={{ color: '#92400e' }}>Warnings:</strong>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                {fileAnalysis.validation.warnings.map((warning, index) => (
                  <li key={index} style={{ color: '#92400e' }}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button
          onClick={() => setImportStep('upload')}
          style={{
            padding: '8px 16px',
            background: 'transparent',
            border: `1px solid ${theme.colors.border.default}`,
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Back
        </button>
        <button
          onClick={handleGeneratePreview}
          disabled={loading || !fileAnalysis?.validation.isValid}
          style={{
            padding: '8px 16px',
            background: fileAnalysis?.validation.isValid ? theme.colors.admin.button.primary : theme.colors.admin.button.disabled,
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: fileAnalysis?.validation.isValid ? 'pointer' : 'not-allowed'
          }}
        >
          {loading ? 'Generating...' : 'Generate Preview'}
        </button>
      </div>
    </div>
  );

  const renderImportExecute = () => (
    <div style={{ padding: 20 }}>
      <h3 style={{ margin: '0 0 20px 0', color: theme.colors.text.primary }}>
        Ready to Import
      </h3>
      
      {importPreview && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: theme.colors.text.secondary, marginBottom: 16 }}>
            The following data will be imported:
          </p>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 12,
            marginBottom: 16
          }}>
            <div style={{ textAlign: 'center', padding: 12, background: theme.colors.background.secondary, borderRadius: 6 }}>
              <div style={{ fontSize: 20, fontWeight: 'bold', color: theme.colors.admin.button.primary }}>
                {importPreview.nodes.length}
              </div>
              <div style={{ fontSize: 12, color: theme.colors.text.secondary }}>Nodes</div>
            </div>
            <div style={{ textAlign: 'center', padding: 12, background: theme.colors.background.secondary, borderRadius: 6 }}>
              <div style={{ fontSize: 20, fontWeight: 'bold', color: theme.colors.admin.button.success }}>
                {importPreview.edges.length}
              </div>
              <div style={{ fontSize: 12, color: theme.colors.text.secondary }}>Edges</div>
            </div>
            <div style={{ textAlign: 'center', padding: 12, background: theme.colors.background.secondary, borderRadius: 6 }}>
              <div style={{ fontSize: 20, fontWeight: 'bold', color: theme.colors.admin.button.warning }}>
                {importPreview.hierarchies.length}
              </div>
              <div style={{ fontSize: 12, color: theme.colors.text.secondary }}>Hierarchies</div>
            </div>
          </div>
          
          {importPreview.conflicts.length > 0 && (
            <div style={{
              padding: 12,
              background: '#fef3c7',
              border: '1px solid #fbbf24',
              borderRadius: 6,
              marginBottom: 16
            }}>
              <strong style={{ color: '#92400e' }}>Conflicts Detected:</strong>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                {importPreview.conflicts.slice(0, 5).map((conflict, index) => (
                  <li key={index} style={{ color: '#92400e' }}>
                    {conflict.type} "{conflict.id}": {conflict.reason} (will {conflict.action})
                  </li>
                ))}
                {importPreview.conflicts.length > 5 && (
                  <li style={{ color: '#92400e' }}>
                    ... and {importPreview.conflicts.length - 5} more conflicts
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
      
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button
          onClick={() => setImportStep('preview')}
          style={{
            padding: '8px 16px',
            background: 'transparent',
            border: `1px solid ${theme.colors.border.default}`,
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Back
        </button>
        <button
          onClick={handleExecuteImport}
          disabled={loading}
          style={{
            padding: '8px 16px',
            background: theme.colors.admin.button.success,
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Starting...' : 'Start Import'}
        </button>
      </div>
    </div>
  );

  const renderJobProgress = (jobStatus: JobStatus, jobType: 'import' | 'export') => (
    <div style={{ padding: 20 }}>
      <h3 style={{ margin: '0 0 20px 0', color: theme.colors.text.primary }}>
        {jobType === 'import' ? 'Import' : 'Export'} Progress
      </h3>
      
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8
        }}>
          <span style={{ fontSize: 14, color: theme.colors.text.secondary }}>
            {jobStatus.message}
          </span>
          <span style={{ fontSize: 14, fontWeight: 500 }}>
            {jobStatus.progress}%
          </span>
        </div>
        
        <div style={{
          width: '100%',
          height: 8,
          background: theme.colors.background.secondary,
          borderRadius: 4,
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${jobStatus.progress}%`,
            height: '100%',
            background: jobStatus.status === 'failed' 
              ? theme.colors.admin.button.danger 
              : theme.colors.admin.button.success,
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>
      
      {jobStatus.status === 'completed' && jobType === 'export' && (
        <div style={{
          padding: 16,
          background: theme.colors.admin.tenant.healthy,
          border: `1px solid ${theme.colors.admin.tenant.healthyText}`,
          borderRadius: 6,
          marginBottom: 16,
          textAlign: 'center'
        }}>
          <p style={{ margin: '0 0 12px 0', color: theme.colors.admin.tenant.healthyText }}>
            Export completed successfully!
          </p>
          <button
            onClick={handleDownloadExport}
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: theme.colors.admin.button.success,
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Downloading...' : 'Download File'}
          </button>
        </div>
      )}
      
      {jobStatus.status === 'completed' && jobType === 'import' && jobStatus.result && (
        <div style={{
          padding: 16,
          background: theme.colors.admin.tenant.healthy,
          border: `1px solid ${theme.colors.admin.tenant.healthyText}`,
          borderRadius: 6,
          marginBottom: 16
        }}>
          <p style={{ margin: '0 0 8px 0', color: theme.colors.admin.tenant.healthyText, fontWeight: 500 }}>
            Import completed successfully!
          </p>
          <div style={{ fontSize: 14, color: theme.colors.admin.tenant.healthyText }}>
            • {jobStatus.result.nodesImported || 0} nodes imported<br/>
            • {jobStatus.result.edgesImported || 0} edges imported<br/>
            • {jobStatus.result.hierarchiesImported || 0} hierarchies imported
          </div>
        </div>
      )}
      
      {jobStatus.status === 'failed' && (
        <div style={{
          padding: 16,
          background: theme.colors.admin.error.background,
          border: `1px solid ${theme.colors.admin.error.border}`,
          borderRadius: 6,
          marginBottom: 16
        }}>
          <p style={{ margin: '0 0 8px 0', color: theme.colors.admin.error.text, fontWeight: 500 }}>
            {jobType === 'import' ? 'Import' : 'Export'} failed
          </p>
          <p style={{ margin: 0, color: theme.colors.admin.error.text, fontSize: 14 }}>
            {jobStatus.error || 'Unknown error occurred'}
          </p>
        </div>
      )}
      
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        {(jobStatus.status === 'running' || jobStatus.status === 'pending') && (
          <button
            onClick={() => handleCancelJob(jobStatus.jobId)}
            style={{
              padding: '8px 16px',
              background: theme.colors.admin.button.danger,
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        )}
        
        {(jobStatus.status === 'completed' || jobStatus.status === 'failed' || jobStatus.status === 'cancelled') && (
          <button
            onClick={resetWizard}
            style={{
              padding: '8px 16px',
              background: theme.colors.admin.button.primary,
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            Start New Operation
          </button>
        )}
      </div>
    </div>
  );

  const renderExportFormat = () => (
    <div style={{ padding: 20 }}>
      <h3 style={{ margin: '0 0 20px 0', color: theme.colors.text.primary }}>
        Select Export Format
      </h3>
      
      <div style={{ marginBottom: 20 }}>
        {exportFormats.map((format) => (
          <div
            key={format.id}
            style={{
              padding: 16,
              border: selectedFormat === format.id 
                ? `2px solid ${theme.colors.admin.button.primary}` 
                : `1px solid ${theme.colors.border.default}`,
              borderRadius: 6,
              marginBottom: 12,
              cursor: 'pointer',
              background: selectedFormat === format.id 
                ? theme.colors.background.secondary 
                : 'transparent'
            }}
            onClick={() => setSelectedFormat(format.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <input
                type="radio"
                checked={selectedFormat === format.id}
                onChange={() => setSelectedFormat(format.id)}
                style={{ marginRight: 12 }}
              />
              <strong style={{ color: theme.colors.text.primary }}>{format.name}</strong>
            </div>
            <p style={{ margin: 0, color: theme.colors.text.secondary, fontSize: 14 }}>
              {format.description}
            </p>
          </div>
        ))}
      </div>
      
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button
          onClick={() => setMode('select')}
          style={{
            padding: '8px 16px',
            background: 'transparent',
            border: `1px solid ${theme.colors.border.default}`,
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Back
        </button>
        <button
          onClick={() => setExportStep('options')}
          style={{
            padding: '8px 16px',
            background: theme.colors.admin.button.primary,
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Next
        </button>
      </div>
    </div>
  );

  const renderExportOptions = () => (
    <div style={{ padding: 20 }}>
      <h3 style={{ margin: '0 0 20px 0', color: theme.colors.text.primary }}>
        Export Options
      </h3>
      
      <div style={{ marginBottom: 20 }}>
        <p style={{ color: theme.colors.text.secondary, marginBottom: 16 }}>
          Selected format: <strong>{exportFormats.find(f => f.id === selectedFormat)?.name}</strong>
        </p>
        
        <div style={{
          padding: 16,
          background: theme.colors.background.secondary,
          borderRadius: 6,
          marginBottom: 16
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 500 }}>Export will include:</p>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>All nodes in the current tenant</li>
            <li>All edges and relationships</li>
            <li>Hierarchy definitions and assignments</li>
            <li>Metadata and timestamps</li>
          </ul>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button
          onClick={() => setExportStep('format')}
          style={{
            padding: '8px 16px',
            background: 'transparent',
            border: `1px solid ${theme.colors.border.default}`,
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Back
        </button>
        <button
          onClick={handleExecuteExport}
          disabled={loading}
          style={{
            padding: '8px 16px',
            background: theme.colors.admin.button.success,
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Starting...' : 'Start Export'}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      {error && (
        <div style={{
          margin: '0 20px 20px 20px',
          padding: 12,
          background: theme.colors.admin.error.background,
          border: `1px solid ${theme.colors.admin.error.border}`,
          borderRadius: 6,
          color: theme.colors.admin.error.text
        }}>
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              float: 'right',
              background: 'none',
              border: 'none',
              color: theme.colors.admin.error.text,
              cursor: 'pointer',
              fontSize: 16
            }}
          >
            ×
          </button>
        </div>
      )}
      
      {mode === 'select' && renderModeSelection()}
      
      {mode === 'import' && importStep === 'upload' && renderImportUpload()}
      {mode === 'import' && importStep === 'preview' && renderImportPreview()}
      {mode === 'import' && importStep === 'execute' && renderImportExecute()}
      {mode === 'import' && importStep === 'progress' && importJobStatus && renderJobProgress(importJobStatus, 'import')}
      
      {mode === 'export' && exportStep === 'format' && renderExportFormat()}
      {mode === 'export' && exportStep === 'options' && renderExportOptions()}
      {mode === 'export' && exportStep === 'progress' && exportJobStatus && renderJobProgress(exportJobStatus, 'export')}
    </div>
  );
};

export default ImportExportWizard;
