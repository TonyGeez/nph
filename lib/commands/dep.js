import { execSync } from 'child_process';
import { readPackageJson } from '../package.js';
import { log, logError, logWarning } from '../logger.js';
import { BAR_DEPRE, HEAD, CYAN, GREEN, HL_DEPRE, HR_DEPRE, POINTER, BOLD, LIGHTCYAN, DIM, RESET, WARNING, SUCCESS, ERROR } from '../colors.js';
import fs from 'fs';
import path from 'path';

export async function depCommand(options) {
  try {
    const { data: packageJson } = readPackageJson();
    
    console.log();
    console.log(`${BAR_DEPRE}`);
    console.log(`${HL_DEPRE} Deprecated Packages  ${HR_DEPRE}`);
    console.log(`${BAR_DEPRE}`);
    console.log();
    
    console.log(`${POINTER} ${LIGHTCYAN}Scanning for deprecated patterns...\n${RESET}`);
    
    const results = {
      deprecatedPackages: [],
      deprecatedNodeApis: [],
      deprecatedCodePatterns: []
    };
    
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };
    
    for (const packageName of Object.keys(dependencies)) {
      try {
        const info = JSON.parse(execSync(`npm view ${packageName} --json`, {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore'],
          timeout: 5000
        }));
        
        if (info.deprecated) {
          results.deprecatedPackages.push({
            package: packageName,
            reason: info.deprecated
          });
        }
      } catch (e) {
        logError(`Failed to check ${packageName}: ${e.message}`);
      }
    }
    
    try {
      const eslintConfig = path.join(process.cwd(), '.eslintrc.json');
      if (!fs.existsSync(eslintConfig)) {
        fs.writeFileSync(eslintConfig, JSON.stringify({
          root: true,
          parserOptions: {
            ecmaVersion: 2022,
            sourceType: 'module'
          },
          plugins: ['deprecation'],
          rules: {
            'deprecation/deprecation': 'error'
          }
        }, null, 2));
      }
      
      const output = execSync('npx eslint . --format json', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 30000
      });
      
      const eslintResults = JSON.parse(output);
      
      for (const file of eslintResults) {
        for (const message of file.messages) {
          if (message.ruleId === 'deprecation/deprecation') {
            results.deprecatedCodePatterns.push({
              file: file.filePath,
              line: message.line,
              column: message.column,
              message: message.message
            });
          }
        }
      }
    } catch (e) {
      logWarning(`ESLint scan failed: ${e.message}`);
    }
    
    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }
    
    if (results.deprecatedPackages.length > 0) {
      console.log(`${BOLD}${CYAN}Deprecated packages:${RESET}\n`);
      for (const pkg of results.deprecatedPackages) {
        console.log(`${POINTER} ${BOLD}${LIGHTCYAN}${pkg.package}${RESET}`);
        console.log(`  ${DIM}Reason:${RESET} ${pkg.reason}`);
        console.log();
      }
    }
    
    if (results.deprecatedCodePatterns.length > 0) {
      console.log(`${BOLD}${CYAN}Deprecated code patterns:${RESET}\n`);
      for (const pattern of results.deprecatedCodePatterns) {
        console.log(`${POINTER} ${BOLD}${LIGHTCYAN}${pattern.file}:${pattern.line}:${pattern.column}${RESET}`);
        console.log(`  ${DIM}Issue:${RESET} ${pattern.message}`);
        console.log();
      }
    }
    
    if (results.deprecatedPackages.length === 0 && results.deprecatedCodePatterns.length === 0) {
      console.log(`${GREEN}${BOLD}▍ ${GREEN}${DIM}No deprecations found!${RESET}\n`);
      log('No deprecations found');
    } else {
      logWarning(`Found ${results.deprecatedPackages.length} deprecated packages and ${results.deprecatedCodePatterns.length} code patterns`);
      
      if (options.fix) {
        console.log(`${POINTER} Automatic fixes not available for deprecations. Manual review required.${RESET}`);
      }
    }
  } catch (err) {
    logError(`Unexpected error in deprecationsCommand: ${err.message}`);
    console.error(`${ERROR} Unexpected error: ${err.message}${RESET}`);
    process.exit(1);
  }
}
