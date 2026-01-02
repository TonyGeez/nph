#!/usr/bin/env node

import { Command } from 'commander';
import { displayScripts, addScript, removeScripts, editScript } from '../lib/commands/script.js';
import { verifCommand } from '../lib/commands/verif.js';
import { upgradeCommand } from '../lib/commands/upgrade.js';
import { depCommand } from '../lib/commands/dep.js';

import { BAR_CLI, HL_CLI, HR_CLI, BAR, HEAD, HL, HR, POINTER, BOLD, LIGHTCYAN, DIM, RESET, WARNING, ERROR, SUCCESS, CYAN, BLUE, WHITE } from '../lib/colors.js';

const program = new Command();

// Override console.error for colored error messages
const originalError = console.error;
console.error = (...args) => {
  originalError(`${ERROR}`, ...args, `${RESET}`);
};

program
  .name('nph')
  .description(`${BOLD}${LIGHTCYAN}Node Package Helper CLI${RESET}`)
  .version('1.0.0');

// Add global help option with colors
program.addHelpText('beforeAll', `
${BAR_CLI}
${HL_CLI} Node Package Helper ${HR_CLI}
${BAR_CLI}
`);

// Add custom help text with colored examples
program.addHelpText('after', `
${POINTER} ${BOLD}${LIGHTCYAN}Examples:${RESET}

  ${POINTER} ${DIM}Display scripts:${RESET}
    nph script

  ${POINTER} ${DIM}Add a new script:${RESET}
    nph script add

  ${POINTER} ${DIM}Verify dependencies:${RESET}
    nph verig

  ${POINTER} ${DIM}Upgrade packages:${RESET}
    nph upgrade

  ${POINTER} ${DIM}Check deprecations:${RESET}
    nph dep

${POINTER} ${DIM}For more help on a specific command:${RESET}
    nph ${CYAN}<command>${RESET} ${DIM}--help${RESET}
`);

const scriptCmd = program
  .command('script')
  .description(`${POINTER} Display and manage package.json scripts`);

scriptCmd
  .command('add')
  .description(`${POINTER} Add a new script interactively`)
  .action(addScript);

scriptCmd
  .command('rm')
  .description(`${POINTER} Remove scripts interactively`)
  .action(removeScripts);

scriptCmd
  .command('edit')
  .description(`${POINTER} Edit a script interactively`)
  .action(editScript);

scriptCmd
  .action(displayScripts);

program
  .command('verif')
  .description(`${POINTER} Verify dependencies against npm registry`)
  .option('--fix-all', 'Fix all issues automatically')
  .option('--fix-version', 'Fix version issues only')
  .option('--fix-name', 'Fix package name issues only')
  .action(verifCommand);

program
  .command('upgrade')
  .description(`${POINTER} Upgrade packages to latest compatible versions without conflicts`)
  .option('--dry-run', 'Show what would be upgraded without making changes')
  .option('--force', 'Override peer dependency conflicts')
  .option('--ignore-deprecated', 'Proceed despite deprecated packages')
  .action(upgradeCommand);

program
  .command('dep')
  .description(`${POINTER} Check for deprecated code patterns and APIs`)
  .option('--fix', 'Automatically fix fixable deprecation issues')
  .option('--json', 'Output results in JSON format')
  .action(depCommand);

// Handle unknown commands with colored error
program.on('command:*', (operands) => {
  console.error(`${ERROR} Unknown command: ${operands.join(' ')}${RESET}`);
  console.error(`${POINTER} Run ${CYAN}nph --help${RESET} to see available commands${RESET}`);
  process.exit(1);
});

// Show welcome message if no command provided
if (process.argv.length === 2) {
  console.log(`
${BAR_CLI}
${HL_CLI} Node Package Helper ${HR_CLI}
${BAR_CLI}

${POINTER} ${LIGHTCYAN}nph script${RESET}     ${BLUE} Manage package.json scripts${RESET}
${POINTER} ${LIGHTCYAN}nph verif${RESET}      ${BLUE} Verify dependencies${RESET}
${POINTER} ${LIGHTCYAN}nph upgrade${RESET}    ${BLUE} Upgrade dependencies${RESET}
${POINTER} ${LIGHTCYAN}nph dep${RESET}        ${BLUE} Check for deprecations${RESET}

${POINTER} ${WHITE}Run ${LIGHTCYAN}nph {command} --help${RESET} ${WHITE}for more information${RESET}
  `);
  process.exit(0);
}

// Parse and handle errors
try {
  program.parse();
} catch (err) {
  console.error(`${ERROR} Error: ${err.message}${RESET}`);
  process.exit(1);
}