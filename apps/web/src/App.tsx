import { type FormEvent, useEffect, useMemo, useState } from 'react';
import './styles.css';

type View = 'wiki' | 'generators' | 'upload';
type HealthState = 'checking' | 'ok' | 'down';
type GenerateKind = 'quiz' | 'video_script' | 'sales_script';
type GenerateLanguage = 'zh-TW' | 'en';

type GenerateApiResponse = {
  content: string;
  content_type: 'json' | 'markdown';
  disclaimer: string;
  generated_at: string;
  kind: GenerateKind;
  source_refs: string[];
  warnings: string[];
};

type GenerateStatus = 'idle' | 'submitting' | 'success' | 'error';

const views: Array<{ id: View; label: string }> = [
  { id: 'wiki', label: 'Wiki' },
  { id: 'generators', label: 'Generators' },
  { id: 'upload', label: 'Upload' },
];

const generatorKinds: Array<{ id: GenerateKind; label: string }> = [
  { id: 'quiz', label: 'Quiz' },
  { id: 'video_script', label: 'Video Script' },
  { id: 'sales_script', label: 'Sales Script' },
];

function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL ?? '';
}

function parseWikiPaths(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((path) => path.trim())
    .filter(Boolean);
}

function getOptions(kind: GenerateKind, count: number, duration: number) {
  if (kind === 'quiz') {
    return {
      question_count: count,
    };
  }

  return {
    duration_minutes: duration,
  };
}

function formatContent(response: GenerateApiResponse) {
  if (response.content_type !== 'json') {
    return response.content;
  }

  try {
    return JSON.stringify(JSON.parse(response.content), null, 2);
  } catch {
    return response.content;
  }
}

export function App() {
  const [activeView, setActiveView] = useState<View>('wiki');
  const [health, setHealth] = useState<HealthState>('checking');
  const [kind, setKind] = useState<GenerateKind>('quiz');
  const [lang, setLang] = useState<GenerateLanguage>('zh-TW');
  const [wikiPathsInput, setWikiPathsInput] = useState('products/iphone-17-pro.zh-TW.md');
  const [questionCount, setQuestionCount] = useState(5);
  const [durationMinutes, setDurationMinutes] = useState(3);
  const [generateStatus, setGenerateStatus] = useState<GenerateStatus>('idle');
  const [generateError, setGenerateError] = useState('');
  const [generateResponse, setGenerateResponse] = useState<GenerateApiResponse | null>(null);

  const wikiPaths = useMemo(() => parseWikiPaths(wikiPathsInput), [wikiPathsInput]);

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

  async function submitGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGenerateStatus('submitting');
    setGenerateError('');
    setGenerateResponse(null);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/generate`, {
        body: JSON.stringify({
          kind,
          lang,
          options: getOptions(kind, questionCount, durationMinutes),
          wiki_paths: wikiPaths,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });
      const body = (await response.json()) as GenerateApiResponse | { error?: string };

      if (!response.ok) {
        throw new Error(
          'error' in body && body.error ? body.error : `Request failed: ${response.status}`,
        );
      }

      setGenerateResponse(body as GenerateApiResponse);
      setGenerateStatus('success');
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : 'Generate request failed');
      setGenerateStatus('error');
    }
  }

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
            <div className="generator-layout">
              <form className="generator-form" onSubmit={submitGenerate}>
                <div className="field-group">
                  <label htmlFor="generator-kind">Generator</label>
                  <select
                    id="generator-kind"
                    onChange={(event) => setKind(event.target.value as GenerateKind)}
                    value={kind}
                  >
                    {generatorKinds.map((generatorKind) => (
                      <option key={generatorKind.id} value={generatorKind.id}>
                        {generatorKind.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field-row">
                  <div className="field-group">
                    <label htmlFor="generator-lang">Language</label>
                    <select
                      id="generator-lang"
                      onChange={(event) => setLang(event.target.value as GenerateLanguage)}
                      value={lang}
                    >
                      <option value="zh-TW">zh-TW</option>
                      <option value="en">en</option>
                    </select>
                  </div>

                  {kind === 'quiz' ? (
                    <div className="field-group">
                      <label htmlFor="question-count">Questions</label>
                      <input
                        id="question-count"
                        min="1"
                        max="20"
                        onChange={(event) => setQuestionCount(Number(event.target.value))}
                        type="number"
                        value={questionCount}
                      />
                    </div>
                  ) : (
                    <div className="field-group">
                      <label htmlFor="duration-minutes">Minutes</label>
                      <input
                        id="duration-minutes"
                        min="1"
                        onChange={(event) => setDurationMinutes(Number(event.target.value))}
                        type="number"
                        value={durationMinutes}
                      />
                    </div>
                  )}
                </div>

                <div className="field-group">
                  <label htmlFor="wiki-paths">Wiki paths</label>
                  <textarea
                    id="wiki-paths"
                    onChange={(event) => setWikiPathsInput(event.target.value)}
                    rows={4}
                    value={wikiPathsInput}
                  />
                </div>

                <button
                  className="primary-action"
                  disabled={generateStatus === 'submitting'}
                  type="submit"
                >
                  {generateStatus === 'submitting' ? 'Generating...' : 'Generate'}
                </button>
              </form>

              <section className="generator-result" aria-live="polite">
                {generateStatus === 'idle' && (
                  <p>Select a generator and submit a request to preview the API response.</p>
                )}

                {generateStatus === 'error' && (
                  <div className="alert error">
                    <strong>Generate failed</strong>
                    <span>{generateError}</span>
                  </div>
                )}

                {generateResponse && (
                  <div className="result-stack">
                    <div className="result-meta">
                      <span>{generateResponse.kind}</span>
                      <span>{generateResponse.content_type}</span>
                      <span>{new Date(generateResponse.generated_at).toLocaleString()}</span>
                    </div>

                    {generateResponse.warnings.length > 0 && (
                      <div className="alert warning">
                        <strong>Warnings</strong>
                        <ul>
                          {generateResponse.warnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <pre className="generated-content">{formatContent(generateResponse)}</pre>

                    <div className="result-refs">
                      <strong>Source refs</strong>
                      <ul>
                        {generateResponse.source_refs.map((sourceRef) => (
                          <li key={sourceRef}>{sourceRef}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="disclaimer-box">
                      <strong>Disclaimer</strong>
                      <p>
                        {generateResponse.disclaimer ||
                          'No disclaimer configured for this environment.'}
                      </p>
                    </div>
                  </div>
                )}
              </section>
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
