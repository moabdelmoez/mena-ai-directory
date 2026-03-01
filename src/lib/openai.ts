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
  description: string
): Promise<number[]> {
  return generateEmbedding(`${name}\n${description}`);
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
