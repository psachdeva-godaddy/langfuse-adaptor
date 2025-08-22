import { Router, Request, Response } from 'express';
import { PromptController } from '../controllers/prompt-controller';
import { IRoutingStrategy } from '../strategies/routing-strategy';
import { 
  validate, 
  validateId, 
  validatePagination, 
  commonSchemas 
} from '../middleware/validation';
import { asyncHandler } from '../middleware/error-handler';
import { 
  createPromptSchema, 
  updatePromptSchema, 
  rollbackRequestSchema 
} from '../../utils/validation';
import Joi from 'joi';

/**
 * Create prompt routes using the controller pattern
 * This follows the sequence diagram architecture
 */
export const createPromptRoutes = (routingStrategy: IRoutingStrategy): Router => {
  const router = Router();
  const promptController = new PromptController(routingStrategy);

  // Create prompt
  router.post('/', 
    validate({ body: createPromptSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      await promptController.createPrompt(req, res);
    })
  );

  // Get prompt by ID (latest version)
  router.get('/:id',
    validateId,
    asyncHandler(async (req: Request, res: Response) => {
      await promptController.getPrompt(req, res);
    })
  );

  // Get specific version of prompt
  router.get('/:id/versions/:version',
    validateId,
    validate({
      params: Joi.object({
        id: commonSchemas.id.required(),
        version: Joi.string().required(),
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      await promptController.getPromptVersion(req, res);
    })
  );

  // Update prompt
  router.put('/:id',
    validateId,
    validate({ body: updatePromptSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      await promptController.updatePrompt(req, res);
    })
  );

  // List prompts
  router.get('/',
    validatePagination,
    validate({
      query: Joi.object({
        page: commonSchemas.page,
        limit: commonSchemas.limit,
        sortBy: Joi.string().valid('name', 'createdAt', 'updatedAt', 'version').optional(),
        sortOrder: Joi.string().valid('asc', 'desc').optional().default('desc'),
        name: Joi.string().optional(),
        tags: Joi.alternatives().try(
          Joi.string(),
          Joi.array().items(Joi.string())
        ).optional(),
        author: Joi.string().optional(),
        type: Joi.string().valid('text', 'chat').optional(),
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      await promptController.listPrompts(req, res);
    })
  );

  // Get prompt versions
  router.get('/:id/versions',
    validateId,
    asyncHandler(async (req: Request, res: Response) => {
      await promptController.getPromptVersions(req, res);
    })
  );

  // Rollback prompt
  router.post('/:id/rollback',
    validateId,
    validate({ body: rollbackRequestSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      await promptController.rollbackPrompt(req, res);
    })
  );

  // Delete prompt
  router.delete('/:id',
    validateId,
    asyncHandler(async (req: Request, res: Response) => {
      await promptController.deletePrompt(req, res);
    })
  );

  // Search prompts
  router.post('/search',
    validate({
      body: Joi.object({
        name: Joi.string().optional(),
        content: Joi.string().optional(),
        tags: Joi.array().items(Joi.string()).optional(),
        author: Joi.string().optional(),
        type: Joi.string().valid('text', 'chat').optional(),
        dateRange: Joi.object({
          start: Joi.date().optional(),
          end: Joi.date().optional(),
        }).optional(),
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      await promptController.searchPrompts(req, res);
    })
  );

  // Validate prompt
  router.post('/:id/validate',
    validateId,
    asyncHandler(async (req: Request, res: Response) => {
      await promptController.validatePrompt(req, res);
    })
  );

  // Health check for prompt service
  router.get('/health/check',
    asyncHandler(async (req: Request, res: Response) => {
      await promptController.getHealth(req, res);
    })
  );

  return router;
};
