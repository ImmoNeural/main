/**
 * 🤖 Serviço de Integração com OpenAI/ChatGPT
 *
 * Usado na Camada 3 do sistema de categorização para:
 * - Identificar o tipo de estabelecimento/serviço pela descrição
 * - Sugerir categoria apropriada para transações desconhecidas
 */

import { VALID_CATEGORIES } from './categorization.service';

interface OpenAICategorization {
  category: string;
  subcategory: string;
  confidence: number;
  reasoning: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

class OpenAIService {
  private apiKey: string | undefined;
  private baseUrl = 'https://api.openai.com/v1/chat/completions';
  private model = 'gpt-4o-mini'; // Modelo mais barato: $0.15/1M input, $0.60/1M output

  constructor() {
    // Suporta ambos os nomes de variável (OPENAI_KEY usado no Render)
    this.apiKey = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY;
  }

  /**
   * Verifica se o serviço está configurado
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * 🎯 Categoriza uma transação usando ChatGPT
   *
   * @param description - Descrição da transação
   * @param merchant - Nome do merchant (opcional)
   * @returns Categoria sugerida ou null se falhar
   */
  async categorizeTransaction(
    description: string,
    merchant?: string
  ): Promise<OpenAICategorization | null> {
    if (!this.apiKey) {
      console.warn('⚠️ OpenAI API key not configured. Layer 3 disabled.');
      return null;
    }

    try {
      const prompt = this.buildCategorizationPrompt(description, merchant);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(),
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3, // Baixa temperatura para respostas mais consistentes
          max_tokens: 200,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ OpenAI API error:', response.status, errorText);
        return null;
      }

      const data = (await response.json()) as OpenAIResponse;
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        console.warn('⚠️ OpenAI returned empty response');
        return null;
      }

      // Tentar fazer parse da resposta JSON
      try {
        const result = JSON.parse(content) as OpenAICategorization;

        // Validar que a categoria retornada é válida
        if (!VALID_CATEGORIES.includes(result.category)) {
          console.warn(
            `⚠️ OpenAI returned invalid category: ${result.category}`
          );
          // Tentar encontrar categoria mais próxima
          const normalizedCategory = this.findClosestCategory(result.category);
          if (normalizedCategory) {
            result.category = normalizedCategory;
          } else {
            return null;
          }
        }

        console.log(
          `🤖 [OpenAI] Categorizado: "${description.substring(0, 30)}..." → ${result.category} (${result.confidence}%)`
        );
        return result;
      } catch {
        console.warn('⚠️ Failed to parse OpenAI response:', content);
        return null;
      }
    } catch (error) {
      console.error('❌ OpenAI request failed:', error);
      return null;
    }
  }

  /**
   * 📝 Constrói o prompt para categorização
   */
  private buildCategorizationPrompt(
    description: string,
    merchant?: string
  ): string {
    let prompt = `Categorize esta transação bancária brasileira:\n\nDescrição: "${description}"`;

    if (merchant) {
      prompt += `\nEstabelecimento: "${merchant}"`;
    }

    prompt += `\n\nResponda APENAS com JSON no formato:
{
  "category": "CATEGORIA",
  "subcategory": "SUBCATEGORIA",
  "confidence": 75,
  "reasoning": "explicação curta"
}`;

    return prompt;
  }

  /**
   * 🎭 Prompt do sistema com categorias válidas
   */
  private getSystemPrompt(): string {
    return `Você é um especialista em categorização de transações financeiras brasileiras.

CATEGORIAS VÁLIDAS (use EXATAMENTE uma destas):
${VALID_CATEGORIES.filter((c) => c !== 'Não Categorizado' && c !== 'Identificação Fiscal').join(', ')}

SUBCATEGORIAS COMUNS:
- Supermercado: "Compras de Mercado"
- Alimentação: "Restaurantes e Delivery", "Padaria"
- Saúde: "Farmácias e Drogarias", "Médicos e Clínicas", "Odontologia", "Academia e Fitness"
- Entretenimento: "Streaming e Assinaturas", "Lazer e Diversão"
- Transporte: "Apps de Transporte", "Combustível e Pedágio", "Transporte Público"
- Compras: "E-commerce", "Moda e Vestuário", "Tecnologia"
- Casa: "Construção e Reforma", "Móveis e Decoração"
- Contas: "Telefonia e Internet", "Energia e Água", "Aluguel de Imóvel", "Condomínio"
- Educação: "Cursos e Ensino", "Livrarias e Papelarias"
- Pet: "Alimentação", "Médico", "Tratamentos"
- Viagens: "Aéreo e Turismo"
- Transferências: "PIX", "TED/DOC"
- Investimentos: "Aplicações e Investimentos", "Corretoras e Fundos"

REGRAS:
1. Se não conseguir identificar com certeza, use confidence baixo (40-60)
2. Se for claramente uma transferência pessoal (PIX para pessoa), use "Transferências"
3. Se for pagamento de conta (luz, água, telefone), use "Contas"
4. SEMPRE responda em JSON válido
5. confidence deve ser um número de 0 a 100`;
  }

  /**
   * 🔍 Encontra categoria mais próxima
   */
  private findClosestCategory(input: string): string | null {
    const normalized = input.toLowerCase().trim();

    for (const category of VALID_CATEGORIES) {
      if (category.toLowerCase().includes(normalized)) {
        return category;
      }
      if (normalized.includes(category.toLowerCase())) {
        return category;
      }
    }

    // Mapeamentos comuns
    const mappings: Record<string, string> = {
      mercado: 'Supermercado',
      restaurante: 'Alimentação',
      comida: 'Alimentação',
      farmacia: 'Saúde',
      hospital: 'Saúde',
      medico: 'Saúde',
      uber: 'Transporte',
      gasolina: 'Transporte',
      combustivel: 'Transporte',
      netflix: 'Entretenimento',
      spotify: 'Entretenimento',
      streaming: 'Entretenimento',
      luz: 'Contas',
      energia: 'Contas',
      agua: 'Contas',
      telefone: 'Contas',
      internet: 'Contas',
      aluguel: 'Contas',
      pix: 'Transferências',
      ted: 'Transferências',
      transferencia: 'Transferências',
      escola: 'Educação',
      curso: 'Educação',
      faculdade: 'Educação',
      cachorro: 'Pet',
      gato: 'Pet',
      pet: 'Pet',
      veterinario: 'Pet',
      viagem: 'Viagens',
      hotel: 'Viagens',
      passagem: 'Viagens',
      investimento: 'Investimentos',
      aplicacao: 'Investimentos',
      salario: 'Salário',
      imposto: 'Impostos e Taxas',
      taxa: 'Impostos e Taxas',
    };

    for (const [key, value] of Object.entries(mappings)) {
      if (normalized.includes(key)) {
        return value;
      }
    }

    return null;
  }

  /**
   * 📊 Categoriza múltiplas transações em batch
   * (mais eficiente para muitas transações)
   */
  async categorizeTransactionsBatch(
    transactions: Array<{ id: string; description: string; merchant?: string }>
  ): Promise<Map<string, OpenAICategorization | null>> {
    const results = new Map<string, OpenAICategorization | null>();

    // Processar em paralelo com limite de 5 requisições simultâneas
    const BATCH_SIZE = 5;

    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async (t) => {
          const result = await this.categorizeTransaction(
            t.description,
            t.merchant
          );
          return { id: t.id, result };
        })
      );

      for (const { id, result } of batchResults) {
        results.set(id, result);
      }

      // Pequena pausa entre batches para não sobrecarregar a API
      if (i + BATCH_SIZE < transactions.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return results;
  }
}

export default new OpenAIService();
