import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '../../helpers/testUtils';
import AdminModal from '../../../src/components/AdminModal';

// Mock the UI context
const mockCloseAdminModal = vi.fn();
const mockAuthenticateAdmin = vi.fn();
const mockLogoutAdmin = vi.fn();

const mockUseUIContext = vi.fn(() => ({
  adminModalOpen: true,
  closeAdminModal: mockCloseAdminModal,
  adminAuthenticated: false,
  authenticateAdmin: mockAuthenticateAdmin,
  logoutAdmin: mockLogoutAdmin,
}));

vi.mock('../../../src/hooks/useUI', () => ({
  useUIContext: mockUseUIContext,
}));

// Mock API Service
vi.mock('../../../src/services/ApiService', () => ({
  listTenants: vi.fn(),
  startTestRun: vi.fn(),
  getTestRun: vi.fn(),
  runLinting: vi.fn(),
  createTenant: vi.fn(),
  deleteTenant: vi.fn(),
  resetTenant: vi.fn(),
  clearTenantData: vi.fn(),
  clearTenantSchema: vi.fn(),
  pushSchema: vi.fn(),
  seedTenantData: vi.fn(),
  fetchSystemStatus: vi.fn(),
  getTenantSchema: vi.fn(),
}));

describe('AdminModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default unauthenticated state
    mockUseUIContext.mockReturnValue({
      adminModalOpen: true,
      closeAdminModal: mockCloseAdminModal,
      adminAuthenticated: false,
      authenticateAdmin: mockAuthenticateAdmin,
      logoutAdmin: mockLogoutAdmin,
    });
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
        adminAuthenticated: false,
        authenticateAdmin: mockAuthenticateAdmin,
        logoutAdmin: mockLogoutAdmin,
      });

      const { container } = render(<AdminModal />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Authentication Flow', () => {
    it('shows login form when not authenticated', () => {
      render(<AdminModal />);
      
      expect(screen.getByText('Admin Authentication')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Admin API Key')).toBeInTheDocument();
      expect(screen.getByText('Login')).toBeInTheDocument();
    });

    it('shows tabs when authenticated', () => {
      mockUseUIContext.mockReturnValue({
        adminModalOpen: true,
        closeAdminModal: mockCloseAdminModal,
        adminAuthenticated: true,
        authenticateAdmin: mockAuthenticateAdmin,
        logoutAdmin: mockLogoutAdmin,
      });

      render(<AdminModal />);
      
      expect(screen.getByText('Tests')).toBeInTheDocument();
      expect(screen.getByText('Tenants')).toBeInTheDocument();
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    it('calls logout when logout button is clicked', () => {
      mockUseUIContext.mockReturnValue({
        adminModalOpen: true,
        closeAdminModal: mockCloseAdminModal,
        adminAuthenticated: true,
        authenticateAdmin: mockAuthenticateAdmin,
        logoutAdmin: mockLogoutAdmin,
      });

      render(<AdminModal />);
      
      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);
      
      expect(mockLogoutAdmin).toHaveBeenCalled();
    });
  });

  describe('Tab Navigation', () => {
    beforeEach(() => {
      mockUseUIContext.mockReturnValue({
        adminModalOpen: true,
        closeAdminModal: mockCloseAdminModal,
        adminAuthenticated: true,
        authenticateAdmin: mockAuthenticateAdmin,
        logoutAdmin: mockLogoutAdmin,
      });
    });

    it('switches between tabs correctly', () => {
      render(<AdminModal />);
      
      // Should start on Tests tab
      expect(screen.getByText('Start Tests')).toBeInTheDocument();
      
      // Switch to Tenants tab
      fireEvent.click(screen.getByText('Tenants'));
      expect(screen.getByText('Mode:')).toBeInTheDocument();
    });

    it('shows Tests tab content when Tests tab is active', () => {
      render(<AdminModal />);
      
      fireEvent.click(screen.getByText('Tests'));
      expect(screen.getByText('Start Tests')).toBeInTheDocument();
      expect(screen.getByText('Unit Tests')).toBeInTheDocument();
      expect(screen.getByText('Integration Tests')).toBeInTheDocument();
    });
  });

  describe('Shared Modal Architecture', () => {
    it('uses shared modal components', () => {
      render(<AdminModal />);
      
      // Should use ModalOverlay and ModalContainer
      expect(screen.getByText('Admin Tools')).toBeInTheDocument();
      
      // Should have close button from ModalHeader
      const closeButton = screen.getByLabelText('Close Modal');
      expect(closeButton).toBeInTheDocument();
      
      fireEvent.click(closeButton);
      expect(mockCloseAdminModal).toHaveBeenCalled();
    });

    it('applies consistent styling with other modals', () => {
      render(<AdminModal />);
      
      // Should have consistent modal structure
      const modal = screen.getByText('Admin Tools').closest('[style*="width"]');
      expect(modal).toHaveStyle({ width: '600px' });
    });
  });

  describe('Theme Integration', () => {
    it('uses theme-based button styling', () => {
      mockUseUIContext.mockReturnValue({
        adminModalOpen: true,
        closeAdminModal: mockCloseAdminModal,
        adminAuthenticated: true,
        authenticateAdmin: mockAuthenticateAdmin,
        logoutAdmin: mockLogoutAdmin,
      });

      render(<AdminModal />);
      
      // Test buttons should use theme-based styling
      const unitTestButton = screen.getByText('Unit Tests');
      expect(unitTestButton).toHaveStyle({ 
        fontSize: '12px',
        fontWeight: '500'
      });
    });

    it('applies consistent scrollbar styling', () => {
      mockUseUIContext.mockReturnValue({
        adminModalOpen: true,
        closeAdminModal: mockCloseAdminModal,
        adminAuthenticated: true,
        authenticateAdmin: mockAuthenticateAdmin,
        logoutAdmin: mockLogoutAdmin,
      });

      render(<AdminModal />);
      
      // Should have scrollbar CSS applied
      const styleElement = document.querySelector('style');
      expect(styleElement?.textContent).toContain('admin-modal-content');
      expect(styleElement?.textContent).toContain('scrollbar-width');
    });
  });
});
