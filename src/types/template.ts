import { BaseMetadata, FilterOptions, PaginationOptions } from './common';

export interface TemplateMetadata extends BaseMetadata {
  variables: string[];
  syntax: 'handlebars' | 'mustache' | 'simple';
}

export interface CreateTemplateRequest {
  name: string;
  content: string;
  description?: string;
  label?: string;
  tags?: string[];
  variables?: string[];
  syntax?: 'handlebars' | 'mustache' | 'simple';
  defaultValues?: Record<string, any>;
}

export interface UpdateTemplateRequest {
  content?: string;
  description?: string;
  label?: string;
  tags?: string[];
  variables?: string[];
  defaultValues?: Record<string, any>;
}

export interface TemplateResponse {
  id: string;
  name: string;
  content: string;
  description?: string;
  label?: string;
  tags: string[];
  variables: string[];
  syntax: 'handlebars' | 'mustache' | 'simple';
  defaultValues?: Record<string, any>;
  author: string;
  createdAt: Date;
  updatedAt: Date;
  version: string;
}

export interface TemplateFilters extends FilterOptions {
  syntax?: 'handlebars' | 'mustache' | 'simple';
  hasVariables?: boolean;
  variables?: string[];
}

export interface TemplateListOptions extends PaginationOptions {
  filters?: TemplateFilters;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'version';
  sortOrder?: 'asc' | 'desc';
}

export interface TemplateRenderRequest {
  templateId: string;
  version?: string;
  variables: Record<string, any>;
}

export interface TemplateRenderResponse {
  rendered: string;
  usedVariables: string[];
  missingVariables: string[];
}
