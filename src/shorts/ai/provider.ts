import type {AppConfig} from '../config/env';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type LlmCompletion = {
  content: string;
  model: string;
  provider: string;
};

export interface LlmProvider {
  readonly name: string;
  complete(messages: ChatMessage[], options?: {temperature?: number}): Promise<LlmCompletion>;
}

export class OpenAiCompatibleProvider implements LlmProvider {
  readonly name: string;

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly baseUrl: string,
    private readonly timeoutMs: number,
    name = 'openai-compatible',
  ) {
    this.name = name;
  }

  async complete(
    messages: ChatMessage[],
    options?: {temperature?: number},
  ): Promise<LlmCompletion> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: options?.temperature ?? 0.4,
          response_format: {type: 'json_object'},
          messages,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`LLM HTTP ${response.status}: ${body.slice(0, 400)}`);
      }

      const json = (await response.json()) as {
        choices?: Array<{message?: {content?: string}}>;
        model?: string;
      };
      const content = json.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('LLM response sin contenido');
      }
      return {
        content,
        model: json.model || this.model,
        provider: this.name,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Provider that refuses network calls — used when AI_PROVIDER=template. */
export class TemplateOnlyProvider implements LlmProvider {
  readonly name = 'template';

  async complete(): Promise<LlmCompletion> {
    throw new Error(
      'AI_PROVIDER=template: no hay llamadas a modelos. Usa el generador de plantillas.',
    );
  }
}

export const createLlmProvider = (config: AppConfig): LlmProvider => {
  if (config.aiProvider === 'template') {
    return new TemplateOnlyProvider();
  }

  if (!config.aiApiKey) {
    throw new Error('Falta API key para el proveedor de IA');
  }

  const baseUrl =
    config.aiBaseUrl ||
    (config.aiProvider === 'openai'
      ? 'https://api.openai.com/v1'
      : 'https://api.openai.com/v1');

  return new OpenAiCompatibleProvider(
    config.aiApiKey,
    config.aiModel,
    baseUrl.replace(/\/$/, ''),
    config.requestTimeoutMs,
    config.aiProvider,
  );
};
