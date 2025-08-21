import { BaseMetadata, FilterOptions, PaginationOptions } from './common';

export interface PromptMetadata extends BaseMetadata {
  type: 'text' | 'chat';
  config?: Record<string, any>;
}

export interface CreatePromptRequest {
  name: string;
  content: string;
  description?: string;
  label?: string;
  tags?: string[];
  variables?: Record<string, any>;
  type?: 'text' | 'chat';
  config?: Record<string, any>;
}

export interface UpdatePromptRequest {
  content?: string;
  description?: string;
  label?: string;
  tags?: string[];
  variables?: Record<string, any>;
  config?: Record<string, any>;
}

export interface PromptResponse {
  id: string;
  name: string;
  content: string;
  description?: string;
  label?: string;
  tags: string[];
  variables?: Record<string, any>;
  author: string;
  createdAt: Date;
  updatedAt: Date;
  version: string;
  type: 'text' | 'chat';
  config?: Record<string, any>;
}

export interface PromptFilters extends FilterOptions {
  type?: 'text' | 'chat';
  hasVariables?: boolean;
}

export interface PromptListOptions extends PaginationOptions {
  filters?: PromptFilters;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'version';
  sortOrder?: 'asc' | 'desc';
}

export interface PromptVersion {
  version: string;
  content: string;
  createdAt: Date;
  author: string;
  changelog?: string;
}

export interface RollbackRequest {
  targetVersion: string;
  changelog?: string;
}
