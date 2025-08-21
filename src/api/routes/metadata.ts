import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { LangfusePromptSDK } from '../../sdk';
import { 
  validate, 
  validatePagination, 
  commonSchemas 
} from '../middleware/validation';
import { 
  asyncHandler, 
  createSuccessResponse, 
  NotFoundError 
} from '../middleware/error-handler';

export const createMetadataRoutes = (sdk: LangfusePromptSDK): Router => {
  const router = Router();

  // Get overall statistics
  router.get('/stats',
    asyncHandler(async (req: Request, res: Response) => {
      const stats = await sdk.metadata.getOverallStats();
      res.json(createSuccessResponse(stats));
    })
  );

  // Get all resource metadata
  router.get('/resources',
    validatePagination,
    asyncHandler(async (req: Request, res: Response) => {
      const metadata = await sdk.metadata.getAllResourceMetadata();
      
      // Apply pagination manually since this is in-memory
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;
      const start = (page - 1) * limit;
      const end = start + limit;
      
      const paginatedMetadata = metadata.slice(start, end);
      
      res.json(createSuccessResponse({
        data: paginatedMetadata,
        pagination: {
          page,
          limit,
          total: metadata.length,
          totalPages: Math.ceil(metadata.length / limit),
        },
      }));
    })
  );

  // Search resources
  router.post('/resources/search',
    validate({
      body: Joi.object({
        name: Joi.string().optional(),
        type: Joi.string().valid('prompt', 'template', 'chain').optional(),
        author: Joi.string().optional(),
        tags: Joi.array().items(Joi.string()).optional(),
        createdAfter: Joi.date().optional(),
        createdBefore: Joi.date().optional(),
        updatedAfter: Joi.date().optional(),
        updatedBefore: Joi.date().optional(),
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const results = await sdk.metadata.searchResources(req.body);
      res.json(createSuccessResponse(results));
    })
  );

  // Get resources by tag
  router.get('/tags/:tag/resources',
    validate({
      params: Joi.object({
        tag: Joi.string().required(),
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const resources = await sdk.metadata.getResourcesByTag(req.params.tag);
      res.json(createSuccessResponse(resources));
    })
  );

  // Get resources by author
  router.get('/authors/:author/resources',
    validate({
      params: Joi.object({
        author: Joi.string().required(),
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const resources = await sdk.metadata.getResourcesByAuthor(req.params.author);
      res.json(createSuccessResponse(resources));
    })
  );

  // Get tag analysis
  router.get('/tags/:tag/analysis',
    validate({
      params: Joi.object({
        tag: Joi.string().required(),
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const analysis = await sdk.metadata.getTagAnalysis(req.params.tag);
      res.json(createSuccessResponse(analysis));
    })
  );

  // Get all tags analysis
  router.get('/tags/analysis',
    asyncHandler(async (req: Request, res: Response) => {
      const analysis = await sdk.metadata.getAllTagsAnalysis();
      res.json(createSuccessResponse(analysis));
    })
  );

  // Get author analysis
  router.get('/authors/:author/analysis',
    validate({
      params: Joi.object({
        author: Joi.string().required(),
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const analysis = await sdk.metadata.getAuthorAnalysis(req.params.author);
      res.json(createSuccessResponse(analysis));
    })
  );

  // Get all authors analysis
  router.get('/authors/analysis',
    asyncHandler(async (req: Request, res: Response) => {
      const analysis = await sdk.metadata.getAllAuthorsAnalysis();
      res.json(createSuccessResponse(analysis));
    })
  );

  // Get recent activity
  router.get('/activity/recent',
    validate({
      query: Joi.object({
        limit: Joi.number().integer().min(1).max(100).optional().default(10),
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const limit = Number(req.query.limit) || 10;
      const activity = await sdk.metadata.getRecentActivity(limit);
      res.json(createSuccessResponse(activity));
    })
  );

  // Get resource duplicates
  router.get('/duplicates',
    asyncHandler(async (req: Request, res: Response) => {
      const duplicates = await sdk.metadata.getResourceDuplicates();
      res.json(createSuccessResponse(duplicates));
    })
  );

  // Get unused tags
  router.get('/tags/unused',
    asyncHandler(async (req: Request, res: Response) => {
      const unusedTags = await sdk.metadata.getUnusedTags();
      res.json(createSuccessResponse(unusedTags));
    })
  );

  // Get orphaned resources
  router.get('/resources/orphaned',
    asyncHandler(async (req: Request, res: Response) => {
      const orphaned = await sdk.metadata.getOrphanedResources();
      res.json(createSuccessResponse(orphaned));
    })
  );

  // Export all metadata
  router.get('/export',
    asyncHandler(async (req: Request, res: Response) => {
      const exportData = await sdk.metadata.exportMetadata();
      
      // Set headers for file download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="langfuse-metadata-${new Date().toISOString().split('T')[0]}.json"`);
      
      res.json(exportData);
    })
  );

  // Get system health and statistics
  router.get('/system',
    asyncHandler(async (req: Request, res: Response) => {
      const systemStats = await sdk.getSystemStats();
      res.json(createSuccessResponse(systemStats));
    })
  );

  // Validate all resources
  router.get('/validation',
    asyncHandler(async (req: Request, res: Response) => {
      const validation = await sdk.validateAllResources();
      res.json(createSuccessResponse(validation));
    })
  );

  // Global search across all resource types
  router.post('/search',
    validate({
      body: Joi.object({
        query: Joi.string().min(1).required(),
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const results = await sdk.globalSearch(req.body.query);
      res.json(createSuccessResponse(results));
    })
  );

  // Get system export (all data)
  router.get('/export/all',
    asyncHandler(async (req: Request, res: Response) => {
      const exportData = await sdk.exportAll();
      
      // Set headers for file download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="langfuse-full-export-${new Date().toISOString().split('T')[0]}.json"`);
      
      res.json(exportData);
    })
  );

  return router;
};
