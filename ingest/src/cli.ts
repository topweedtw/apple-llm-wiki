import { createAiSdkLLMProvider } from '@apple-llm-wiki/llm';
import { fetchUrlSource } from './raw-source.js';
import { rewriteRawSourceToWikiPage } from './rewrite-source.js';
import { ingestUploadedFileFromPath } from './upload-source.js';
import { recordWikiWrite } from './wiki-writer.js';

function getRepoRoot() {
  return process.env.REPO_ROOT ?? process.cwd();
}

async function main() {
  const command = process.argv[2];

  if (command === 'fetch-url') {
    const url = process.argv[3];

    if (!url) {
      console.error('Usage: pnpm --filter @apple-llm-wiki/ingest ingest:fetch-url <url>');
      process.exitCode = 1;
      return;
    }

    const result = await fetchUrlSource(getRepoRoot(), url);
    console.info(`Stored ${result.contentPath}`);
    return;
  }

  if (command === 'upload-file') {
    const filePath = process.argv[3];

    if (!filePath) {
      console.error('Usage: pnpm --filter @apple-llm-wiki/ingest ingest:upload-file <path>');
      process.exitCode = 1;
      return;
    }

    const result = await ingestUploadedFileFromPath(getRepoRoot(), filePath);
    console.info(`Stored ${result.contentPath}`);
    return;
  }

  if (command === 'rewrite-source') {
    const [sourcePath, targetPath, title] = process.argv.slice(3);

    if (!sourcePath || !targetPath || !title) {
      console.error(
        'Usage: pnpm --filter @apple-llm-wiki/ingest ingest:rewrite-source <raw-path> <wiki-path> <title>',
      );
      process.exitCode = 1;
      return;
    }

    const result = await rewriteRawSourceToWikiPage(getRepoRoot(), {
      lang: 'zh-TW',
      llm: createAiSdkLLMProvider(),
      pageType: 'product',
      sourcePath,
      targetPath,
      title,
    });
    console.info(`Wrote wiki/${result.path}`);
    return;
  }

  if (command !== 'record-sample') {
    console.error(
      'Usage: pnpm --filter @apple-llm-wiki/ingest ingest:record-sample | ingest:fetch-url <url> | ingest:upload-file <path> | ingest:rewrite-source <raw-path> <wiki-path> <title>',
    );
    process.exitCode = 1;
    return;
  }

  await recordWikiWrite(
    getRepoRoot(),
    {
      title: 'iPhone 17 Pro',
      path: 'products/iphone-17-pro.zh-TW.md',
    },
    {
      action: 'update',
      page: 'products/iphone-17-pro.zh-TW.md',
      sourceRefs: ['raw/samples/iphone-17-pro-source.md'],
      timestamp: new Date().toISOString(),
    },
  );
}

await main();
