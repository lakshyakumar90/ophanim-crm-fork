import pino from "pino";
import { config } from "../config/env.js";

// Configure pino logger
export const logger = pino({
  level: config.server.isDevelopment ? "debug" : "info",
  transport: config.server.isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
        },
      }
    : {
        target: "pino/file",
        options: {
          destination: "./logs/server.log",
          mkdir: true,
        },
      },
  base: {
    env: config.server.nodeEnv,
  },
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
});

// Create child logger with request context
export const createRequestLogger = (requestId: string, userId?: string) => {
  return logger.child({
    requestId,
    userId,
  });
};

export type Logger = typeof logger;
