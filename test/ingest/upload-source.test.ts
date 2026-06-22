import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ingestUploadedFile, slugFromFilename } from '../../ingest/src/index.js';

let repoRoot: string;

beforeEach(async () => {
  repoRoot = await mkdtemp(join(tmpdir(), 'apple-llm-wiki-upload-'));
});

afterEach(async () => {
  await rm(repoRoot, { recursive: true, force: true });
});

describe('uploaded raw source ingestion', () => {
  it('creates a stable slug from a filename', () => {
    expect(slugFromFilename('Apple Training Deck v1.2.pdf')).toBe('apple-training-deck-v1-2');
  });

  it('stores parsed PDF text and metadata', async () => {
    const result = await ingestUploadedFile(
      repoRoot,
      {
        buffer: Buffer.from('pdf bytes'),
        filename: 'training.pdf',
      },
      {
        parsers: {
          pdf: async () => 'PDF text content.',
        },
        uploadedAt: '2026-06-22T00:00:00.000Z',
      },
    );

    const markdown = await readFile(result.contentPath, 'utf8');
    const meta = JSON.parse(await readFile(result.metaPath, 'utf8')) as Record<string, unknown>;

    expect(result.contentPath).toMatch(/raw\/upload\/training\.md$/);
    expect(markdown).toContain('# training.pdf');
    expect(markdown).toContain('PDF text content.');
    expect(meta).toEqual({
      filename: 'training.pdf',
      uploaded_at: '2026-06-22T00:00:00.000Z',
      content_type: 'application/pdf',
      size_bytes: 9,
      parser: 'pdf',
    });
  });

  it('stores parsed DOCX text and metadata', async () => {
    const result = await ingestUploadedFile(
      repoRoot,
      {
        buffer: Buffer.from('docx bytes'),
        filename: 'guide.docx',
      },
      {
        parsers: {
          docx: async () => 'DOCX text content.',
        },
        uploadedAt: '2026-06-22T00:00:00.000Z',
      },
    );

    const markdown = await readFile(result.contentPath, 'utf8');
    const meta = JSON.parse(await readFile(result.metaPath, 'utf8')) as Record<string, unknown>;

    expect(markdown).toContain('DOCX text content.');
    expect(meta).toMatchObject({
      filename: 'guide.docx',
      content_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      parser: 'docx',
    });
  });

  it('rejects empty files', async () => {
    await expect(
      ingestUploadedFile(repoRoot, {
        buffer: Buffer.alloc(0),
        filename: 'empty.pdf',
      }),
    ).rejects.toThrow(/empty/);
  });

  it('rejects unsupported file types', async () => {
    await expect(
      ingestUploadedFile(repoRoot, {
        buffer: Buffer.from('text'),
        filename: 'notes.txt',
      }),
    ).rejects.toThrow(/Unsupported/);
  });

  it('rejects files above the size limit', async () => {
    await expect(
      ingestUploadedFile(
        repoRoot,
        {
          buffer: Buffer.from('too large'),
          filename: 'large.pdf',
        },
        {
          maxBytes: 4,
        },
      ),
    ).rejects.toThrow(/exceeds/);
  });

  it('rejects files with no extractable text', async () => {
    await expect(
      ingestUploadedFile(
        repoRoot,
        {
          buffer: Buffer.from('pdf bytes'),
          filename: 'blank.pdf',
        },
        {
          parsers: {
            pdf: async () => '   \n\n',
          },
        },
      ),
    ).rejects.toThrow(/extractable text/);
  });

  it('does not overwrite existing upload files', async () => {
    const input = {
      buffer: Buffer.from('pdf bytes'),
      filename: 'training.pdf',
    };
    const options = {
      parsers: {
        pdf: async () => 'PDF text content.',
      },
    };

    await ingestUploadedFile(repoRoot, input, options);

    await expect(ingestUploadedFile(repoRoot, input, options)).rejects.toThrow(/already exists/);
  });
});
