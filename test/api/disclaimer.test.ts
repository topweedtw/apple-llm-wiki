import { describe, expect, it } from 'vitest';
import { applyDisclaimer, selectDisclaimer } from '../../apps/api/src/generators/disclaimer.js';

const disclaimer = `# Disclaimer

## zh-TW

非官方中文聲明。

## en

Unofficial English disclaimer.
`;

describe('generate disclaimer injection', () => {
  it('selects the requested language section', () => {
    expect(selectDisclaimer(disclaimer, 'zh-TW')).toBe('非官方中文聲明。');
    expect(selectDisclaimer(disclaimer, 'en')).toBe('Unofficial English disclaimer.');
  });

  it('rejects missing language sections', () => {
    expect(() => selectDisclaimer('# Disclaimer', 'en')).toThrow(/Disclaimer section not found/);
  });

  it('adds disclaimer metadata and prepends markdown content', () => {
    expect(
      applyDisclaimer(
        {
          content: '# Video Script',
          kind: 'video_script',
          source_refs: ['wiki/products/example.md'],
          warnings: [],
        },
        {
          disclaimer: 'Unofficial English disclaimer.',
          generatedAt: '2026-06-22T00:00:00.000Z',
        },
      ),
    ).toEqual({
      content: '> Unofficial English disclaimer.\n\n# Video Script',
      disclaimer: 'Unofficial English disclaimer.',
      generated_at: '2026-06-22T00:00:00.000Z',
      kind: 'video_script',
      source_refs: ['wiki/products/example.md'],
      warnings: [],
    });
  });

  it('injects disclaimer metadata inside quiz JSON content', () => {
    const result = applyDisclaimer(
      {
        content: JSON.stringify({
          questions: [
            {
              answer: 'A',
              explanation: 'Because the source says so.',
              options: ['A', 'B'],
              question: 'Which option is correct?',
              source_ref: 'wiki/products/example.md',
            },
          ],
        }),
        kind: 'quiz',
        source_refs: ['wiki/products/example.md'],
        warnings: [],
      },
      {
        disclaimer: 'Unofficial English disclaimer.',
        generatedAt: '2026-06-22T00:00:00.000Z',
      },
    );

    expect(result.disclaimer).toBe('Unofficial English disclaimer.');
    expect(result.generated_at).toBe('2026-06-22T00:00:00.000Z');
    expect(JSON.parse(result.content)).toMatchObject({
      disclaimer: 'Unofficial English disclaimer.',
      generated_at: '2026-06-22T00:00:00.000Z',
      questions: expect.any(Array),
    });
  });
});
