import { Request, Response } from 'express';
import { BaseController } from './base-controller';
import { PromptManager } from '../../sdk/prompt-manager';
import { IRoutingStrategy, RoutingContext } from '../strategies/routing-strategy';
import { 
  CreatePromptRequest, 
  UpdatePromptRequest, 
  PromptListOptions,
  RollbackRequest 
} from '../../types/prompt';

/**
 * Controller for handling prompt-related HTTP requests
 * Implements the Controller pattern from the sequence diagram
 */
export class PromptController extends BaseController {
  private promptManager: PromptManager;

  constructor(private routingStrategy: IRoutingStrategy) {
    super();
    // Initialize PromptManager with adapter from routing strategy
    const adapter = this.routingStrategy.getPromptAdapter();
    this.promptManager = new PromptManager({ adapter });
  }

  /**
   * Create a new prompt
   * POST /api/v1/prompts
   */
  async createPrompt(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getPromptAdapter(context);
      
      // Update manager with context-specific adapter if needed
      this.updateManagerAdapter(adapter);
      
      const promptData: CreatePromptRequest = req.body;
      const prompt = await this.promptManager.createPrompt(promptData);
      
      const result = this.created(prompt);
      this.sendResponse(res, result);
      
      // Log successful creation for monitoring
      console.log(`Prompt created: ${prompt.id} by ${context.userId || 'anonymous'}`);
      
    } catch (error) {
      this.handleError(error as Error, 'Prompt');
    }
  }

  /**
   * Get prompt by ID (latest version)
   * GET /api/v1/prompts/:id
   */
  async getPrompt(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getPromptAdapter(context);
      this.updateManagerAdapter(adapter);
      
      const { id } = req.params;
      const prompt = await this.promptManager.getPrompt(id);
      
      const result = this.success(prompt);
      this.sendResponse(res, result);
      
    } catch (error) {
      this.handleError(error as Error, 'Prompt', req.params.id);
    }
  }

  /**
   * Get specific version of prompt
   * GET /api/v1/prompts/:id/versions/:version
   */
  async getPromptVersion(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getPromptAdapter(context);
      this.updateManagerAdapter(adapter);
      
      const { id, version } = req.params;
      const prompt = await this.promptManager.getPrompt(id, version);
      
      const result = this.success(prompt);
      this.sendResponse(res, result);
      
    } catch (error) {
      this.handleError(error as Error, 'Prompt', `${req.params.id}:${req.params.version}`);
    }
  }

  /**
   * Update prompt
   * PUT /api/v1/prompts/:id
   */
  async updatePrompt(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getPromptAdapter(context);
      this.updateManagerAdapter(adapter);
      
      const { id } = req.params;
      const updateData: UpdatePromptRequest = req.body;
      const prompt = await this.promptManager.updatePrompt(id, updateData);
      
      const result = this.success(prompt);
      this.sendResponse(res, result);
      
      console.log(`Prompt updated: ${id} by ${context.userId || 'anonymous'}`);
      
    } catch (error) {
      this.handleError(error as Error, 'Prompt', req.params.id);
    }
  }

  /**
   * List prompts with filtering and pagination
   * GET /api/v1/prompts
   */
  async listPrompts(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getPromptAdapter(context);
      this.updateManagerAdapter(adapter);
      
      const paginationParams = this.getPaginationParams(req);
      const filters = this.getFilterParams(req, ['name', 'tags', 'author', 'type']);
      
      // Parse tags if it's a string
      if (filters.tags && typeof filters.tags === 'string') {
        filters.tags = filters.tags.split(',').map((tag: string) => tag.trim());
      }
      
      const options: PromptListOptions = {
        page: paginationParams.page,
        limit: paginationParams.limit,
        sortBy: paginationParams.sortBy as any,
        sortOrder: paginationParams.sortOrder as any,
        filters
      };
      
      const prompts = await this.promptManager.listPrompts(options);
      
      const result = this.success(prompts);
      this.sendResponse(res, result);
      
    } catch (error) {
      this.handleError(error as Error, 'Prompt');
    }
  }

  /**
   * Get prompt versions
   * GET /api/v1/prompts/:id/versions
   */
  async getPromptVersions(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getPromptAdapter(context);
      this.updateManagerAdapter(adapter);
      
      const { id } = req.params;
      const versions = await this.promptManager.getPromptVersions(id);
      
      const result = this.success(versions);
      this.sendResponse(res, result);
      
    } catch (error) {
      this.handleError(error as Error, 'Prompt', req.params.id);
    }
  }

  /**
   * Rollback prompt to previous version
   * POST /api/v1/prompts/:id/rollback
   */
  async rollbackPrompt(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getPromptAdapter(context);
      this.updateManagerAdapter(adapter);
      
      const { id } = req.params;
      const rollbackData: RollbackRequest = req.body;
      const prompt = await this.promptManager.rollbackPrompt(id, rollbackData);
      
      const result = this.success(prompt);
      this.sendResponse(res, result);
      
      console.log(`Prompt rolled back: ${id} to version ${rollbackData.targetVersion} by ${context.userId || 'anonymous'}`);
      
    } catch (error) {
      this.handleError(error as Error, 'Prompt', req.params.id);
    }
  }

  /**
   * Delete prompt
   * DELETE /api/v1/prompts/:id
   */
  async deletePrompt(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getPromptAdapter(context);
      this.updateManagerAdapter(adapter);
      
      const { id } = req.params;
      await this.promptManager.deletePrompt(id);
      
      const result = this.success({ message: 'Prompt deleted successfully' });
      this.sendResponse(res, result);
      
      console.log(`Prompt deleted: ${id} by ${context.userId || 'anonymous'}`);
      
    } catch (error) {
      this.handleError(error as Error, 'Prompt', req.params.id);
    }
  }

  /**
   * Search prompts
   * POST /api/v1/prompts/search
   */
  async searchPrompts(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getPromptAdapter(context);
      this.updateManagerAdapter(adapter);
      
      const searchCriteria = req.body;
      const prompts = await this.promptManager.searchPrompts(searchCriteria);
      
      const result = this.success(prompts);
      this.sendResponse(res, result);
      
    } catch (error) {
      this.handleError(error as Error, 'Prompt');
    }
  }

  /**
   * Validate prompt
   * POST /api/v1/prompts/:id/validate
   */
  async validatePrompt(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getPromptAdapter(context);
      this.updateManagerAdapter(adapter);
      
      const { id } = req.params;
      const validation = await this.promptManager.validatePrompt(id);
      
      const result = this.success(validation);
      this.sendResponse(res, result);
      
    } catch (error) {
      this.handleError(error as Error, 'Prompt', req.params.id);
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
   * Update manager adapter if different from current
   */
  private updateManagerAdapter(adapter: any): void {
    // In a more sophisticated implementation, we could check if the adapter
    // is different and create a new manager instance if needed
    // For now, we assume the adapter doesn't change during request processing
  }

  /**
   * Get health status of the prompt service
   */
  async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getPromptAdapter(context);
      
      const health = await adapter.healthCheck();
      const result = this.success({
        service: 'PromptController',
        adapter: 'langfuse',
        ...health,
        timestamp: new Date().toISOString()
      });
      
      this.sendResponse(res, result);
      
    } catch (error) {
      this.handleError(error as Error, 'PromptService');
    }
  }
}
