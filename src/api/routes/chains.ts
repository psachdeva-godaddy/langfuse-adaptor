import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { LangfusePromptSDK } from '../../sdk';
import { 
  validate, 
  validateId, 
  validatePagination, 
  commonSchemas 
} from '../middleware/validation';
import { 
  asyncHandler, 
  createSuccessResponse, 
  NotFoundError, 
  ConflictError,
  BadRequestError 
} from '../middleware/error-handler';
import { 
  createChainSchema, 
  updateChainSchema, 
  chainExecutionSchema 
} from '../../utils/validation';

export const createChainRoutes = (sdk: LangfusePromptSDK): Router => {
  const router = Router();

  // Create chain
  router.post('/', 
    validate({ body: createChainSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const chain = await sdk.chains.createChain(req.body);
        res.status(201).json(createSuccessResponse(chain));
      } catch (error) {
        if ((error as Error).message.includes('already exists')) {
          throw new ConflictError((error as Error).message);
        }
        if ((error as Error).message.includes('validation failed')) {
          throw new BadRequestError((error as Error).message);
        }
        throw error;
      }
    })
  );

  // Get chain by ID (latest version)
  router.get('/:id',
    validateId,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const chain = await sdk.chains.getChain(req.params.id);
        res.json(createSuccessResponse(chain));
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new NotFoundError('Chain', req.params.id);
        }
        throw error;
      }
    })
  );

  // Get specific version of chain
  router.get('/:id/versions/:version',
    validate({
      params: Joi.object({
        id: commonSchemas.id,
        version: commonSchemas.version,
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const chain = await sdk.chains.getChain(req.params.id, req.params.version);
        res.json(createSuccessResponse(chain));
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new NotFoundError('Chain version', `${req.params.id}@${req.params.version}`);
        }
        throw error;
      }
    })
  );

  // Update chain
  router.put('/:id',
    validateId,
    validate({ body: updateChainSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const chain = await sdk.chains.updateChain(req.params.id, req.body);
        res.json(createSuccessResponse(chain));
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new NotFoundError('Chain', req.params.id);
        }
        if ((error as Error).message.includes('validation failed')) {
          throw new BadRequestError((error as Error).message);
        }
        throw error;
      }
    })
  );

  // Delete chain
  router.delete('/:id',
    validateId,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        await sdk.chains.deleteChain(req.params.id);
        res.status(204).send();
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new NotFoundError('Chain', req.params.id);
        }
        throw error;
      }
    })
  );

  // List chains
  router.get('/',
    validatePagination,
    validate({
      query: Joi.object({
        page: commonSchemas.page,
        limit: commonSchemas.limit,
        sortBy: Joi.string().valid('name', 'createdAt', 'updatedAt', 'stepCount').optional(),
        sortOrder: Joi.string().valid('asc', 'desc').optional().default('desc'),
        name: Joi.string().optional(),
        tags: Joi.alternatives().try(
          Joi.string(),
          Joi.array().items(Joi.string())
        ).optional(),
        executionOrder: Joi.string().valid('sequential', 'parallel').optional(),
        hasStepType: Joi.string().valid('prompt', 'template').optional(),
        minStepCount: Joi.number().integer().min(0).optional(),
        maxStepCount: Joi.number().integer().min(0).optional(),
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const { 
        page, 
        limit, 
        sortBy, 
        sortOrder, 
        name, 
        tags, 
        executionOrder, 
        hasStepType,
        minStepCount,
        maxStepCount 
      } = req.query;
      
      // Parse tags if it's a string
      let parsedTags: string[] | undefined;
      if (tags) {
        parsedTags = Array.isArray(tags) ? tags as string[] : [tags as string];
      }

      const stepCountFilter = (minStepCount || maxStepCount) ? {
        min: minStepCount ? Number(minStepCount) : undefined,
        max: maxStepCount ? Number(maxStepCount) : undefined,
      } : undefined;

      const chains = await sdk.chains.listChains({
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
        filters: {
          name: name as string,
          tags: parsedTags,
          executionOrder: executionOrder as any,
          hasStepType: hasStepType as any,
          stepCount: stepCountFilter,
        },
      });

      res.json(createSuccessResponse(chains));
    })
  );

  // Execute chain
  router.post('/:id/execute',
    validateId,
    validate({ body: chainExecutionSchema.fork('chainId', (schema) => schema.optional()) }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const executionRequest = {
          ...req.body,
          chainId: req.params.id,
        };
        const result = await sdk.chains.executeChain(executionRequest);
        res.json(createSuccessResponse(result));
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new NotFoundError('Chain', req.params.id);
        }
        if ((error as Error).message.includes('validation failed')) {
          throw new BadRequestError((error as Error).message);
        }
        throw error;
      }
    })
  );

  // Validate chain
  router.get('/:id/validate',
    validateId,
    validate({
      query: Joi.object({
        version: commonSchemas.version,
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const validation = await sdk.chains.validateChain(
          req.params.id,
          req.query.version as string
        );
        res.json(createSuccessResponse(validation));
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new NotFoundError('Chain', req.params.id);
        }
        throw error;
      }
    })
  );

  // Get chain dependencies
  router.get('/:id/dependencies',
    validateId,
    validate({
      query: Joi.object({
        version: commonSchemas.version,
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const dependencies = await sdk.chains.getChainDependencies(
          req.params.id,
          req.query.version as string
        );
        res.json(createSuccessResponse(dependencies));
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new NotFoundError('Chain', req.params.id);
        }
        throw error;
      }
    })
  );

  // Get chain execution plan
  router.get('/:id/execution-plan',
    validateId,
    validate({
      query: Joi.object({
        version: commonSchemas.version,
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const executionPlan = await sdk.chains.getChainExecutionPlan(
          req.params.id,
          req.query.version as string
        );
        res.json(createSuccessResponse(executionPlan));
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new NotFoundError('Chain', req.params.id);
        }
        throw error;
      }
    })
  );

  // Search chains
  router.post('/search',
    validate({
      body: Joi.object({
        name: Joi.string().optional(),
        tags: Joi.array().items(Joi.string()).optional(),
        executionOrder: Joi.string().valid('sequential', 'parallel').optional(),
        hasStepType: Joi.string().valid('prompt', 'template').optional(),
        stepCount: Joi.object({
          min: Joi.number().integer().min(0).optional(),
          max: Joi.number().integer().min(0).optional(),
        }).optional(),
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const results = await sdk.chains.searchChains(req.body);
      res.json(createSuccessResponse(results));
    })
  );

  // Clone chain
  router.post('/:id/clone',
    validateId,
    validate({
      body: Joi.object({
        newName: commonSchemas.name,
        version: commonSchemas.version,
        description: Joi.string().max(500).optional(),
        tags: commonSchemas.tags,
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { newName, version, description, tags } = req.body;
        const clonedChain = await sdk.chains.cloneChain(
          req.params.id,
          newName,
          { version, description, tags }
        );
        res.status(201).json(createSuccessResponse(clonedChain));
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new NotFoundError('Chain', req.params.id);
        }
        if ((error as Error).message.includes('already exists')) {
          throw new ConflictError((error as Error).message);
        }
        throw error;
      }
    })
  );

  return router;
};
