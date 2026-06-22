import { formatWikiLintIssues, lintWiki } from './wiki-lint.js';

async function main() {
  const command = process.argv[2];

  if (command !== 'lint-wiki') {
    console.error('Usage: pnpm --filter @apple-llm-wiki/content lint-wiki');
    process.exitCode = 1;
    return;
  }

  const repoRoot = process.env.REPO_ROOT ?? process.env.INIT_CWD ?? process.cwd();
  const result = await lintWiki(repoRoot);

  if (result.issues.length > 0) {
    console.error(formatWikiLintIssues(result.issues));
    process.exitCode = 1;
  }
}

await main();
