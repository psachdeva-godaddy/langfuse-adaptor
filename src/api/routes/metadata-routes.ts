import { Router, Request, Response } from 'express';
import { MetadataController } from '../controllers/metadata-controller';
import { IRoutingStrategy } from '../strategies/routing-strategy';
import { 
  validate, 
  validatePagination, 
  commonSchemas 
} from '../middleware/validation';
import { asyncHandler } from '../middleware/error-handler';
import Joi from 'joi';

/**
 * Create metadata routes using the controller pattern
 */
export const createMetadataRoutes = (routingStrategy: IRoutingStrategy): Router => {
  const router = Router();
  const metadataController = new MetadataController(routingStrategy);

  // Get overall statistics
  router.get('/stats',
    asyncHandler(async (req: Request, res: Response) => {
      await metadataController.getOverallStats(req, res);
    })
  );

  // Get all resource metadata
  router.get('/resources',
    validatePagination,
    asyncHandler(async (req: Request, res: Response) => {
      await metadataController.getAllResourceMetadata(req, res);
    })
  );

  // Search resources
  router.post('/search',
    validate({
      body: Joi.object({
        query: Joi.string().min(1).required(),
        filters: Joi.object({
          type: Joi.array().items(Joi.string().valid('prompt', 'template', 'chain')).optional(),
          tags: Joi.array().items(Joi.string()).optional(),
          author: Joi.string().optional(),
          dateRange: Joi.object({
            start: Joi.date().optional(),
            end: Joi.date().optional(),
          }).optional(),
        }).optional(),
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      await metadataController.searchResources(req, res);
    })
  );

  // Get recent activity
  router.get('/activity',
    validate({
      query: Joi.object({
        limit: Joi.number().integer().min(1).max(100).optional().default(20),
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      await metadataController.getRecentActivity(req, res);
    })
  );

  // Get resource duplicates
  router.get('/duplicates',
    asyncHandler(async (req: Request, res: Response) => {
      await metadataController.getResourceDuplicates(req, res);
    })
  );

  // Get orphaned resources
  router.get('/orphaned',
    asyncHandler(async (req: Request, res: Response) => {
      await metadataController.getOrphanedResources(req, res);
    })
  );

  // Get system health and statistics
  router.get('/system',
    asyncHandler(async (req: Request, res: Response) => {
      await metadataController.getSystemStats(req, res);
    })
  );

  // Validate all resources
  router.get('/validation',
    asyncHandler(async (req: Request, res: Response) => {
      await metadataController.validateAllResources(req, res);
    })
  );

  // Global search across all resource types
  router.post('/search/global',
    validate({
      body: Joi.object({
        query: Joi.string().min(1).required(),
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      await metadataController.globalSearch(req, res);
    })
  );

  // Get system export (all data)
  router.get('/export/all',
    asyncHandler(async (req: Request, res: Response) => {
      await metadataController.exportAll(req, res);
    })
  );

  // Get tag analysis
  router.get('/tags/analysis',
    asyncHandler(async (req: Request, res: Response) => {
      await metadataController.getTagAnalysis(req, res);
    })
  );

  // Get author statistics
  router.get('/authors/stats',
    asyncHandler(async (req: Request, res: Response) => {
      await metadataController.getAuthorStats(req, res);
    })
  );

  // Health check for all services
  router.get('/health/check',
    asyncHandler(async (req: Request, res: Response) => {
      await metadataController.getHealth(req, res);
    })
  );

  return router;
};
