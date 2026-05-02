import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const buildServers = () => {
  const servers = [
    {
      url: `http://localhost:${env.port}${env.apiPrefix}/v1`,
      description: 'Localhost (v1 API)',
    },
    {
      url: `http://localhost:${env.port}${env.apiPrefix}/admin`,
      description: 'Localhost (Admin API)',
    },
  ];

  // Add network IP servers if SERVER_HOST is configured
  if (env.serverHost) {
    servers.push(
      {
        url: `http://${env.serverHost}:${env.port}${env.apiPrefix}/v1`,
        description: `Network IP (v1 API) — ${env.serverHost}`,
      },
      {
        url: `http://${env.serverHost}:${env.port}${env.apiPrefix}/admin`,
        description: `Network IP (Admin API) — ${env.serverHost}`,
      },
    );
  }

  return servers;
};

const swaggerDefinition: swaggerJsdoc.OAS3Definition = {
  openapi: '3.0.0',
  info: {
    title: 'LocalLoom API Documentation',
    version: '1.0.0',
    description: 'REST API documentation for the LocalLoom backend service',
    contact: {
      name: 'LocalLoom Team',
    },
  },
  servers: buildServers(),
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
};

export const swaggerOptions: swaggerJsdoc.Options = {
  definition: swaggerDefinition,
  apis: ['./src/modules/**/*.swagger.ts', './src/docs/components/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
