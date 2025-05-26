import React, { useState } from 'react';
import { useUIContext } from '../context/UIContext';

interface StatusIconProps {
  isActive: boolean;
}

const StatusIcon: React.FC<StatusIconProps> = ({ isActive }) => (
  <span 
    style={{
      color: isActive ? '#22c55e' : '#ef4444',
      fontWeight: 'bold',
      fontSize: 18,
    }}
  >
    {isActive ? '✓' : '✗'}
  </span>
);

interface FeaturesTabProps {
  systemStatus: any;
}

const FeaturesTab: React.FC<FeaturesTabProps> = ({ systemStatus }) => {
  if (!systemStatus) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <p>Loading system status...</p>
      </div>
    );
  }

  // Determine license type display
  const isTrialActive = systemStatus.licenseType === 'oss-trial';
  
  // Get display name for license type
  const getLicenseTypeDisplay = (licenseType: string) => {
    switch (licenseType) {
      case 'oss-only':
        return 'Open Source';
      case 'oss-trial':
        return 'Open Source';
      case 'enterprise-licensed':
        return 'Enterprise';
      default:
        return 'Unknown';
    }
  };

  return (
    <div style={{ padding: 20 }}>
      {/* License Type Section */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid #eee',
      }}>
        <span style={{ fontWeight: 500 }}>License Type</span>
        <span style={{ 
          fontSize: 14, 
          fontWeight: 500,
          color: '#374151'
        }}>
          {getLicenseTypeDisplay(systemStatus.licenseType)}
        </span>
      </div>

      {/* Enterprise Features Status */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid #eee',
      }}>
        <span style={{ fontWeight: 500 }}>Enterprise Features Active</span>
        <StatusIcon isActive={systemStatus.dgraphEnterprise} />
      </div>

      {/* Trial Expiry (only show for OSS trial) */}
      {isTrialActive && systemStatus.licenseExpiry && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 0',
          borderBottom: '1px solid #eee',
        }}>
          <span style={{ fontWeight: 500 }}>Expires</span>
          <span style={{ 
            fontSize: 14, 
            color: '#dc2626',
            fontWeight: 500 
          }}>
            {new Date(systemStatus.licenseExpiry).toLocaleDateString()}
          </span>
        </div>
      )}
      
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid #eee',
      }}>
        <span style={{ fontWeight: 500 }}>Multi-Tenant Operations Verified</span>
        <StatusIcon isActive={systemStatus.multiTenantVerified} />
      </div>
      
      <div style={{ marginTop: 20, padding: '16px 0' }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#666' }}>System Information</h4>
        <div style={{ fontSize: 14, lineHeight: 1.6 }}>
          <p><strong>Current Mode:</strong> {systemStatus.mode}</p>
          <p><strong>Current Tenant:</strong> {systemStatus.currentTenant}</p>
          {systemStatus.namespace && (
            <p><strong>Namespace:</strong> {systemStatus.namespace}</p>
          )}
          {systemStatus.version && (
            <p><strong>Dgraph Version:</strong> {systemStatus.version}</p>
          )}
          <p><strong>Detected At:</strong> {new Date(systemStatus.detectedAt).toLocaleString()}</p>
        </div>
        
        {systemStatus.detectionError && (
          <div style={{
            marginTop: 12,
            padding: 12,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 4,
            color: '#dc2626',
            fontSize: 14,
          }}>
            <strong>Detection Error:</strong> {systemStatus.detectionError}
          </div>
        )}

        {/* License Type Details */}
        {systemStatus.licenseType && systemStatus.licenseType !== 'unknown' && (
          <div style={{
            marginTop: 12,
            padding: 12,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 4,
            fontSize: 14,
          }}>
            <strong>License Details:</strong>
            <div style={{ marginTop: 4 }}>
              {systemStatus.licenseType === 'oss-trial' && (
                <span style={{ color: '#dc2626' }}>
                  OSS with 30-day Enterprise trial features
                </span>
              )}
              {systemStatus.licenseType === 'enterprise-licensed' && (
                <span style={{ color: '#059669' }}>
                  Licensed Dgraph Enterprise
                </span>
              )}
              {systemStatus.licenseType === 'oss-only' && (
                <span style={{ color: '#6b7280' }}>
                  Open Source (no Enterprise features)
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SettingsModal: React.FC = () => {
  const { settingsModalOpen, closeSettingsModal, systemStatus } = useUIContext();
  const [activeTab, setActiveTab] = useState('features');

  if (!settingsModalOpen) return null;

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
        maxHeight: '80vh',
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
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Settings</h2>
          <button
            onClick={closeSettingsModal}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: '#6b7280',
              padding: 4,
              lineHeight: 1,
            }}
            aria-label="Close Settings"
          >
            ×
          </button>
        </div>
        
        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e5e7eb',
        }}>
          <button
            onClick={() => setActiveTab('hierarchy')}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: 'none',
              background: activeTab === 'hierarchy' ? '#f3f4f6' : 'transparent',
              cursor: 'pointer',
              fontWeight: activeTab === 'hierarchy' ? 600 : 400,
              borderBottom: activeTab === 'hierarchy' ? '2px solid #3b82f6' : '2px solid transparent',
            }}
          >
            Hierarchy
          </button>
          <button
            onClick={() => setActiveTab('features')}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: 'none',
              background: activeTab === 'features' ? '#f3f4f6' : 'transparent',
              cursor: 'pointer',
              fontWeight: activeTab === 'features' ? 600 : 400,
              borderBottom: activeTab === 'features' ? '2px solid #3b82f6' : '2px solid transparent',
            }}
          >
            Features
          </button>
        </div>
        
        {/* Tab Content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {activeTab === 'hierarchy' && (
            <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>
              <p>Hierarchy settings coming soon...</p>
            </div>
          )}
          
          {activeTab === 'features' && (
            <FeaturesTab systemStatus={systemStatus} />
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
