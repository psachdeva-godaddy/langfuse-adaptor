import { Request, Response } from 'express';
import { BaseController } from './base-controller';
import { ChainManager } from '../../sdk/chain-manager';
import { IRoutingStrategy, RoutingContext } from '../strategies/routing-strategy';
import { 
  CreateChainRequest, 
  UpdateChainRequest, 
  ChainListOptions,
  ChainExecutionRequest 
} from '../../types/chain';

/**
 * Controller for handling chain-related HTTP requests
 */
export class ChainController extends BaseController {
  private chainManager: ChainManager;

  constructor(private routingStrategy: IRoutingStrategy) {
    super();
    const adapter = this.routingStrategy.getChainAdapter();
    this.chainManager = new ChainManager({ adapter });
  }

  /**
   * Create a new chain
   * POST /api/v1/chains
   */
  async createChain(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getChainAdapter(context);
      
      const chainData: CreateChainRequest = req.body;
      const chain = await this.chainManager.createChain(chainData);
      
      const result = this.created(chain);
      this.sendResponse(res, result);
      
      console.log(`Chain created: ${chain.id} by ${context.userId || 'anonymous'}`);
      
    } catch (error) {
      this.handleError(error as Error, 'Chain');
    }
  }

  /**
   * Get chain by ID
   * GET /api/v1/chains/:id
   */
  async getChain(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getChainAdapter(context);
      
      const { id } = req.params;
      const chain = await this.chainManager.getChain(id);
      
      const result = this.success(chain);
      this.sendResponse(res, result);
      
    } catch (error) {
      this.handleError(error as Error, 'Chain', req.params.id);
    }
  }

  /**
   * Update chain
   * PUT /api/v1/chains/:id
   */
  async updateChain(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getChainAdapter(context);
      
      const { id } = req.params;
      const updateData: UpdateChainRequest = req.body;
      const chain = await this.chainManager.updateChain(id, updateData);
      
      const result = this.success(chain);
      this.sendResponse(res, result);
      
      console.log(`Chain updated: ${id} by ${context.userId || 'anonymous'}`);
      
    } catch (error) {
      this.handleError(error as Error, 'Chain', req.params.id);
    }
  }

  /**
   * List chains
   * GET /api/v1/chains
   */
  async listChains(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getChainAdapter(context);
      
      const paginationParams = this.getPaginationParams(req);
      const filters = this.getFilterParams(req, ['name', 'tags', 'author', 'executionOrder']);
      
      if (filters.tags && typeof filters.tags === 'string') {
        filters.tags = filters.tags.split(',').map((tag: string) => tag.trim());
      }
      
      const options: ChainListOptions = {
        page: paginationParams.page,
        limit: paginationParams.limit,
        sortBy: paginationParams.sortBy as any,
        sortOrder: paginationParams.sortOrder as any,
        filters
      };
      
      const chains = await this.chainManager.listChains(options);
      
      const result = this.success(chains);
      this.sendResponse(res, result);
      
    } catch (error) {
      this.handleError(error as Error, 'Chain');
    }
  }

  /**
   * Execute chain
   * POST /api/v1/chains/:id/execute
   */
  async executeChain(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getChainAdapter(context);
      
      const { id } = req.params;
      const executionRequest: ChainExecutionRequest = {
        chainId: id,
        version: req.body.version,
        initialData: req.body.initialData
      };
      
      const execution = await this.chainManager.executeChain(executionRequest);
      
      const result = this.success(execution);
      this.sendResponse(res, result);
      
      console.log(`Chain executed: ${id} by ${context.userId || 'anonymous'}`);
      
    } catch (error) {
      this.handleError(error as Error, 'Chain', req.params.id);
    }
  }

  /**
   * Delete chain
   * DELETE /api/v1/chains/:id
   */
  async deleteChain(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getChainAdapter(context);
      
      const { id } = req.params;
      await this.chainManager.deleteChain(id);
      
      const result = this.success({ message: 'Chain deleted successfully' });
      this.sendResponse(res, result);
      
      console.log(`Chain deleted: ${id} by ${context.userId || 'anonymous'}`);
      
    } catch (error) {
      this.handleError(error as Error, 'Chain', req.params.id);
    }
  }

  /**
   * Search chains
   * POST /api/v1/chains/search
   */
  async searchChains(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getChainAdapter(context);
      
      const searchCriteria = req.body;
      const chains = await this.chainManager.searchChains(searchCriteria);
      
      const result = this.success(chains);
      this.sendResponse(res, result);
      
    } catch (error) {
      this.handleError(error as Error, 'Chain');
    }
  }

  /**
   * Validate chain
   * POST /api/v1/chains/:id/validate
   */
  async validateChain(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getChainAdapter(context);
      
      const { id } = req.params;
      const validation = await this.chainManager.validateChain(id);
      
      const result = this.success(validation);
      this.sendResponse(res, result);
      
    } catch (error) {
      this.handleError(error as Error, 'Chain', req.params.id);
    }
  }

  /**
   * Get chain versions
   * GET /api/v1/chains/:id/versions
   */
  async getChainVersions(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getChainAdapter(context);
      
      const { id } = req.params;
      // Note: getChainVersions method needs to be implemented in ChainManager
      // For now, return empty array
      const versions: any[] = [];
      
      const result = this.success(versions);
      this.sendResponse(res, result);
      
    } catch (error) {
      this.handleError(error as Error, 'Chain', req.params.id);
    }
  }

  /**
   * Get chain execution history
   * GET /api/v1/chains/:id/executions
   */
  async getChainExecutions(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getChainAdapter(context);
      
      const { id } = req.params;
      const paginationParams = this.getPaginationParams(req);
      
      // Note: getChainExecutions method needs to be implemented in ChainManager
      // For now, return empty array
      const executions: any[] = [];
      
      const result = this.success(executions);
      this.sendResponse(res, result);
      
    } catch (error) {
      this.handleError(error as Error, 'Chain', req.params.id);
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
   * Get health status of the chain service
   */
  async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getChainAdapter(context);
      
      const health = await adapter.healthCheck();
      const result = this.success({
        service: 'ChainController',
        adapter: 'langfuse',
        ...health,
        timestamp: new Date().toISOString()
      });
      
      this.sendResponse(res, result);
      
    } catch (error) {
      this.handleError(error as Error, 'ChainService');
    }
  }
}
