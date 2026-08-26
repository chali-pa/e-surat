import './config/dotenv-config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';

// Set environment variables to handle TLS issues with Node.js
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Import routes
import authRoutes from './routes/auth';
import suratRoutes from './routes/surat';
import suratKeluarRoutes from './routes/suratKeluar';
import profileRoutes from './routes/profile';
import googleRoutes from './routes/google';
import folderRoutes from './routes/folder';
import compressRoutes from './routes/compress';

// Import Google configuration
import { initializeGoogleServices } from './config/google';


// Initialize Google services
try {
  initializeGoogleServices();
} catch (error) {
  console.warn('Failed to initialize Google services:', error);
  console.warn('The application will continue, but Google Drive/Sheets features will not work');
}

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    // Allow exact match against configured origins
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow *.vercel.app subdomains dynamically
    if (/\.vercel\.app$/.test(origin)) return callback(null, true);
    callback(new Error(`CORS: Origin '${origin}' not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parsing middleware — no hard application-level cap.
// Infrastructure limits (Vercel payload size, Nginx client_max_body_size, etc.)
// are the effective ceiling; see backend/src/config/upload.ts for details.
app.use(express.json({ limit: '2gb' }));
app.use(express.urlencoded({ extended: true, limit: '2gb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Root health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'E-Surat API is running successfully.', environment: process.env.NODE_ENV || 'development' });
});

// Production health endpoint — does not expose secrets
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
// Shorthand aliases — frontend calls /api/login, /api/register directly
app.use('/api', authRoutes);
app.use('/api/surat', suratRoutes);
app.use('/api/surat-keluar', suratKeluarRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/google', googleRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/compress-pdf', compressRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start server only when NOT running in Vercel Serverless (which invokes app as handler)
if (!process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  }).on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Error: Port ${PORT} is already in use.`);
      console.error('Please kill the process using this port or use a different port.');
      console.error('You can use: taskkill /PID [PID] /F (Windows) or kill -9 [PID] (Linux/Mac)');
      console.error('Or set a different PORT in your .env file');
      process.exit(1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

export default app;
