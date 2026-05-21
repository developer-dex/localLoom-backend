import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'staging', 'test').default('development'),
  PORT: Joi.number().default(5000),
  API_PREFIX: Joi.string().default('/api'),

  DB_HOST: Joi.string().default('127.0.0.1'),
  DB_PORT: Joi.number().default(5432),
  DB_NAME: Joi.string().required().description('PostgreSQL database name'),
  DB_USER: Joi.string().required().description('PostgreSQL user'),
  DB_PASSWORD: Joi.string().required().description('PostgreSQL password'),

  JWT_ACCESS_SECRET: Joi.string().required().description('JWT access token secret'),
  JWT_REFRESH_SECRET: Joi.string().required().description('JWT refresh token secret'),
  JWT_ACCESS_EXPIRY: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRY: Joi.string().default('7d'),

  CORS_ORIGIN: Joi.string().default('*'),

  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000),
  RATE_LIMIT_MAX: Joi.number().default(100),

  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),

  MAX_FILE_SIZE: Joi.number().default(5242880),
  UPLOAD_DIR: Joi.string().default('uploads'),

  SERVER_HOST: Joi.string().default(''),

  // Twilio (required in production, optional in development — dev mode uses hardcoded OTP)
  TWILIO_ACCOUNT_SID: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional().default(''),
  }),
  TWILIO_AUTH_TOKEN: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional().default(''),
  }),
  TWILIO_VERIFY_SERVICE_SID: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional().default(''),
  }),
  TWILIO_MESSAGING_SERVICE_SID: Joi.string().optional().default(''),

  // OTP config
  OTP_EXPIRY_MINUTES: Joi.number().default(5),
  OTP_MAX_ATTEMPTS: Joi.number().default(3),
  OTP_DEV_CODE: Joi.string().default('123456'),

  // Email (optional — absence triggers dev mode in EmailService)
  EMAIL_HOST: Joi.string().optional().default(''),
  EMAIL_PORT: Joi.number().optional().default(587),
  EMAIL_USER: Joi.string().optional().default(''),
  EMAIL_PASS: Joi.string().optional().default(''),
  EMAIL_FROM: Joi.string().optional().default(''),

  // ABN Lookup (Australian Business Register)
  ABN_LOOKUP_GUID: Joi.string().optional().default(''),

  // AI Classifier (Anthropic Claude)
  AI_MODE: Joi.string().valid('development', 'production').default('development'),
  ANTHROPIC_API_KEY: Joi.string().allow('').default(''),
  ANTHROPIC_CLASSIFIER_MODEL: Joi.string().default('claude-haiku-4-5'),
  AI_CLASSIFIER_MAX_TOKENS: Joi.number().integer().min(1).default(256),
  AI_CLASSIFIER_TEMPERATURE: Joi.number().min(0).max(1).default(0),
  AI_CLASSIFIER_TIMEOUT_MS: Joi.number().integer().min(1).default(15000),
  AI_CLASSIFIER_RATE_LIMIT_MAX: Joi.number().integer().min(1).default(30),
  AI_CLASSIFIER_RATE_LIMIT_WINDOW_MS: Joi.number().integer().min(1).default(60000),
  AI_CLASSIFIER_CATALOG_CACHE_TTL_MS: Joi.number().integer().min(0).default(60000),
  AI_CLASSIFIER_DEBUG_LOG_PROMPT: Joi.boolean().truthy('true').falsy('false').default(false),
})
  .unknown()
  .required();

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Environment validation error: ${error.message}`);
}

export const env = {
  nodeEnv: envVars.NODE_ENV as string,
  port: envVars.PORT as number,
  apiPrefix: envVars.API_PREFIX as string,
  isProduction: envVars.NODE_ENV === 'production',
  isDevelopment: envVars.NODE_ENV === 'development',
  backendBaseUrl: envVars.BACKEND_BASE_URL,

  db: {
    host: envVars.DB_HOST as string,
    port: envVars.DB_PORT as number,
    name: envVars.DB_NAME as string,
    user: envVars.DB_USER as string,
    password: envVars.DB_PASSWORD as string,
  },

  jwt: {
    accessSecret: envVars.JWT_ACCESS_SECRET as string,
    refreshSecret: envVars.JWT_REFRESH_SECRET as string,
    accessExpiry: envVars.JWT_ACCESS_EXPIRY as string,
    refreshExpiry: envVars.JWT_REFRESH_EXPIRY as string,
  },

  cors: {
    origin: envVars.CORS_ORIGIN as string,
  },

  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS as number,
    max: envVars.RATE_LIMIT_MAX as number,
  },

  log: {
    level: envVars.LOG_LEVEL as string,
  },

  upload: {
    maxFileSize: envVars.MAX_FILE_SIZE as number,
    dir: envVars.UPLOAD_DIR as string,
  },

  serverHost: envVars.SERVER_HOST as string,

  twilio: {
    accountSid: envVars.TWILIO_ACCOUNT_SID as string,
    authToken: envVars.TWILIO_AUTH_TOKEN as string,
    verifyServiceSid: envVars.TWILIO_VERIFY_SERVICE_SID as string,
    messagingServiceSid: envVars.TWILIO_MESSAGING_SERVICE_SID as string,
  },

  otp: {
    expiryMinutes: envVars.OTP_EXPIRY_MINUTES as number,
    maxAttempts: envVars.OTP_MAX_ATTEMPTS as number,
    devCode: envVars.OTP_DEV_CODE as string,
  },

  email: {
    host: envVars.EMAIL_HOST as string,
    port: envVars.EMAIL_PORT as number,
    user: envVars.EMAIL_USER as string,
    pass: envVars.EMAIL_PASS as string,
    from: envVars.EMAIL_FROM as string,
  },

  abnLookup: {
    guid: envVars.ABN_LOOKUP_GUID as string,
  },

  aiClassifier: {
    aiMode: envVars.AI_MODE as 'development' | 'production',
    anthropicApiKey: envVars.ANTHROPIC_API_KEY as string,
    model: envVars.ANTHROPIC_CLASSIFIER_MODEL as string,
    maxTokens: envVars.AI_CLASSIFIER_MAX_TOKENS as number,
    temperature: envVars.AI_CLASSIFIER_TEMPERATURE as number,
    timeoutMs: envVars.AI_CLASSIFIER_TIMEOUT_MS as number,
    rateLimitMax: envVars.AI_CLASSIFIER_RATE_LIMIT_MAX as number,
    rateLimitWindowMs: envVars.AI_CLASSIFIER_RATE_LIMIT_WINDOW_MS as number,
    catalogCacheTtlMs: envVars.AI_CLASSIFIER_CATALOG_CACHE_TTL_MS as number,
    debugLogPrompt: envVars.AI_CLASSIFIER_DEBUG_LOG_PROMPT as boolean,
  },
};
