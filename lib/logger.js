import fs from 'fs';
import path from 'path';

const logDir = path.join(process.cwd(), 'logs');
const logFile = path.join(logDir, 'nph.log');

function ensureLogDir() {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

export function log(message, level = 'INFO') {
  ensureLogDir();
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} [${level}] ${message}\n`;
  
  try {
    fs.appendFileSync(logFile, logEntry);
  } catch (err) {
    console.error(`Failed to write to log file: ${err.message}`);
  }
}

export function logError(message) {
  log(message, 'ERROR');
}

export function logWarning(message) {
  log(message, 'WARN');
}

export function logDebug(message) {
  log(message, 'DEBUG');
}
