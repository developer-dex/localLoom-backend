import { Sequelize } from 'sequelize';
import { env } from './env';
import { logger } from '../common/utils/logger';

export const sequelize = new Sequelize(env.db.name, env.db.user, env.db.password, {
  host: env.db.host,
  port: env.db.port,
  dialect: 'postgres',
  logging: env.isDevelopment ? (msg) => logger.debug(msg) : false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  pool: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true,
  },
});

export const connectDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logger.info('PostgreSQL connected successfully');
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL:', error);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await sequelize.close();
  logger.info('PostgreSQL disconnected gracefully');
};
