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
  return {
    name: data.name,
    prompt: data.content,
    config: data.config,
    labels: data.label ? [data.label] : [],
    tags: data.tags || [],
    version: data.version ? parseInt(data.version.split('.')[0]) : 1,
    isActive: true,
  };
};

export const transformFromLangfusePrompt = (data: LangfusePromptResponse): any => {
  return {
    id: data.id,
    name: data.name,
    content: data.prompt,
    description: '', // Langfuse doesn't have description field
    label: data.labels?.[0],
    tags: data.tags || [],
    config: data.config,
    author: data.createdBy,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
    version: `${data.version}.0.0`,
    type: 'text' as const,
  };
};
