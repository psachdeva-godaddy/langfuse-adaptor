export interface BaseMetadata {
  id: string;
  name: string;
  description?: string;
  label?: string;
  tags: string[];
  author: string;
  createdAt: Date;
  updatedAt: Date;
  version: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface FilterOptions {
  tags?: string[];
  author?: string;
  name?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: ValidationError[];
  };
}

export type ExecutionOrder = 'sequential' | 'parallel';

export interface DataMappingConfig {
  fromStep: string;
  toStep: string;
  fieldMapping: Record<string, string>;
}
