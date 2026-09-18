import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "..", "..", ".env") });

const env = (key: string, fallback?: string): string | undefined => {
  const v = process.env[key];
  if (v === undefined || v === "") return fallback;
  return v;
};

export const config = {
  port: Number(env("PORT", "4000")),
  nodeEnv: env("NODE_ENV", "development") as string,
  mongoUri: env("MONGODB_URI") as string | undefined,
  mongoDnsServers: (env("MONGODB_DNS_SERVERS", "1.1.1.1,8.8.8.8") as string)
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean),
  groqApiKey: env("GROQ_API_KEY") as string | undefined,
  groqModel: env("GROQ_MODEL", "openai/gpt-oss-120b") as string,
  groqUrl: "https://api.groq.com/openai/v1/chat/completions",
  groqTimeoutMs: Number(env("GROQ_TIMEOUT_MS", "20000")),
  groqMaxRetries: Number(env("GROQ_MAX_RETRIES", "2")),
  logLevel: env("LOG_LEVEL", "info") as string,
};

export const isMongoConfigured = (): boolean => {
  return !!config.mongoUri && config.mongoUri.length > 0;
};

export const isGroqConfigured = (): boolean => {
  return !!config.groqApiKey && config.groqApiKey.length > 0;
};
