const express = require('express');
const router = express.Router();
const { TenantManager } = require('../services/tenantManager');
const { authenticateAdmin } = require('../middleware/auth');
const { ensureTenant } = require('../middleware/tenantContext');

const tenantManager = new TenantManager();

// --- Public Tenant Operations ---

// Get current tenant information
router.get('/tenant/info', async (req, res) => {
  try {
    const { tenantId } = req.tenantContext;
    const tenantInfo = await tenantManager.getTenantInfo(tenantId);
    
    res.json({
      ...tenantInfo,
      context: req.tenantContext
    });
  } catch (error) {
    console.error('[TENANT_INFO] Error:', error);
    res.status(500).json({ error: 'Failed to get tenant information' });
  }
});

// --- Admin-Protected Tenant Operations ---
router.use(authenticateAdmin);

// Create a new tenant
router.post('/tenant', ensureTenant, async (req, res) => {
  try {
    const { tenantId } = req.body;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Missing required field: tenantId' });
    }

    // Check if tenant already exists
    const exists = await tenantManager.tenantExists(tenantId);
    if (exists) {
      return res.status(409).json({ error: 'Tenant already exists' });
    }

    // Create the tenant
    const namespace = await tenantManager.createTenant(tenantId);
    const tenantInfo = await tenantManager.getTenantInfo(tenantId);

    res.status(201).json({
      message: 'Tenant created successfully',
      tenant: tenantInfo,
      namespace
    });
  } catch (error) {
    console.error('[CREATE_TENANT] Error:', error);
    res.status(500).json({ error: 'Failed to create tenant' });
  }
});

// List all tenants
router.get('/tenant', async (req, res) => {
  try {
    const tenants = await tenantManager.listTenants();
    res.json(tenants);
  } catch (error) {
    console.error('[LIST_TENANTS] Error:', error);
    res.status(500).json({ error: 'Failed to list tenants' });
  }
});

// Get specific tenant information
router.get('/tenant/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const tenantInfo = await tenantManager.getTenantInfo(tenantId);
    
    res.json(tenantInfo);
  } catch (error) {
    console.error('[GET_TENANT] Error:', error);
    res.status(500).json({ error: 'Failed to get tenant information' });
  }
});

// Delete a tenant
router.delete('/tenant/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    // Prevent deletion of system tenants
    if (tenantId === 'default' || tenantId === 'test-tenant') {
      return res.status(400).json({ error: 'Cannot delete system tenants' });
    }

    // Check if tenant exists
    const exists = await tenantManager.tenantExists(tenantId);
    if (!exists) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Delete the tenant
    await tenantManager.deleteTenant(tenantId);

    res.json({
      message: 'Tenant deleted successfully',
      tenantId
    });
  } catch (error) {
    console.error('[DELETE_TENANT] Error:', error);
    res.status(500).json({ error: 'Failed to delete tenant' });
  }
});

// Initialize test tenant (for development)
router.post('/tenant/test/init', async (req, res) => {
  try {
    const testTenantId = 'test-tenant';
    
    // Check if test tenant already exists
    const exists = await tenantManager.tenantExists(testTenantId);
    if (exists) {
      return res.json({
        message: 'Test tenant already exists',
        tenant: await tenantManager.getTenantInfo(testTenantId)
      });
    }

    // Create test tenant
    const namespace = await tenantManager.createTenant(testTenantId);
    const tenantInfo = await tenantManager.getTenantInfo(testTenantId);

    res.status(201).json({
      message: 'Test tenant initialized successfully',
      tenant: tenantInfo,
      namespace
    });
  } catch (error) {
    console.error('[INIT_TEST_TENANT] Error:', error);
    res.status(500).json({ error: 'Failed to initialize test tenant' });
  }
});

// Reset test tenant (clear all data)
router.post('/tenant/test/reset', async (req, res) => {
  try {
    const testTenantId = 'test-tenant';
    
    // Delete and recreate test tenant
    await tenantManager.deleteTenant(testTenantId);
    const namespace = await tenantManager.createTenant(testTenantId);
    const tenantInfo = await tenantManager.getTenantInfo(testTenantId);

    res.json({
      message: 'Test tenant reset successfully',
      tenant: tenantInfo,
      namespace
    });
  } catch (error) {
    console.error('[RESET_TEST_TENANT] Error:', error);
    res.status(500).json({ error: 'Failed to reset test tenant' });
  }
});

module.exports = router;
