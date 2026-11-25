/**
 * main.jsx — Frontend Entry Point & Provider Composition
 * Loads global CSS layers in cascade order (`tokens` -> `global` -> `shell`)
 * and mounts `<App />` inside React Router, `ThemeProvider`, and `LangProvider`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// Modular stylesheets ordered from design tokens to base primitives and shell layout
import './styles/tokens.css';
import './styles/global.css';
import './styles/shell.css';

import { ThemeProvider } from './context/ThemeContext.jsx';
import { LangProvider } from './context/LangContext.jsx';
import App from './App.jsx';

// Mount root application with routing, theme, and bilingual contexts available everywhere
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <LangProvider>
          <App />
        </LangProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);
