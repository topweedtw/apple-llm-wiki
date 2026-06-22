import { useEffect, useState } from 'react';
import './styles.css';

type View = 'wiki' | 'generators' | 'upload';
type HealthState = 'checking' | 'ok' | 'down';

const views: Array<{ id: View; label: string }> = [
  { id: 'wiki', label: 'Wiki' },
  { id: 'generators', label: 'Generators' },
  { id: 'upload', label: 'Upload' },
];

function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL ?? '';
}

export function App() {
  const [activeView, setActiveView] = useState<View>('wiki');
  const [health, setHealth] = useState<HealthState>('checking');

  useEffect(() => {
    const controller = new AbortController();

    async function checkHealth() {
      try {
        const response = await fetch(`${getApiBaseUrl()}/health`, {
          signal: controller.signal,
        });

        setHealth(response.ok ? 'ok' : 'down');
      } catch {
        if (!controller.signal.aborted) {
          setHealth('down');
        }
      }
    }

    void checkHealth();

    return () => controller.abort();
  }, []);

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div>
          <p className="eyebrow">Apple LLM Wiki</p>
          <h1>Training Console</h1>
        </div>

        <nav className="nav-list">
          {views.map((view) => (
            <button
              className={activeView === view.id ? 'nav-item active' : 'nav-item'}
              key={view.id}
              onClick={() => setActiveView(view.id)}
              type="button"
            >
              {view.label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="workspace" aria-labelledby="workspace-title">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Week 1 Shell</p>
            <h2 id="workspace-title">{views.find((view) => view.id === activeView)?.label}</h2>
          </div>
          <span className={`health ${health}`}>API {health}</span>
        </header>

        <div className="panel">
          {activeView === 'wiki' && (
            <div>
              <h3>Wiki Browser</h3>
              <p>Sample markdown pages are ready under the repository wiki directory.</p>
            </div>
          )}

          {activeView === 'generators' && (
            <div>
              <h3>Generators</h3>
              <p>Quiz, video script, and sales script workflows will connect here.</p>
            </div>
          )}

          {activeView === 'upload' && (
            <div>
              <h3>Upload</h3>
              <p>Manual document ingest controls will land after the content pipeline.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
