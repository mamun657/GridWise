import dns from "node:dns";
import mongoose from "mongoose";
import { config, isMongoConfigured } from "../config";
import { logger } from "../utils/logger";

let connectionState: "disconnected" | "connecting" | "connected" | "error" = "disconnected";

export const connectMongo = async (): Promise<boolean> => {
  if (!isMongoConfigured()) {
    logger.info("MongoDB URI not configured; skipping MongoDB connection");
    connectionState = "disconnected";
    return false;
  }
  if (mongoose.connection.readyState === 1) {
    connectionState = "connected";
    return true;
  }
  try {
    connectionState = "connecting";
    if (config.mongoUri?.startsWith("mongodb+srv://") && config.mongoDnsServers.length > 0) {
      dns.setServers(config.mongoDnsServers);
    }
    mongoose.set("strictQuery", true);
    await mongoose.connect(config.mongoUri as string, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 5,
    });
    connectionState = "connected";
    logger.info("MongoDB connected");
    return true;
  } catch (e) {
    connectionState = "error";
    logger.warn("MongoDB connection failed", {
      error: e instanceof Error ? e.message : "unknown",
    });
    return false;
  }
};

export const disconnectMongo = async (): Promise<void> => {
  if (mongoose.connection.readyState === 1) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
};

export const getMongoState = (): string => connectionState;
