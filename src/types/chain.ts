import { BaseMetadata, FilterOptions, PaginationOptions, ExecutionOrder, DataMappingConfig } from './common';

export interface ChainStep {
  id: string;
  name: string;
  type: 'prompt' | 'template';
  resourceId: string;
  resourceVersion?: string;
  inputMapping?: Record<string, string>;
  outputMapping?: Record<string, string>;
  condition?: string;
  order: number;
}

export interface ChainMetadata extends BaseMetadata {
  stepCount: number;
  executionOrder: ExecutionOrder;
}

export interface CreateChainRequest {
  name: string;
  description?: string;
  label?: string;
  tags?: string[];
  steps: Omit<ChainStep, 'id'>[];
  executionOrder: ExecutionOrder;
  dataMapping?: DataMappingConfig[];
}

export interface UpdateChainRequest {
  description?: string;
  label?: string;
  tags?: string[];
  steps?: Omit<ChainStep, 'id'>[];
  executionOrder?: ExecutionOrder;
  dataMapping?: DataMappingConfig[];
}

export interface ChainResponse {
  id: string;
  name: string;
  description?: string;
  label?: string;
  tags: string[];
  steps: ChainStep[];
  executionOrder: ExecutionOrder;
  dataMapping: DataMappingConfig[];
  author: string;
  createdAt: Date;
  updatedAt: Date;
  version: string;
}

export interface ChainFilters extends FilterOptions {
  executionOrder?: ExecutionOrder;
  stepCount?: { min?: number; max?: number };
  hasStepType?: 'prompt' | 'template';
}

export interface ChainListOptions extends PaginationOptions {
  filters?: ChainFilters;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'stepCount';
  sortOrder?: 'asc' | 'desc';
}

export interface ChainExecutionRequest {
  chainId: string;
  version?: string;
  initialData?: Record<string, any>;
  stepOverrides?: Record<string, Record<string, any>>;
}

export interface ChainExecutionResult {
  chainId: string;
  executionId: string;
  status: 'success' | 'error' | 'partial';
  results: Record<string, any>;
  stepResults: Array<{
    stepId: string;
    status: 'success' | 'error' | 'skipped';
    result?: any;
    error?: string;
    executionTime: number;
  }>;
  totalExecutionTime: number;
  error?: string;
}
