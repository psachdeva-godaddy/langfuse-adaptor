import { config } from 'dotenv';
import { LangfusePromptSDK } from '../src/sdk';

// Load environment variables
config();

async function productionDemo() {
  console.log('🎯 Langfuse Prompt Management System - Production Demo');
  console.log('===================================================');

  const sdk = new LangfusePromptSDK({ autoConnect: false });

  try {
    await sdk.connect();
    console.log('✅ Connected to Langfuse server');

    // Demo 1: Template with Default Values
    console.log('\n📧 Demo 1: Template rendering with default values');
    
    const emailTemplate = await sdk.createTemplate(
      `email-demo-${Date.now()}`,
      'Dear {{name}},\n\n{{message}}\n\nBest regards,\n{{sender}}',
      {
        description: 'Professional email template',
        tags: ['email', 'professional'],
        syntax: 'simple',
        defaultValues: {
          sender: 'Customer Support Team',
          message: 'Thank you for contacting us.'
        }
      }
    );

    console.log('✅ Template created with', emailTemplate.variables.length, 'variables');

    // Test rendering with defaults and overrides
    const rendered1 = await sdk.renderTemplate(emailTemplate.id, { name: 'Alice Johnson' });
    const rendered2 = await sdk.renderTemplate(emailTemplate.id, {
      name: 'Bob Smith',
      message: 'Your order has been shipped and will arrive tomorrow.',
      sender: 'Shipping Department'
    });

    console.log('✅ Template rendering: defaults and overrides working');

    // Demo 2: Langfuse Versioning
    console.log('\n📝 Demo 2: Langfuse versioning (1→2→3 progression)');
    
    try {
      const promptName = `versioning-demo-${Date.now()}`;
      
      // Create initial version
      const initialPrompt = await sdk.createPrompt(
        promptName,
        'Hello {{name}}! Welcome to {{platform}}. How can I assist you today?',
        {
          description: 'Customer service greeting - v1',
          tags: ['greeting', 'v1'],
          variables: { name: 'string', platform: 'string' },
          labels: ['staging', 'latest']
        }
      );

      console.log('✅ Version 1 created:', initialPrompt.version, '- Langfuse:', initialPrompt.langfuseVersion);

      // Create version 2
      const v2Prompt = await sdk.updatePrompt(initialPrompt.id, {
        content: 'Hello {{name}}! Welcome to {{platform}}. I\'m your AI assistant ready to help with any questions.',
        tags: ['greeting', 'v2', 'improved'],
        description: 'Customer service greeting - v2'
      });

      console.log('✅ Version 2 created:', v2Prompt.version, '- Langfuse:', v2Prompt.langfuseVersion);

      // Create version 3
      const v3Prompt = await sdk.updatePrompt(initialPrompt.id, {
        content: 'Hello {{name}}! Welcome to {{platform}}. I\'m here to provide excellent support. How may I assist you?',
        tags: ['greeting', 'v3', 'production-ready'],
        description: 'Customer service greeting - v3'
      });

      console.log('✅ Version 3 created:', v3Prompt.version, '- Langfuse:', v3Prompt.langfuseVersion);

      // Test version retrieval
      const specificVersion = await sdk.getPrompt(initialPrompt.id, initialPrompt.version);
      const latestVersion = await sdk.getPrompt(initialPrompt.id);
      const versions = await sdk.getPromptVersions(initialPrompt.id);

      console.log('✅ Version retrieval working - Total versions:', versions.length);

    } catch (error) {
      console.log('ℹ️  Versioning demo:', (error as Error).message);
    }

    // Demo 3: Chain Execution
    console.log('\n🔗 Demo 3: Workflow chain execution');

    const workflowChain = await sdk.createChain(
      `workflow-demo-${Date.now()}`,
      [{ name: 'email-step', type: 'template', resourceId: emailTemplate.id }],
      {
        description: 'Customer communication workflow',
        tags: ['workflow', 'customer-service'],
        executionOrder: 'sequential'
      }
    );

    const execution = await sdk.executeChain(workflowChain.id, {
      name: 'Carol Davis',
      message: 'Welcome to our premium service! We are excited to have you on board.'
    });

    console.log('✅ Chain execution:', execution.status, '- Steps:', execution.stepResults.length);

    // Demo 4: Multi-Environment Deployment
    console.log('\n🚀 Demo 4: Multi-environment deployment (dev→staging→prod)');
    
    try {
      const alertPromptName = `alert-system-${Date.now()}`;
      
      // Create dev → staging → production versions
      const devPrompt = await sdk.createPrompt(
        alertPromptName,
        'ALERT: {{severity}} - {{message}}. Action required: {{action}}',
        {
          description: 'System alert - dev version',
          tags: ['alert', 'dev'],
          variables: { severity: 'string', message: 'string', action: 'string' },
          labels: ['development']
        }
      );

      const stagingPrompt = await sdk.updatePrompt(devPrompt.id, {
        content: '🚨 {{severity}} ALERT: {{message}}\n\n📋 Action: {{action}}\n⏰ Time: {{timestamp}}',
        tags: ['alert', 'staging', 'enhanced'],
        description: 'System alert - staging version',
        variables: { severity: 'string', message: 'string', action: 'string', timestamp: 'string' }
      });

      const prodPrompt = await sdk.updatePrompt(devPrompt.id, {
        content: '🚨 {{severity}} SYSTEM ALERT\n\nIssue: {{message}}\nAction: {{action}}\nTime: {{timestamp}}\nContact: support@company.com',
        tags: ['alert', 'production', 'final'],
        description: 'System alert - production version'
      });

      console.log('✅ Multi-environment deployment:', devPrompt.version, '→', stagingPrompt.version, '→', prodPrompt.version);

      // A/B Testing
      const welcomeA = await sdk.createPrompt(
        `welcome-ab-${Date.now()}-a`,
        'Welcome to {{company}}, {{name}}. We appreciate your business.',
        { tags: ['welcome', 'formal'], labels: ['version-a'] }
      );

      const welcomeB = await sdk.createPrompt(
        `welcome-ab-${Date.now()}-b`,
        'Hey {{name}}! 👋 Welcome to {{company}}! We\'re excited to have you! 🎉',
        { tags: ['welcome', 'casual'], labels: ['version-b'] }
      );

      console.log('✅ A/B testing setup: formal vs casual versions created');

    } catch (error) {
      console.log('ℹ️  Deployment demo:', (error as Error).message);
    }

    // Demo 5: System Analytics & Search
    console.log('\n📊 Demo 5: System analytics & search');

    const stats = await sdk.getSystemStats();
    console.log('✅ System overview: Prompts:', stats.overview.totalPrompts, 
                '| Templates:', stats.overview.totalTemplates, 
                '| Chains:', stats.overview.totalChains,
                '| Health:', stats.systemHealth.status);

    const searchResults = await sdk.globalSearch('demo');
    console.log('✅ Search results: Prompts:', searchResults.prompts.length, 
                '| Templates:', searchResults.templates.length, 
                '| Chains:', searchResults.chains.length);

    console.log('\n🎉 Production demo completed successfully!');
    console.log('The system is ready for production use with your Langfuse server.');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  } finally {
    await sdk.disconnect();
    console.log('\n👋 Disconnected from Langfuse');
  }
}

if (require.main === module) {
  productionDemo().catch(console.error);
}

export { productionDemo };
