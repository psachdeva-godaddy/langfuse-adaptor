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
  createPromptSchema, 
  updatePromptSchema, 
  rollbackRequestSchema 
} from '../../utils/validation';

export const createPromptRoutes = (sdk: LangfusePromptSDK): Router => {
  const router = Router();

  // Create prompt
  router.post('/', 
    validate({ body: createPromptSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const prompt = await sdk.prompts.createPrompt(req.body);
        res.status(201).json(createSuccessResponse(prompt));
      } catch (error) {
        if ((error as Error).message.includes('already exists')) {
          throw new ConflictError((error as Error).message);
        }
        throw error;
      }
    })
  );

  // Get prompt by ID (latest version)
  router.get('/:id',
    validateId,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const prompt = await sdk.prompts.getPrompt(req.params.id);
        res.json(createSuccessResponse(prompt));
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new NotFoundError('Prompt', req.params.id);
        }
        throw error;
      }
    })
  );

  // Get specific version of prompt
  router.get('/:id/versions/:version',
    validate({
      params: Joi.object({
        id: commonSchemas.id,
        version: commonSchemas.version,
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const prompt = await sdk.prompts.getPromptVersion(req.params.id, req.params.version);
        res.json(createSuccessResponse(prompt));
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new NotFoundError('Prompt version', `${req.params.id}@${req.params.version}`);
        }
        throw error;
      }
    })
  );

  // Update prompt
  router.put('/:id',
    validateId,
    validate({ body: updatePromptSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const prompt = await sdk.prompts.updatePrompt(req.params.id, req.body);
        res.json(createSuccessResponse(prompt));
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new NotFoundError('Prompt', req.params.id);
        }
        throw error;
      }
    })
  );

  // Delete prompt
  router.delete('/:id',
    validateId,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        await sdk.prompts.deletePrompt(req.params.id);
        res.status(204).send();
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new NotFoundError('Prompt', req.params.id);
        }
        throw error;
      }
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
      const { page, limit, sortBy, sortOrder, name, tags, author, type } = req.query;
      
      // Parse tags if it's a string
      let parsedTags: string[] | undefined;
      if (tags) {
        parsedTags = Array.isArray(tags) ? tags as string[] : [tags as string];
      }

      const prompts = await sdk.prompts.listPrompts({
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
        filters: {
          name: name as string,
          tags: parsedTags,
          author: author as string,
          type: type as any,
        },
      });

      res.json(createSuccessResponse(prompts));
    })
  );

  // Get prompt versions
  router.get('/:id/versions',
    validateId,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const versions = await sdk.prompts.getPromptVersions(req.params.id);
        res.json(createSuccessResponse(versions));
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new NotFoundError('Prompt', req.params.id);
        }
        throw error;
      }
    })
  );

  // Rollback prompt
  router.post('/:id/rollback',
    validateId,
    validate({ body: rollbackRequestSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const prompt = await sdk.prompts.rollbackPrompt(req.params.id, req.body);
        res.json(createSuccessResponse(prompt));
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new NotFoundError('Prompt', req.params.id);
        }
        if ((error as Error).message.includes('does not exist')) {
          throw new BadRequestError((error as Error).message);
        }
        throw error;
      }
    })
  );

  // Compare prompt versions
  router.get('/:id/compare/:version1/:version2',
    validate({
      params: Joi.object({
        id: commonSchemas.id,
        version1: commonSchemas.version,
        version2: commonSchemas.version,
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const comparison = await sdk.prompts.comparePromptVersions(
          req.params.id,
          req.params.version1,
          req.params.version2
        );
        res.json(createSuccessResponse(comparison));
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new NotFoundError('Prompt', req.params.id);
        }
        throw error;
      }
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
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const results = await sdk.prompts.searchPrompts(req.body);
      res.json(createSuccessResponse(results));
    })
  );

  // Validate prompt
  router.get('/:id/validate',
    validateId,
    validate({
      query: Joi.object({
        version: commonSchemas.version,
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const validation = await sdk.prompts.validatePrompt(
          req.params.id,
          req.query.version as string
        );
        res.json(createSuccessResponse(validation));
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new NotFoundError('Prompt', req.params.id);
        }
        throw error;
      }
    })
  );

  // Get prompt statistics
  router.get('/:id/stats',
    validateId,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const stats = await sdk.prompts.getPromptStats(req.params.id);
        res.json(createSuccessResponse(stats));
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new NotFoundError('Prompt', req.params.id);
        }
        throw error;
      }
    })
  );

  // Get latest version of prompt
  router.get('/:id/latest',
    validateId,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const prompt = await sdk.prompts.getLatestPrompt(req.params.id);
        res.json(createSuccessResponse(prompt));
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new NotFoundError('Prompt', req.params.id);
        }
        throw error;
      }
    })
  );

  return router;
};
