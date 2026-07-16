import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";

const app = express();
const httpServer = createServer(app);

app.set('trust proxy', 1);

const isDev = process.env.NODE_ENV !== 'production';

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: isDev
          ? ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://challenges.cloudflare.com"]
          : ["'self'", "'unsafe-inline'", "https://challenges.cloudflare.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:", "https://www.bungie.net", "https://bungie.net", "https://images.contentstack.io"],
        connectSrc: isDev
          ? ["'self'", "https://www.bungie.net", "https://challenges.cloudflare.com", "wss:", "ws:"]
          : ["'self'", "https://www.bungie.net", "https://challenges.cloudflare.com"],
        frameSrc: ["https://challenges.cloudflare.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: {
      maxAge: 63072000,
      includeSubDomains: true,
      preload: true,
    },
    xFrameOptions: { action: "deny" },
    noSniff: true,
  })
);

const allowedOrigins = [
  'https://guardiangrid.io',
  'https://www.guardiangrid.io',
  'https://guardiangrid.net',
  'https://www.guardiangrid.net',
  process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : '',
  process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : '',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (isDev) {
      try {
        const hostname = new URL(origin).hostname;
        if (hostname.endsWith('.replit.dev') || hostname.endsWith('.repl.co')) return callback(null, true);
      } catch {}
    }
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret && process.env.NODE_ENV === 'production') {
  throw new Error('SESSION_SECRET environment variable is required in production');
}
app.use(cookieParser(sessionSecret || 'dev-secret-change-me'));

const CLOUDFLARE_IP_RANGES = [
  '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22',
  '141.101.64.0/18', '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20',
  '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13',
  '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
];

function ipInCidr(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split('/');
  const mask = ~(2 ** (32 - parseInt(bits)) - 1) >>> 0;
  const ipNum = ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct), 0) >>> 0;
  const rangeNum = range.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct), 0) >>> 0;
  return (ipNum & mask) === (rangeNum & mask);
}

function isCloudflareIp(ip: string): boolean {
  return CLOUDFLARE_IP_RANGES.some(cidr => ipInCidr(ip, cidr));
}

function normalizeToIPv4(ip: string): string | null {
  if (!ip) return null;
  const mapped = ip.replace(/^::ffff:/, '');
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(mapped)) return mapped;
  return null;
}

function getClientIp(req: express.Request): string {
  const cfIp = req.headers['cf-connecting-ip'] as string;
  if (cfIp && req.ip) {
    const proxyIp = normalizeToIPv4(req.ip);
    if (proxyIp && isCloudflareIp(proxyIp)) {
      return cfIp;
    }
  }
  return req.ip || 'unknown';
}

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' },
  validate: { trustProxy: false, xForwardedForHeader: false },
  keyGenerator: (req) => getClientIp(req),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please try again later.' },
  validate: { trustProxy: false, xForwardedForHeader: false },
  keyGenerator: (req) => getClientIp(req),
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many write requests. Please slow down.' },
  validate: { trustProxy: false, xForwardedForHeader: false },
  keyGenerator: (req) => getClientIp(req),
});

app.use('/api/', globalLimiter);
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many AI analysis requests. Please try again later.' },
  validate: { trustProxy: false, xForwardedForHeader: false },
  keyGenerator: (req) => getClientIp(req),
});

app.use('/api/auth/login', authLimiter);
app.use('/api/bungie/transfer', writeLimiter);
app.use('/api/bungie/equip', writeLimiter);
app.use('/api/bungie/equip-items', writeLimiter);
app.use('/api/bungie/pull-postmaster', writeLimiter);
app.use('/api/bungie/lock', writeLimiter);
app.use('/api/bungie/insert-plug', writeLimiter);
app.use('/api/loadouts', writeLimiter);
app.use('/api/ai/', aiLimiter);

app.use((req: Request, res: Response, next: NextFunction) => {
  const ua = req.headers['user-agent'];
  if (req.path.startsWith('/api/') && (!ua || ua.length < 5)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
});

app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

app.use(express.json({ limit: '100kb' }));

app.use(express.urlencoded({ extended: false, limit: '1mb' }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

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
        const body = JSON.stringify(capturedJsonResponse);
        logLine += ` :: ${body.length > 120 ? body.slice(0, 119) + '…' : body}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    const status = err.status || err.statusCode || 500;
    if (status < 500) {
      return res.status(status).json({ message: err.message || 'Request error' });
    }
    return res.status(500).json({ message: 'Internal server error' });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
