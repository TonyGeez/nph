import readline from 'readline';
import { CYAN, DIM, RESET } from './colors.js';

export function createPrompt() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.on('SIGINT', () => {
    console.log('\nOperation cancelled');
    process.exit(0);
  });
  
  return {
    question: (query, options = {}) => {
      return new Promise((resolve) => {
        const { defaultValue = '', hint = '' } = options;
        const hintText = hint ? ` ${DIM}(${hint})${RESET}` : '';
        const fullQuery = `${CYAN}${query}:${RESET}${hintText} `;
        
        rl.question(fullQuery, (answer) => {
          resolve(answer.trim() || defaultValue);
        });
        
        if (defaultValue) {
          rl.write(defaultValue);
        }
      });
    },
    confirm: (query) => {
      return new Promise((resolve) => {
        const fullQuery = `${CYAN}${query}${RESET} ${DIM}(y/n)${RESET} `;
        rl.question(fullQuery, (answer) => {
          resolve(answer.toLowerCase() === 'y');
        });
      });
    },
    close: () => rl.close()
  };
}
