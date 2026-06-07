import { Sequelize } from 'sequelize';
import { env } from './env';
import { logger } from '../common/utils/logger';

export const sequelize = new Sequelize(env.db.name, env.db.user, env.db.password, {
  host: env.db.host,
  port: env.db.port,
  dialect: 'postgres',
  logging: env.isDevelopment ? (msg) => logger.debug(msg) : false,
  dialectOptions: {
    ...(env.isProduction && {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    }),
    connectTimeoutMS: 60000,
  },
  pool: {
    max: 20,
    min: 2,
    acquire: 60000,
    idle: 10000,
  },
  retry: {
    max: 5,
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true,
  },
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const connectDatabase = async (): Promise<void> => {
  const maxRetries = 5;
  const baseDelay = 3000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await sequelize.authenticate();
      logger.info('PostgreSQL connected successfully');
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        logger.error(`Failed to connect to PostgreSQL after ${maxRetries} attempts:`, error);
        process.exit(1);
      }
      const delay = baseDelay * attempt;
      logger.warn(
        `Database connection attempt ${attempt}/${maxRetries} failed. Retrying in ${delay / 1000}s...`
      );
      await sleep(delay);
    }
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await sequelize.close();
  logger.info('PostgreSQL disconnected gracefully');
};
