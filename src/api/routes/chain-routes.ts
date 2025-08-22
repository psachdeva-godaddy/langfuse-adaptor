import { Router, Request, Response } from 'express';
import { ChainController } from '../controllers/chain-controller';
import { IRoutingStrategy } from '../strategies/routing-strategy';
import { 
  validate, 
  validateId, 
  validatePagination, 
  commonSchemas 
} from '../middleware/validation';
import { asyncHandler } from '../middleware/error-handler';
import { 
  createChainSchema, 
  updateChainSchema, 
  chainExecutionSchema 
} from '../../utils/validation';
import Joi from 'joi';

/**
 * Create chain routes using the controller pattern
 */
export const createChainRoutes = (routingStrategy: IRoutingStrategy): Router => {
  const router = Router();
  const chainController = new ChainController(routingStrategy);

  // Create chain
  router.post('/', 
    validate({ body: createChainSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      await chainController.createChain(req, res);
    })
  );

  // Get chain by ID
  router.get('/:id',
    validateId,
    asyncHandler(async (req: Request, res: Response) => {
      await chainController.getChain(req, res);
    })
  );

  // Update chain
  router.put('/:id',
    validateId,
    validate({ body: updateChainSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      await chainController.updateChain(req, res);
    })
  );

  // List chains
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
        executionOrder: Joi.string().valid('sequential', 'parallel').optional(),
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      await chainController.listChains(req, res);
    })
  );

  // Execute chain
  router.post('/:id/execute',
    validateId,
    validate({ body: chainExecutionSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      await chainController.executeChain(req, res);
    })
  );

  // Delete chain
  router.delete('/:id',
    validateId,
    asyncHandler(async (req: Request, res: Response) => {
      await chainController.deleteChain(req, res);
    })
  );

  // Search chains
  router.post('/search',
    validate({
      body: Joi.object({
        name: Joi.string().optional(),
        tags: Joi.array().items(Joi.string()).optional(),
        author: Joi.string().optional(),
        executionOrder: Joi.string().valid('sequential', 'parallel').optional(),
        dateRange: Joi.object({
          start: Joi.date().optional(),
          end: Joi.date().optional(),
        }).optional(),
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      await chainController.searchChains(req, res);
    })
  );

  // Validate chain
  router.post('/:id/validate',
    validateId,
    asyncHandler(async (req: Request, res: Response) => {
      await chainController.validateChain(req, res);
    })
  );

  // Get chain versions
  router.get('/:id/versions',
    validateId,
    asyncHandler(async (req: Request, res: Response) => {
      await chainController.getChainVersions(req, res);
    })
  );

  // Get chain execution history
  router.get('/:id/executions',
    validateId,
    validatePagination,
    asyncHandler(async (req: Request, res: Response) => {
      await chainController.getChainExecutions(req, res);
    })
  );

  // Health check for chain service
  router.get('/health/check',
    asyncHandler(async (req: Request, res: Response) => {
      await chainController.getHealth(req, res);
    })
  );

  return router;
};
