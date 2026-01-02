//upgrade.js
import { readPackageJson, writePackageJson } from '../package.js';
import { fetchPackageInfo, getLatestCompatibleVersion, checkPeerConflicts, getDependencyTree } from '../npm.js';
import { log, logError, logWarning } from '../logger.js';
import { BAR_UP, HEAD, CYAN, GREEN, HL_UP, HR_UP, POINTER, BOLD, LIGHTCYAN, DIM, RESET, WARNING, SUCCESS, ERROR } from '../colors.js';
import { createPrompt } from '../prompts.js';
import semver from 'semver';

export async function upgradeCommand(options) {
  try {
    const { path: packageJsonPath, data: packageJson } = readPackageJson();
    
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (Object.keys(dependencies).length === 0) {
      console.log(`${WARNING} No dependencies found in package.json${RESET}`);
      log('No dependencies found');
      process.exit(0);
    }
    
    console.log();
    console.log(`${BAR_UP}`);
    console.log(`${HL_UP} Dependency Upgrade Analyzer ${HR_UP}`);
    console.log(`${BAR_UP}`);
    console.log();
    
    console.log(`${POINTER} ${LIGHTCYAN}Analyzing ${Object.keys(dependencies).length} dependencies for safe upgrades...\n${RESET}`);
    
    const currentTree = await getDependencyTree();
    const upgrades = [];
    const skipped = [];
    
    for (const [packageName, currentRange] of Object.entries(dependencies)) {
      const isDev = packageJson.devDependencies && packageJson.devDependencies[packageName];
      const depType = isDev ? 'devDependencies' : 'dependencies';
      
      process.stdout.write(`${DIM}Checking ${packageName}@${currentRange}...${RESET}\r`);
      log(`Checking upgrade for ${packageName}@${currentRange}`);
      
      try {
        const latestVersion = await getLatestCompatibleVersion(packageName, currentRange);
        
        if (!latestVersion) {
          skipped.push({
            package: packageName,
            reason: 'Package not found in registry',
            depType
          });
          continue;
        }
        
        const currentClean = currentRange.replace(/^[\^~>=<]/, '');
        if (semver.gte(latestVersion, currentClean)) {
          const prefix = currentRange.match(/^[\^~]/)?.[0] || '';
          const newRange = prefix + latestVersion;
          
          if (newRange !== currentRange) {
            const conflictCheck = await checkPeerConflicts(packageName, latestVersion, currentTree);
            
            if (conflictCheck.hasConflicts && !options.force) {
              skipped.push({
                package: packageName,
                reason: 'Peer dependency conflicts',
                conflicts: conflictCheck.conflicts,
                depType
              });
              logWarning(`Skipping ${packageName} due to peer conflicts`);
            } else {
              upgrades.push({
                package: packageName,
                from: currentRange,
                to: newRange,
                depType,
                warnings: conflictCheck.conflicts
              });
            }
          }
        }
      } catch (error) {
        skipped.push({
          package: packageName,
          reason: `Error: ${error.message}`,
          depType
        });
        logError(`Error checking ${packageName}: ${error.message}`);
      }
    }
    
    
    if (upgrades.length > 0) {
      console.log(`${BOLD}${CYAN}Upgrades available:${RESET}\n`);
      for (const upgrade of upgrades) {
        console.log(`${POINTER} ${BOLD}${LIGHTCYAN}${upgrade.package}${RESET}`);
        console.log(`  ${DIM}Current:${RESET} ${upgrade.from}`);
        console.log(`  ${DIM}Latest:${RESET} ${CYAN}${upgrade.to}${RESET}`);
        if (upgrade.warnings.length > 0) {
          console.log(`  ${WARNING} Peer dependency warnings:${RESET}`);
          for (const warning of upgrade.warnings) {
            console.log(`    ${DIM}${warning.package} requires ${warning.required}${RESET}`);
          }
        }
        console.log();
      }
    }
    
    if (skipped.length > 0) {
      console.log(`${BOLD}${CYAN}Skipped packages:${RESET}\n`);
      for (const skip of skipped) {
        console.log(`${POINTER} ${BOLD}${LIGHTCYAN}${skip.package}${RESET}: ${skip.reason}${RESET}`);
        if (skip.conflicts) {
          for (const conflict of skip.conflicts) {
            console.log(`  ${DIM}${conflict.package} requires ${conflict.required}${RESET}`);
          }
        }
        console.log();
      }
    }
    
    if (upgrades.length === 0) {
      console.log(`${GREEN}${BOLD}▍ ${GREEN}${DIM}All packages are up to date!${RESET}\n`);
      log('All packages up to date');
      process.exit(0);
    }
    
    if (options.dryRun) {
      console.log(`${POINTER} Dry run complete. No changes made.${RESET}`);
      log('Upgrade dry run completed');
      process.exit(0);
    }
    
    const prompt = createPrompt();
    try {
      const confirmed = await prompt.confirm(`Apply ${upgrades.length} upgrade(s)`);
      
      if (confirmed) {
        const newPackageJson = { ...packageJson };
        
        for (const upgrade of upgrades) {
          newPackageJson[upgrade.depType][upgrade.package] = upgrade.to;
        }
        
        if (writePackageJson(packageJsonPath, newPackageJson)) {
          console.log(`${SUCCESS} package.json updated successfully${RESET}`);
          console.log(`${POINTER} Run ${CYAN}npm install${RESET} to install updates${RESET}`);
          log(`Applied ${upgrades.length} upgrades`);
        }
      } else {
        console.log(`${WARNING} Operation cancelled${RESET}`);
      }
    } finally {
      prompt.close();
    }
  } catch (err) {
    logError(`Unexpected error in upgradeCommand: ${err.message}`);
    console.error(`${ERROR} Unexpected error: ${err.message}${RESET}`);
    process.exit(1);
  }
}
