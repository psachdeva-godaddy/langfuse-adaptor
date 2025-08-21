import { IAdapter } from '../adapters/base-adapter';
import {
  CreateChainRequest,
  UpdateChainRequest,
  ChainResponse,
  ChainListOptions,
  ChainExecutionRequest,
  ChainExecutionResult,
  ChainStep,
} from '../types/chain';
import {
  validateSchema,
  createChainSchema,
  updateChainSchema,
  chainExecutionSchema,
  listOptionsSchema,
  validateChainSteps,
  validateDataMapping,
} from '../utils/validation';
import { VersionManager } from '../utils/versioning';

export class ChainManager {
  constructor(private adapter: IAdapter) {}

  async createChain(request: CreateChainRequest): Promise<ChainResponse> {
    // Validate request
    const { value, errors } = validateSchema<CreateChainRequest>(createChainSchema, request);
    if (errors) {
      throw new Error(`Validation failed: ${errors.map(e => e.message).join(', ')}`);
    }

    // Validate chain steps
    const stepValidation = validateChainSteps(value.steps);
    if (!stepValidation.valid) {
      throw new Error(`Chain step validation failed: ${stepValidation.errors.join(', ')}`);
    }

    // Validate data mapping
    if (value.dataMapping) {
      const mappingValidation = validateDataMapping(value.dataMapping, value.steps);
      if (!mappingValidation.valid) {
        throw new Error(`Data mapping validation failed: ${mappingValidation.errors.join(', ')}`);
      }
    }

    // Validate that referenced resources exist
    await this.validateResourceReferences(value.steps);

    return await this.adapter.createChain(value);
  }

  async getChain(id: string, version?: string): Promise<ChainResponse> {
    if (!id) {
      throw new Error('Chain ID is required');
    }

    if (version && !VersionManager.isValidVersion(version)) {
      throw new Error(`Invalid version format: ${version}`);
    }

    return await this.adapter.getChain(id, version);
  }

  async updateChain(id: string, request: UpdateChainRequest): Promise<ChainResponse> {
    if (!id) {
      throw new Error('Chain ID is required');
    }

    // Validate request
    const { value, errors } = validateSchema<UpdateChainRequest>(updateChainSchema, request);
    if (errors) {
      throw new Error(`Validation failed: ${errors.map(e => e.message).join(', ')}`);
    }

    // Ensure chain exists
    await this.adapter.getChain(id);

    // Validate steps if provided
    if (value.steps) {
      const stepValidation = validateChainSteps(value.steps);
      if (!stepValidation.valid) {
        throw new Error(`Chain step validation failed: ${stepValidation.errors.join(', ')}`);
      }

      // Validate data mapping if provided
      if (value.dataMapping) {
        const mappingValidation = validateDataMapping(value.dataMapping, value.steps);
        if (!mappingValidation.valid) {
          throw new Error(`Data mapping validation failed: ${mappingValidation.errors.join(', ')}`);
        }
      }

      // Validate that referenced resources exist
      await this.validateResourceReferences(value.steps);
    }

    return await this.adapter.updateChain(id, value);
  }

  async deleteChain(id: string): Promise<void> {
    if (!id) {
      throw new Error('Chain ID is required');
    }

    // Ensure chain exists
    await this.adapter.getChain(id);

    await this.adapter.deleteChain(id);
  }

  async listChains(options?: ChainListOptions): Promise<ChainResponse[]> {
    if (options) {
      const { value, errors } = validateSchema<ChainListOptions>(listOptionsSchema, options);
      if (errors) {
        throw new Error(`Validation failed: ${errors.map(e => e.message).join(', ')}`);
      }
      return await this.adapter.listChains(value);
    }

    return await this.adapter.listChains();
  }

  async executeChain(request: ChainExecutionRequest): Promise<ChainExecutionResult> {
    // Validate request
    const { value, errors } = validateSchema<ChainExecutionRequest>(chainExecutionSchema, request);
    if (errors) {
      throw new Error(`Validation failed: ${errors.map(e => e.message).join(', ')}`);
    }

    // Validate chain before execution
    const validation = await this.adapter.validateChain(value.chainId, value.version);
    if (!validation.valid) {
      throw new Error(`Chain validation failed: ${validation.errors.join(', ')}`);
    }

    return await this.adapter.executeChain(value);
  }

  async validateChain(chainId: string, version?: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    if (!chainId) {
      throw new Error('Chain ID is required');
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const chain = await this.adapter.getChain(chainId, version);
      
      // Basic validation
      const adapterValidation = await this.adapter.validateChain(chainId, version);
      if (!adapterValidation.valid) {
        errors.push(...adapterValidation.errors);
      }
      
      // Additional validations
      if (chain.steps.length === 0) {
        errors.push('Chain must have at least one step');
      }
      
      // Check for circular dependencies in data mapping
      const circularDeps = this.detectCircularDependencies(chain.steps, chain.dataMapping);
      if (circularDeps.length > 0) {
        errors.push(`Circular dependencies detected: ${circularDeps.join(', ')}`);
      }
      
      // Check for unreachable steps
      const unreachableSteps = this.findUnreachableSteps(chain.steps, chain.dataMapping);
      if (unreachableSteps.length > 0) {
        warnings.push(`Potentially unreachable steps: ${unreachableSteps.join(', ')}`);
      }
      
      // Validate execution order consistency
      if (chain.executionOrder === 'sequential') {
        const orderIssues = this.validateSequentialOrder(chain.steps);
        if (orderIssues.length > 0) {
          warnings.push(...orderIssues);
        }
      }
      
      // Check version format
      if (!VersionManager.isValidVersion(chain.version)) {
        errors.push(`Invalid version format: ${chain.version}`);
      }
      
    } catch (error) {
      errors.push(`Failed to retrieve chain: ${(error as Error).message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async getChainDependencies(chainId: string, version?: string): Promise<{
    prompts: Array<{ id: string; version?: string; stepName: string }>;
    templates: Array<{ id: string; version?: string; stepName: string }>;
    totalDependencies: number;
  }> {
    const chain = await this.adapter.getChain(chainId, version);
    
    const prompts: Array<{ id: string; version?: string; stepName: string }> = [];
    const templates: Array<{ id: string; version?: string; stepName: string }> = [];
    
    for (const step of chain.steps) {
      if (step.type === 'prompt') {
        prompts.push({
          id: step.resourceId,
          version: step.resourceVersion,
          stepName: step.name,
        });
      } else if (step.type === 'template') {
        templates.push({
          id: step.resourceId,
          version: step.resourceVersion,
          stepName: step.name,
        });
      }
    }
    
    return {
      prompts,
      templates,
      totalDependencies: prompts.length + templates.length,
    };
  }

  async cloneChain(
    sourceId: string,
    newName: string,
    options?: {
      version?: string;
      description?: string;
      tags?: string[];
    }
  ): Promise<ChainResponse> {
    const sourceChain = await this.adapter.getChain(sourceId, options?.version);
    
    const cloneRequest: CreateChainRequest = {
      name: newName,
      description: options?.description || `Clone of ${sourceChain.name}`,
      label: sourceChain.label,
      tags: options?.tags || sourceChain.tags,
      steps: sourceChain.steps.map(step => ({
        name: step.name,
        type: step.type,
        resourceId: step.resourceId,
        resourceVersion: step.resourceVersion,
        inputMapping: step.inputMapping,
        outputMapping: step.outputMapping,
        condition: step.condition,
        order: step.order,
      })),
      executionOrder: sourceChain.executionOrder,
      dataMapping: sourceChain.dataMapping,
    };
    
    return await this.createChain(cloneRequest);
  }

  async getChainExecutionPlan(chainId: string, version?: string): Promise<{
    executionOrder: 'sequential' | 'parallel';
    steps: Array<{
      stepId: string;
      stepName: string;
      order: number;
      dependencies: string[];
      dependents: string[];
    }>;
    estimatedExecutionTime?: number;
  }> {
    const chain = await this.adapter.getChain(chainId, version);
    
    const stepDependencies = this.buildDependencyGraph(chain.steps, chain.dataMapping);
    
    const steps = chain.steps.map(step => ({
      stepId: step.id,
      stepName: step.name,
      order: step.order,
      dependencies: stepDependencies[step.id]?.dependencies || [],
      dependents: stepDependencies[step.id]?.dependents || [],
    }));
    
    return {
      executionOrder: chain.executionOrder,
      steps,
      // Estimated execution time could be calculated based on historical data
      estimatedExecutionTime: undefined,
    };
  }

  async searchChains(query: {
    name?: string;
    tags?: string[];
    executionOrder?: 'sequential' | 'parallel';
    hasStepType?: 'prompt' | 'template';
    stepCount?: { min?: number; max?: number };
  }): Promise<ChainResponse[]> {
    const allChains = await this.adapter.listChains();
    
    return allChains.filter(chain => {
      if (query.name && !chain.name.toLowerCase().includes(query.name.toLowerCase())) {
        return false;
      }
      
      if (query.tags && !query.tags.some(tag => chain.tags.includes(tag))) {
        return false;
      }
      
      if (query.executionOrder && chain.executionOrder !== query.executionOrder) {
        return false;
      }
      
      if (query.hasStepType && !chain.steps.some(step => step.type === query.hasStepType)) {
        return false;
      }
      
      if (query.stepCount) {
        const stepCount = chain.steps.length;
        if (query.stepCount.min && stepCount < query.stepCount.min) {
          return false;
        }
        if (query.stepCount.max && stepCount > query.stepCount.max) {
          return false;
        }
      }
      
      return true;
    });
  }

  // Private helper methods
  private async validateResourceReferences(steps: any[]): Promise<void> {
    const validationPromises = steps.map(async (step) => {
      try {
        if (step.type === 'prompt') {
          await this.adapter.getPrompt(step.resourceId, step.resourceVersion);
        } else if (step.type === 'template') {
          await this.adapter.getTemplate(step.resourceId, step.resourceVersion);
        }
      } catch (error) {
        throw new Error(`Step '${step.name}' references non-existent ${step.type}: ${step.resourceId}`);
      }
    });

    await Promise.all(validationPromises);
  }

  private detectCircularDependencies(steps: ChainStep[], dataMapping: any[]): string[] {
    const graph: Record<string, string[]> = {};
    const circularDeps: string[] = [];
    
    // Build dependency graph
    for (const mapping of dataMapping) {
      if (!graph[mapping.fromStep]) {
        graph[mapping.fromStep] = [];
      }
      graph[mapping.fromStep].push(mapping.toStep);
    }
    
    // Detect cycles using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const hasCycle = (node: string): boolean => {
      visited.add(node);
      recursionStack.add(node);
      
      const neighbors = graph[node] || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          circularDeps.push(`${node} -> ${neighbor}`);
          return true;
        }
      }
      
      recursionStack.delete(node);
      return false;
    };
    
    for (const step of steps) {
      if (!visited.has(step.name)) {
        hasCycle(step.name);
      }
    }
    
    return circularDeps;
  }

  private findUnreachableSteps(steps: ChainStep[], dataMapping: any[]): string[] {
    if (steps.length <= 1) return [];
    
    const reachable = new Set<string>();
    const graph: Record<string, string[]> = {};
    
    // Build dependency graph
    for (const mapping of dataMapping) {
      if (!graph[mapping.fromStep]) {
        graph[mapping.fromStep] = [];
      }
      graph[mapping.fromStep].push(mapping.toStep);
    }
    
    // Find reachable steps starting from first step
    const firstStep = steps.find(s => s.order === 0)?.name;
    if (firstStep) {
      const queue = [firstStep];
      reachable.add(firstStep);
      
      while (queue.length > 0) {
        const current = queue.shift()!;
        const neighbors = graph[current] || [];
        
        for (const neighbor of neighbors) {
          if (!reachable.has(neighbor)) {
            reachable.add(neighbor);
            queue.push(neighbor);
          }
        }
      }
    }
    
    return steps
      .map(s => s.name)
      .filter(name => !reachable.has(name));
  }

  private validateSequentialOrder(steps: ChainStep[]): string[] {
    const warnings: string[] = [];
    const sortedSteps = [...steps].sort((a, b) => a.order - b.order);
    
    for (let i = 0; i < sortedSteps.length - 1; i++) {
      const currentStep = sortedSteps[i];
      const nextStep = sortedSteps[i + 1];
      
      if (nextStep.order - currentStep.order > 1) {
        warnings.push(`Gap in sequential order between steps '${currentStep.name}' and '${nextStep.name}'`);
      }
    }
    
    return warnings;
  }

  private buildDependencyGraph(steps: ChainStep[], dataMapping: any[]): Record<string, {
    dependencies: string[];
    dependents: string[];
  }> {
    const graph: Record<string, { dependencies: string[]; dependents: string[] }> = {};
    
    // Initialize graph
    for (const step of steps) {
      graph[step.id] = { dependencies: [], dependents: [] };
    }
    
    // Build dependencies from data mapping
    for (const mapping of dataMapping) {
      const fromStepId = steps.find(s => s.name === mapping.fromStep)?.id;
      const toStepId = steps.find(s => s.name === mapping.toStep)?.id;
      
      if (fromStepId && toStepId) {
        graph[toStepId].dependencies.push(fromStepId);
        graph[fromStepId].dependents.push(toStepId);
      }
    }
    
    return graph;
  }
}
