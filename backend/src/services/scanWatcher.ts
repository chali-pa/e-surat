import fs from 'fs';
import path from 'path';

export interface ScanClient {
  userId: number;
  scanIdentifier: string;
  res: any; // Express Response object for SSE
}

const activeClients = new Set<ScanClient>();
let watcher: fs.FSWatcher | null = null;
let hotFolder = '';

export const getHotFolder = () => {
  if (hotFolder) return hotFolder;
  const envPath = process.env.SCAN_HOT_FOLDER;
  if (envPath) {
    hotFolder = path.resolve(envPath);
  } else {
    hotFolder = path.resolve(__dirname, '../../scans');
  }
  
  // Ensure the directory exists
  if (!fs.existsSync(hotFolder)) {
    fs.mkdirSync(hotFolder, { recursive: true });
  }
  return hotFolder;
};

// Check if file is fully written and stable
const checkFileStability = async (filePath: string): Promise<boolean> => {
  let prevSize = -1;
  for (let i = 0; i < 15; i++) { // try up to 15 times (7.5 seconds)
    try {
      if (!fs.existsSync(filePath)) return false;
      const stats = fs.statSync(filePath);
      // Ensure file is non-empty and size is stable
      if (stats.size > 0 && stats.size === prevSize) {
        return true;
      }
      prevSize = stats.size;
    } catch (e) {
      // Locked or not ready
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
};

// Start watching the hot folder
export const startScanWatcher = () => {
  if (watcher) return;
  const watchDir = getHotFolder();
  console.log(`Starting scan watcher on directory: ${watchDir}`);

  try {
    watcher = fs.watch(watchDir, { recursive: true }, async (eventType, filename) => {
      if (!filename || eventType !== 'rename') return; // 'rename' captures new additions and deletions

      const filePath = path.join(watchDir, filename);
      const relativePath = filename.replace(/\\/g, '/'); // standardise slash

      // Wait a moment for OS to register filesystem events
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (!fs.existsSync(filePath)) return;

      const isFile = fs.statSync(filePath).isFile();
      if (!isFile) return;

      // Wait until file is fully written
      const stable = await checkFileStability(filePath);
      if (!stable) {
        console.warn(`File ${relativePath} did not stabilize in size, skipping.`);
        return;
      }

      console.log(`Stable scan file detected: ${relativePath}`);
      notifyMatchingClients(relativePath);
    });
  } catch (error) {
    console.error('Failed to start scan watcher:', error);
  }
};

// Match and notify registered SSE clients
const notifyMatchingClients = (relativePath: string) => {
  const parts = relativePath.split('/');
  const filename = parts[parts.length - 1];
  const subfolder = parts.length > 1 ? parts[0] : '';

  activeClients.forEach((client) => {
    const ident = client.scanIdentifier.toLowerCase().trim();
    if (!ident) return; // ignore empty identifiers

    let isMatch = false;

    // A) Subdirectory match: file is inside a folder named exactly like the identifier
    if (subfolder && subfolder.toLowerCase() === ident) {
      isMatch = true;
    }
    // B) Filename prefix match: filename starts with the identifier (e.g. john_scan_001.jpg)
    else if (filename.toLowerCase().startsWith(ident)) {
      isMatch = true;
    }

    if (isMatch) {
      console.log(`Sending scan notification to user ID: ${client.userId} for file: ${relativePath}`);
      client.res.write(`event: scan-detected\n`);
      client.res.write(`data: ${JSON.stringify({ filename: relativePath, scanIdentifier: client.scanIdentifier })}\n\n`);
    }
  });
};

export const registerScanClient = (client: ScanClient) => {
  activeClients.add(client);
  console.log(`SSE scan client registered. Active clients: ${activeClients.size}`);
};

export const unregisterScanClient = (client: ScanClient) => {
  activeClients.delete(client);
  console.log(`SSE scan client disconnected. Active clients: ${activeClients.size}`);
};
