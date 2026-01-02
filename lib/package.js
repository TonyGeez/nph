import fs from 'fs';
import path from 'path';
import { ERROR, RESET } from './colors.js';
import { logError } from './logger.js';

export function readPackageJson() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.log(`${ERROR} No package.json found in current directory${RESET}`);
    logError('package.json not found');
    process.exit(1);
  }

  try {
    const fileContent = fs.readFileSync(packageJsonPath, 'utf8');
    return {
      path: packageJsonPath,
      data: JSON.parse(fileContent)
    };
  } catch (err) {
    console.log(`${ERROR} Failed to read or parse package.json: ${err.message}${RESET}`);
    logError(`Failed to read package.json: ${err.message}`);
    process.exit(1);
  }
}

export function writePackageJson(packageJsonPath, data) {
  try {
    const content = JSON.stringify(data, null, 2) + '\n';
    fs.writeFileSync(packageJsonPath, content, 'utf8');
    return true;
  } catch (err) {
    console.log(`${ERROR} Failed to write package.json: ${err.message}${RESET}`);
    logError(`Failed to write package.json: ${err.message}`);
    return false;
  }
}
