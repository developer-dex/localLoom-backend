import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
import { env } from './env';

const buildServers = () => {
  const servers = [];

  // Production / deployed URL (e.g. Render sets RENDER_EXTERNAL_URL automatically,
  // or you can set SERVER_URL manually in the environment)
  const deployedUrl = process.env.RENDER_EXTERNAL_URL || process.env.SERVER_URL;
  if (deployedUrl) {
    const base = deployedUrl.replace(/\/$/, '');
    servers.push(
      {
        url: `${base}${env.apiPrefix}/v1`,
        description: 'Production (v1 API)',
      },
      {
        url: `${base}${env.apiPrefix}/admin`,
        description: 'Production (Admin API)',
      },
    );
  }

  // Localhost fallback
  servers.push(
    {
      url: `http://localhost:${env.port}${env.apiPrefix}/v1`,
      description: 'Localhost (v1 API)',
    },
    {
      url: `http://localhost:${env.port}${env.apiPrefix}/admin`,
      description: 'Localhost (Admin API)',
    },
  );

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

// Resolve swagger file paths that work in both dev (ts-node, src/) and prod (node, dist/)
const isCompiled = __filename.endsWith('.js');
const modulesGlob = isCompiled
  ? path.join(__dirname, '../modules/**/*.swagger.js')
  : path.join(__dirname, '../modules/**/*.swagger.ts');
const docsGlob = isCompiled
  ? path.join(__dirname, '../docs/components/*.js')
  : path.join(__dirname, '../docs/components/*.ts');

export const swaggerOptions: swaggerJsdoc.Options = {
  definition: swaggerDefinition,
  apis: [modulesGlob, docsGlob],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
