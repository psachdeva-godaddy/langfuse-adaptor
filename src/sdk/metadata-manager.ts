import { IAdapter } from '../adapters/base-adapter';
import { LangfuseAdapter } from '../adapters/langfuse/langfuse-adapter';
import { createLangfuseConfig, validateLangfuseConfig, LangfuseConfig } from '../config/langfuse';
import { PromptResponse } from '../types/prompt';
import { TemplateResponse } from '../types/template';
import { ChainResponse } from '../types/chain';

export interface MetadataStats {
  totalPrompts: number;
  totalTemplates: number;
  totalChains: number;
  totalResources: number;
  uniqueAuthors: number;
  uniqueTags: number;
  averagePromptsPerAuthor: number;
  mostUsedTags: Array<{ tag: string; count: number }>;
  authorStats: Array<{ author: string; promptCount: number; templateCount: number; chainCount: number }>;
}

export interface ResourceMetadata {
  id: string;
  name: string;
  type: 'prompt' | 'template' | 'chain';
  author: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  version: string;
}

export interface TagAnalysis {
  tag: string;
  count: number;
  resources: Array<{
    id: string;
    name: string;
    type: 'prompt' | 'template' | 'chain';
  }>;
}

export interface AuthorAnalysis {
  author: string;
  totalResources: number;
  prompts: number;
  templates: number;
  chains: number;
  mostRecentActivity: Date;
  tags: string[];
}

export interface MetadataManagerOptions {
  adapter?: IAdapter;
  langfuseConfig?: LangfuseConfig;
  autoConnect?: boolean;
}

export class MetadataManager {
  private adapter: IAdapter;

  constructor(options: MetadataManagerOptions = {}) {
    // Initialize adapter
    if (options.adapter) {
      this.adapter = options.adapter;
    } else {
      const config = options.langfuseConfig || createLangfuseConfig();
      validateLangfuseConfig(config);
      this.adapter = new LangfuseAdapter(config);
    }

    // Auto-connect if requested
    if (options.autoConnect !== false) {
      this.connect().catch(error => {
        console.error('Failed to auto-connect MetadataManager:', error);
      });
    }
  }

  async connect(): Promise<void> {
    await this.adapter.connect();
  }

  async disconnect(): Promise<void> {
    await this.adapter.disconnect();
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }> {
    return await this.adapter.healthCheck();
  }

  async getOverallStats(): Promise<MetadataStats> {
    const [prompts, templates, chains] = await Promise.all([
      this.adapter.listPrompts(),
      this.adapter.listTemplates(),
      this.adapter.listChains(),
    ]);

    const allResources = [
      ...prompts.map(p => ({ ...p, type: 'prompt' as const })),
      ...templates.map(t => ({ ...t, type: 'template' as const })),
      ...chains.map(c => ({ ...c, type: 'chain' as const })),
    ];

    const authors = new Set(allResources.map(r => r.author));
    const allTags = allResources.flatMap(r => r.tags);
    const uniqueTags = new Set(allTags);

    // Count tag usage
    const tagCounts = new Map<string, number>();
    for (const tag of allTags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }

    const mostUsedTags = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Author statistics
    const authorStats = Array.from(authors).map(author => {
      const authorPrompts = prompts.filter(p => p.author === author);
      const authorTemplates = templates.filter(t => t.author === author);
      const authorChains = chains.filter(c => c.author === author);

      return {
        author,
        promptCount: authorPrompts.length,
        templateCount: authorTemplates.length,
        chainCount: authorChains.length,
      };
    });

    return {
      totalPrompts: prompts.length,
      totalTemplates: templates.length,
      totalChains: chains.length,
      totalResources: allResources.length,
      uniqueAuthors: authors.size,
      uniqueTags: uniqueTags.size,
      averagePromptsPerAuthor: authors.size > 0 ? prompts.length / authors.size : 0,
      mostUsedTags,
      authorStats,
    };
  }

  async getAllResourceMetadata(): Promise<ResourceMetadata[]> {
    const [prompts, templates, chains] = await Promise.all([
      this.adapter.listPrompts(),
      this.adapter.listTemplates(),
      this.adapter.listChains(),
    ]);

    const metadata: ResourceMetadata[] = [
      ...prompts.map(p => ({
        id: p.id,
        name: p.name,
        type: 'prompt' as const,
        author: p.author,
        tags: p.tags,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        version: p.version,
      })),
      ...templates.map(t => ({
        id: t.id,
        name: t.name,
        type: 'template' as const,
        author: t.author,
        tags: t.tags,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        version: t.version,
      })),
      ...chains.map(c => ({
        id: c.id,
        name: c.name,
        type: 'chain' as const,
        author: c.author,
        tags: c.tags,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        version: c.version,
      })),
    ];

    return metadata.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getResourcesByTag(tag: string): Promise<ResourceMetadata[]> {
    const allMetadata = await this.getAllResourceMetadata();
    return allMetadata.filter(resource => resource.tags.includes(tag));
  }

  async getResourcesByAuthor(author: string): Promise<ResourceMetadata[]> {
    const allMetadata = await this.getAllResourceMetadata();
    return allMetadata.filter(resource => resource.author === author);
  }

  async getTagAnalysis(tag: string): Promise<TagAnalysis> {
    const resources = await this.getResourcesByTag(tag);
    
    return {
      tag,
      count: resources.length,
      resources: resources.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
      })),
    };
  }

  async getAllTagsAnalysis(): Promise<TagAnalysis[]> {
    const allMetadata = await this.getAllResourceMetadata();
    const tagCounts = new Map<string, ResourceMetadata[]>();

    // Group resources by tag
    for (const resource of allMetadata) {
      for (const tag of resource.tags) {
        if (!tagCounts.has(tag)) {
          tagCounts.set(tag, []);
        }
        tagCounts.get(tag)!.push(resource);
      }
    }

    // Convert to analysis format
    return Array.from(tagCounts.entries())
      .map(([tag, resources]) => ({
        tag,
        count: resources.length,
        resources: resources.map(r => ({
          id: r.id,
          name: r.name,
          type: r.type,
        })),
      }))
      .sort((a, b) => b.count - a.count);
  }

  async getAuthorAnalysis(author: string): Promise<AuthorAnalysis> {
    const resources = await this.getResourcesByAuthor(author);
    
    const prompts = resources.filter(r => r.type === 'prompt');
    const templates = resources.filter(r => r.type === 'template');
    const chains = resources.filter(r => r.type === 'chain');
    
    const mostRecentActivity = resources.length > 0 
      ? new Date(Math.max(...resources.map(r => r.updatedAt.getTime())))
      : new Date(0);
    
    const allTags = new Set(resources.flatMap(r => r.tags));

    return {
      author,
      totalResources: resources.length,
      prompts: prompts.length,
      templates: templates.length,
      chains: chains.length,
      mostRecentActivity,
      tags: Array.from(allTags),
    };
  }

  async getAllAuthorsAnalysis(): Promise<AuthorAnalysis[]> {
    const allMetadata = await this.getAllResourceMetadata();
    const authors = new Set(allMetadata.map(r => r.author));

    const analyses = await Promise.all(
      Array.from(authors).map(author => this.getAuthorAnalysis(author))
    );

    return analyses.sort((a, b) => b.totalResources - a.totalResources);
  }

  async searchResources(query: {
    name?: string;
    type?: 'prompt' | 'template' | 'chain';
    author?: string;
    tags?: string[];
    createdAfter?: Date;
    createdBefore?: Date;
    updatedAfter?: Date;
    updatedBefore?: Date;
  }): Promise<ResourceMetadata[]> {
    const allMetadata = await this.getAllResourceMetadata();

    return allMetadata.filter(resource => {
      if (query.name && !resource.name.toLowerCase().includes(query.name.toLowerCase())) {
        return false;
      }

      if (query.type && resource.type !== query.type) {
        return false;
      }

      if (query.author && !resource.author.toLowerCase().includes(query.author.toLowerCase())) {
        return false;
      }

      if (query.tags && !query.tags.some(tag => resource.tags.includes(tag))) {
        return false;
      }

      if (query.createdAfter && resource.createdAt < query.createdAfter) {
        return false;
      }

      if (query.createdBefore && resource.createdAt > query.createdBefore) {
        return false;
      }

      if (query.updatedAfter && resource.updatedAt < query.updatedAfter) {
        return false;
      }

      if (query.updatedBefore && resource.updatedAt > query.updatedBefore) {
        return false;
      }

      return true;
    });
  }

  async getRecentActivity(limit: number = 10): Promise<Array<ResourceMetadata & {
    activity: 'created' | 'updated';
    activityDate: Date;
  }>> {
    const allMetadata = await this.getAllResourceMetadata();
    
    // Create activity entries for both creation and updates
    const activities: Array<ResourceMetadata & {
      activity: 'created' | 'updated';
      activityDate: Date;
    }> = [];

    for (const resource of allMetadata) {
      activities.push({
        ...resource,
        activity: 'created',
        activityDate: resource.createdAt,
      });

      // Only add update activity if it's different from creation
      if (resource.updatedAt.getTime() !== resource.createdAt.getTime()) {
        activities.push({
          ...resource,
          activity: 'updated',
          activityDate: resource.updatedAt,
        });
      }
    }

    return activities
      .sort((a, b) => b.activityDate.getTime() - a.activityDate.getTime())
      .slice(0, limit);
  }

  async getResourceDuplicates(): Promise<Array<{
    name: string;
    resources: Array<{
      id: string;
      type: 'prompt' | 'template' | 'chain';
      author: string;
      version: string;
    }>;
  }>> {
    const allMetadata = await this.getAllResourceMetadata();
    const nameGroups = new Map<string, ResourceMetadata[]>();

    // Group by name
    for (const resource of allMetadata) {
      const name = resource.name.toLowerCase();
      if (!nameGroups.has(name)) {
        nameGroups.set(name, []);
      }
      nameGroups.get(name)!.push(resource);
    }

    // Find duplicates
    return Array.from(nameGroups.entries())
      .filter(([_, resources]) => resources.length > 1)
      .map(([name, resources]) => ({
        name,
        resources: resources.map(r => ({
          id: r.id,
          type: r.type,
          author: r.author,
          version: r.version,
        })),
      }));
  }

  async getUnusedTags(): Promise<string[]> {
    // This would require tracking tag usage in actual executions
    // For now, we'll return tags that are used by only one resource
    const tagAnalysis = await this.getAllTagsAnalysis();
    return tagAnalysis
      .filter(analysis => analysis.count === 1)
      .map(analysis => analysis.tag);
  }

  async getOrphanedResources(): Promise<ResourceMetadata[]> {
    // Resources that are not referenced by any chains
    const [allMetadata, chains] = await Promise.all([
      this.getAllResourceMetadata(),
      this.adapter.listChains(),
    ]);

    const referencedIds = new Set<string>();
    
    // Collect all referenced resource IDs from chains
    for (const chain of chains) {
      for (const step of chain.steps) {
        referencedIds.add(step.resourceId);
      }
    }

    // Return resources not referenced by any chain
    return allMetadata.filter(resource => 
      (resource.type === 'prompt' || resource.type === 'template') && 
      !referencedIds.has(resource.id)
    );
  }

  async exportMetadata(): Promise<{
    exportDate: Date;
    stats: MetadataStats;
    resources: ResourceMetadata[];
    tagAnalysis: TagAnalysis[];
    authorAnalysis: AuthorAnalysis[];
  }> {
    const [stats, resources, tagAnalysis, authorAnalysis] = await Promise.all([
      this.getOverallStats(),
      this.getAllResourceMetadata(),
      this.getAllTagsAnalysis(),
      this.getAllAuthorsAnalysis(),
    ]);

    return {
      exportDate: new Date(),
      stats,
      resources,
      tagAnalysis,
      authorAnalysis,
    };
  }
}
