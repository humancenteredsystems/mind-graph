import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchSystemStatus } from '../services/ApiService';

interface TenantContextType {
  tenantId: string | null;
  namespace: string | null;
  isTestTenant: boolean;
  isMultiTenantMode: boolean;
  switchTenant: (tenantId: string) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenantId, setTenantId] = useState<string | null>(
    localStorage.getItem('tenantId') || 'default'
  );
  const [namespace, setNamespace] = useState<string | null>(null);
  const [isMultiTenantMode, setIsMultiTenantMode] = useState(false);

  // Auto-detect multi-tenant capabilities on mount
  useEffect(() => {
    const detectCapabilities = async () => {
      try {
        const systemStatus = await fetchSystemStatus();
        setIsMultiTenantMode(systemStatus.namespacesSupported || false);
        
        console.log(`[TENANT_CONTEXT] Multi-tenant mode: ${systemStatus.namespacesSupported ? 'enabled' : 'disabled'}`);
      } catch (error) {
        console.warn('Could not detect multi-tenant capabilities, assuming OSS mode');
        setIsMultiTenantMode(false);
      }
    };
    
    detectCapabilities();
  }, []);

  const switchTenant = (newTenantId: string) => {
    if (!isMultiTenantMode && newTenantId !== 'default') {
      console.warn('Multi-tenant mode not supported, staying in default mode');
      return;
    }
    
    console.log(`[TENANT_CONTEXT] Switching to tenant: ${newTenantId}`);
    setTenantId(newTenantId);
    localStorage.setItem('tenantId', newTenantId);
    
    // Update namespace based on tenant (Enterprise only)
    if (isMultiTenantMode) {
      const newNamespace = newTenantId === 'test-tenant' ? '0x1' : null;
      setNamespace(newNamespace);
      console.log(`[TENANT_CONTEXT] Namespace set to: ${newNamespace || 'default'}`);
    }
  };

  const isTestTenant = tenantId === 'test-tenant';

  return (
    <TenantContext.Provider value={{
      tenantId,
      namespace,
      isTestTenant,
      isMultiTenantMode,
      switchTenant
    }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
};
