import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminModal from '../../../src/components/AdminModal';

const uiMocks = vi.hoisted(() => ({
  mockCloseAdminModal: vi.fn(),
  mockUseUIContext: vi.fn(),
}));

const serviceMocks = vi.hoisted(() => ({
  mockListTenants: vi.fn(),
  mockStartTestRun: vi.fn(),
  mockGetTestRun: vi.fn(),
  mockRunLinting: vi.fn(),
  mockCreateTenant: vi.fn(),
  mockDeleteTenant: vi.fn(),
  mockResetTenant: vi.fn(),
  mockClearTenantData: vi.fn(),
  mockClearTenantSchema: vi.fn(),
  mockPushSchema: vi.fn(),
  mockSeedTenantData: vi.fn(),
  mockFetchSystemStatus: vi.fn(),
  mockGetTenantSchema: vi.fn(),
}));

vi.mock('../../../src/hooks/useUI', () => ({
  useUIContext: uiMocks.mockUseUIContext,
}));

vi.mock('../../../src/services/ApiService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/services/ApiService')>();
  return {
    ...actual,
    listTenants: serviceMocks.mockListTenants,
    startTestRun: serviceMocks.mockStartTestRun,
    getTestRun: serviceMocks.mockGetTestRun,
    runLinting: serviceMocks.mockRunLinting,
    createTenant: serviceMocks.mockCreateTenant,
    deleteTenant: serviceMocks.mockDeleteTenant,
    resetTenant: serviceMocks.mockResetTenant,
    clearTenantData: serviceMocks.mockClearTenantData,
    clearTenantSchema: serviceMocks.mockClearTenantSchema,
    pushSchema: serviceMocks.mockPushSchema,
    seedTenantData: serviceMocks.mockSeedTenantData,
    fetchSystemStatus: serviceMocks.mockFetchSystemStatus,
    getTenantSchema: serviceMocks.mockGetTenantSchema,
  };
});

const { mockCloseAdminModal, mockUseUIContext } = uiMocks;

const {
  mockListTenants,
  mockStartTestRun,
  mockGetTestRun,
  mockRunLinting,
  mockCreateTenant,
  mockDeleteTenant,
  mockResetTenant,
  mockClearTenantData,
  mockClearTenantSchema,
  mockPushSchema,
  mockSeedTenantData,
  mockFetchSystemStatus,
  mockGetTenantSchema,
} = serviceMocks;

const defaultSystemStatus = {
  dgraphEnterprise: false,
  multiTenantVerified: false,
  currentTenant: 'default',
  namespace: null,
  mode: 'single-tenant' as const,
  detectedAt: new Date().toISOString(),
};

describe('AdminModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUIContext.mockReturnValue({
      adminModalOpen: true,
      closeAdminModal: mockCloseAdminModal,
    });

    mockListTenants.mockResolvedValue({ tenants: [], count: 0 });
    mockFetchSystemStatus.mockResolvedValue(defaultSystemStatus);
  });

  describe('Modal Visibility', () => {
    it('renders when adminModalOpen is true', () => {
      render(<AdminModal />);
      expect(screen.getByText('Admin Tools')).toBeInTheDocument();
    });

    it('does not render when adminModalOpen is false', () => {
      mockUseUIContext.mockReturnValue({
        adminModalOpen: false,
        closeAdminModal: mockCloseAdminModal,
      });

      const { container } = render(<AdminModal />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Admin key management', () => {
    it('shows login form and tab navigation by default', () => {
      render(<AdminModal />);

      expect(screen.getByText('Admin API Access')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Admin API Key')).toBeInTheDocument();
      expect(screen.getByText('Login')).toBeInTheDocument();
      expect(screen.getByText('Tests')).toBeInTheDocument();
      expect(screen.getByText('Tenants')).toBeInTheDocument();
      expect(screen.getByText('An admin API key is required to run tests.')).toBeInTheDocument();
      expect(mockListTenants).not.toHaveBeenCalled();
      expect(mockFetchSystemStatus).not.toHaveBeenCalled();
    });

    it('validates and stores the admin key', async () => {
      render(<AdminModal />);

      fireEvent.change(screen.getByPlaceholderText('Admin API Key'), {
        target: { value: 'test-key' },
      });
      fireEvent.click(screen.getByText('Login'));

      await waitFor(() => {
        expect(mockListTenants).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText('Admin API key verified')).toBeInTheDocument();
      });

      expect(screen.getByText('Change Key')).toBeInTheDocument();
    });

    it('allows clearing the configured admin key', async () => {
      render(<AdminModal />);

      fireEvent.change(screen.getByPlaceholderText('Admin API Key'), {
        target: { value: 'another-key' },
      });
      fireEvent.click(screen.getByText('Login'));

      await waitFor(() => {
        expect(screen.getByText('Admin API key verified')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Change Key'));

      expect(screen.getByText('Admin API Access')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Admin API Key')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    const configureAdminKey = async () => {
      fireEvent.change(screen.getByPlaceholderText('Admin API Key'), {
        target: { value: 'valid-key' },
      });
      fireEvent.click(screen.getByText('Login'));
      await waitFor(() => screen.getByText('Admin API key verified'));
    };

    it('shows test controls after configuring admin key', async () => {
      render(<AdminModal />);
      await configureAdminKey();

      expect(screen.getByText('Start Tests')).toBeInTheDocument();
      expect(screen.getByText('Unit Tests')).toBeInTheDocument();
    });

    it('switches between tabs correctly', async () => {
      render(<AdminModal />);
      await configureAdminKey();

      fireEvent.click(screen.getByText('Tenants'));
      await waitFor(() => {
        expect(screen.getByText(/Mode:/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Tests'));
      expect(screen.getByText('Start Tests')).toBeInTheDocument();
    });
  });

  describe('Shared Modal Architecture', () => {
    it('uses shared modal components and close action', () => {
      render(<AdminModal />);

      expect(screen.getByText('Admin Tools')).toBeInTheDocument();
      const closeButton = screen.getByLabelText('Close Modal');
      expect(closeButton).toBeInTheDocument();

      fireEvent.click(closeButton);
      expect(mockCloseAdminModal).toHaveBeenCalled();
    });

    it('applies consistent modal styling', () => {
      render(<AdminModal />);
      const modal = screen.getByText('Admin Tools').closest('[style*="width"]');
      expect(modal).toHaveStyle({ width: '600px' });
    });

    it('applies shared scrollbar styling', () => {
      render(<AdminModal />);
      const styleElement = document.querySelector('style');
      expect(styleElement?.textContent).toContain('admin-modal-content');
      expect(styleElement?.textContent).toContain('scrollbar-width');
    });
  });
});
