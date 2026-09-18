import { buildApp } from "./app";
import { config } from "./config";
import { logger } from "./utils/logger";
import { connectMongo, disconnectMongo } from "./models/mongoose";

const main = async (): Promise<void> => {
  const app = buildApp();
  await connectMongo();

  const server = app.listen(config.port, "0.0.0.0", () => {
    logger.info("GridWise server listening", {
      port: config.port,
      env: config.nodeEnv,
    });
  });

  const shutdown = async (signal: string) => {
    logger.info("Shutdown requested", { signal });
    server.close(() => {
      void disconnectMongo().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 5000).unref();
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
};

main().catch((e) => {
  logger.error("Fatal startup error", { error: e instanceof Error ? e.message : "unknown" });
  process.exit(1);
});
