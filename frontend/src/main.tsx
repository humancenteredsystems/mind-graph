import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { UIProvider } from './context/UIContext';
import { ContextMenuProvider } from './context/ContextMenuContext';
import ContextMenu from './components/ContextMenu';
import NodeFormModal from './components/NodeFormModal';
import NodeDrawer from './components/NodeDrawer';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UIProvider>
      <ContextMenuProvider>
        <App />
        <ContextMenu />
        <NodeFormModal
          open={false}
          onSubmit={() => {}}
          onCancel={() => {}}
        />
        <NodeDrawer
          open={false}
          onSave={() => {}}
          onClose={() => {}}
        />
      </ContextMenuProvider>
    </UIProvider>
  </StrictMode>,
)
