import { Request, Response } from 'express';
import { BaseController } from './base-controller';
import { TemplateManager } from '../../sdk/template-manager';
import { IRoutingStrategy, RoutingContext } from '../strategies/routing-strategy';
import { 
  CreateTemplateRequest, 
  UpdateTemplateRequest, 
  TemplateListOptions,
  TemplateRenderRequest 
} from '../../types/template';

/**
 * Controller for handling template-related HTTP requests
 */
export class TemplateController extends BaseController {
  private templateManager: TemplateManager;

  constructor(private routingStrategy: IRoutingStrategy) {
    super();
    const adapter = this.routingStrategy.getTemplateAdapter();
    this.templateManager = new TemplateManager({ adapter });
  }

  /**
   * Create a new template
   * POST /api/v1/templates
   */
  async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getTemplateAdapter(context);
      
      const templateData: CreateTemplateRequest = req.body;
      const template = await this.templateManager.createTemplate(templateData);
      
      const result = this.created(template);
      this.sendResponse(res, result);
      
      console.log(`Template created: ${template.id} by ${context.userId || 'anonymous'}`);
      
    } catch (error) {
      this.handleError(error as Error, 'Template');
    }
  }

  /**
   * Get template by ID
   * GET /api/v1/templates/:id
   */
  async getTemplate(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getTemplateAdapter(context);
      
      const { id } = req.params;
      const template = await this.templateManager.getTemplate(id);
      
      const result = this.success(template);
      this.sendResponse(res, result);
      
    } catch (error) {
      this.handleError(error as Error, 'Template', req.params.id);
    }
  }

  /**
   * Update template
   * PUT /api/v1/templates/:id
   */
  async updateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getTemplateAdapter(context);
      
      const { id } = req.params;
      const updateData: UpdateTemplateRequest = req.body;
      const template = await this.templateManager.updateTemplate(id, updateData);
      
      const result = this.success(template);
      this.sendResponse(res, result);
      
      console.log(`Template updated: ${id} by ${context.userId || 'anonymous'}`);
      
    } catch (error) {
      this.handleError(error as Error, 'Template', req.params.id);
    }
  }

  /**
   * List templates
   * GET /api/v1/templates
   */
  async listTemplates(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getTemplateAdapter(context);
      
      const paginationParams = this.getPaginationParams(req);
      const filters = this.getFilterParams(req, ['name', 'tags', 'author', 'syntax']);
      
      if (filters.tags && typeof filters.tags === 'string') {
        filters.tags = filters.tags.split(',').map((tag: string) => tag.trim());
      }
      
      const options: TemplateListOptions = {
        page: paginationParams.page,
        limit: paginationParams.limit,
        sortBy: paginationParams.sortBy as any,
        sortOrder: paginationParams.sortOrder as any,
        filters
      };
      
      const templates = await this.templateManager.listTemplates(options);
      
      const result = this.success(templates);
      this.sendResponse(res, result);
      
    } catch (error) {
      this.handleError(error as Error, 'Template');
    }
  }

  /**
   * Render template with variables
   * POST /api/v1/templates/:id/render
   */
  async renderTemplate(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getTemplateAdapter(context);
      
      const { id } = req.params;
      const renderRequest: TemplateRenderRequest = {
        templateId: id,
        variables: req.body.variables,
        version: req.body.version
      };
      
      const rendered = await this.templateManager.renderTemplate(renderRequest);
      
      const result = this.success(rendered);
      this.sendResponse(res, result);
      
    } catch (error) {
      this.handleError(error as Error, 'Template', req.params.id);
    }
  }

  /**
   * Delete template
   * DELETE /api/v1/templates/:id
   */
  async deleteTemplate(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getTemplateAdapter(context);
      
      const { id } = req.params;
      await this.templateManager.deleteTemplate(id);
      
      const result = this.success({ message: 'Template deleted successfully' });
      this.sendResponse(res, result);
      
      console.log(`Template deleted: ${id} by ${context.userId || 'anonymous'}`);
      
    } catch (error) {
      this.handleError(error as Error, 'Template', req.params.id);
    }
  }

  /**
   * Search templates
   * POST /api/v1/templates/search
   */
  async searchTemplates(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getTemplateAdapter(context);
      
      const searchCriteria = req.body;
      const templates = await this.templateManager.searchTemplates(searchCriteria);
      
      const result = this.success(templates);
      this.sendResponse(res, result);
      
    } catch (error) {
      this.handleError(error as Error, 'Template');
    }
  }

  /**
   * Validate template
   * POST /api/v1/templates/:id/validate
   */
  async validateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getTemplateAdapter(context);
      
      const { id } = req.params;
      const validation = await this.templateManager.validateTemplate(id);
      
      const result = this.success(validation);
      this.sendResponse(res, result);
      
    } catch (error) {
      this.handleError(error as Error, 'Template', req.params.id);
    }
  }

  /**
   * Get template versions
   * GET /api/v1/templates/:id/versions
   */
  async getTemplateVersions(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getTemplateAdapter(context);
      
      const { id } = req.params;
      // Note: getTemplateVersions method needs to be implemented in TemplateManager
      // For now, return empty array
      const versions: any[] = [];
      
      const result = this.success(versions);
      this.sendResponse(res, result);
      
    } catch (error) {
      this.handleError(error as Error, 'Template', req.params.id);
    }
  }

  /**
   * Extract routing context from request
   */
  private extractRoutingContext(req: Request): RoutingContext {
    return {
      userId: req.headers['x-user-id'] as string,
      organizationId: req.headers['x-organization-id'] as string,
      environment: (req.headers['x-environment'] as any) || process.env.NODE_ENV as any,
      region: req.headers['x-region'] as string,
      requestId: req.headers['x-request-id'] as string,
      headers: req.headers as Record<string, string>
    };
  }

  /**
   * Get health status of the template service
   */
  async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getTemplateAdapter(context);
      
      const health = await adapter.healthCheck();
      const result = this.success({
        service: 'TemplateController',
        adapter: 'langfuse',
        ...health,
        timestamp: new Date().toISOString()
      });
      
      this.sendResponse(res, result);
      
    } catch (error) {
      this.handleError(error as Error, 'TemplateService');
    }
  }
}
