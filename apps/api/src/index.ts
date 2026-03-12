import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", prettyJSON());
app.use(
  "/api/*",
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  })
);

// Health check
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
  });
});

// API root
app.get("/", (c) => {
  return c.json({
    name: "NexoMail API",
    version: "0.1.0",
    docs: "/api/docs",
  });
});

const port = parseInt(process.env.PORT ?? "3001", 10);

console.log(`NexoMail API starting on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
