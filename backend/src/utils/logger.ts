import fs from 'fs';
import path from 'path';

const logsDir = path.join(process.cwd(), 'logs');

// Asegurar existencia del directorio de logs
try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
} catch (e) {
  // Ignorar si no hay permisos de disco
}

const writeToFile = (filename: string, text: string) => {
  try {
    const filePath = path.join(logsDir, filename);
    fs.appendFileSync(filePath, text + '\n', 'utf8');
  } catch (e) {
    // Fallback silencioso
  }
};

export const logger = {
  info: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [INFO] ${message}${meta ? ' ' + JSON.stringify(meta) : ''}`;
    console.log(logLine);
    writeToFile('app.log', logLine);
  },
  warn: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [WARN] ${message}${meta ? ' ' + JSON.stringify(meta) : ''}`;
    console.warn(logLine);
    writeToFile('app.log', logLine);
  },
  error: (message: string, error?: any) => {
    const timestamp = new Date().toISOString();
    const errDetails = error?.stack || (typeof error === 'object' ? JSON.stringify(error) : error) || '';
    const logLine = `[${timestamp}] [ERROR] ${message}${errDetails ? ' ' + errDetails : ''}`;
    console.error(logLine);
    writeToFile('error.log', logLine);
    writeToFile('app.log', logLine);
  },
  debug: (message: string, meta?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      const timestamp = new Date().toISOString();
      const logLine = `[${timestamp}] [DEBUG] ${message}${meta ? ' ' + JSON.stringify(meta) : ''}`;
      console.log(logLine);
      writeToFile('debug.log', logLine);
    }
  }
};

export default logger;
