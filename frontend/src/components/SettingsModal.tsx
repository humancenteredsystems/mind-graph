import React, { useState } from 'react';
import { useUIContext } from '../hooks/useUI';
import { SystemStatus } from '../types/system';
import ModalOverlay from './ModalOverlay';
import ModalContainer, { ModalHeader, ModalContent } from './ModalContainer';
import TabNavigation, { Tab } from './TabNavigation';
import { buildStandardModalStyle, buildScrollbarStyle } from '../utils/styleUtils';

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
  systemStatus: SystemStatus | null;
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
  const getLicenseTypeDisplay = (licenseType?: string) => {
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

      {/* Active Tenant Section */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid #eee',
      }}>
        <span style={{ fontWeight: 500 }}>Active Tenant</span>
        <span style={{ 
          fontSize: 14, 
          fontWeight: 500,
          color: '#374151'
        }}>
          {systemStatus.currentTenant}
        </span>
      </div>
      
      <div style={{ marginTop: 20, padding: '16px 0' }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#666' }}>System Information</h4>
        <div style={{ fontSize: 14, lineHeight: 1.6 }}>
          <p><strong>Current Mode:</strong> {systemStatus.mode}</p>
          {systemStatus.namespace && systemStatus.namespace !== '0x0' && (
            <p><strong>Namespace:</strong> {systemStatus.namespace}</p>
          )}
          {systemStatus.version && (
            <p><strong>Dgraph Version:</strong> {systemStatus.version}</p>
          )}
          <p><strong>Last Updated:</strong> {new Date(systemStatus.detectedAt).toLocaleString()}</p>
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

  const tabs: Tab[] = [
    { id: 'hierarchy', label: 'Hierarchy' },
    { id: 'features', label: 'Features' },
  ];

  const scrollbarConfig = buildScrollbarStyle('settings-modal-content');

  return (
    <ModalOverlay isOpen={settingsModalOpen} onClose={closeSettingsModal}>
      <ModalContainer 
        width={600}
        height="70vh"
      >
        <ModalHeader 
          title="Settings" 
          onClose={closeSettingsModal}
        />
        
        <TabNavigation 
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          variant="default"
        />
        
        <ModalContent 
          padding={false}
          className={scrollbarConfig.className}
        >
          {activeTab === 'hierarchy' && (
            <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>
              <p>Hierarchy settings coming soon...</p>
            </div>
          )}
          
          {activeTab === 'features' && (
            <FeaturesTab systemStatus={systemStatus} />
          )}
        </ModalContent>
        
        {/* Shared scrollbar CSS */}
        <style>{scrollbarConfig.cssString}</style>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default SettingsModal;
