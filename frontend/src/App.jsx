import { Moon, Sun } from 'lucide-react';
import { useTheme } from './context/ThemeContext.jsx';

export default function App() {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <main className="preview-stage">
      <section className="bento-card preview-card">
        <div className="preview-card__header">
          <span className="mono-tag">Phase 1 · Design Tokens</span>

          <button
            type="button"
            className="btn"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {isDark ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
            <span>{isDark ? 'Light' : 'Dark'}</span>
          </button>
        </div>

        <div className="preview-card__body">
          <h1 className="font-editorial preview-card__title">ESN Console</h1>

          <p className="preview-card__subtitle">
            Bento Modular x Swiss International foundation preview. Active surface theme:{' '}
            <strong className="preview-card__emphasis">
              {theme === 'light' ? 'Swiss Studio (Warm Paper)' : 'Warm Carbon Ink'}
            </strong>
            .
          </p>
        </div>

        <div className="hairline-top preview-card__footer">
          <span>Inter · Newsreader · JetBrains Mono</span>
          <span className="font-mono-label status-badge status-badge--active">
            Theme Ready
          </span>
        </div>
      </section>
    </main>
  );
}
