/**
 * Default Lens - Basic graph view with standard styling
 */

import { LensDefinition } from '@mims/lens-types';
import { theme } from '../config';

const defaultLens: LensDefinition = {
  id: 'default',
  label: 'Default',
  icon: '⚪',
  layout: { 
    name: 'fcose',
    options: {
      animate: true,
      fit: true,
      padding: 30,
    }
  },
  style: (el) => ({
    'background-color': theme.colors.node.default,
    'border-color': theme.colors.node.border.default,
  }),
};

export default defaultLens;
