import dotenv from "dotenv";

// Load environment variables FIRST (before any imports that use them)
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { logger } from "./config/logger";
import "./config/firebase"; // Firebase initializes automatically on import
import { swaggerSpec } from "./config/swagger";
import routes from "./routes";
import paymentRoutes from "./routes/payments";
import { errorHandler } from "./middleware/errorHandler";

// Create Express app
const app = express();
const PORT = process.env.PORT || 8888;

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable for Swagger UI
  })
);

// CORS configuration - allow multiple origins
// Read from environment variable or use defaults for development
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:8080",
      "http://localhost:8081", // Vite auto-increment port
      "https://e85f917e-442a-4cd9-8b6c-ece9d8844a07.lovableproject.com",
    ];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked request from origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Stripe webhook route with raw body parser (MUST be before global JSON parser)
// This is required for Stripe webhook signature verification
app.post(
  '/api/v1/payments/webhook',
  express.raw({ type: 'application/json' }),
  paymentRoutes
);

// Body parser middleware (for all other routes)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting middleware
// General API rate limit - 100 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
    });
  },
});

// Strict rate limit for authentication endpoints - 5 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window per IP
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'You have exceeded the authentication rate limit. Please try again in 15 minutes.',
    });
  },
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// Apply stricter rate limiting to auth endpoints
// Note: These must be defined before the main routes to take precedence
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

// Swagger documentation (root path)
app.use("/", swaggerUi.serve);
app.get(
  "/",
  swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "TIPU Academy API Documentation",
  })
);

// API routes
app.use("/api", routes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 TIPU API running on port ${PORT}`);
  logger.info(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
  logger.info(`📚 Swagger docs: http://localhost:${PORT}`);
  logger.info(`🌐 API base URL: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM signal received: closing HTTP server");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT signal received: closing HTTP server");
  process.exit(0);
});

export default app;
