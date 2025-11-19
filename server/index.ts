import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedDatabase } from "./seed";
import { wsManager } from "./websocket";

const app = express();

// Trust Replit's proxy for secure cookies
app.set('trust proxy', 1);

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Session configuration with PostgreSQL store
// Always use PostgreSQL session store when DATABASE_URL is available for reliable session persistence
const PgSession = connectPgSimple(session);
const isProduction = process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1";

// Create a separate pool for session store
// Configure SSL based on database server capabilities
const sessionPool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false
    })
  : undefined;

const sessionStore = sessionPool 
  ? new PgSession({
      pool: sessionPool,
      createTableIfMissing: true,
    })
  : undefined;

// In Replit, even dev environment is served over HTTPS via proxy, so we need secure cookies
// Check if we're in Replit by looking for REPL_ID or REPLIT_DB_URL env vars
const isReplit = !!process.env.REPL_ID || !!process.env.REPLIT_DB_URL;

app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    proxy: true, // Trust the reverse proxy for secure cookies
    cookie: {
      secure: isReplit || isProduction, // Secure cookies in Replit (always HTTPS) or production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: "lax", // Use lax for better compatibility in Replit's environment
      path: "/", // Explicitly set cookie path
    },
  })
);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    console.log('[STARTUP] Node version:', process.version);
    console.log('[STARTUP] NODE_ENV:', process.env.NODE_ENV);
    console.log('[STARTUP] REPLIT_DEPLOYMENT:', process.env.REPLIT_DEPLOYMENT);
    console.log('[STARTUP] PORT:', process.env.PORT);
    console.log('[STARTUP] DATABASE_URL exists:', !!process.env.DATABASE_URL);
    
    // Verify essential environment variables in production/published deployment
    const isProductionEnv = process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === '1';
    if (isProductionEnv) {
      if (!process.env.DATABASE_URL) {
        console.error('[Startup Error] DATABASE_URL environment variable is not set in production');
        process.exit(1);
      }
      console.log('[Production Mode] Starting server with production configuration');
    }

    console.log('[STARTUP] Registering routes...');
    const server = await registerRoutes(app);
    console.log('[STARTUP] Routes registered successfully');

    // Initialize WebSocket server
    console.log('[STARTUP] Initializing WebSocket...');
    wsManager.initialize(server);
    console.log('[STARTUP] WebSocket initialized');

    console.log('[STARTUP] Running database seed...');
    await seedDatabase();
    console.log('[STARTUP] Database seed complete');

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // Log error details in production for debugging
      console.error('[Server Error]', {
        status,
        message,
        stack: err.stack,
        NODE_ENV: process.env.NODE_ENV
      });

      res.status(status).json({ message });
    });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  // Use REPLIT_DEPLOYMENT to detect published apps (NODE_ENV may not be set)
  const isPublished = process.env.REPLIT_DEPLOYMENT === "1";
  if (!isPublished && app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    console.log('[STARTUP] Starting server on port', port, 'with host 0.0.0.0');
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      console.log('[STARTUP] ✅ SERVER IS RUNNING on port', port);
      log(`serving on port ${port}`);
    });
  } catch (error) {
    console.error('[Server Startup Error]', error);
    process.exit(1);
  }
})();
