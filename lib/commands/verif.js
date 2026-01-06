import { readPackageJson, writePackageJson } from '../package.js';
import { fetchPackageInfo } from '../npm.js';
import { log, logError, logWarning } from '../logger.js';
import { BAR_DEP, HEAD, CYAN, GREEN, HL_DEP, HR_DEP, POINTER, BOLD, LIGHTCYAN, DIM, RESET, WARNING, SUCCESS, ERROR } from '../colors.js';
import Levenshtein from 'fastest-levenshtein';
import semver from 'semver';
import fs from 'fs';

// Simple fuzzy matching for package names
function findSimilarPackages(packageName, allPackages = []) {
  if (allPackages.length === 0) return [];
  
  const scored = allPackages
    .map(name => ({
      name,
      distance: Levenshtein.distance(packageName.toLowerCase(), name.toLowerCase())
    }))
    .filter(item => item.distance <= 3)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);
  
  return scored.map(item => item.name);
}

// Find closest valid version using semver
function findClosestVersion(availableVersions, requestedVersion) {
  const versions = Object.keys(availableVersions).sort(semver.rcompare);
  
  // Try to satisfy the range if it's a valid semver range
  try {
    const satisfied = semver.maxSatisfying(versions, requestedVersion);
    if (satisfied) return satisfied;
  } catch (e) {
    // Not a valid range, continue
  }
  
  // Strip prefixes and try exact match
  const cleanVersion = requestedVersion.replace(/^[\^~>=<]+/, '');
  if (versions.includes(cleanVersion)) {
    return cleanVersion;
  }
  
  // Find closest by comparing major.minor.patch
  try {
    const parsed = semver.coerce(cleanVersion);
    if (parsed) {
      // Find versions with same major
      const sameMajor = versions.filter(v => semver.major(v) === parsed.major);
      if (sameMajor.length > 0) return sameMajor[0];
    }
  } catch (e) {
    // Fall through to latest
  }
  
  // Return latest version as last resort
  return versions[0];
}

// Check packages in parallel with concurrency limit
async function checkPackagesInParallel(dependencies, concurrency = 5) {
  const entries = Object.entries(dependencies);
  const results = [];
  
  for (let i = 0; i < entries.length; i += concurrency) {
    const batch = entries.slice(i, i + concurrency);
    const batchPromises = batch.map(([packageName, version]) => 
      checkSinglePackage(packageName, version)
        .catch(error => ({
          package: packageName,
          version,
          status: 'error',
          error: error.message
        }))
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Update progress
    const progress = Math.min(i + concurrency, entries.length);
    process.stdout.write(`${DIM}Progress: ${progress}/${entries.length}${RESET}\r`);
  }
  
  console.log(); // Clear progress line
  return results;
}

async function checkSinglePackage(packageName, version) {
  try {
    const packageInfo = await fetchPackageInfo(packageName);
    
    if (!packageInfo) {
      return {
        package: packageName,
        version,
        status: 'package-not-found',
        suggestion: null
      };
    }
    
    const versions = packageInfo.versions || {};
    const availableVersions = Object.keys(versions);
    
    // Check if version satisfies the requirement
    try {
      const satisfied = semver.maxSatisfying(availableVersions, version);
      if (satisfied) {
        return {
          package: packageName,
          version,
          status: 'ok',
          resolvedVersion: satisfied
        };
      }
    } catch (e) {
      // Not a valid semver range, try exact match
      const cleanVersion = version.replace(/^[\^~>=<]+/, '');
      if (versions[cleanVersion]) {
        return {
          package: packageName,
          version,
          status: 'ok',
          resolvedVersion: cleanVersion
        };
      }
    }
    
    // Version not found, suggest closest
    const closestVersion = findClosestVersion(versions, version);
    const prefix = version.match(/^[\^~]/)?.[0] || '';
    
    return {
      package: packageName,
      version,
      status: 'version-not-found',
      closestVersion: prefix + closestVersion,
      availableCount: availableVersions.length
    };
    
  } catch (error) {
    throw error;
  }
}

function createBackup(packageJsonPath) {
  const backupPath = packageJsonPath + '.backup';
  try {
    fs.copyFileSync(packageJsonPath, backupPath);
    return backupPath;
  } catch (e) {
    logWarning('Failed to create backup');
    return null;
  }
}

export async function verifCommand(options = {}) {
  try {
    const { path: packageJsonPath, data: packageJson } = readPackageJson();
    
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    // Filter by type if requested
    let dependencies = allDeps;
    if (options.prodOnly) {
      dependencies = packageJson.dependencies || {};
    } else if (options.devOnly) {
      dependencies = packageJson.devDependencies || {};
    }
    
    if (Object.keys(dependencies).length === 0) {
      console.log(`${WARNING} No dependencies found${RESET}`);
      process.exit(0);
    }
    
    console.log();
    console.log(`${BAR_DEP}`);
    console.log(`${HL_DEP} Dependency Verifier ${HR_DEP}`);
    console.log(`${BAR_DEP}`);
    console.log();
    
    console.log(`${POINTER} ${LIGHTCYAN}Checking ${Object.keys(dependencies).length} dependencies...\n${RESET}`);
    
    // Check all packages in parallel
    const concurrency = options.concurrency || 10;
    const results = await checkPackagesInParallel(dependencies, concurrency);
    
    // Add depType to results
    for (const result of results) {
      const isDev = packageJson.devDependencies?.[result.package];
      result.depType = isDev ? 'devDependencies' : 'dependencies';
    }
    
    // Categorize results
    const ok = results.filter(r => r.status === 'ok');
    const versionErrors = results.filter(r => r.status === 'version-not-found');
    const packageErrors = results.filter(r => r.status === 'package-not-found');
    const otherErrors = results.filter(r => r.status === 'error');
    
    // Display results
    console.log(`\n${BOLD}${CYAN}Results:${RESET}\n`);
    
    if (ok.length > 0 && !options.errorsOnly) {
      console.log(`${SUCCESS} ${ok.length} valid dependencies${RESET}\n`);
    }
    
    if (versionErrors.length > 0) {
      console.log(`${BOLD}${ERROR}Version Issues (${versionErrors.length}):${RESET}\n`);
      for (const result of versionErrors) {
        console.log(`${ERROR} ${result.package}@${result.version}${RESET}`);
        console.log(`  ${POINTER} Version not found (${result.availableCount} versions available)`);
        console.log(`  ${POINTER} Suggested: ${CYAN}${result.closestVersion}${RESET}\n`);
      }
    }
    
    if (packageErrors.length > 0) {
      console.log(`${BOLD}${ERROR}Package Not Found (${packageErrors.length}):${RESET}\n`);
      for (const result of packageErrors) {
        console.log(`${ERROR} ${result.package}@${result.version}${RESET}`);
        console.log(`  ${POINTER} This package does not exist on npm${RESET}\n`);
      }
    }
    
    if (otherErrors.length > 0) {
      console.log(`${BOLD}${WARNING}Errors (${otherErrors.length}):${RESET}\n`);
      for (const result of otherErrors) {
        console.log(`${WARNING} ${result.package}@${result.version}${RESET}`);
        console.log(`  ${POINTER} ${result.error}${RESET}\n`);
      }
    }
    
    const hasErrors = versionErrors.length > 0 || packageErrors.length > 0;
    
    // Apply fixes if requested
    if (hasErrors && (options.fixAll || options.fixVersion)) {
      if (options.dryRun) {
        console.log(`${HEAD} Dry Run - Changes that would be made:${RESET}\n`);
      } else {
        console.log(`${HEAD} Applying Fixes${RESET}\n`);
        const backupPath = createBackup(packageJsonPath);
        if (backupPath) {
          console.log(`${DIM}Backup created: ${backupPath}${RESET}\n`);
        }
      }
      
      const newPackageJson = { ...packageJson };
      let changeCount = 0;
      
      for (const result of versionErrors) {
        if (options.fixAll || options.fixVersion) {
          const oldValue = newPackageJson[result.depType][result.package];
          newPackageJson[result.depType][result.package] = result.closestVersion;
          console.log(`${POINTER} ${result.package}: ${DIM}${oldValue}${RESET} → ${CYAN}${result.closestVersion}${RESET}`);
          changeCount++;
        }
      }
      
      if (!options.dryRun && changeCount > 0) {
        if (writePackageJson(packageJsonPath, newPackageJson)) {
          console.log(`\n${SUCCESS} Updated ${changeCount} dependencies in package.json${RESET}`);
          console.log(`${DIM}Run 'npm install' to install updated versions${RESET}\n`);
        } else {
          console.log(`\n${ERROR} Failed to write package.json${RESET}\n`);
        }
      } else if (options.dryRun) {
        console.log(`\n${DIM}${changeCount} changes would be made${RESET}\n`);
      }
      
    } else if (!hasErrors) {
      console.log(`${SUCCESS} ${BOLD}All dependencies are valid!${RESET}\n`);
    } else {
      console.log(`\n${POINTER} Run with ${CYAN}--fix-all${RESET} to fix all version issues`);
      console.log(`${POINTER} Run with ${CYAN}--dry-run --fix-all${RESET} to preview changes${RESET}\n`);
    }
    
    // Summary
    const total = results.length;
    const failed = versionErrors.length + packageErrors.length + otherErrors.length;
    console.log(`${DIM}Summary: ${ok.length}/${total} valid, ${failed} issues${RESET}\n`);
    
    if (hasErrors) {
      process.exit(1);
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
