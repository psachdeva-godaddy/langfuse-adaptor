export type TemplateSyntax = 'handlebars' | 'mustache' | 'simple';

export interface TemplateRenderOptions {
  syntax: TemplateSyntax;
  variables: Record<string, any>;
  defaultValues?: Record<string, any>;
  strictMode?: boolean; // If true, throws error on missing variables
}

export interface TemplateRenderResult {
  rendered: string;
  usedVariables: string[];
  missingVariables: string[];
  errors: string[];
}

export class TemplateEngine {
  static render(content: string, options: TemplateRenderOptions): TemplateRenderResult {
    const { syntax, variables, defaultValues = {}, strictMode = false } = options;
    
    switch (syntax) {
      case 'simple':
        return this.renderSimple(content, variables, defaultValues, strictMode);
      case 'handlebars':
        return this.renderHandlebars(content, variables, defaultValues, strictMode);
      case 'mustache':
        return this.renderMustache(content, variables, defaultValues, strictMode);
      default:
        throw new Error(`Unsupported template syntax: ${syntax}`);
    }
  }

  private static renderSimple(
    content: string,
    variables: Record<string, any>,
    defaultValues: Record<string, any>,
    strictMode: boolean
  ): TemplateRenderResult {
    const errors: string[] = [];
    const usedVariables: string[] = [];
    const missingVariables: string[] = [];
    
    // Extract all variables from content
    const variableRegex = /\{\{(\w+)\}\}/g;
    const contentVariables = new Set<string>();
    let match;
    
    while ((match = variableRegex.exec(content)) !== null) {
      contentVariables.add(match[1]);
    }
    
    // Merge variables with defaults (variables override defaults)
    const allVariables = { ...defaultValues, ...variables };
    
    // Replace variables in content
    let rendered = content;
    
    for (const variable of contentVariables) {
      const regex = new RegExp(`\\{\\{${variable}\\}\\}`, 'g');
      
      if (variable in allVariables) {
        const value = allVariables[variable];
        rendered = rendered.replace(regex, String(value));
        usedVariables.push(variable);
      } else {
        missingVariables.push(variable);
        
        if (strictMode) {
          errors.push(`Missing required variable: ${variable}`);
        } else {
          // Leave placeholder in non-strict mode
          rendered = rendered.replace(regex, `{{${variable}}}`);
        }
      }
    }
    
    return {
      rendered,
      usedVariables: [...new Set(usedVariables)],
      missingVariables: [...new Set(missingVariables)],
      errors,
    };
  }

  private static renderHandlebars(
    content: string,
    variables: Record<string, any>,
    defaultValues: Record<string, any>,
    strictMode: boolean
  ): TemplateRenderResult {
    // Simplified Handlebars-like syntax support
    // In a real implementation, you'd use the Handlebars library
    const errors: string[] = [];
    const usedVariables: string[] = [];
    const missingVariables: string[] = [];
    
    // Support for {{variable}}, {{#if variable}}, {{#each array}}
    const allVariables = { ...defaultValues, ...variables };
    let rendered = content;
    
    // Handle simple variables first
    const simpleVarRegex = /\{\{(\w+)\}\}/g;
    rendered = rendered.replace(simpleVarRegex, (match, varName) => {
      if (varName in allVariables) {
        usedVariables.push(varName);
        return String(allVariables[varName]);
      } else {
        missingVariables.push(varName);
        if (strictMode) {
          errors.push(`Missing required variable: ${varName}`);
          return match;
        }
        return match;
      }
    });
    
    // Handle conditional blocks {{#if variable}}...{{/if}}
    const ifRegex = /\{\{#if\s+(\w+)\}\}(.*?)\{\{\/if\}\}/gs;
    rendered = rendered.replace(ifRegex, (match, varName, content) => {
      if (varName in allVariables && allVariables[varName]) {
        usedVariables.push(varName);
        return content;
      }
      return '';
    });
    
    // Handle each blocks {{#each array}}...{{/each}}
    const eachRegex = /\{\{#each\s+(\w+)\}\}(.*?)\{\{\/each\}\}/gs;
    rendered = rendered.replace(eachRegex, (match, varName, itemTemplate) => {
      if (varName in allVariables && Array.isArray(allVariables[varName])) {
        usedVariables.push(varName);
        return allVariables[varName]
          .map((item: any, index: number) => {
            let itemContent = itemTemplate;
            // Replace {{this}} with current item
            itemContent = itemContent.replace(/\{\{this\}\}/g, String(item));
            // Replace {{@index}} with current index
            itemContent = itemContent.replace(/\{\{@index\}\}/g, String(index));
            return itemContent;
          })
          .join('');
      } else if (strictMode) {
        errors.push(`Variable '${varName}' is not an array or is missing`);
      }
      return '';
    });
    
    return {
      rendered,
      usedVariables: [...new Set(usedVariables)],
      missingVariables: [...new Set(missingVariables)],
      errors,
    };
  }

  private static renderMustache(
    content: string,
    variables: Record<string, any>,
    defaultValues: Record<string, any>,
    strictMode: boolean
  ): TemplateRenderResult {
    // Simplified Mustache-like syntax support
    // In a real implementation, you'd use the Mustache library
    const errors: string[] = [];
    const usedVariables: string[] = [];
    const missingVariables: string[] = [];
    
    const allVariables = { ...defaultValues, ...variables };
    let rendered = content;
    
    // Handle simple variables {{variable}}
    const simpleVarRegex = /\{\{(\w+)\}\}/g;
    rendered = rendered.replace(simpleVarRegex, (match, varName) => {
      if (varName in allVariables) {
        usedVariables.push(varName);
        return String(allVariables[varName]);
      } else {
        missingVariables.push(varName);
        if (strictMode) {
          errors.push(`Missing required variable: ${varName}`);
        }
        return match;
      }
    });
    
    // Handle sections {{#variable}}...{{/variable}}
    const sectionRegex = /\{\{#(\w+)\}\}(.*?)\{\{\/\1\}\}/gs;
    rendered = rendered.replace(sectionRegex, (match, varName, sectionContent) => {
      if (varName in allVariables) {
        const value = allVariables[varName];
        usedVariables.push(varName);
        
        if (Array.isArray(value)) {
          return value.map(item => {
            let itemContent = sectionContent;
            if (typeof item === 'object') {
              // Replace variables within the section
              for (const [key, val] of Object.entries(item)) {
                const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                itemContent = itemContent.replace(regex, String(val));
              }
            } else {
              // Replace {{.}} with the item value
              itemContent = itemContent.replace(/\{\{\.\}\}/g, String(item));
            }
            return itemContent;
          }).join('');
        } else if (value) {
          return sectionContent;
        }
      } else if (strictMode) {
        errors.push(`Missing required variable: ${varName}`);
      }
      return '';
    });
    
    // Handle inverted sections {{^variable}}...{{/variable}}
    const invertedSectionRegex = /\{\{\^(\w+)\}\}(.*?)\{\{\/\1\}\}/gs;
    rendered = rendered.replace(invertedSectionRegex, (match, varName, sectionContent) => {
      if (varName in allVariables) {
        const value = allVariables[varName];
        usedVariables.push(varName);
        
        if (!value || (Array.isArray(value) && value.length === 0)) {
          return sectionContent;
        }
      } else {
        // Variable doesn't exist, show inverted section
        return sectionContent;
      }
      return '';
    });
    
    return {
      rendered,
      usedVariables: [...new Set(usedVariables)],
      missingVariables: [...new Set(missingVariables)],
      errors,
    };
  }

  static extractVariables(content: string, syntax: TemplateSyntax): string[] {
    const variables = new Set<string>();
    
    switch (syntax) {
      case 'simple':
      case 'handlebars':
      case 'mustache':
        // Extract simple variables {{variable}}
        const simpleRegex = /\{\{(\w+)\}\}/g;
        let match;
        while ((match = simpleRegex.exec(content)) !== null) {
          variables.add(match[1]);
        }
        
        // Extract conditional variables {{#if variable}} or {{#variable}}
        const conditionalRegex = /\{\{#(?:if\s+)?(\w+)\}\}/g;
        while ((match = conditionalRegex.exec(content)) !== null) {
          variables.add(match[1]);
        }
        
        // Extract each variables {{#each variable}}
        const eachRegex = /\{\{#each\s+(\w+)\}\}/g;
        while ((match = eachRegex.exec(content)) !== null) {
          variables.add(match[1]);
        }
        
        // Extract inverted section variables {{^variable}}
        const invertedRegex = /\{\{\^(\w+)\}\}/g;
        while ((match = invertedRegex.exec(content)) !== null) {
          variables.add(match[1]);
        }
        break;
    }
    
    return Array.from(variables);
  }

  static validateSyntax(content: string, syntax: TemplateSyntax): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      switch (syntax) {
        case 'simple':
          this.validateSimpleSyntax(content, errors);
          break;
        case 'handlebars':
          this.validateHandlebarsSyntax(content, errors);
          break;
        case 'mustache':
          this.validateMustacheSyntax(content, errors);
          break;
      }
    } catch (error) {
      errors.push((error as Error).message);
    }
    
    return { valid: errors.length === 0, errors };
  }

  private static validateSimpleSyntax(content: string, errors: string[]): void {
    // Check for balanced braces
    const openBraces = (content.match(/\{\{/g) || []).length;
    const closeBraces = (content.match(/\}\}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      errors.push('Unbalanced template braces');
    }
    
    // Check for valid variable names
    const variableRegex = /\{\{(\w*)\}\}/g;
    let match;
    while ((match = variableRegex.exec(content)) !== null) {
      if (!match[1] || !/^\w+$/.test(match[1])) {
        errors.push(`Invalid variable name: {{${match[1]}}}`);
      }
    }
  }

  private static validateHandlebarsSyntax(content: string, errors: string[]): void {
    this.validateSimpleSyntax(content, errors);
    
    // Check for balanced if blocks
    const ifOpens = (content.match(/\{\{#if\s+\w+\}\}/g) || []).length;
    const ifCloses = (content.match(/\{\{\/if\}\}/g) || []).length;
    
    if (ifOpens !== ifCloses) {
      errors.push('Unbalanced {{#if}} blocks');
    }
    
    // Check for balanced each blocks
    const eachOpens = (content.match(/\{\{#each\s+\w+\}\}/g) || []).length;
    const eachCloses = (content.match(/\{\{\/each\}\}/g) || []).length;
    
    if (eachOpens !== eachCloses) {
      errors.push('Unbalanced {{#each}} blocks');
    }
  }

  private static validateMustacheSyntax(content: string, errors: string[]): void {
    this.validateSimpleSyntax(content, errors);
    
    // Check for balanced sections
    const sectionRegex = /\{\{#(\w+)\}\}/g;
    const sections = new Set<string>();
    let match;
    
    while ((match = sectionRegex.exec(content)) !== null) {
      sections.add(match[1]);
    }
    
    for (const section of sections) {
      const opens = (content.match(new RegExp(`\\{\\{#${section}\\}\\}`, 'g')) || []).length;
      const closes = (content.match(new RegExp(`\\{\\{\\/${section}\\}\\}`, 'g')) || []).length;
      
      if (opens !== closes) {
        errors.push(`Unbalanced {{#${section}}} sections`);
      }
    }
    
    // Check for balanced inverted sections
    const invertedRegex = /\{\{\^(\w+)\}\}/g;
    const invertedSections = new Set<string>();
    
    while ((match = invertedRegex.exec(content)) !== null) {
      invertedSections.add(match[1]);
    }
    
    for (const section of invertedSections) {
      const opens = (content.match(new RegExp(`\\{\\{\\^${section}\\}\\}`, 'g')) || []).length;
      const closes = (content.match(new RegExp(`\\{\\{\\/${section}\\}\\}`, 'g')) || []).length;
      
      if (opens !== closes) {
        errors.push(`Unbalanced {{^${section}}} inverted sections`);
      }
    }
  }
}
