import { Request, Response } from 'express';
import { BaseController } from './base-controller';
import { MetadataManager } from '../../sdk/metadata-manager';
import { PromptManager } from '../../sdk/prompt-manager';
import { TemplateManager } from '../../sdk/template-manager';
import { ChainManager } from '../../sdk/chain-manager';
import { IRoutingStrategy, RoutingContext } from '../strategies/routing-strategy';

/**
 * Controller for handling metadata and system-wide operations
 */
export class MetadataController extends BaseController {
  private metadataManager: MetadataManager;
  private promptManager: PromptManager;
  private templateManager: TemplateManager;
  private chainManager: ChainManager;

  constructor(private routingStrategy: IRoutingStrategy) {
    super();
    // Initialize all managers with adapters from routing strategy
    const metadataAdapter = this.routingStrategy.getMetadataAdapter();
    const promptAdapter = this.routingStrategy.getPromptAdapter();
    const templateAdapter = this.routingStrategy.getTemplateAdapter();
    const chainAdapter = this.routingStrategy.getChainAdapter();
    
    this.metadataManager = new MetadataManager({ adapter: metadataAdapter });
    this.promptManager = new PromptManager({ adapter: promptAdapter });
    this.templateManager = new TemplateManager({ adapter: templateAdapter });
    this.chainManager = new ChainManager({ adapter: chainAdapter });
  }

  /**
   * Get overall system statistics
   * GET /api/v1/metadata/stats
   */
  async getOverallStats(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getMetadataAdapter(context);
      
      const stats = await this.metadataManager.getOverallStats();
      
      const result = this.success(stats);
      this.sendResponse(res, result);
      
    } catch (error) {
      this.handleError(error as Error, 'Metadata');
    }
  }

  /**
   * Get all resource metadata with pagination
   * GET /api/v1/metadata/resources
   */
  async getAllResourceMetadata(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getMetadataAdapter(context);
      
      const metadata = await this.metadataManager.getAllResourceMetadata();
      
      // Apply pagination
      const paginationParams = this.getPaginationParams(req);
      const start = (paginationParams.page - 1) * paginationParams.limit;
      const end = start + paginationParams.limit;
      
      const paginatedMetadata = metadata.slice(start, end);
      
      const result = this.success({
        data: paginatedMetadata,
        pagination: {
          page: paginationParams.page,
          limit: paginationParams.limit,
          total: metadata.length,
          totalPages: Math.ceil(metadata.length / paginationParams.limit),
        },
      });
      
      this.sendResponse(res, result);
      
    } catch (error) {
      this.handleError(error as Error, 'Metadata');
    }
  }

  /**
   * Search resources across all types
   * POST /api/v1/metadata/search
   */
  async searchResources(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      
      const { query, filters } = req.body;
      const searchResults = await this.metadataManager.searchResources(query);
      
      const result = this.success(searchResults);
      this.sendResponse(res, result);
      
    } catch (error) {
      this.handleError(error as Error, 'Metadata');
    }
  }

  /**
   * Get recent activity across all resources
   * GET /api/v1/metadata/activity
   */
  async getRecentActivity(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getMetadataAdapter(context);
      
      const limit = Number(req.query.limit) || 20;
      const activity = await this.metadataManager.getRecentActivity(limit);
      
      const result = this.success(activity);
      this.sendResponse(res, result);
      
    } catch (error) {
      this.handleError(error as Error, 'Metadata');
    }
  }

  /**
   * Get resource duplicates
   * GET /api/v1/metadata/duplicates
   */
  async getResourceDuplicates(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getMetadataAdapter(context);
      
      const duplicates = await this.metadataManager.getResourceDuplicates();
      
      const result = this.success(duplicates);
      this.sendResponse(res, result);
      
    } catch (error) {
      this.handleError(error as Error, 'Metadata');
    }
  }

  /**
   * Get orphaned resources
   * GET /api/v1/metadata/orphaned
   */
  async getOrphanedResources(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getMetadataAdapter(context);
      
      const orphaned = await this.metadataManager.getOrphanedResources();
      
      const result = this.success(orphaned);
      this.sendResponse(res, result);
      
    } catch (error) {
      this.handleError(error as Error, 'Metadata');
    }
  }

  /**
   * Get system health and statistics
   * GET /api/v1/metadata/system
   */
  async getSystemStats(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      
      // Get system stats by combining data from all managers
      const [overallStats, recentActivity, duplicates, orphaned] = await Promise.all([
        this.metadataManager.getOverallStats(),
        this.metadataManager.getRecentActivity(20),
        this.metadataManager.getResourceDuplicates(),
        this.metadataManager.getOrphanedResources(),
      ]);

      const systemStats = {
        overview: overallStats,
        recentActivity,
        duplicates,
        orphanedResources: orphaned,
        systemHealth: 'healthy', // TODO: Implement healthCheckAll in routing strategy
        timestamp: new Date().toISOString()
      };
      
      const result = this.success(systemStats);
      this.sendResponse(res, result);
      
    } catch (error) {
      this.handleError(error as Error, 'System');
    }
  }

  /**
   * Validate all resources
   * GET /api/v1/metadata/validation
   */
  async validateAllResources(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      
      // Validate all resources across all managers
      const [prompts, templates, chains] = await Promise.all([
        this.promptManager.listPrompts(),
        this.templateManager.listTemplates(),
        this.chainManager.listChains(),
      ]);

      const validationResults = await Promise.all([
        ...prompts.map(async (p: any) => ({
          type: 'prompt' as const,
          id: p.id,
          name: p.name,
          validation: await this.promptManager.validatePrompt(p.id),
        })),
        ...templates.map(async (t: any) => ({
          type: 'template' as const,
          id: t.id,
          name: t.name,
          validation: await this.templateManager.validateTemplate(t.id),
        })),
        ...chains.map(async (c: any) => ({
          type: 'chain' as const,
          id: c.id,
          name: c.name,
          validation: await this.chainManager.validateChain(c.id),
        })),
      ]);

      const invalid = validationResults.filter(r => !r.validation.valid);
      const warnings = validationResults.filter(r => r.validation.warnings && r.validation.warnings.length > 0);

      const validation = {
        totalResources: validationResults.length,
        validResources: validationResults.length - invalid.length,
        invalidResources: invalid.length,
        resourcesWithWarnings: warnings.length,
        invalid,
        warnings,
        timestamp: new Date().toISOString()
      };
      
      const result = this.success(validation);
      this.sendResponse(res, result);
      
    } catch (error) {
      this.handleError(error as Error, 'Validation');
    }
  }

  /**
   * Global search across all resource types
   * POST /api/v1/metadata/search/global
   */
  async globalSearch(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      
      const { query } = req.body;
      
      // Search across all resource types
      const [prompts, templates, chains] = await Promise.all([
        this.promptManager.searchPrompts({ name: query, content: query }),
        this.templateManager.searchTemplates({ name: query, content: query }),
        this.chainManager.searchChains({ name: query }),
      ]);

      const results = {
        prompts,
        templates,
        chains,
        totalResults: prompts.length + templates.length + chains.length,
        timestamp: new Date().toISOString()
      };
      
      const result = this.success(results);
      this.sendResponse(res, result);
      
    } catch (error) {
      this.handleError(error as Error, 'Search');
    }
  }

  /**
   * Export all system data
   * GET /api/v1/metadata/export/all
   */
  async exportAll(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      
      // Export all data from all managers
      const [prompts, templates, chains, metadata] = await Promise.all([
        this.promptManager.listPrompts(),
        this.templateManager.listTemplates(),
        this.chainManager.listChains(),
        this.metadataManager.exportMetadata(),
      ]);

      const exportData = {
        exportDate: new Date(),
        version: '1.0.0',
        exportedBy: context.userId || 'anonymous',
        prompts,
        templates,
        chains,
        metadata,
      };
      
      // Set headers for file download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="langfuse-full-export-${new Date().toISOString().split('T')[0]}.json"`);
      
      res.json(exportData);
      
      console.log(`Full system export by ${context.userId || 'anonymous'}`);
      
    } catch (error) {
      this.handleError(error as Error, 'Export');
    }
  }

  /**
   * Get tag analysis
   * GET /api/v1/metadata/tags/analysis
   */
  async getTagAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getMetadataAdapter(context);
      
      // Note: getTagAnalysis method needs to be implemented in MetadataManager
      // For now, return empty array
      const analysis: any[] = [];
      
      const result = this.success(analysis);
      this.sendResponse(res, result);
      
    } catch (error) {
      this.handleError(error as Error, 'TagAnalysis');
    }
  }

  /**
   * Get author statistics
   * GET /api/v1/metadata/authors/stats
   */
  async getAuthorStats(req: Request, res: Response): Promise<void> {
    try {
      const context = this.extractRoutingContext(req);
      const adapter = this.routingStrategy.getMetadataAdapter(context);
      
      // Note: getAuthorStats method needs to be implemented in MetadataManager
      // For now, return empty object
      const stats = {};
      
      const result = this.success(stats);
      this.sendResponse(res, result);
      
    } catch (error) {
      this.handleError(error as Error, 'AuthorStats');
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
   * Get health status of all services
   */
  async getHealth(req: Request, res: Response): Promise<void> {
    try {
      // TODO: Implement healthCheckAll and getAdapterStats in routing strategy
      const healthChecks = { langfuse: { status: 'healthy' as const } };
      const adapterStats = { totalAdapters: 1, availableAdapters: ['langfuse'] };
      
      const result = this.success({
        service: 'MetadataController',
        adapters: healthChecks,
        adapterStats,
        timestamp: new Date().toISOString()
      });
      
      this.sendResponse(res, result);
      
    } catch (error) {
      this.handleError(error as Error, 'MetadataService');
    }
  }
}
