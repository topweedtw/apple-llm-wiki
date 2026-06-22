import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

export type UploadParser = (buffer: Buffer) => Promise<string>;

export type UploadParserMap = {
  docx: UploadParser;
  pdf: UploadParser;
};

export type UploadRawSourceOptions = {
  parsers?: Partial<UploadParserMap>;
  uploadedAt?: string;
  maxBytes?: number;
};

export type UploadRawSourceInput = {
  buffer: Buffer;
  filename: string;
};

export type UploadRawSourceRecord = {
  content: string;
  contentType: string;
  filename: string;
  parser: keyof UploadParserMap;
  sizeBytes: number;
  slug: string;
  uploadedAt: string;
};

export type StoredUploadRawSource = {
  contentPath: string;
  metaPath: string;
  record: UploadRawSourceRecord;
};

const defaultMaxBytes = 50 * 1024 * 1024;

const contentTypes: Record<keyof UploadParserMap, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
};

export function slugFromFilename(filename: string) {
  const name = basename(filename, extname(filename));
  const slug = name
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return slug || 'upload';
}

function parserKeyFromFilename(filename: string): keyof UploadParserMap {
  const extension = extname(filename).toLowerCase();

  if (extension === '.pdf') {
    return 'pdf';
  }

  if (extension === '.docx') {
    return 'docx';
  }

  throw new Error(`Unsupported upload file type: ${extension || 'none'}`);
}

async function parsePdf(buffer: Buffer) {
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function parseDocx(buffer: Buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

function normalizeExtractedText(text: string) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function assertFileDoesNotExist(path: string) {
  try {
    await readFile(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }

    throw error;
  }

  throw new Error(`Raw upload already exists: ${path}`);
}

export async function storeUploadedRawSource(
  repoRoot: string,
  record: UploadRawSourceRecord,
): Promise<StoredUploadRawSource> {
  const basePath = join(repoRoot, 'raw', 'upload', record.slug);
  const contentPath = `${basePath}.md`;
  const metaPath = `${basePath}.meta.json`;

  await assertFileDoesNotExist(contentPath);
  await assertFileDoesNotExist(metaPath);
  await mkdir(dirname(contentPath), { recursive: true });
  await writeFile(
    contentPath,
    `# ${record.filename}\n\nUploaded: ${record.uploadedAt}\nParser: ${record.parser}\n\n${record.content}\n`,
    'utf8',
  );
  await writeFile(
    metaPath,
    `${JSON.stringify(
      {
        filename: record.filename,
        uploaded_at: record.uploadedAt,
        content_type: record.contentType,
        size_bytes: record.sizeBytes,
        parser: record.parser,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  return { contentPath, metaPath, record };
}

export async function ingestUploadedFile(
  repoRoot: string,
  input: UploadRawSourceInput,
  options: UploadRawSourceOptions = {},
) {
  if (input.buffer.byteLength === 0) {
    throw new Error('Upload file is empty');
  }

  const maxBytes = options.maxBytes ?? defaultMaxBytes;

  if (input.buffer.byteLength > maxBytes) {
    throw new Error(`Upload file exceeds ${maxBytes} bytes`);
  }

  const parserKey = parserKeyFromFilename(input.filename);
  const parser = options.parsers?.[parserKey] ?? (parserKey === 'pdf' ? parsePdf : parseDocx);
  const content = normalizeExtractedText(await parser(input.buffer));

  if (!content) {
    throw new Error('Upload file did not contain extractable text');
  }

  return await storeUploadedRawSource(repoRoot, {
    content,
    contentType: contentTypes[parserKey],
    filename: basename(input.filename),
    parser: parserKey,
    sizeBytes: input.buffer.byteLength,
    slug: slugFromFilename(input.filename),
    uploadedAt: options.uploadedAt ?? new Date().toISOString(),
  });
}

export async function ingestUploadedFileFromPath(
  repoRoot: string,
  filePath: string,
  options: UploadRawSourceOptions = {},
) {
  return await ingestUploadedFile(
    repoRoot,
    {
      buffer: await readFile(filePath),
      filename: basename(filePath),
    },
    options,
  );
}
