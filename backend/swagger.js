const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI Performance Testing Assistant - E-Commerce API',
      version: '1.0.0',
      description: `
        Complete E-Commerce API for performance testing.
        This API is designed to be used by the AI Performance Testing Assistant
        to discover business transactions, generate load tests, and analyze performance.
      `,
      contact: {
        name: 'AI Performance Testing Assistant',
        email: 'support@perf-testing.ai'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token from /api/auth/login'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            email: { type: 'string', format: 'email' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            role: { type: 'string', enum: ['customer', 'admin'] },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number', format: 'float' },
            compare_price: { type: 'number', format: 'float' },
            category_id: { type: 'integer' },
            category_name: { type: 'string' },
            image_url: { type: 'string' },
            stock_quantity: { type: 'integer' },
            sku: { type: 'string' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Cart: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            user_id: { type: 'integer' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  product_id: { type: 'integer' },
                  name: { type: 'string' },
                  price: { type: 'number' },
                  quantity: { type: 'integer' },
                  image_url: { type: 'string' }
                }
              }
            },
            total: { type: 'number' }
          }
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            order_number: { type: 'string' },
            user_id: { type: 'integer' },
            status: { type: 'string' },
            subtotal: { type: 'number' },
            tax: { type: 'number' },
            shipping: { type: 'number' },
            total: { type: 'number' },
            payment_status: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  product_id: { type: 'integer' },
                  product_name: { type: 'string' },
                  quantity: { type: 'integer' },
                  unit_price: { type: 'number' },
                  total_price: { type: 'number' }
                }
              }
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', format: 'password' }
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'first_name', 'last_name'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', format: 'password' },
            first_name: { type: 'string' },
            last_name: { type: 'string' }
          }
        },
        AddToCartRequest: {
          type: 'object',
          required: ['product_id', 'quantity'],
          properties: {
            product_id: { type: 'integer' },
            quantity: { type: 'integer', minimum: 1 }
          }
        },
        CreateOrderRequest: {
          type: 'object',
          required: ['shipping_address', 'payment_method'],
          properties: {
            shipping_address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                zip: { type: 'string' },
                country: { type: 'string' }
              }
            },
            payment_method: { 
              type: 'string', 
              enum: ['credit_card', 'debit_card', 'paypal', 'stripe']
            }
          }
        },
        ProductSearchRequest: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search query' },
            category_id: { type: 'integer' },
            min_price: { type: 'number' },
            max_price: { type: 'number' },
            sort_by: { type: 'string', enum: ['name', 'price', 'created_at'] },
            sort_order: { type: 'string', enum: ['asc', 'desc'] },
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
          }
        }
      }
    },
    tags: [
      { name: 'Authentication', description: 'User authentication endpoints' },
      { name: 'Products', description: 'Product browsing and search' },
      { name: 'Cart', description: 'Shopping cart management' },
      { name: 'Orders', description: 'Order management and history' },
      { name: 'Users', description: 'User profile management' },
      { name: 'Admin', description: 'Admin dashboard and management' },
      { name: 'Health', description: 'API health check' }
    ],
    paths: {
      '/api/auth/register': {
        post: {
          tags: ['Authentication'],
          summary: 'Register a new user account',
          operationId: 'registerUser',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RegisterRequest' }
              }
            }
          },
          responses: {
            201: { description: 'User registered successfully' },
            400: { description: 'Invalid input or email already exists' }
          }
        }
      },
      '/api/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'Login and receive JWT token',
          operationId: 'loginUser',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginRequest' }
              }
            }
          },
          responses: {
            200: { description: 'Login successful, returns JWT token' },
            401: { description: 'Invalid credentials' }
          }
        }
      },
      '/api/auth/refresh': {
        post: {
          tags: ['Authentication'],
          summary: 'Refresh JWT token',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Token refreshed successfully' }
          }
        }
      },
      '/api/products': {
        get: {
          tags: ['Products'],
          summary: 'List products with search, filter, and pagination',
          operationId: 'listProducts',
          parameters: [
            { name: 'q', in: 'query', schema: { type: 'string' } },
            { name: 'category_id', in: 'query', schema: { type: 'integer' } },
            { name: 'min_price', in: 'query', schema: { type: 'number' } },
            { name: 'max_price', in: 'query', schema: { type: 'number' } },
            { name: 'sort_by', in: 'query', schema: { type: 'string', enum: ['name', 'price', 'created_at'] } },
            { name: 'sort_order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }
          ],
          responses: {
            200: { description: 'List of products with pagination info' }
          }
        }
      },
      '/api/products/categories': {
        get: {
          tags: ['Products'],
          summary: 'List all product categories',
          operationId: 'listCategories',
          responses: {
            200: { description: 'List of categories' }
          }
        }
      },
      '/api/products/{slug}': {
        get: {
          tags: ['Products'],
          summary: 'Get product details by slug',
          operationId: 'getProductBySlug',
          parameters: [
            { name: 'slug', in: 'path', required: true, schema: { type: 'string' } }
          ],
          responses: {
            200: { description: 'Product details' },
            404: { description: 'Product not found' }
          }
        }
      },
      '/api/products/{id}/reviews': {
        get: {
          tags: ['Products'],
          summary: 'Get product reviews',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          responses: {
            200: { description: 'List of reviews' }
          }
        },
        post: {
          tags: ['Products'],
          summary: 'Add a product review',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    rating: { type: 'integer', minimum: 1, maximum: 5 },
                    title: { type: 'string' },
                    comment: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            201: { description: 'Review created' }
          }
        }
      },
      '/api/cart': {
        get: {
          tags: ['Cart'],
          summary: 'Get current user cart',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Cart contents with items and total' }
          }
        },
        post: {
          tags: ['Cart'],
          summary: 'Add item to cart',
          security: [{ bearerAuth: [] }],
          operationId: 'addToCart',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AddToCartRequest' }
              }
            }
          },
          responses: {
            200: { description: 'Item added to cart' },
            400: { description: 'Invalid product or insufficient stock' }
          }
        },
        delete: {
          tags: ['Cart'],
          summary: 'Clear entire cart',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Cart cleared' }
          }
        }
      },
      '/api/cart/items/{itemId}': {
        put: {
          tags: ['Cart'],
          summary: 'Update cart item quantity',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'itemId', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    quantity: { type: 'integer', minimum: 0 }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Cart item updated' }
          }
        },
        delete: {
          tags: ['Cart'],
          summary: 'Remove item from cart',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'itemId', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          responses: {
            200: { description: 'Item removed from cart' }
          }
        }
      },
      '/api/orders': {
        get: {
          tags: ['Orders'],
          summary: 'Get user order history',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'List of user orders' }
          }
        },
        post: {
          tags: ['Orders'],
          summary: 'Create new order from cart',
          security: [{ bearerAuth: [] }],
          operationId: 'createOrder',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateOrderRequest' }
              }
            }
          },
          responses: {
            201: { description: 'Order created' },
            400: { description: 'Cart is empty or invalid' }
          }
        }
      },
      '/api/orders/{id}': {
        get: {
          tags: ['Orders'],
          summary: 'Get order details',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          responses: {
            200: { description: 'Order details with items' },
            404: { description: 'Order not found' }
          }
        }
      },
      '/api/orders/{id}/cancel': {
        post: {
          tags: ['Orders'],
          summary: 'Cancel an order',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          responses: {
            200: { description: 'Order cancelled' }
          }
        }
      },
      '/api/users/profile': {
        get: {
          tags: ['Users'],
          summary: 'Get user profile',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'User profile' }
          }
        },
        put: {
          tags: ['Users'],
          summary: 'Update user profile',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Profile updated' }
          }
        }
      },
      '/api/admin/stats': {
        get: {
          tags: ['Admin'],
          summary: 'Get admin dashboard statistics',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Dashboard statistics' }
          }
        }
      },
      '/api/admin/products': {
        get: {
          tags: ['Admin'],
          summary: 'Admin list all products with inventory',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'List of all products' }
          }
        },
        post: {
          tags: ['Admin'],
          summary: 'Create a new product',
          security: [{ bearerAuth: [] }],
          responses: {
            201: { description: 'Product created' }
          }
        }
      },
      '/api/admin/products/{id}': {
        put: {
          tags: ['Admin'],
          summary: 'Update product details',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          responses: {
            200: { description: 'Product updated' }
          }
        },
        delete: {
          tags: ['Admin'],
          summary: 'Delete a product',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          responses: {
            200: { description: 'Product deleted' }
          }
        }
      },
      '/api/admin/orders': {
        get: {
          tags: ['Admin'],
          summary: 'Admin list all orders',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'List of all orders' }
          }
        }
      },
      '/api/admin/orders/{id}/status': {
        put: {
          tags: ['Admin'],
          summary: 'Update order status',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          responses: {
            200: { description: 'Order status updated' }
          }
        }
      },
      '/api/admin/sales': {
        get: {
          tags: ['Admin'],
          summary: 'Get sales report data',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Sales report data' }
          }
        }
      },
      '/api/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check endpoint',
          responses: {
            200: { description: 'API health status' }
          }
        }
      }
    }
  },
  apis: []
};

module.exports = swaggerJsdoc(options);
