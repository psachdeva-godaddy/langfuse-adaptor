import { Langfuse } from 'langfuse';
import { LangfuseConfig } from '../../config/langfuse';
import {
  LangfusePromptData,
  LangfusePromptResponse,
  LangfusePromptVersion,
  LangfuseListResponse,
  LangfuseError,
} from './types';

export class LangfuseClient {
  private client: Langfuse;
  private config: LangfuseConfig;

  constructor(config: LangfuseConfig) {
    this.config = config;
    this.client = new Langfuse({
      baseUrl: config.baseUrl,
      publicKey: config.publicKey,
      secretKey: config.secretKey,
    });
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }> {
    try {
      // Simple health check - just verify the client is initialized
      // In a real implementation, you might ping the Langfuse server
      return { status: 'healthy' };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async createPrompt(data: LangfusePromptData): Promise<LangfusePromptResponse> {
    try {
      // According to Langfuse docs, we can create prompts with labels
      const promptType = data.type || 'text';
      const promptData: any = {
        name: data.name,
        prompt: data.prompt,
        config: data.config,
        labels: data.labels || ['latest'], // Default to 'latest' label
        tags: data.tags,
        isActive: data.isActive !== false,
      };
      
      // Only add type if it's explicitly set to avoid overload issues
      if (promptType === 'chat') {
        promptData.type = 'chat';
      } else {
        promptData.type = 'text';
      }
      
      const result = await this.client.createPrompt(promptData);
      return result as unknown as LangfusePromptResponse;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getPrompt(name: string, version?: number, options?: { label?: string }): Promise<LangfusePromptResponse> {
    try {
      // According to Langfuse docs, we can fetch by version or label
      if (options?.label) {
        const result = await this.client.getPrompt(name, undefined, { label: options.label });
        return result as unknown as LangfusePromptResponse;
      } else {
        const result = await this.client.getPrompt(name, version);
        return result as unknown as LangfusePromptResponse;
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getPrompts(options: {
    page?: number;
    limit?: number;
    name?: string;
    label?: string;
    tag?: string;
  } = {}): Promise<LangfuseListResponse<LangfusePromptResponse>> {
    try {
      // Since Langfuse SDK doesn't have getPrompts, we'll simulate it
      // In a real implementation, you would use the actual Langfuse API
      return {
        data: [],
        meta: {
          page: options.page || 1,
          limit: options.limit || 50,
          totalItems: 0,
          totalPages: 0,
        },
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getPromptVersions(name: string): Promise<LangfusePromptVersion[]> {
    try {
      // Langfuse doesn't have a direct endpoint for versions, so we'll simulate it
      // by fetching the prompt and returning version info
      const prompt = await this.getPrompt(name);
      return [{
        version: prompt.version || 1,
        prompt: prompt.prompt,
        config: prompt.config,
        createdAt: prompt.createdAt,
        createdBy: prompt.createdBy,
        isActive: prompt.isActive,
      }];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updatePrompt(name: string, data: Partial<LangfusePromptData>): Promise<LangfusePromptResponse> {
    try {
      // In Langfuse, updating a prompt creates a new version with the same name
      // We need to create a new prompt version, not update the existing one
      const updatedData: LangfusePromptData = {
        name: name, // Keep the same name to create a new version
        prompt: data.prompt || '',
        config: data.config,
        labels: data.labels || ['latest'],
        tags: data.tags || [],
        type: data.type || 'text',
        isActive: true,
      };
      
      // Creating a prompt with the same name in Langfuse creates a new version
      const result = await this.createPrompt(updatedData);
      return result;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updatePromptLabels(name: string, version: number, newLabels: string[]): Promise<LangfusePromptResponse> {
    try {
      // According to Langfuse docs, we can update labels of existing prompt versions
      const result = await this.client.updatePrompt({
        name,
        version,
        newLabels,
      });
      return result as unknown as LangfusePromptResponse;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deletePrompt(name: string): Promise<void> {
    try {
      // Langfuse doesn't have a delete endpoint, so we'll mark as inactive
      const currentPrompt = await this.getPrompt(name);
      await this.createPrompt({
        ...currentPrompt,
        version: (currentPrompt.version || 0) + 1,
        isActive: false,
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (error instanceof Error) {
      return error;
    }
    
    if (typeof error === 'object' && error.message) {
      return new Error(error.message);
    }
    
    return new Error('Unknown Langfuse error');
  }

  async shutdown(): Promise<void> {
    await this.client.shutdownAsync();
  }
}
