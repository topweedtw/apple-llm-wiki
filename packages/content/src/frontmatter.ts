import matter from 'gray-matter';
import { z } from 'zod';

export const pageTypeSchema = z.enum([
  'product',
  'os',
  'concept',
  'comparison',
  'sales-play',
  'digest',
]);
export const languageSchema = z.enum(['zh-TW', 'en']);
export const pageStatusSchema = z.enum(['current', 'beta', 'historical', 'deprecated', 'draft']);

const siblingPathSchema = z.string().min(1);
const dateStringSchema = z.preprocess(
  (value) => {
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }

    return value;
  },
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
);

export const wikiFrontmatterSchema = z
  .object({
    type: pageTypeSchema,
    title: z.string().min(1),
    slug: z.string().min(1),
    lang: languageSchema,
    siblings: z
      .object({
        'zh-TW': siblingPathSchema.optional(),
        en: siblingPathSchema.optional(),
      })
      .strict()
      .default({}),
    status: pageStatusSchema,
    os_version: z.string().min(1).nullable().default(null),
    last_updated: dateStringSchema,
    source_count: z.number().int().nonnegative(),
    source_refs: z.array(z.string().min(1)).default([]),
    tags: z.array(z.string().min(1)).default([]),
    ingest_managed_sections: z.array(z.string().min(1)),
    human_owned_sections: z.array(z.string().min(1)),
  })
  .superRefine((frontmatter, ctx) => {
    if (frontmatter.status === 'beta' && !frontmatter.os_version) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'os_version is required when status is beta',
        path: ['os_version'],
      });
    }

    if (frontmatter.source_count !== frontmatter.source_refs.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'source_count must match source_refs length',
        path: ['source_count'],
      });
    }
  });

export type WikiFrontmatter = z.infer<typeof wikiFrontmatterSchema>;

export type ParsedWikiPage = {
  frontmatter: WikiFrontmatter;
  content: string;
};

export function parseWikiPage(markdown: string): ParsedWikiPage {
  const parsed = matter(markdown);

  return {
    frontmatter: wikiFrontmatterSchema.parse(parsed.data),
    content: parsed.content,
  };
}
