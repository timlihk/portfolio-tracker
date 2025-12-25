import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.1.0',
  info: {
    title: 'Mangrove Portfolio API',
    version: '1.0.0',
    description: 'API docs for portfolio, pricing, and auth endpoints.'
  },
  servers: [
    { url: '/api/v1', description: 'Primary API' },
    { url: '/api', description: 'Internal (health/docs)' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      },
      sharedSecret: {
        type: 'apiKey',
        in: 'header',
        name: 'Authorization',
        description: 'Use format: Shared <secret>'
      }
    },
    schemas: {
      Stock: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          ticker: { type: 'string' },
          companyName: { type: 'string' },
          sector: { type: 'string' },
          shares: { type: 'number' },
          averageCost: { type: 'number' },
          currentPrice: { type: 'number' },
          currency: { type: 'string' },
          account: { type: 'string' },
          purchaseDate: { type: 'string', format: 'date' },
          notes: { type: 'string' }
        }
      },
      Bond: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          isin: { type: 'string' },
          bondType: { type: 'string' },
          faceValue: { type: 'number' },
          couponRate: { type: 'number' },
          maturityDate: { type: 'string', format: 'date' },
          purchasePrice: { type: 'number' },
          currentValue: { type: 'number' },
          currency: { type: 'string' },
          account: { type: 'string' }
        }
      },
      CashDeposit: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          depositType: { type: 'string' },
          amount: { type: 'number' },
          currency: { type: 'string' },
          interestRate: { type: 'number' },
          maturityDate: { type: 'string', format: 'date' },
          account: { type: 'string' },
          notes: { type: 'string' }
        }
      },
      Liability: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          liabilityType: { type: 'string' },
          outstandingBalance: { type: 'number' },
          currency: { type: 'string' },
          interestRate: { type: 'number' },
          status: { type: 'string' },
          account: { type: 'string' }
        }
      },
      Account: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          institution: { type: 'string' },
          accountType: { type: 'string' },
          accountNumber: { type: 'string' }
        }
      },
      AuthResponse: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          token: { type: 'string' },
          user: { type: 'object' }
        }
      }
    }
  },
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        responses: { 200: { description: 'OK' } }
      }
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with email/password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' }
                },
                required: ['email', 'password']
              }
            }
          }
        },
        responses: {
          200: { description: 'JWT issued', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          401: { description: 'Invalid credentials' }
        }
      }
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user (when enabled)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                  name: { type: 'string' }
                },
                required: ['email', 'password']
              }
            }
          }
        },
        responses: {
          201: { description: 'User created' },
          400: { description: 'Validation error' }
        }
      }
    },
    '/pricing/stock/{ticker}': {
      get: {
        tags: ['Pricing'],
        summary: 'Get stock price by ticker',
        parameters: [
          { name: 'ticker', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Price data' }, 404: { description: 'Not found' } }
      }
    },
    '/pricing/bond/{isin}': {
      get: {
        tags: ['Pricing'],
        summary: 'Get bond price by ISIN',
        parameters: [{ name: 'isin', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Price data' }, 404: { description: 'Not found' } }
      }
    },
    '/portfolio/stocks': {
      get: {
        tags: ['Portfolio - Stocks'],
        summary: 'List stocks',
        responses: { 200: { description: 'List of stocks', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Stock' } } } } } },
        security: [{ bearerAuth: [] }, { sharedSecret: [] }]
      },
      post: {
        tags: ['Portfolio - Stocks'],
        summary: 'Create stock',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Stock' } } }
        },
        responses: { 201: { description: 'Created' }, 400: { description: 'Validation error' } },
        security: [{ bearerAuth: [] }, { sharedSecret: [] }]
      }
    },
    '/portfolio/stocks/{id}': {
      put: {
        tags: ['Portfolio - Stocks'],
        summary: 'Update stock',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Stock' } } }
        },
        responses: { 200: { description: 'Updated' } },
        security: [{ bearerAuth: [] }, { sharedSecret: [] }]
      },
      delete: {
        tags: ['Portfolio - Stocks'],
        summary: 'Delete stock',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 204: { description: 'Deleted' } },
        security: [{ bearerAuth: [] }, { sharedSecret: [] }]
      }
    },
    '/portfolio/bonds': {
      get: {
        tags: ['Portfolio - Bonds'],
        summary: 'List bonds',
        responses: { 200: { description: 'List of bonds', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Bond' } } } } } },
        security: [{ bearerAuth: [] }, { sharedSecret: [] }]
      },
      post: {
        tags: ['Portfolio - Bonds'],
        summary: 'Create bond',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Bond' } } } },
        responses: { 201: { description: 'Created' } },
        security: [{ bearerAuth: [] }, { sharedSecret: [] }]
      }
    },
    '/portfolio/cash-deposits': {
      get: {
        tags: ['Portfolio - Cash'],
        summary: 'List cash/deposits',
        responses: { 200: { description: 'List of cash deposits', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/CashDeposit' } } } } } },
        security: [{ bearerAuth: [] }, { sharedSecret: [] }]
      },
      post: {
        tags: ['Portfolio - Cash'],
        summary: 'Create cash/deposit',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CashDeposit' } } } },
        responses: { 201: { description: 'Created' } },
        security: [{ bearerAuth: [] }, { sharedSecret: [] }]
      }
    },
    '/portfolio/liabilities': {
      get: {
        tags: ['Portfolio - Liabilities'],
        summary: 'List liabilities',
        responses: { 200: { description: 'List of liabilities', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Liability' } } } } } },
        security: [{ bearerAuth: [] }, { sharedSecret: [] }]
      },
      post: {
        tags: ['Portfolio - Liabilities'],
        summary: 'Create liability',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Liability' } } } },
        responses: { 201: { description: 'Created' } },
        security: [{ bearerAuth: [] }, { sharedSecret: [] }]
      }
    },
    '/portfolio/accounts': {
      get: {
        tags: ['Portfolio - Accounts'],
        summary: 'List accounts',
        responses: { 200: { description: 'List of accounts', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Account' } } } } } },
        security: [{ bearerAuth: [] }, { sharedSecret: [] }]
      },
      post: {
        tags: ['Portfolio - Accounts'],
        summary: 'Create account',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Account' } } } },
        responses: { 201: { description: 'Created' } },
        security: [{ bearerAuth: [] }, { sharedSecret: [] }]
      }
    }
  }
};

export const swaggerSpec = swaggerJsdoc({
  definition: swaggerDefinition,
  apis: []
});

export default swaggerSpec;
