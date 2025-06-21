import React, { useState, useEffect } from 'react';
import { theme } from '../config/theme';
import { 
  uploadImportFile, 
  executeDirectImport,
  getExportFormats,
  executeDirectExport,
  type ImportFileAnalysis,
  type ExportFormat
} from '../services/ApiService';
import { log } from '../utils/logger';
import ModalOverlay from './ModalOverlay';
import ModalContainer, { ModalHeader, ModalContent } from './ModalContainer';

interface ImportExportWizardProps {
  onClose: () => void;
}

type WizardMode = 'select' | 'import' | 'export';
type ImportStep = 'upload' | 'preview';
type ExportStep = 'format' | 'options';

const ImportExportWizard: React.FC<ImportExportWizardProps> = ({ onClose }) => {
  const [mode, setMode] = useState<WizardMode>('select');
  const [importStep, setImportStep] = useState<ImportStep>('upload');
  const [exportStep, setExportStep] = useState<ExportStep>('format');
  
  // Import state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileAnalysis, setFileAnalysis] = useState<ImportFileAnalysis | null>(null);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    result: {
      nodesImported: number;
      edgesImported: number;
      hierarchiesImported: number;
    };
    importedAt: string;
  } | null>(null);
  
  // Export state
  const [exportFormats, setExportFormats] = useState<ExportFormat[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<string>('json');
  const [exportFilters, setExportFilters] = useState<any>({});
  const [exportOptions, setExportOptions] = useState<any>({});
  
  // Common state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load export formats when entering export mode
  useEffect(() => {
    if (mode === 'export' && exportFormats.length === 0) {
      loadExportFormats();
    }
  }, [mode]);

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

  const handleDirectImport = async () => {
    if (!selectedFile) return;
    
    try {
      setLoading(true);
      setError(null);
      
      log('ImportExportWizard', 'Starting direct import:', selectedFile.name);
      const result = await executeDirectImport(selectedFile);
      
      setImportResult(result);
      
    } catch (error) {
      setError(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteExport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Direct export with immediate download
      await executeDirectExport(selectedFormat, exportFilters, exportOptions);
      
      // Close modal immediately after download
      onClose();
      
    } catch (error) {
      setError(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const resetWizard = () => {
    setMode('select');
    setImportStep('upload');
    setExportStep('format');
    setSelectedFile(null);
    setFileAnalysis(null);
    setImportResult(null);
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
      
      {/* Show import result if available */}
      {importResult && (
        <div style={{ marginBottom: 20 }}>
          {importResult.success ? (
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
                • {importResult.result.nodesImported} nodes imported<br/>
                • {importResult.result.edgesImported} edges imported<br/>
                • {importResult.result.hierarchiesImported} hierarchies imported
              </div>
            </div>
          ) : (
            <div style={{
              padding: 16,
              background: theme.colors.admin.error.background,
              border: `1px solid ${theme.colors.admin.error.border}`,
              borderRadius: 6,
              marginBottom: 16
            }}>
              <p style={{ margin: '0 0 8px 0', color: theme.colors.admin.error.text, fontWeight: 500 }}>
                Import failed
              </p>
              <p style={{ margin: 0, color: theme.colors.admin.error.text, fontSize: 14 }}>
                {importResult.message}
              </p>
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
        
        {importResult ? (
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
            Start New Import
          </button>
        ) : (
          <button
            onClick={handleDirectImport}
            disabled={loading || !fileAnalysis?.validation.isValid}
            style={{
              padding: '8px 16px',
              background: fileAnalysis?.validation.isValid ? theme.colors.admin.button.success : theme.colors.admin.button.disabled,
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: fileAnalysis?.validation.isValid ? 'pointer' : 'not-allowed'
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ 
                  width: 16, 
                  height: 16, 
                  border: '2px solid transparent',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}>
                </span>
                Importing...
              </span>
            ) : (
              'Import'
            )}
          </button>
        )}
      </div>
      
      {/* Add spinner animation CSS */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
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
          {loading ? 'Exporting...' : 'Export Data'}
        </button>
      </div>
    </div>
  );

  return (
    <ModalOverlay isOpen={true} onClose={onClose}>
      <ModalContainer width={600} height="70vh">
        <ModalHeader title="Import/Export Data" onClose={onClose} />
        
        <ModalContent>
          {error && (
            <div style={{
              marginBottom: 20,
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
          
          {mode === 'export' && exportStep === 'format' && renderExportFormat()}
          {mode === 'export' && exportStep === 'options' && renderExportOptions()}
        </ModalContent>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default ImportExportWizard;
