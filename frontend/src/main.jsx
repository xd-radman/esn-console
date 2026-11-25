/**
 * main.jsx — Frontend Entry Point & Provider Composition
 * Loads modular CSS layers in cascade order (`tokens` -> `global` -> `header` ->
 * `landing` -> `dashboard` -> `shell`) and mounts `<App />` inside React Router,
 * `ThemeProvider`, `LangProvider`, and `DataProvider`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// Modular stylesheets ordered from design tokens to base primitives and feature areas
import './styles/tokens.css';
import './styles/global.css';
import './styles/header.css';
import './styles/landing.css';
import './styles/dashboard.css';
import './styles/shell.css';

import { ThemeProvider } from './context/ThemeContext.jsx';
import { LangProvider } from './context/LangContext.jsx';
import { DataProvider } from './context/DataContext.jsx';
import App from './App.jsx';

// Mount root application with routing, theme, language, and CSV/project contexts
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <LangProvider>
          <DataProvider>
            <App />
          </DataProvider>
        </LangProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);
