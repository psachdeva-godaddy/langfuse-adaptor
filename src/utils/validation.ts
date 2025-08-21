import Joi from 'joi';
import * as semver from 'semver';
import { ValidationError } from '../types/common';

// Common validation schemas
const nameSchema = Joi.string().min(1).max(100).pattern(/^[a-zA-Z0-9_-]+$/).required();
const descriptionSchema = Joi.string().max(500).optional();
const labelSchema = Joi.string().max(50).optional();
const tagsSchema = Joi.array().items(Joi.string().max(30)).max(10).optional();
const versionSchema = Joi.string().pattern(/^\d+\.\d+\.\d+$/).optional();

// Prompt validation schemas
export const createPromptSchema = Joi.object({
  name: nameSchema,
  content: Joi.string().min(1).max(10000).required(),
  description: descriptionSchema,
  label: labelSchema,
  tags: tagsSchema,
  variables: Joi.object().pattern(Joi.string(), Joi.any()).optional(),
  type: Joi.string().valid('text', 'chat').optional().default('text'),
  config: Joi.object().optional(),
});

export const updatePromptSchema = Joi.object({
  content: Joi.string().min(1).max(10000).optional(),
  description: descriptionSchema,
  label: labelSchema,
  tags: tagsSchema,
  variables: Joi.object().pattern(Joi.string(), Joi.any()).optional(),
  config: Joi.object().optional(),
}).min(1);

export const rollbackRequestSchema = Joi.object({
  targetVersion: Joi.string().pattern(/^\d+\.\d+\.\d+$/).required(),
  changelog: Joi.string().max(500).optional(),
});

// Template validation schemas
export const createTemplateSchema = Joi.object({
  name: nameSchema,
  content: Joi.string().min(1).max(10000).required(),
  description: descriptionSchema,
  label: labelSchema,
  tags: tagsSchema,
  variables: Joi.array().items(Joi.string()).optional(),
  syntax: Joi.string().valid('handlebars', 'mustache', 'simple').optional().default('simple'),
  defaultValues: Joi.object().pattern(Joi.string(), Joi.any()).optional(),
});

export const updateTemplateSchema = Joi.object({
  content: Joi.string().min(1).max(10000).optional(),
  description: descriptionSchema,
  label: labelSchema,
  tags: tagsSchema,
  variables: Joi.array().items(Joi.string()).optional(),
  defaultValues: Joi.object().pattern(Joi.string(), Joi.any()).optional(),
}).min(1);

export const templateRenderSchema = Joi.object({
  templateId: Joi.string().uuid().required(),
  version: versionSchema,
  variables: Joi.object().pattern(Joi.string(), Joi.any()).required(),
});

// Chain validation schemas
const chainStepSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  type: Joi.string().valid('prompt', 'template').required(),
  resourceId: Joi.string().required(),
  resourceVersion: versionSchema,
  inputMapping: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  outputMapping: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  condition: Joi.string().optional(),
  order: Joi.number().integer().min(0).required(),
});

const dataMappingSchema = Joi.object({
  fromStep: Joi.string().required(),
  toStep: Joi.string().required(),
  fieldMapping: Joi.object().pattern(Joi.string(), Joi.string()).required(),
});

export const createChainSchema = Joi.object({
  name: nameSchema,
  description: descriptionSchema,
  label: labelSchema,
  tags: tagsSchema,
  steps: Joi.array().items(chainStepSchema.fork('order', (schema: Joi.Schema) => schema.optional())).min(1).required(),
  executionOrder: Joi.string().valid('sequential', 'parallel').required(),
  dataMapping: Joi.array().items(dataMappingSchema).optional(),
});

export const updateChainSchema = Joi.object({
  description: descriptionSchema,
  label: labelSchema,
  tags: tagsSchema,
  steps: Joi.array().items(chainStepSchema.fork('order', (schema: Joi.Schema) => schema.optional())).min(1).optional(),
  executionOrder: Joi.string().valid('sequential', 'parallel').optional(),
  dataMapping: Joi.array().items(dataMappingSchema).optional(),
}).min(1);

export const chainExecutionSchema = Joi.object({
  chainId: Joi.string().uuid().required(),
  version: versionSchema,
  initialData: Joi.object().pattern(Joi.string(), Joi.any()).optional(),
  stepOverrides: Joi.object().pattern(Joi.string(), Joi.object()).optional(),
});

// List options schemas
export const listOptionsSchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(50),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional().default('desc'),
  filters: Joi.object().optional(),
});

// Validation helper functions
export const validateSchema = <T>(schema: Joi.ObjectSchema, data: any): { value: T; errors?: ValidationError[] } => {
  const { error, value } = schema.validate(data, { abortEarly: false });
  
  if (error) {
    const errors: ValidationError[] = error.details.map((detail: Joi.ValidationErrorItem) => ({
      field: detail.path.join('.'),
      message: detail.message,
      code: detail.type,
    }));
    return { value, errors };
  }
  
  return { value };
};

export const validatePromptName = (name: string): boolean => {
  return /^[a-zA-Z0-9_-]+$/.test(name) && name.length >= 1 && name.length <= 100;
};

export const validateVersion = (version: string): boolean => {
  return semver.valid(version) !== null;
};

export const validateTemplateVariables = (content: string, variables: string[]): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const contentVariables = extractVariablesFromContent(content);
  
  // Check for undefined variables in content
  const undefinedVariables = contentVariables.filter(v => !variables.includes(v));
  if (undefinedVariables.length > 0) {
    errors.push(`Undefined variables in content: ${undefinedVariables.join(', ')}`);
  }
  
  // Skip unused variable check for now as it's too strict for complex templates
  // In a real implementation, you might want to make this configurable
  
  return { valid: errors.length === 0, errors };
};

export const validateChainSteps = (steps: any[]): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const stepNames = new Set<string>();
  
  for (const step of steps) {
    // Check for duplicate step names
    if (stepNames.has(step.name)) {
      errors.push(`Duplicate step name: ${step.name}`);
    }
    stepNames.add(step.name);
    
    // Validate step order
    if (step.order < 0 || step.order >= steps.length) {
      errors.push(`Invalid order for step '${step.name}': ${step.order}`);
    }
  }
  
  // Check for order conflicts
  const orders = steps.map(s => s.order).sort((a, b) => a - b);
  for (let i = 0; i < orders.length; i++) {
    if (orders[i] !== i) {
      errors.push(`Step order sequence is not continuous: expected ${i}, got ${orders[i]}`);
      break;
    }
  }
  
  return { valid: errors.length === 0, errors };
};

export const validateDataMapping = (dataMapping: any[], steps: any[]): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const stepNames = new Set(steps.map(s => s.name));
  
  for (const mapping of dataMapping) {
    if (!stepNames.has(mapping.fromStep)) {
      errors.push(`Data mapping references non-existent step: ${mapping.fromStep}`);
    }
    
    if (!stepNames.has(mapping.toStep)) {
      errors.push(`Data mapping references non-existent step: ${mapping.toStep}`);
    }
    
    if (mapping.fromStep === mapping.toStep) {
      errors.push(`Data mapping cannot map step to itself: ${mapping.fromStep}`);
    }
  }
  
  return { valid: errors.length === 0, errors };
};

// Helper function to extract variables from template content
const extractVariablesFromContent = (content: string): string[] => {
  const variables: string[] = [];
  
  // Extract simple variables {{variable}}
  const simpleRegex = /\{\{(\w+)\}\}/g;
  let match;
  while ((match = simpleRegex.exec(content)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }
  
  // Extract conditional variables {{#if variable}} or {{#variable}}
  const conditionalRegex = /\{\{#(?:if\s+)?(\w+)\}\}/g;
  while ((match = conditionalRegex.exec(content)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }
  
  // Extract each variables {{#each variable}}
  const eachRegex = /\{\{#each\s+(\w+)\}\}/g;
  while ((match = eachRegex.exec(content)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }
  
  return variables;
};
