import {
  CreatePromptRequest,
  UpdatePromptRequest,
  PromptResponse,
  PromptListOptions,
  RollbackRequest,
} from '../types/prompt';
import {
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateResponse,
  TemplateListOptions,
  TemplateRenderRequest,
  TemplateRenderResponse,
} from '../types/template';
import {
  CreateChainRequest,
  UpdateChainRequest,
  ChainResponse,
  ChainListOptions,
  ChainExecutionRequest,
  ChainExecutionResult,
} from '../types/chain';

export interface IPromptAdapter {
  // Prompt operations
  createPrompt(request: CreatePromptRequest): Promise<PromptResponse>;
  getPrompt(id: string, version?: string): Promise<PromptResponse>;
  updatePrompt(id: string, request: UpdatePromptRequest): Promise<PromptResponse>;
  deletePrompt(id: string): Promise<void>;
  listPrompts(options?: PromptListOptions): Promise<PromptResponse[]>;
  getPromptVersions(id: string): Promise<string[]>;
  rollbackPrompt(id: string, request: RollbackRequest): Promise<PromptResponse>;
}

export interface ITemplateAdapter {
  // Template operations
  createTemplate(request: CreateTemplateRequest): Promise<TemplateResponse>;
  getTemplate(id: string, version?: string): Promise<TemplateResponse>;
  updateTemplate(id: string, request: UpdateTemplateRequest): Promise<TemplateResponse>;
  deleteTemplate(id: string): Promise<void>;
  listTemplates(options?: TemplateListOptions): Promise<TemplateResponse[]>;
  renderTemplate(request: TemplateRenderRequest): Promise<TemplateRenderResponse>;
}

export interface IChainAdapter {
  // Chain operations
  createChain(request: CreateChainRequest): Promise<ChainResponse>;
  getChain(id: string, version?: string): Promise<ChainResponse>;
  updateChain(id: string, request: UpdateChainRequest): Promise<ChainResponse>;
  deleteChain(id: string): Promise<void>;
  listChains(options?: ChainListOptions): Promise<ChainResponse[]>;
  executeChain(request: ChainExecutionRequest): Promise<ChainExecutionResult>;
  validateChain(chainId: string, version?: string): Promise<{ valid: boolean; errors: string[] }>;
}

export interface IAdapter extends IPromptAdapter, ITemplateAdapter, IChainAdapter {
  // Health check
  healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }>;
  
  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

export abstract class BaseAdapter implements IAdapter {
  protected connected: boolean = false;

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }>;

  // Prompt operations
  abstract createPrompt(request: CreatePromptRequest): Promise<PromptResponse>;
  abstract getPrompt(id: string, version?: string): Promise<PromptResponse>;
  abstract updatePrompt(id: string, request: UpdatePromptRequest): Promise<PromptResponse>;
  abstract deletePrompt(id: string): Promise<void>;
  abstract listPrompts(options?: PromptListOptions): Promise<PromptResponse[]>;
  abstract getPromptVersions(id: string): Promise<string[]>;
  abstract rollbackPrompt(id: string, request: RollbackRequest): Promise<PromptResponse>;

  // Template operations
  abstract createTemplate(request: CreateTemplateRequest): Promise<TemplateResponse>;
  abstract getTemplate(id: string, version?: string): Promise<TemplateResponse>;
  abstract updateTemplate(id: string, request: UpdateTemplateRequest): Promise<TemplateResponse>;
  abstract deleteTemplate(id: string): Promise<void>;
  abstract listTemplates(options?: TemplateListOptions): Promise<TemplateResponse[]>;
  abstract renderTemplate(request: TemplateRenderRequest): Promise<TemplateRenderResponse>;

  // Chain operations
  abstract createChain(request: CreateChainRequest): Promise<ChainResponse>;
  abstract getChain(id: string, version?: string): Promise<ChainResponse>;
  abstract updateChain(id: string, request: UpdateChainRequest): Promise<ChainResponse>;
  abstract deleteChain(id: string): Promise<void>;
  abstract listChains(options?: ChainListOptions): Promise<ChainResponse[]>;
  abstract executeChain(request: ChainExecutionRequest): Promise<ChainExecutionResult>;
  abstract validateChain(chainId: string, version?: string): Promise<{ valid: boolean; errors: string[] }>;

  protected ensureConnected(): void {
    if (!this.connected) {
      throw new Error('Adapter is not connected. Call connect() first.');
    }
  }
}
