import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { UIProvider } from './context/UIContext';
import { ContextMenuProvider } from './context/ContextMenuContext';
import ContextMenu from './components/ContextMenu';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UIProvider>
      <ContextMenuProvider>
        <App />
        <ContextMenu />
      </ContextMenuProvider>
    </UIProvider>
  </StrictMode>,
)
