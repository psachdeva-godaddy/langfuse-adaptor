// Langfuse-specific type mappings and extensions

export interface LangfusePromptConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
}

export interface LangfusePromptData {
  name: string;
  prompt: string;
  config?: LangfusePromptConfig;
  labels?: string[];
  tags?: string[];
  version?: number;
  isActive?: boolean;
  type?: 'text' | 'chat';
}

export interface LangfusePromptResponse {
  id: string;
  name: string;
  prompt: string;
  config?: LangfusePromptConfig;
  labels?: string[];
  tags?: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isActive: boolean;
  type?: 'text' | 'chat';
}

export interface LangfusePromptVersion {
  version: number;
  prompt: string;
  config?: LangfusePromptConfig;
  createdAt: string;
  createdBy: string;
  isActive: boolean;
}

export interface LangfuseError {
  message: string;
  code?: string;
  details?: any;
}

export interface LangfuseListResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

// Transform functions between our types and Langfuse types
export const transformToLangfusePrompt = (data: any): LangfusePromptData => {
  // Handle labels - if no labels provided, default to 'latest'
  let labels = data.labels || [];
  if (data.label) {
    labels = Array.isArray(data.label) ? data.label : [data.label];
  }
  if (labels.length === 0) {
    labels = ['latest'];
  }

  return {
    name: data.name,
    prompt: data.content,
    config: data.config,
    labels: labels,
    tags: data.tags || [],
    version: data.version ? parseInt(data.version.split('.')[0]) : undefined, // Let Langfuse auto-assign version
    isActive: true,
    type: data.type || 'text',
  };
};

export const transformFromLangfusePrompt = (data: LangfusePromptResponse): any => {
  return {
    id: data.name, // In Langfuse, the name IS the ID for updates
    name: data.name,
    content: data.prompt,
    description: '', // Langfuse doesn't have description field
    label: data.labels?.[0],
    labels: data.labels || [],
    tags: data.tags || [],
    config: data.config,
    author: data.createdBy,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
    version: `${data.version || 1}.0.0`,
    type: data.type || 'text',
    langfuseVersion: data.version, // Keep original Langfuse version for reference
    langfuseId: data.id, // Keep the actual Langfuse ID for reference
  };
};
