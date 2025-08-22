import { Router, Request, Response } from 'express';
import { TemplateController } from '../controllers/template-controller';
import { IRoutingStrategy } from '../strategies/routing-strategy';
import { 
  validate, 
  validateId, 
  validatePagination, 
  commonSchemas 
} from '../middleware/validation';
import { asyncHandler } from '../middleware/error-handler';
import { 
  createTemplateSchema, 
  updateTemplateSchema, 
  templateRenderSchema 
} from '../../utils/validation';
import Joi from 'joi';

/**
 * Create template routes using the controller pattern
 */
export const createTemplateRoutes = (routingStrategy: IRoutingStrategy): Router => {
  const router = Router();
  const templateController = new TemplateController(routingStrategy);

  // Create template
  router.post('/', 
    validate({ body: createTemplateSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      await templateController.createTemplate(req, res);
    })
  );

  // Get template by ID
  router.get('/:id',
    validateId,
    asyncHandler(async (req: Request, res: Response) => {
      await templateController.getTemplate(req, res);
    })
  );

  // Update template
  router.put('/:id',
    validateId,
    validate({ body: updateTemplateSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      await templateController.updateTemplate(req, res);
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
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      await templateController.listTemplates(req, res);
    })
  );

  // Render template
  router.post('/:id/render',
    validateId,
    validate({ body: templateRenderSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      await templateController.renderTemplate(req, res);
    })
  );

  // Delete template
  router.delete('/:id',
    validateId,
    asyncHandler(async (req: Request, res: Response) => {
      await templateController.deleteTemplate(req, res);
    })
  );

  // Search templates
  router.post('/search',
    validate({
      body: Joi.object({
        name: Joi.string().optional(),
        content: Joi.string().optional(),
        tags: Joi.array().items(Joi.string()).optional(),
        author: Joi.string().optional(),
        syntax: Joi.string().valid('handlebars', 'mustache', 'simple').optional(),
        dateRange: Joi.object({
          start: Joi.date().optional(),
          end: Joi.date().optional(),
        }).optional(),
      }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
      await templateController.searchTemplates(req, res);
    })
  );

  // Validate template
  router.post('/:id/validate',
    validateId,
    asyncHandler(async (req: Request, res: Response) => {
      await templateController.validateTemplate(req, res);
    })
  );

  // Get template versions
  router.get('/:id/versions',
    validateId,
    asyncHandler(async (req: Request, res: Response) => {
      await templateController.getTemplateVersions(req, res);
    })
  );

  // Health check for template service
  router.get('/health/check',
    asyncHandler(async (req: Request, res: Response) => {
      await templateController.getHealth(req, res);
    })
  );

  return router;
};
