export interface LangfuseConfig {
  baseUrl: string;
  publicKey: string;
  secretKey: string;
  debug?: boolean;
  timeout?: number;
}

export const createLangfuseConfig = (): LangfuseConfig => {
  const baseUrl = process.env.LANGFUSE_BASE_URL || 'http://localhost:3000';
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;

  if (!publicKey || !secretKey) {
    throw new Error('LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY environment variables are required');
  }

  return {
    baseUrl,
    publicKey,
    secretKey,
    debug: process.env.NODE_ENV === 'development',
    timeout: 30000, // 30 seconds
  };
};

export const validateLangfuseConfig = (config: LangfuseConfig): void => {
  if (!config.baseUrl) {
    throw new Error('Langfuse baseUrl is required');
  }
  
  if (!config.publicKey) {
    throw new Error('Langfuse publicKey is required');
  }
  
  if (!config.secretKey) {
    throw new Error('Langfuse secretKey is required');
  }

  // Validate URL format
  try {
    new URL(config.baseUrl);
  } catch (error) {
    throw new Error(`Invalid Langfuse baseUrl: ${config.baseUrl}`);
  }
};
