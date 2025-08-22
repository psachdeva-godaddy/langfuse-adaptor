import { Request, Response } from 'express';
import { 
  createSuccessResponse, 
  NotFoundError, 
  ConflictError, 
  BadRequestError,
  InternalServerError 
} from '../middleware/error-handler';

/**
 * Base controller class providing common functionality for all controllers
 */
export abstract class BaseController {
  /**
   * Handle common error scenarios and convert them to appropriate HTTP errors
   */
  protected handleError(error: Error, resourceType: string, resourceId?: string): never {
    const message = error.message.toLowerCase();
    
    if (message.includes('not found')) {
      throw new NotFoundError(resourceType, resourceId || 'unknown');
    }
    
    if (message.includes('already exists')) {
      throw new ConflictError(error.message);
    }
    
    if (message.includes('validation failed') || message.includes('invalid')) {
      throw new BadRequestError(error.message);
    }
    
    // Log unexpected errors for monitoring
    console.error(`Unexpected error in ${this.constructor.name}:`, error);
    throw new InternalServerError('An unexpected error occurred');
  }

  /**
   * Create a standardized success response
   */
  protected success(data: any, statusCode: number = 200) {
    return {
      statusCode,
      response: createSuccessResponse(data)
    };
  }

  /**
   * Create a standardized created response
   */
  protected created(data: any) {
    return this.success(data, 201);
  }

  /**
   * Send response with proper status code
   */
  protected sendResponse(res: Response, result: { statusCode: number; response: any }) {
    res.status(result.statusCode).json(result.response);
  }

  /**
   * Extract pagination parameters from request
   */
  protected getPaginationParams(req: Request) {
    return {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 50,
      sortBy: req.query.sortBy as string,
      sortOrder: (req.query.sortOrder as string) || 'desc'
    };
  }

  /**
   * Extract filter parameters from request query
   */
  protected getFilterParams(req: Request, allowedFilters: string[]) {
    const filters: Record<string, any> = {};
    
    allowedFilters.forEach(filter => {
      if (req.query[filter] !== undefined) {
        let value = req.query[filter];
        
        // Handle array parameters (like tags)
        if (typeof value === 'string' && value.includes(',')) {
          value = value.split(',').map(v => v.trim());
        } else if (Array.isArray(value)) {
          value = value as string[];
        }
        
        filters[filter] = value;
      }
    });
    
    return filters;
  }
}
