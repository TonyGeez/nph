import { execSync } from 'child_process';
import { readPackageJson } from '../package.js';
import { log, logError, logWarning } from '../logger.js';
import { BAR_DEPRE, HEAD, CYAN, GREEN, HL_DEPRE, HR_DEPRE, POINTER, BOLD, LIGHTCYAN, DIM, RESET, WARNING, SUCCESS, ERROR } from '../colors.js';
import fs from 'fs';
import path from 'path';

const CACHE_FILE = path.join(process.cwd(), '.dep-cache.json');
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      if (Date.now() - cache.timestamp < CACHE_TTL) {
        return cache.data;
      }
    }
  } catch (e) {
    // Cache invalid, continue without it
  }
  return null;
}

function saveCache(data) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify({
      timestamp: Date.now(),
      data
    }, null, 2));
  } catch (e) {
    logWarning('Failed to save cache');
  }
}

async function checkDeprecatedPackages(dependencies, useCache = true) {
  const cached = useCache ? loadCache() : null;
  if (cached) {
    console.log(`${DIM}Using cached results (use --no-cache to refresh)${RESET}\n`);
    return cached;
  }

  const results = [];
  const packageNames = Object.keys(dependencies);
  
  console.log(`${DIM}Checking ${packageNames.length} packages...${RESET}\n`);
  
  // Use npm view with multiple packages at once (batch processing)
  const batchSize = 10;
  for (let i = 0; i < packageNames.length; i += batchSize) {
    const batch = packageNames.slice(i, i + batchSize);
    const progress = Math.min(i + batchSize, packageNames.length);
    process.stdout.write(`${DIM}Progress: ${progress}/${packageNames.length}${RESET}\r`);
    
    try {
      // Query multiple packages in one call
      const info = JSON.parse(execSync(`npm view ${batch.join(' ')} --json`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 10000
      }));
      
      // Handle both single package (object) and multiple packages (array) responses
      const packages = Array.isArray(info) ? info : [info];
      
      for (const pkg of packages) {
        if (pkg && pkg.deprecated) {
          results.push({
            package: pkg.name || batch[0],
            version: pkg.version,
            reason: pkg.deprecated
          });
        }
      }
    } catch (e) {
      // If batch fails, try individual packages as fallback
      for (const pkgName of batch) {
        try {
          const info = JSON.parse(execSync(`npm view ${pkgName} --json`, {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 5000
          }));
          
          if (info.deprecated) {
            results.push({
              package: pkgName,
              version: info.version,
              reason: info.deprecated
            });
          }
        } catch (err) {
          logWarning(`Failed to check ${pkgName}`);
        }
      }
    }
  }
  
  console.log(); // Clear progress line
  
  if (useCache) {
    saveCache(results);
  }
  
  return results;
}

function hasEslintPlugin() {
  try {
    const { data: packageJson } = readPackageJson();
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };
    return 'eslint-plugin-deprecation' in allDeps;
  } catch {
    return false;
  }
}

async function scanCodePatterns(options) {
  if (!hasEslintPlugin()) {
    console.log(`${WARNING} eslint-plugin-deprecation not installed. Skipping code scan.${RESET}`);
    console.log(`${DIM}Install with: npm install -D eslint-plugin-deprecation${RESET}\n`);
    return [];
  }

  try {
    const patterns = options.patterns || ['src/**/*.js', 'lib/**/*.js', '*.js'];
    const filesArg = patterns.join(' ');
    
    console.log(`${DIM}Scanning code patterns...${RESET}\n`);
    
    const output = execSync(`npx eslint ${filesArg} --format json --no-eslintrc --parser-options=ecmaVersion:2022,sourceType:module --plugin deprecation --rule "deprecation/deprecation: error"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000
    });
    
    const eslintResults = JSON.parse(output);
    const results = [];
    
    for (const file of eslintResults) {
      for (const message of file.messages) {
        if (message.ruleId === 'deprecation/deprecation') {
          results.push({
            file: path.relative(process.cwd(), file.filePath),
            line: message.line,
            column: message.column,
            message: message.message
          });
        }
      }
    }
    
    return results;
  } catch (e) {
    // ESLint returns non-zero exit code when it finds issues
    try {
      const output = e.stdout || e.output?.[1]?.toString();
      if (output) {
        const eslintResults = JSON.parse(output);
        const results = [];
        
        for (const file of eslintResults) {
          for (const message of file.messages) {
            if (message.ruleId === 'deprecation/deprecation') {
              results.push({
                file: path.relative(process.cwd(), file.filePath),
                line: message.line,
                column: message.column,
                message: message.message
              });
            }
          }
        }
        
        return results;
      }
    } catch (parseErr) {
      // Really failed
    }
    
    logError(`Code pattern scan failed: ${e.message}`);
    return [];
  }
}

export async function depCommand(options = {}) {
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
      deprecatedCodePatterns: []
    };
    
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };
    
    if (Object.keys(dependencies).length === 0) {
      console.log(`${WARNING} No dependencies found in package.json${RESET}\n`);
      return;
    }
    
    // Check packages
    results.deprecatedPackages = await checkDeprecatedPackages(
      dependencies, 
      !options.noCache
    );
    
    // Check code patterns if requested
    if (!options.skipCode) {
      results.deprecatedCodePatterns = await scanCodePatterns(options);
    }
    
    // Output results
    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }
    
    if (results.deprecatedPackages.length > 0) {
      console.log(`${BOLD}${CYAN}Deprecated packages (${results.deprecatedPackages.length}):${RESET}\n`);
      for (const pkg of results.deprecatedPackages) {
        console.log(`${POINTER} ${BOLD}${LIGHTCYAN}${pkg.package}${RESET}${DIM}@${pkg.version}${RESET}`);
        console.log(`  ${DIM}Reason:${RESET} ${pkg.reason}`);
        console.log();
      }
    }
    
    if (results.deprecatedCodePatterns.length > 0) {
      console.log(`${BOLD}${CYAN}Deprecated code patterns (${results.deprecatedCodePatterns.length}):${RESET}\n`);
      
      const grouped = {};
      for (const pattern of results.deprecatedCodePatterns) {
        if (!grouped[pattern.file]) {
          grouped[pattern.file] = [];
        }
        grouped[pattern.file].push(pattern);
      }
      
      for (const [file, patterns] of Object.entries(grouped)) {
        console.log(`${BOLD}${LIGHTCYAN}${file}${RESET}`);
        for (const pattern of patterns) {
          console.log(`  ${DIM}Line ${pattern.line}:${pattern.column}${RESET} - ${pattern.message}`);
        }
        console.log();
      }
    }
    
    const totalIssues = results.deprecatedPackages.length + results.deprecatedCodePatterns.length;
    
    if (totalIssues === 0) {
      console.log(`${SUCCESS} ${BOLD}No deprecations found!${RESET}\n`);
    } else {
      console.log(`${WARNING} Found ${totalIssues} total deprecation issues${RESET}\n`);
      
      if (results.deprecatedPackages.length > 0) {
        console.log(`${DIM}Consider updating or replacing deprecated packages.${RESET}`);
        console.log(`${DIM}Run 'npm outdated' for available updates.${RESET}\n`);
      }
    }
    
  } catch (err) {
    logError(`Unexpected error: ${err.message}`);
    console.error(`${ERROR} Unexpected error: ${err.message}${RESET}`);
    if (options.verbose) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}
