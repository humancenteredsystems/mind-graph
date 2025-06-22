/**
 * Unit tests for lens registry
 */

import { staticLensRegistry, generateHierarchyLens, getLensRegistry } from '../index';

describe('Lens Registry', () => {
  it('should have empty static lens registry', () => {
    expect(Object.keys(staticLensRegistry)).toHaveLength(0);
  });

  it('should generate hierarchy lens correctly', () => {
    const mockHierarchy = {
      id: 'h1',
      name: 'Test Hierarchy',
      version: 'v1'
    };

    const lens = generateHierarchyLens(mockHierarchy);
    
    expect(lens.id).toBe('hierarchy-h1');
    expect(lens.label).toBe('Test Hierarchy (v1)');
    expect(lens.icon).toBe('🌳');
    expect(lens.compute).toBeDefined();
    expect(lens.compute?.endpoint).toBe('/api/compute/hierarchyView');
    expect(lens.compute?.params).toEqual({ hierarchyId: 'h1' });
    expect(lens.layout?.name).toBe('dagre');
  });

  it('should generate complete lens registry with only hierarchy lenses', () => {
    const mockHierarchies = [
      { id: 'h1', name: 'Hierarchy 1' },
      { id: 'h2', name: 'Hierarchy 2' }
    ];

    const registry = getLensRegistry(mockHierarchies);
    
    expect(registry).toHaveProperty('hierarchy-h1');
    expect(registry).toHaveProperty('hierarchy-h2');
    expect(Object.keys(registry)).toHaveLength(2);
    
    expect(registry['hierarchy-h1'].label).toBe('Hierarchy 1');
    expect(registry['hierarchy-h2'].label).toBe('Hierarchy 2');
  });

  it('should handle hierarchy without version', () => {
    const mockHierarchy = {
      id: 'h1',
      name: 'Test Hierarchy'
    };

    const lens = generateHierarchyLens(mockHierarchy);
    
    expect(lens.label).toBe('Test Hierarchy');
  });

  it('should return empty registry when no hierarchies provided', () => {
    const registry = getLensRegistry([]);
    expect(Object.keys(registry)).toHaveLength(0);
  });
});
