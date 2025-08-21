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
  createTemplateSchema, 
  updateTemplateSchema, 
  templateRenderSchema 
} from '../../utils/validation';

export const createTemplateRoutes = (sdk: LangfusePromptSDK): Router => {
  const router = Router();

  // Create template
  router.post('/', 
    validate({ body: createTemplateSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const template = await sdk.templates.createTemplate(req.body);
        res.status(201).json(createSuccessResponse(template));
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

  // Get template by ID (latest version)
  router.get('/:id',
    validateId,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const template = await sdk.templates.getTemplate(req.params.id);
        res.json(createSuccessResponse(template));
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new NotFoundError('Template', req.params.id);
        }
        throw error;
      }
    })
  );

  // Get specific version of template
  router.get('/:id/versions/:version',
    validate({
      params: Joi.object({
        id: commonSchemas.id,
        version: commonSchemas.version,
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const template = await sdk.templates.getTemplate(req.params.id, req.params.version);
        res.json(createSuccessResponse(template));
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new NotFoundError('Template version', `${req.params.id}@${req.params.version}`);
        }
        throw error;
      }
    })
  );

  // Update template
  router.put('/:id',
    validateId,
    validate({ body: updateTemplateSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const template = await sdk.templates.updateTemplate(req.params.id, req.body);
        res.json(createSuccessResponse(template));
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new NotFoundError('Template', req.params.id);
        }
        if ((error as Error).message.includes('validation failed')) {
          throw new BadRequestError((error as Error).message);
        }
        throw error;
      }
    })
  );

  // Delete template
  router.delete('/:id',
    validateId,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        await sdk.templates.deleteTemplate(req.params.id);
        res.status(204).send();
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new NotFoundError('Template', req.params.id);
        }
        throw error;
      }
    })
  );

  // List templates
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
        syntax: Joi.string().valid('handlebars', 'mustache', 'simple').optional(),
        hasVariables: Joi.boolean().optional(),
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const { page, limit, sortBy, sortOrder, name, tags, author, syntax, hasVariables } = req.query;
      
      // Parse tags if it's a string
      let parsedTags: string[] | undefined;
      if (tags) {
        parsedTags = Array.isArray(tags) ? tags as string[] : [tags as string];
      }

      const templates = await sdk.templates.listTemplates({
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
        filters: {
          name: name as string,
          tags: parsedTags,
          author: author as string,
          syntax: syntax as any,
          hasVariables: hasVariables === 'true',
        },
      });

      res.json(createSuccessResponse(templates));
    })
  );

  // Render template
  router.post('/:id/render',
    validateId,
    validate({ body: templateRenderSchema.fork('templateId', (schema: Joi.Schema) => schema.optional()) }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const renderRequest = {
          ...req.body,
          templateId: req.params.id,
        };
        const result = await sdk.templates.renderTemplate(renderRequest);
        res.json(createSuccessResponse(result));
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new NotFoundError('Template', req.params.id);
        }
        if ((error as Error).message.includes('rendering failed')) {
          throw new BadRequestError((error as Error).message);
        }
        throw error;
      }
    })
  );

  // Render template with engine (alternative endpoint with more options)
  router.post('/:id/render-advanced',
    validateId,
    validate({
      body: Joi.object({
        variables: Joi.object().pattern(Joi.string(), Joi.any()).required(),
        version: commonSchemas.version,
        strictMode: Joi.boolean().optional().default(false),
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { variables, version, strictMode } = req.body;
        const result = await sdk.templates.renderTemplateWithEngine(
          req.params.id,
          variables,
          { version, strictMode }
        );
        res.json(createSuccessResponse(result));
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new NotFoundError('Template', req.params.id);
        }
        if ((error as Error).message.includes('rendering failed')) {
          throw new BadRequestError((error as Error).message);
        }
        throw error;
      }
    })
  );

  // Preview template
  router.post('/:id/preview',
    validateId,
    validate({
      body: Joi.object({
        variables: Joi.object().pattern(Joi.string(), Joi.any()).required(),
        version: commonSchemas.version,
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { variables, version } = req.body;
        const result = await sdk.templates.previewTemplate(req.params.id, variables, version);
        res.json(createSuccessResponse(result));
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new NotFoundError('Template', req.params.id);
        }
        throw error;
      }
    })
  );

  // Get template variables
  router.get('/:id/variables',
    validateId,
    validate({
      query: Joi.object({
        version: commonSchemas.version,
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const variables = await sdk.templates.getTemplateVariables(
          req.params.id,
          req.query.version as string
        );
        res.json(createSuccessResponse(variables));
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new NotFoundError('Template', req.params.id);
        }
        throw error;
      }
    })
  );

  // Search templates
  router.post('/search',
    validate({
      body: Joi.object({
        name: Joi.string().optional(),
        content: Joi.string().optional(),
        tags: Joi.array().items(Joi.string()).optional(),
        syntax: Joi.string().valid('handlebars', 'mustache', 'simple').optional(),
        hasVariable: Joi.string().optional(),
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const results = await sdk.templates.searchTemplates(req.body);
      res.json(createSuccessResponse(results));
    })
  );

  // Validate template
  router.get('/:id/validate',
    validateId,
    validate({
      query: Joi.object({
        version: commonSchemas.version,
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const validation = await sdk.templates.validateTemplate(
          req.params.id,
          req.query.version as string
        );
        res.json(createSuccessResponse(validation));
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new NotFoundError('Template', req.params.id);
        }
        throw error;
      }
    })
  );

  // Clone template
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
        const clonedTemplate = await sdk.templates.cloneTemplate(
          req.params.id,
          newName,
          { version, description, tags }
        );
        res.status(201).json(createSuccessResponse(clonedTemplate));
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new NotFoundError('Template', req.params.id);
        }
        if ((error as Error).message.includes('already exists')) {
          throw new ConflictError((error as Error).message);
        }
        throw error;
      }
    })
  );

  // Get template statistics
  router.get('/:id/stats',
    validateId,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const stats = await sdk.templates.getTemplateStats(req.params.id);
        res.json(createSuccessResponse(stats));
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new NotFoundError('Template', req.params.id);
        }
        throw error;
      }
    })
  );

  return router;
};
