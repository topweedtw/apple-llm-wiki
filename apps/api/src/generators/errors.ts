export class WikiPageNotFoundError extends Error {
  readonly wikiPath: string;

  constructor(wikiPath: string) {
    super(`Wiki page not found: ${wikiPath}`);
    this.name = 'WikiPageNotFoundError';
    this.wikiPath = wikiPath;
  }
}

export class GeneratedOutputError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'GeneratedOutputError';
  }
}
