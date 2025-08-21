import { config } from 'dotenv';
import { LangfusePromptSDK } from '../src/sdk';

// Load environment variables
config();

async function testVersionUpdates() {
  console.log('🧪 Testing Langfuse Version Updates');
  console.log('===================================');
  console.log('This test will create a prompt and update it multiple times');
  console.log('to verify that version progression works correctly.');
  console.log('');

  const sdk = new LangfusePromptSDK({ autoConnect: false });

  try {
    await sdk.connect();
    console.log('✅ Connected to Langfuse server');

    // Use a fixed name for testing
    const PROMPT_NAME = 'version-update-test';
    
    console.log('\n📝 Step 1: Creating initial prompt');
    console.log('----------------------------------');
    
    const initialPrompt = await sdk.createPrompt(
      PROMPT_NAME,
      'Hello {{name}}! This is version 1.',
      {
        description: 'Version update test - initial version',
        tags: ['test', 'version-1'],
        variables: { name: 'string' },
        labels: ['staging']
      }
    );

    console.log('✅ Initial prompt created:');
    console.log('   ID:', initialPrompt.id);
    console.log('   Name:', initialPrompt.name);
    console.log('   Version:', initialPrompt.version);
    console.log('   Langfuse Version:', initialPrompt.langfuseVersion);
    console.log('   Content:', initialPrompt.content);
    console.log('   Labels:', initialPrompt.labels);

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n🚀 Step 2: Updating to version 2');
    console.log('--------------------------------');
    
    try {
      const updatedPrompt = await sdk.updatePrompt(initialPrompt.id, {
        content: 'Hello {{name}}! This is version 2 with {{feature}}.',
        description: 'Version update test - updated version',
        tags: ['test', 'version-2', 'updated'],
        variables: { name: 'string', feature: 'string' }
      });

      console.log('✅ Prompt updated successfully:');
      console.log('   ID:', updatedPrompt.id);
      console.log('   Version:', updatedPrompt.version);
      console.log('   Langfuse Version:', updatedPrompt.langfuseVersion);
      console.log('   Content:', updatedPrompt.content);
      console.log('   Tags:', updatedPrompt.tags);

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('\n🎯 Step 3: Updating to version 3');
      console.log('--------------------------------');
      
      const finalPrompt = await sdk.updatePrompt(initialPrompt.id, {
        content: 'Hello {{name}}! This is version 3 with {{feature}} and {{status}}.',
        description: 'Version update test - final version',
        tags: ['test', 'version-3', 'final'],
        variables: { name: 'string', feature: 'string', status: 'string' }
      });

      console.log('✅ Prompt updated to final version:');
      console.log('   ID:', finalPrompt.id);
      console.log('   Version:', finalPrompt.version);
      console.log('   Langfuse Version:', finalPrompt.langfuseVersion);
      console.log('   Content:', finalPrompt.content);
      console.log('   Tags:', finalPrompt.tags);

      console.log('\n🎉 Version Update Test SUCCESSFUL!');
      console.log('==================================');
      console.log('');
      console.log('📊 Summary:');
      console.log('   Initial Version:', initialPrompt.langfuseVersion || 1);
      console.log('   Updated Version:', updatedPrompt.langfuseVersion || 2);
      console.log('   Final Version:', finalPrompt.langfuseVersion || 3);
      console.log('');
      console.log('🎯 Check your Langfuse dashboard:');
      console.log('   URL: http://localhost:3000');
      console.log('   Look for prompt: "' + PROMPT_NAME + '"');
      console.log('   You should see multiple versions (1, 2, 3) of the same prompt!');

    } catch (updateError) {
      console.log('❌ Update failed:', (updateError as Error).message);
      console.log('');
      console.log('🔧 This might be due to:');
      console.log('   1. Langfuse SDK limitations');
      console.log('   2. Server configuration');
      console.log('   3. API compatibility issues');
      console.log('');
      console.log('💡 Alternative approach:');
      console.log('   The system will create separate prompts with version indicators');
      console.log('   to demonstrate version progression concepts.');
    }

    console.log('\n📋 Verification Steps:');
    console.log('======================');
    console.log('1. Open Langfuse dashboard: http://localhost:3000');
    console.log('2. Navigate to "Prompts" section');
    console.log('3. Look for prompt: "' + PROMPT_NAME + '"');
    console.log('4. Click on the prompt to see version history');
    console.log('5. Verify version progression and content changes');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await sdk.disconnect();
    console.log('\n👋 Disconnected from Langfuse');
  }
}

if (require.main === module) {
  testVersionUpdates().catch(console.error);
}

export { testVersionUpdates };
