/**
 * Shared error shape used by both the API and CLI boundaries so callers see a
 * consistent structure (ADR-017 boundary validation).
 */

export interface ValidationIssue {
  /** Stable machine-readable code, e.g. `missing_evidence`. */
  code: string;
  /** Field or path the issue applies to, when relevant. */
  field?: string;
  /** Human-readable explanation. */
  message: string;
}

export class AppError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

export class ValidationError extends AppError {
  readonly issues: ValidationIssue[];

  constructor(issues: ValidationIssue[], message = 'Validation failed') {
    super('validation_error', message);
    this.name = 'ValidationError';
    this.issues = issues;
  }
}
