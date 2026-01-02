import { readPackageJson, writePackageJson } from '../package.js';
import { fetchPackageInfo, findSimilarPackages, findClosestVersion } from '../npm.js';
import { log, logError } from '../logger.js';
import { BAR_DEP, HEAD, CYAN, GREEN, HL_DEP, HR_DEP, POINTER, BOLD, LIGHTCYAN, DIM, RESET, WARNING, SUCCESS, ERROR } from '../colors.js';

export async function verifCommand(options) {
  try {
    const { path: packageJsonPath, data: packageJson } = readPackageJson();
    
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (Object.keys(dependencies).length === 0) {
      console.log(`${WARNING} No dependencies found in package.json${RESET}`);
      log('No dependencies found');
      process.exit(0);
    }
    
    console.log();
    console.log(`${BAR_DEP}`);
    console.log(`${HL_DEP} Dependency Verifier ${HR_DEP}`);
    console.log(`${BAR_DEP}`);
    console.log();
    
    console.log(`${POINTER} ${LIGHTCYAN}Checking ${Object.keys(dependencies).length} dependencies...\n${RESET}`);
    
    const results = [];
    const fixes = {
      dependencies: { ...packageJson.dependencies },
      devDependencies: { ...packageJson.devDependencies }
    };
    
    for (const [packageName, version] of Object.entries(dependencies)) {
      const isDev = packageJson.devDependencies && packageJson.devDependencies[packageName];
      const depType = isDev ? 'devDependencies' : 'dependencies';
      
      process.stdout.write(`${DIM}Checking ${packageName}@${version}...${RESET}\r`);
      log(`Checking ${packageName}@${version}`);
      
      try {
        const packageInfo = await fetchPackageInfo(packageName);
        
        if (!packageInfo) {
          const similar = findSimilarPackages(packageName);
          const suggestion = similar.length > 0 ? similar[0] : null;
          
          results.push({
            package: packageName,
            version: version,
            status: 'package-not-found',
            suggestion: suggestion,
            depType: depType
          });
          
          if ((options.fixAll || options.fixName) && suggestion) {
            delete fixes[depType][packageName];
            fixes[depType][suggestion] = version;
          }
        } else {
          const cleanVersion = version.replace(/^[\^~>=<]/, '');
          const versions = packageInfo.versions;
          
          if (versions[cleanVersion]) {
            results.push({
              package: packageName,
              version: version,
              status: 'ok',
              depType: depType
            });
          } else {
            const closestVersion = findClosestVersion(versions, version);
            const prefix = version.match(/^[\^~]/)?.[0] || '';
            
            results.push({
              package: packageName,
              version: version,
              status: 'version-not-found',
              closestVersion: prefix + closestVersion,
              depType: depType
            });
            
            if (options.fixAll || options.fixVersion) {
              fixes[depType][packageName] = prefix + closestVersion;
            }
          }
        }
      } catch (error) {
        results.push({
          package: packageName,
          version: version,
          status: 'error',
          error: error.message,
          depType: depType
        });
        logError(`Error checking ${packageName}: ${error.message}`);
      }
    }
    
    let hasErrors = false;
    
    for (const result of results) {
      if (result.status === 'ok') {
        console.log(`${SUCCESS} ${result.package}@${result.version}${RESET}`);
      } else if (result.status === 'version-not-found') {
        hasErrors = true;
        console.log(`${ERROR} ${result.package}@${result.version}${RESET}`);
        console.log(`  ${POINTER} Version ${result.version} does not exist for ${result.package}${RESET}`);
        console.log(`  ${POINTER} Closest version available: ${CYAN}${result.closestVersion}${RESET}\n`);
      } else if (result.status === 'package-not-found') {
        hasErrors = true;
        console.log(`${ERROR} ${result.package}@${result.version}${RESET}`);
        console.log(`  ${POINTER} This package does not exist${RESET}`);
        if (result.suggestion) {
          console.log(`  ${POINTER} Did you mean: ${CYAN}${result.suggestion}${RESET}\n`);
        } else {
          console.log(`  ${POINTER} No similar packages found${RESET}\n`);
        }
      } else if (result.status === 'error') {
        hasErrors = true;
        console.log(`${WARNING} ${result.package}@${result.version} - Error: ${result.error}${RESET}`);
      }
    }
    
    if ((options.fixAll || options.fixVersion || options.fixName) && hasErrors) {
      console.log(`\n${HEAD} Applying Fixes ${RESET}\n`);
      
      const newPackageJson = { ...packageJson };
      newPackageJson.dependencies = fixes.dependencies;
      newPackageJson.devDependencies = fixes.devDependencies;
      
      if (Object.keys(newPackageJson.dependencies).length === 0) {
        delete newPackageJson.dependencies;
      }
      
      if (Object.keys(newPackageJson.devDependencies).length === 0) {
        delete newPackageJson.devDependencies;
      }
      
      if (writePackageJson(packageJsonPath, newPackageJson)) {
        console.log(`\n${GREEN}${BOLD}▍package.json has been updated${RESET}\n`);
        log('package.json updated with fixes');
      }
    } else if (!hasErrors) {
      console.log(`\n${GREEN}${BOLD}▍ All dependencies are valid!${RESET}\n`);
      log('All dependencies are valid');
    } else {
      console.log(`\n${POINTER} Run with ${CYAN}--fix-all${RESET} to fix all issues`);
      console.log(`${POINTER} Run with ${CYAN}--fix-version${RESET} to fix version issues only`);
      console.log(`${POINTER} Run with ${CYAN}--fix-name${RESET} to fix package name issues only${RESET}\n`);
    }
  } catch (err) {
    logError(`Unexpected error in depCommand: ${err.message}`);
    console.error(`${ERROR} Unexpected error: ${err.message}${RESET}`);
    process.exit(1);
  }
}
