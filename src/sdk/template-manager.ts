import { IAdapter } from '../adapters/base-adapter';
import {
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateResponse,
  TemplateListOptions,
  TemplateRenderRequest,
  TemplateRenderResponse,
} from '../types/template';
import {
  validateSchema,
  createTemplateSchema,
  updateTemplateSchema,
  templateRenderSchema,
  listOptionsSchema,
  validateTemplateVariables,
} from '../utils/validation';
import { TemplateEngine, TemplateSyntax } from '../utils/template-engine';
import { VersionManager } from '../utils/versioning';

export class TemplateManager {
  constructor(private adapter: IAdapter) {}

  async createTemplate(request: CreateTemplateRequest): Promise<TemplateResponse> {
    // Validate request
    const { value, errors } = validateSchema<CreateTemplateRequest>(createTemplateSchema, request);
    if (errors) {
      throw new Error(`Validation failed: ${errors.map(e => e.message).join(', ')}`);
    }

    // Extract variables from content if not provided
    const syntax = value.syntax || 'simple';
    const extractedVariables = TemplateEngine.extractVariables(value.content, syntax);
    const variables = value.variables || extractedVariables;

    // Validate template syntax
    const syntaxValidation = TemplateEngine.validateSyntax(value.content, syntax);
    if (!syntaxValidation.valid) {
      throw new Error(`Template syntax validation failed: ${syntaxValidation.errors.join(', ')}`);
    }

    // Validate variables consistency
    const variableValidation = validateTemplateVariables(value.content, variables);
    if (!variableValidation.valid) {
      throw new Error(`Template variable validation failed: ${variableValidation.errors.join(', ')}`);
    }

    const templateRequest: CreateTemplateRequest = {
      ...value,
      variables,
      syntax,
    };

    return await this.adapter.createTemplate(templateRequest);
  }

  async getTemplate(id: string, version?: string): Promise<TemplateResponse> {
    if (!id) {
      throw new Error('Template ID is required');
    }

    if (version && !VersionManager.isValidVersion(version)) {
      throw new Error(`Invalid version format: ${version}`);
    }

    return await this.adapter.getTemplate(id, version);
  }

  async updateTemplate(id: string, request: UpdateTemplateRequest): Promise<TemplateResponse> {
    if (!id) {
      throw new Error('Template ID is required');
    }

    // Validate request
    const { value, errors } = validateSchema<UpdateTemplateRequest>(updateTemplateSchema, request);
    if (errors) {
      throw new Error(`Validation failed: ${errors.map(e => e.message).join(', ')}`);
    }

    // Get existing template to validate updates
    const existingTemplate = await this.adapter.getTemplate(id);

    // If content is being updated, validate syntax and variables
    if (value.content) {
      const syntax = existingTemplate.syntax;
      
      // Validate template syntax
      const syntaxValidation = TemplateEngine.validateSyntax(value.content, syntax);
      if (!syntaxValidation.valid) {
        throw new Error(`Template syntax validation failed: ${syntaxValidation.errors.join(', ')}`);
      }

      // Extract variables from new content if variables not explicitly provided
      const extractedVariables = TemplateEngine.extractVariables(value.content, syntax);
      const variables = value.variables || extractedVariables;

      // Validate variables consistency
      const variableValidation = validateTemplateVariables(value.content, variables);
      if (!variableValidation.valid) {
        throw new Error(`Template variable validation failed: ${variableValidation.errors.join(', ')}`);
      }

      // Update variables if not explicitly provided
      if (!value.variables) {
        value.variables = variables;
      }
    }

    return await this.adapter.updateTemplate(id, value);
  }

  async deleteTemplate(id: string): Promise<void> {
    if (!id) {
      throw new Error('Template ID is required');
    }

    // Ensure template exists
    await this.adapter.getTemplate(id);

    await this.adapter.deleteTemplate(id);
  }

  async listTemplates(options?: TemplateListOptions): Promise<TemplateResponse[]> {
    if (options) {
      const { value, errors } = validateSchema<TemplateListOptions>(listOptionsSchema, options);
      if (errors) {
        throw new Error(`Validation failed: ${errors.map(e => e.message).join(', ')}`);
      }
      return await this.adapter.listTemplates(value);
    }

    return await this.adapter.listTemplates();
  }

  async renderTemplate(request: TemplateRenderRequest): Promise<TemplateRenderResponse> {
    // Validate request
    const { value, errors } = validateSchema<TemplateRenderRequest>(templateRenderSchema, request);
    if (errors) {
      throw new Error(`Validation failed: ${errors.map(e => e.message).join(', ')}`);
    }

    return await this.adapter.renderTemplate(value);
  }

  async renderTemplateWithEngine(
    id: string,
    variables: Record<string, any>,
    options?: {
      version?: string;
      strictMode?: boolean;
    }
  ): Promise<TemplateRenderResponse> {
    const template = await this.adapter.getTemplate(id, options?.version);
    
    const renderResult = TemplateEngine.render(template.content, {
      syntax: template.syntax,
      variables,
      defaultValues: template.defaultValues,
      strictMode: options?.strictMode || false,
    });

    if (renderResult.errors.length > 0 && options?.strictMode) {
      throw new Error(`Template rendering failed: ${renderResult.errors.join(', ')}`);
    }

    return {
      rendered: renderResult.rendered,
      usedVariables: renderResult.usedVariables,
      missingVariables: renderResult.missingVariables,
    };
  }

  async validateTemplate(id: string, version?: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const template = await this.adapter.getTemplate(id, version);
      
      // Validate syntax
      const syntaxValidation = TemplateEngine.validateSyntax(template.content, template.syntax);
      if (!syntaxValidation.valid) {
        errors.push(...syntaxValidation.errors);
      }
      
      // Validate variables
      const variableValidation = validateTemplateVariables(template.content, template.variables);
      if (!variableValidation.valid) {
        errors.push(...variableValidation.errors);
      }
      
      // Check content length
      if (template.content.length === 0) {
        errors.push('Template content cannot be empty');
      }
      
      if (template.content.length > 10000) {
        warnings.push('Template content is very long (>10,000 characters)');
      }
      
      // Check for unused default values
      if (template.defaultValues) {
        const unusedDefaults = Object.keys(template.defaultValues).filter(
          key => !template.variables.includes(key)
        );
        if (unusedDefaults.length > 0) {
          warnings.push(`Unused default values: ${unusedDefaults.join(', ')}`);
        }
      }
      
      // Check version format
      if (!VersionManager.isValidVersion(template.version)) {
        errors.push(`Invalid version format: ${template.version}`);
      }
      
    } catch (error) {
      errors.push(`Failed to retrieve template: ${(error as Error).message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async previewTemplate(
    id: string,
    variables: Record<string, any>,
    version?: string
  ): Promise<{
    rendered: string;
    usedVariables: string[];
    missingVariables: string[];
    warnings: string[];
  }> {
    const template = await this.adapter.getTemplate(id, version);
    const warnings: string[] = [];
    
    // Check for missing variables
    const missingRequired = template.variables.filter(
      variable => !(variable in variables) && !(template.defaultValues && variable in template.defaultValues)
    );
    
    if (missingRequired.length > 0) {
      warnings.push(`Missing required variables: ${missingRequired.join(', ')}`);
    }
    
    // Render with available variables
    const renderResult = TemplateEngine.render(template.content, {
      syntax: template.syntax,
      variables,
      defaultValues: template.defaultValues,
      strictMode: false,
    });
    
    return {
      rendered: renderResult.rendered,
      usedVariables: renderResult.usedVariables,
      missingVariables: renderResult.missingVariables,
      warnings,
    };
  }

  async getTemplateVariables(id: string, version?: string): Promise<{
    variables: string[];
    defaultValues: Record<string, any>;
    requiredVariables: string[];
    optionalVariables: string[];
  }> {
    const template = await this.adapter.getTemplate(id, version);
    const defaultKeys = Object.keys(template.defaultValues || {});
    
    return {
      variables: template.variables,
      defaultValues: template.defaultValues || {},
      requiredVariables: template.variables.filter(v => !defaultKeys.includes(v)),
      optionalVariables: template.variables.filter(v => defaultKeys.includes(v)),
    };
  }

  async searchTemplates(query: {
    name?: string;
    content?: string;
    tags?: string[];
    syntax?: TemplateSyntax;
    hasVariable?: string;
  }): Promise<TemplateResponse[]> {
    const allTemplates = await this.adapter.listTemplates();
    
    return allTemplates.filter(template => {
      if (query.name && !template.name.toLowerCase().includes(query.name.toLowerCase())) {
        return false;
      }
      
      if (query.content && !template.content.toLowerCase().includes(query.content.toLowerCase())) {
        return false;
      }
      
      if (query.tags && !query.tags.some(tag => template.tags.includes(tag))) {
        return false;
      }
      
      if (query.syntax && template.syntax !== query.syntax) {
        return false;
      }
      
      if (query.hasVariable && !template.variables.includes(query.hasVariable)) {
        return false;
      }
      
      return true;
    });
  }

  async cloneTemplate(
    sourceId: string,
    newName: string,
    options?: {
      version?: string;
      description?: string;
      tags?: string[];
    }
  ): Promise<TemplateResponse> {
    const sourceTemplate = await this.adapter.getTemplate(sourceId, options?.version);
    
    const cloneRequest: CreateTemplateRequest = {
      name: newName,
      content: sourceTemplate.content,
      description: options?.description || `Clone of ${sourceTemplate.name}`,
      label: sourceTemplate.label,
      tags: options?.tags || sourceTemplate.tags,
      variables: sourceTemplate.variables,
      syntax: sourceTemplate.syntax,
      defaultValues: sourceTemplate.defaultValues,
    };
    
    return await this.createTemplate(cloneRequest);
  }

  async getTemplateStats(id: string): Promise<{
    variableCount: number;
    requiredVariableCount: number;
    optionalVariableCount: number;
    contentLength: number;
    syntax: TemplateSyntax;
    tagCount: number;
    createdAt: Date;
    lastUpdated: Date;
  }> {
    const template = await this.adapter.getTemplate(id);
    const defaultKeys = Object.keys(template.defaultValues || {});
    
    return {
      variableCount: template.variables.length,
      requiredVariableCount: template.variables.filter(v => !defaultKeys.includes(v)).length,
      optionalVariableCount: template.variables.filter(v => defaultKeys.includes(v)).length,
      contentLength: template.content.length,
      syntax: template.syntax,
      tagCount: template.tags.length,
      createdAt: template.createdAt,
      lastUpdated: template.updatedAt,
    };
  }
}
