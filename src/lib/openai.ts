import OpenAI from 'openai';

let _openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    _openai = new OpenAI({
      apiKey,
      timeout: 30000,
      maxRetries: 2,
    });
  }
  return _openai;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAIClient();
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  return response.data[0].embedding;
}

export async function generateCompanyEmbedding(
  name: string,
  description: string,
  derived_capabilities: string[],
  domain_verticals: string[],
  ai_infrastructure: boolean,
  ai_platform: boolean
): Promise<number[]> {
  const parts = [
    name,
    description,
    `Capabilities: ${derived_capabilities.join(', ')}`,
    `Verticals: ${domain_verticals.join(', ')}`
  ];

  if (ai_infrastructure) {
    parts.push('AI Infrastructure provider');
  }
  if (ai_platform) {
    parts.push('AI Platform provider');
  }

  return generateEmbedding(parts.join('\n'));
}

export async function generateProductEmbedding(
  productName: string,
  productDescription: string,
  companyName: string
): Promise<number[]> {
  const text = [
    `Product: ${productName}`,
    productDescription,
    `Company: ${companyName}`
  ].join('\n');

  return generateEmbedding(text);
}
