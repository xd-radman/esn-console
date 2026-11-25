import { CircleCheck, Moon, Sun } from 'lucide-react';
import { useTheme } from './context/ThemeContext.jsx';

export default function App() {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <main className="preview-stage">
      <article className="bento-card preview-card">
        <header>
          <span className="mono-tag">Phase 1 · Design Tokens</span>

          <button
            type="button"
            className="btn"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {isDark ? (
              <Sun size={16} strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <Moon size={16} strokeWidth={1.5} aria-hidden="true" />
            )}
            <span>{isDark ? 'Light' : 'Dark'}</span>
          </button>
        </header>

        <div className="preview-body">
          <h1 className="font-editorial">ESN Console</h1>

          <p className="preview-subtitle">
            Bento Modular × Swiss International foundation preview. Active surface theme:{' '}
            <strong>
              {theme === 'light' ? 'Swiss Studio (Warm Paper)' : 'Warm Carbon Ink'}
            </strong>
            .
          </p>
        </div>

        <footer className="hairline-top">
          <span>Inter · Newsreader · JetBrains Mono</span>
          <span className="font-mono-label status-badge active">
            <CircleCheck size={14} strokeWidth={1.5} aria-hidden="true" />
            <span>Theme Ready</span>
          </span>
        </footer>
      </article>
    </main>
  );
}
