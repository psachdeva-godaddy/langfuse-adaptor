import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiResponse, ValidationError } from '../../types/common';

export interface ValidationOptions {
  body?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  headers?: Joi.ObjectSchema;
}

export const validate = (options: ValidationOptions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: ValidationError[] = [];

    // Validate request body
    if (options.body) {
      const { error } = options.body.validate(req.body, { abortEarly: false });
      if (error) {
        errors.push(...error.details.map(detail => ({
          field: `body.${detail.path.join('.')}`,
          message: detail.message,
          code: detail.type,
        })));
      }
    }

    // Validate request params
    if (options.params) {
      const { error } = options.params.validate(req.params, { abortEarly: false });
      if (error) {
        errors.push(...error.details.map(detail => ({
          field: `params.${detail.path.join('.')}`,
          message: detail.message,
          code: detail.type,
        })));
      }
    }

    // Validate request query
    if (options.query) {
      const { error } = options.query.validate(req.query, { abortEarly: false });
      if (error) {
        errors.push(...error.details.map(detail => ({
          field: `query.${detail.path.join('.')}`,
          message: detail.message,
          code: detail.type,
        })));
      }
    }

    // Validate request headers
    if (options.headers) {
      const { error } = options.headers.validate(req.headers, { abortEarly: false });
      if (error) {
        errors.push(...error.details.map(detail => ({
          field: `headers.${detail.path.join('.')}`,
          message: detail.message,
          code: detail.type,
        })));
      }
    }

    if (errors.length > 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors,
        },
      };
      return res.status(400).json(response);
    }

    next();
  };
};

// Common validation schemas
export const commonSchemas = {
  id: Joi.string().uuid().required(),
  name: Joi.string().min(1).max(100).pattern(/^[a-zA-Z0-9_-]+$/).required(),
  version: Joi.string().pattern(/^\d+\.\d+\.\d+$/).optional(),
  tags: Joi.array().items(Joi.string().max(30)).max(10).optional(),
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(50),
};

// Validation middleware for common parameters
export const validateId = validate({
  params: Joi.object({
    id: commonSchemas.id,
  }),
});

export const validateIdAndVersion = validate({
  params: Joi.object({
    id: commonSchemas.id,
    version: commonSchemas.version,
  }),
});

export const validatePagination = validate({
  query: Joi.object({
    page: commonSchemas.page,
    limit: commonSchemas.limit,
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').optional().default('desc'),
  }),
});

// Content-Type validation middleware
export const requireJsonContent = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    if (!req.is('application/json')) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          message: 'Content-Type must be application/json',
          code: 'INVALID_CONTENT_TYPE',
        },
      };
      return res.status(400).json(response);
    }
  }
  next();
};

// Request size validation middleware
export const validateRequestSize = (maxSize: number = 1024 * 1024) => { // 1MB default
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('content-length') || '0', 10);
    
    if (contentLength > maxSize) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          message: `Request body too large. Maximum size is ${maxSize} bytes`,
          code: 'REQUEST_TOO_LARGE',
        },
      };
      return res.status(413).json(response);
    }
    
    next();
  };
};

// Rate limiting validation (simple in-memory implementation)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => { // 100 requests per 15 minutes
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetTime) {
        rateLimitStore.delete(key);
      }
    }
    
    const clientData = rateLimitStore.get(clientId);
    
    if (!clientData) {
      rateLimitStore.set(clientId, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (now > clientData.resetTime) {
      rateLimitStore.set(clientId, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (clientData.count >= maxRequests) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          message: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
        },
      };
      
      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': Math.ceil(clientData.resetTime / 1000).toString(),
      });
      
      return res.status(429).json(response);
    }
    
    clientData.count++;
    
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': (maxRequests - clientData.count).toString(),
      'X-RateLimit-Reset': Math.ceil(clientData.resetTime / 1000).toString(),
    });
    
    next();
  };
};

// API key validation middleware (if needed in the future)
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.get('X-API-Key') || req.get('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        message: 'API key is required',
        code: 'MISSING_API_KEY',
      },
    };
    return res.status(401).json(response);
  }
  
  // In a real implementation, you would validate the API key against a database
  // For now, we'll skip this validation as specified in requirements
  next();
};
