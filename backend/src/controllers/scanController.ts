import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { registerScanClient, unregisterScanClient, getHotFolder, ScanClient } from '../services/scanWatcher';
import path from 'path';
import fs from 'fs';

// Handle SSE Connection
export const handleScanStream = (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const scanIdentifier = req.query.scanIdentifier as string;

  if (!scanIdentifier) {
    return res.status(400).json({ error: 'scanIdentifier query parameter is required' });
  }

  // Setup headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const client: ScanClient = {
    userId,
    scanIdentifier,
    res,
  };

  registerScanClient(client);

  // Send initial registration event
  res.write(`data: ${JSON.stringify({ message: 'Connected to scanner stream', scanIdentifier })}\n\n`);

  // Heartbeat to keep connection active
  const heartbeat = setInterval(() => {
    res.write(': ping\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unregisterScanClient(client);
  });
};

// Retrieve a scanned file and delete it after sending
export const getScanFile = (req: AuthRequest, res: Response) => {
  const filename = req.query.filename as string;
  
  if (!filename) {
    return res.status(400).json({ error: 'filename parameter is required' });
  }

  const hotFolder = getHotFolder();
  const filePath = path.join(hotFolder, filename);

  // Prevent Directory Traversal
  const absolutePath = path.resolve(filePath);
  if (!absolutePath.startsWith(hotFolder)) {
    return res.status(403).json({ error: 'Access denied: Invalid file path' });
  }

  if (!fs.existsSync(absolutePath)) {
    return res.status(404).json({ error: 'Scanned file not found' });
  }

  // Determine content type
  const ext = path.extname(absolutePath).toLowerCase();
  let contentType = 'application/octet-stream';
  if (ext === '.pdf') contentType = 'application/pdf';
  else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
  else if (ext === '.png') contentType = 'image/png';

  res.setHeader('Content-Type', contentType);

  // Send the file and delete it after sending is complete
  res.sendFile(absolutePath, (err) => {
    if (err) {
      console.error(`Error sending file ${filename}:`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream scan file' });
      }
      return;
    }

    // Delete scan file from hot folder upon successful download
    fs.unlink(absolutePath, (unlinkErr) => {
      if (unlinkErr) {
        console.error(`Failed to clean up scan file ${absolutePath}:`, unlinkErr);
      } else {
        console.log(`Cleaned up scan file from hot folder: ${absolutePath}`);
        
        // Also remove parent folder if it is a user subfolder and empty
        const parentDir = path.dirname(absolutePath);
        if (parentDir !== hotFolder) {
          fs.readdir(parentDir, (readdirErr, files) => {
            if (!readdirErr && files.length === 0) {
              fs.rmdir(parentDir, (rmdirErr) => {
                if (!rmdirErr) console.log(`Removed empty user scan subfolder: ${parentDir}`);
              });
            }
          });
        }
      }
    });
  });
};

// Discard/Delete scanned file explicitly (e.g. if skipped or aborted)
export const deleteScanFile = (req: AuthRequest, res: Response) => {
  const filename = req.query.filename as string;

  if (!filename) {
    return res.status(400).json({ error: 'filename parameter is required' });
  }

  const hotFolder = getHotFolder();
  const filePath = path.join(hotFolder, filename);

  // Prevent Directory Traversal
  const absolutePath = path.resolve(filePath);
  if (!absolutePath.startsWith(hotFolder)) {
    return res.status(403).json({ error: 'Access denied: Invalid file path' });
  }

  if (!fs.existsSync(absolutePath)) {
    return res.status(404).json({ error: 'Scanned file not found' });
  }

  fs.unlink(absolutePath, (unlinkErr) => {
    if (unlinkErr) {
      console.error(`Failed to discard scan file ${absolutePath}:`, unlinkErr);
      return res.status(500).json({ error: 'Failed to delete scan file' });
    }

    console.log(`Discarded scan file: ${absolutePath}`);
    
    // Cleanup parent directory if empty
    const parentDir = path.dirname(absolutePath);
    if (parentDir !== hotFolder) {
      fs.readdir(parentDir, (readdirErr, files) => {
        if (!readdirErr && files.length === 0) {
          fs.rmdir(parentDir, (rmdirErr) => {
            if (!rmdirErr) console.log(`Removed empty user scan subfolder: ${parentDir}`);
          });
        }
      });
    }

    return res.json({ success: true, message: 'Scan file discarded and cleaned up successfully' });
  });
};
