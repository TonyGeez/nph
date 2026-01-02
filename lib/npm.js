import https from 'https';
import { execSync } from 'child_process';
import semver from 'semver';

export function fetchPackageInfo(packageName) {
  return new Promise((resolve, reject) => {
    const url = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Failed to parse package data'));
          }
        } else if (res.statusCode === 404) {
          resolve(null);
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

export function findSimilarPackages(packageName) {
  try {
    const result = execSync(`npm search ${packageName} --json --no-description`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
      timeout: 5000
    });
    const packages = JSON.parse(result);
    return packages.slice(0, 3).map(p => p.name);
  } catch (e) {
    return [];
  }
}

export function findClosestVersion(versions, targetVersion) {
  const cleanTarget = targetVersion.replace(/^[\^~>=<]/, '');
  const versionList = Object.keys(versions).sort((a, b) => {
    return semver.rcompare(a, b);
  });
  
  if (versionList.includes(cleanTarget)) return cleanTarget;
  
  const targetRange = semver.validRange(cleanTarget) ? cleanTarget : null;
  if (targetRange) {
    const maxSatisfying = semver.maxSatisfying(versionList, targetRange);
    if (maxSatisfying) return maxSatisfying;
  }
  
  let closest = versionList[0];
  let minDiff = Infinity;
  
  for (const version of versionList) {
    if (semver.valid(version) && semver.valid(cleanTarget)) {
      const diff = Math.abs(semver.diff(version, cleanTarget) || 0);
      if (diff < minDiff) {
        minDiff = diff;
        closest = version;
      }
    }
  }
  
  return closest;
}

export async function getLatestCompatibleVersion(packageName, currentRange) {
  try {
    const info = await fetchPackageInfo(packageName);
    if (!info) return null;
    
    const versions = Object.keys(info.versions).filter(v => semver.valid(v));
    const latest = semver.maxSatisfying(versions, currentRange);
    return latest || null;
  } catch (e) {
    return null;
  }
}

export async function getDependencyTree() {
  try {
    const result = execSync('npm ls --json --depth=10', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return JSON.parse(result);
  } catch (e) {
    try {
      const result = execSync('npm ls --json --depth=10 --all', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      return JSON.parse(result);
    } catch (err) {
      return null;
    }
  }
}

export async function checkPeerConflicts(packageName, newVersion, currentTree) {
  if (!currentTree) return { hasConflicts: false, conflicts: [] };
  
  const conflicts = [];
  const visited = new Set();
  
  function traverse(node, path = []) {
    if (!node || visited.has(node.path || node.name)) return;
    visited.add(node.path || node.name);
    
    if (node.peerDependencies) {
      for (const [peerName, peerRange] of Object.entries(node.peerDependencies)) {
        if (peerName === packageName) {
          if (!semver.satisfies(newVersion, peerRange)) {
            conflicts.push({
              package: node.name,
              path: [...path, node.name].join(' → '),
              required: peerRange,
              actual: newVersion
            });
          }
        }
      }
    }
    
    if (node.dependencies) {
      for (const [name, dep] of Object.entries(node.dependencies)) {
        traverse(dep, [...path, node.name]);
      }
    }
  }
  
  traverse(currentTree);
  return { hasConflicts: conflicts.length > 0, conflicts };
}
