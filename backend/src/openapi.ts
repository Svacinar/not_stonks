/**
 * OpenAPI 3.0 Specification for Spending Dashboard API
 */

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Spending Dashboard API',
    description: 'API for managing personal finance transactions, categories, and rules',
    version: '1.0.0',
    contact: {
      name: 'API Support',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'API Base URL',
    },
  ],
  tags: [
    { name: 'Health', description: 'Health check endpoints' },
    { name: 'Transactions', description: 'Transaction management' },
    { name: 'Categories', description: 'Category management' },
    { name: 'Rules', description: 'Category rule management' },
    { name: 'Upload', description: 'File upload operations' },
    { name: 'Export', description: 'Data export operations' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns the health status of the API including database connectivity and version',
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
          '503': {
            description: 'Service is degraded (database unavailable)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
        },
      },
    },
    '/transactions': {
      get: {
        tags: ['Transactions'],
        summary: 'List transactions',
        description: 'Get a paginated list of transactions with optional filters',
        parameters: [
          { $ref: '#/components/parameters/startDate' },
          { $ref: '#/components/parameters/endDate' },
          { $ref: '#/components/parameters/bank' },
          { $ref: '#/components/parameters/category' },
          { $ref: '#/components/parameters/uncategorized' },
          { $ref: '#/components/parameters/search' },
          { $ref: '#/components/parameters/limit' },
          { $ref: '#/components/parameters/offset' },
          {
            name: 'sort',
            in: 'query',
            description: 'Column to sort by',
            schema: {
              type: 'string',
              enum: ['date', 'amount', 'description', 'bank', 'created_at'],
              default: 'date',
            },
          },
          {
            name: 'order',
            in: 'query',
            description: 'Sort order',
            schema: {
              type: 'string',
              enum: ['asc', 'desc'],
              default: 'desc',
            },
          },
        ],
        responses: {
          '200': {
            description: 'List of transactions',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TransactionListResponse' },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/transactions/stats': {
      get: {
        tags: ['Transactions'],
        summary: 'Get transaction statistics',
        description: 'Get aggregate statistics for transactions with optional filters',
        parameters: [
          { $ref: '#/components/parameters/startDate' },
          { $ref: '#/components/parameters/endDate' },
          { $ref: '#/components/parameters/bank' },
          { $ref: '#/components/parameters/category' },
        ],
        responses: {
          '200': {
            description: 'Transaction statistics',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TransactionStats' },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/transactions/{id}': {
      get: {
        tags: ['Transactions'],
        summary: 'Get a transaction',
        description: 'Get a single transaction by ID',
        parameters: [{ $ref: '#/components/parameters/id' }],
        responses: {
          '200': {
            description: 'Transaction details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TransactionWithCategory' },
              },
            },
          },
          '400': {
            description: 'Invalid ID parameter',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Transaction not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Transactions'],
        summary: 'Update a transaction',
        description: "Update a transaction's category. Automatically creates a rule from the description keyword.",
        parameters: [{ $ref: '#/components/parameters/id' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  category_id: {
                    type: 'integer',
                    nullable: true,
                    description: 'Category ID to assign (null to remove category)',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated transaction',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TransactionWithCategory' },
              },
            },
          },
          '400': {
            description: 'Invalid request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Transaction or category not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Transactions'],
        summary: 'Delete a transaction',
        description: 'Delete a transaction by ID',
        parameters: [{ $ref: '#/components/parameters/id' }],
        responses: {
          '200': {
            description: 'Transaction deleted',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DeleteResponse' },
              },
            },
          },
          '400': {
            description: 'Invalid ID parameter',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Transaction not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/categories': {
      get: {
        tags: ['Categories'],
        summary: 'List categories',
        description: 'Get all categories with transaction counts',
        responses: {
          '200': {
            description: 'List of categories',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CategoryListResponse' },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Categories'],
        summary: 'Create a category',
        description: 'Create a new category',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateCategoryRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Category created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Category' },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '409': {
            description: 'Category name already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/categories/{id}': {
      get: {
        tags: ['Categories'],
        summary: 'Get a category',
        description: 'Get a single category with stats',
        parameters: [{ $ref: '#/components/parameters/id' }],
        responses: {
          '200': {
            description: 'Category details with stats',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CategoryWithStats' },
              },
            },
          },
          '400': {
            description: 'Invalid ID parameter',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Category not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Categories'],
        summary: 'Update a category',
        description: 'Update a category name and/or color',
        parameters: [{ $ref: '#/components/parameters/id' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateCategoryRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated category',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Category' },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Category not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '409': {
            description: 'Category name already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Categories'],
        summary: 'Delete a category',
        description: 'Delete a category. Transactions with this category will be set to uncategorized.',
        parameters: [{ $ref: '#/components/parameters/id' }],
        responses: {
          '200': {
            description: 'Category deleted',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CategoryDeleteResponse' },
              },
            },
          },
          '400': {
            description: 'Invalid ID parameter',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Category not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/rules': {
      get: {
        tags: ['Rules'],
        summary: 'List rules',
        description: 'Get all category rules with category names',
        responses: {
          '200': {
            description: 'List of rules',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RuleListResponse' },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Rules'],
        summary: 'Create a rule',
        description: 'Create a new category rule',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateRuleRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Rule created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RuleWithCategory' },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Category not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '409': {
            description: 'Rule with this keyword already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/rules/apply': {
      post: {
        tags: ['Rules'],
        summary: 'Apply rules',
        description: 'Re-apply all rules to uncategorized transactions',
        responses: {
          '200': {
            description: 'Rules applied',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApplyRulesResponse' },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/rules/{id}': {
      patch: {
        tags: ['Rules'],
        summary: 'Update a rule',
        description: 'Update a rule keyword and/or category',
        parameters: [{ $ref: '#/components/parameters/id' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateRuleRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated rule',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RuleWithCategory' },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Rule or category not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '409': {
            description: 'Rule with this keyword already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Rules'],
        summary: 'Delete a rule',
        description: 'Delete a category rule',
        parameters: [{ $ref: '#/components/parameters/id' }],
        responses: {
          '200': {
            description: 'Rule deleted',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DeleteResponse' },
              },
            },
          },
          '400': {
            description: 'Invalid ID parameter',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Rule not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/upload': {
      post: {
        tags: ['Upload'],
        summary: 'Upload bank statements',
        description: 'Upload one or more bank statement files (CSV, TXT, XLSX, XLS)',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  files: {
                    type: 'array',
                    items: {
                      type: 'string',
                      format: 'binary',
                    },
                    description: 'Bank statement files (max 10 files, 5MB each)',
                  },
                },
                required: ['files'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Files uploaded and processed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UploadResponse' },
              },
            },
          },
          '400': {
            description: 'Invalid file or upload error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '429': {
            description: 'Rate limit exceeded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/export/transactions': {
      get: {
        tags: ['Export'],
        summary: 'Export transactions',
        description: 'Export transactions with optional filters in CSV or JSON format',
        parameters: [
          { $ref: '#/components/parameters/startDate' },
          { $ref: '#/components/parameters/endDate' },
          { $ref: '#/components/parameters/bank' },
          { $ref: '#/components/parameters/category' },
          { $ref: '#/components/parameters/uncategorized' },
          { $ref: '#/components/parameters/search' },
          { $ref: '#/components/parameters/format' },
        ],
        responses: {
          '200': {
            description: 'Exported transactions',
            content: {
              'text/csv': {
                schema: {
                  type: 'string',
                  description: 'CSV formatted transaction data',
                },
              },
              'application/json': {
                schema: { $ref: '#/components/schemas/ExportTransactionsResponse' },
              },
            },
          },
          '400': {
            description: 'Invalid format parameter',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/export/summary': {
      get: {
        tags: ['Export'],
        summary: 'Export summary',
        description: 'Export summary report grouped by category and month',
        parameters: [
          { $ref: '#/components/parameters/startDate' },
          { $ref: '#/components/parameters/endDate' },
          { $ref: '#/components/parameters/bank' },
          { $ref: '#/components/parameters/category' },
          { $ref: '#/components/parameters/uncategorized' },
          { $ref: '#/components/parameters/search' },
          { $ref: '#/components/parameters/format' },
        ],
        responses: {
          '200': {
            description: 'Exported summary',
            content: {
              'text/csv': {
                schema: {
                  type: 'string',
                  description: 'CSV formatted summary data',
                },
              },
              'application/json': {
                schema: { $ref: '#/components/schemas/ExportSummaryResponse' },
              },
            },
          },
          '400': {
            description: 'Invalid format parameter',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    parameters: {
      id: {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Resource ID',
        schema: {
          type: 'integer',
          minimum: 1,
        },
      },
      startDate: {
        name: 'startDate',
        in: 'query',
        description: 'Filter by start date (YYYY-MM-DD)',
        schema: {
          type: 'string',
          format: 'date',
        },
      },
      endDate: {
        name: 'endDate',
        in: 'query',
        description: 'Filter by end date (YYYY-MM-DD)',
        schema: {
          type: 'string',
          format: 'date',
        },
      },
      bank: {
        name: 'bank',
        in: 'query',
        description: 'Filter by bank name',
        schema: {
          type: 'string',
          enum: ['CSOB', 'Raiffeisen', 'Revolut'],
        },
      },
      category: {
        name: 'category',
        in: 'query',
        description: 'Filter by category ID',
        schema: {
          type: 'integer',
        },
      },
      uncategorized: {
        name: 'uncategorized',
        in: 'query',
        description: 'Filter to only uncategorized transactions (set to "true")',
        schema: {
          type: 'string',
          enum: ['true', 'false'],
        },
      },
      search: {
        name: 'search',
        in: 'query',
        description: 'Search in transaction descriptions',
        schema: {
          type: 'string',
        },
      },
      limit: {
        name: 'limit',
        in: 'query',
        description: 'Maximum number of results (max 500)',
        schema: {
          type: 'integer',
          default: 50,
          maximum: 500,
        },
      },
      offset: {
        name: 'offset',
        in: 'query',
        description: 'Number of results to skip',
        schema: {
          type: 'integer',
          default: 0,
        },
      },
      format: {
        name: 'format',
        in: 'query',
        description: 'Export format',
        schema: {
          type: 'string',
          enum: ['csv', 'json'],
          default: 'csv',
        },
      },
    },
    schemas: {
      HealthResponse: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['ok', 'degraded'],
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
          },
          version: {
            type: 'string',
          },
          database: {
            type: 'object',
            properties: {
              connected: {
                type: 'boolean',
              },
              error: {
                type: 'string',
              },
            },
            required: ['connected'],
          },
        },
        required: ['status', 'timestamp', 'version', 'database'],
      },
      Transaction: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          date: { type: 'string', format: 'date' },
          amount: { type: 'number' },
          description: { type: 'string' },
          bank: { type: 'string', enum: ['CSOB', 'Raiffeisen', 'Revolut'] },
          category_id: { type: 'integer', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'date', 'amount', 'description', 'bank', 'created_at'],
      },
      TransactionWithCategory: {
        allOf: [
          { $ref: '#/components/schemas/Transaction' },
          {
            type: 'object',
            properties: {
              category_name: { type: 'string', nullable: true },
              category_color: { type: 'string', nullable: true },
            },
          },
        ],
      },
      TransactionListResponse: {
        type: 'object',
        properties: {
          transactions: {
            type: 'array',
            items: { $ref: '#/components/schemas/TransactionWithCategory' },
          },
          total: { type: 'integer' },
          limit: { type: 'integer' },
          offset: { type: 'integer' },
        },
        required: ['transactions', 'total', 'limit', 'offset'],
      },
      TransactionStats: {
        type: 'object',
        properties: {
          total_count: { type: 'integer' },
          total_amount: { type: 'number' },
          by_category: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                count: { type: 'integer' },
                sum: { type: 'number' },
              },
              required: ['name', 'count', 'sum'],
            },
          },
          by_bank: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', enum: ['CSOB', 'Raiffeisen', 'Revolut'] },
                count: { type: 'integer' },
                sum: { type: 'number' },
              },
              required: ['name', 'count', 'sum'],
            },
          },
          by_month: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                month: { type: 'string' },
                count: { type: 'integer' },
                sum: { type: 'number' },
              },
              required: ['month', 'count', 'sum'],
            },
          },
          date_range: {
            type: 'object',
            properties: {
              min: { type: 'string' },
              max: { type: 'string' },
            },
            required: ['min', 'max'],
          },
        },
        required: ['total_count', 'total_amount', 'by_category', 'by_bank', 'by_month', 'date_range'],
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
        },
        required: ['id', 'name', 'color'],
      },
      CategoryWithCount: {
        allOf: [
          { $ref: '#/components/schemas/Category' },
          {
            type: 'object',
            properties: {
              transaction_count: { type: 'integer' },
            },
            required: ['transaction_count'],
          },
        ],
      },
      CategoryWithStats: {
        allOf: [
          { $ref: '#/components/schemas/CategoryWithCount' },
          {
            type: 'object',
            properties: {
              total_amount: { type: 'number' },
            },
            required: ['total_amount'],
          },
        ],
      },
      CategoryListResponse: {
        type: 'object',
        properties: {
          categories: {
            type: 'array',
            items: { $ref: '#/components/schemas/CategoryWithCount' },
          },
        },
        required: ['categories'],
      },
      CreateCategoryRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
          color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
        },
        required: ['name', 'color'],
      },
      UpdateCategoryRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
          color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
        },
      },
      CategoryDeleteResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          deleted: { type: 'integer' },
          transactions_affected: { type: 'integer' },
        },
        required: ['success', 'deleted', 'transactions_affected'],
      },
      Rule: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          keyword: { type: 'string' },
          category_id: { type: 'integer' },
          created_at: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'keyword', 'category_id', 'created_at'],
      },
      RuleWithCategory: {
        allOf: [
          { $ref: '#/components/schemas/Rule' },
          {
            type: 'object',
            properties: {
              category_name: { type: 'string' },
            },
            required: ['category_name'],
          },
        ],
      },
      RuleListResponse: {
        type: 'object',
        properties: {
          rules: {
            type: 'array',
            items: { $ref: '#/components/schemas/RuleWithCategory' },
          },
        },
        required: ['rules'],
      },
      CreateRuleRequest: {
        type: 'object',
        properties: {
          keyword: { type: 'string', minLength: 1 },
          category_id: { type: 'integer' },
        },
        required: ['keyword', 'category_id'],
      },
      UpdateRuleRequest: {
        type: 'object',
        properties: {
          keyword: { type: 'string', minLength: 1 },
          category_id: { type: 'integer' },
        },
      },
      ApplyRulesResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          categorized: { type: 'integer' },
          total_uncategorized: { type: 'integer' },
          message: { type: 'string' },
        },
        required: ['success', 'categorized'],
      },
      UploadResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          imported: { type: 'integer' },
          duplicates: { type: 'integer' },
          byBank: {
            type: 'object',
            additionalProperties: { type: 'integer' },
          },
        },
        required: ['success', 'imported', 'duplicates', 'byBank'],
      },
      ExportTransactionsResponse: {
        type: 'object',
        properties: {
          exported_at: { type: 'string', format: 'date-time' },
          count: { type: 'integer' },
          transactions: {
            type: 'array',
            items: { $ref: '#/components/schemas/TransactionWithCategory' },
          },
        },
        required: ['exported_at', 'count', 'transactions'],
      },
      ExportSummaryResponse: {
        type: 'object',
        properties: {
          exported_at: { type: 'string', format: 'date-time' },
          totals: {
            type: 'object',
            properties: {
              transaction_count: { type: 'integer' },
              total_amount: { type: 'number' },
              average_amount: { type: 'number' },
              date_range: {
                type: 'object',
                properties: {
                  min: { type: 'string' },
                  max: { type: 'string' },
                },
              },
            },
          },
          by_category: { type: 'array', items: { type: 'object' } },
          by_month: { type: 'array', items: { type: 'object' } },
          by_category_month: { type: 'array', items: { type: 'object' } },
        },
        required: ['exported_at', 'totals', 'by_category', 'by_month', 'by_category_month'],
      },
      DeleteResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          deleted: { type: 'integer' },
        },
        required: ['success', 'deleted'],
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [false] },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'object' },
            },
            required: ['code', 'message'],
          },
        },
        required: ['success', 'error'],
      },
    },
  },
};
