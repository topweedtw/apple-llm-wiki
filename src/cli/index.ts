import { Command } from 'commander';

const program = new Command();

program
  .name('wiki')
  .description('Apple LLM Wiki ingestion, review, and retrieval CLI')
  .version('0.0.0');

// Placeholder command proving the CLI wiring. Real command groups
// (source, candidate, review, fact, index) are added in later phases.
program
  .command('ping')
  .description('Verify the CLI is wired up')
  .action(() => {
    console.log('pong');
  });

program.parseAsync(process.argv).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
