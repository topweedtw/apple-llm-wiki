import { recordWikiWrite } from './wiki-writer.js';

function getRepoRoot() {
  return process.env.REPO_ROOT ?? process.cwd();
}

async function main() {
  const command = process.argv[2];

  if (command !== 'record-sample') {
    console.error('Usage: pnpm --filter @apple-llm-wiki/ingest ingest:record-sample');
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
