const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());

// Load the OpenAPI YAML file
// We expect it to be placed inside the container at /usr/src/app/api-docs/openapi.yaml
const swaggerDocument = YAML.load(path.join(__dirname, 'api-docs', 'openapi.yaml'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ service: 'docs-service', status: 'healthy', timestamp: new Date().toISOString() });
});
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ service: 'docs-service', status: 'healthy', timestamp: new Date().toISOString(), uptime: process.uptime(), version: '1.0.0' });
});

// Swagger UI configuration
// We serve it at /api/docs to match the Ingress routing
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customSiteTitle: "AeroLink API Documentation",
  customCss: '.swagger-ui .topbar { display: none }'
}));

const PORT = process.env.PORT || 80;

app.listen(PORT, () => {
  console.log(`Docs Service running on port ${PORT}`);
  console.log(`Swagger UI available at http://localhost:${PORT}/api/docs`);
});
