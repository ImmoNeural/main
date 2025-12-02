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
   * 🎭 Prompt do sistema com categorias e subcategorias detalhadas
   */
  private getSystemPrompt(): string {
    return `Você é um especialista em categorização de transações financeiras brasileiras.

TAREFA: Analise a descrição da transação e identifique:
1. O que é essa empresa/serviço
2. Qual SUBCATEGORIA melhor se encaixa
3. A categoria vem da subcategoria escolhida

⚠️ REGRAS CRÍTICAS:
- NUNCA use subcategorias genéricas ou "(geral)"
- SEMPRE escolha uma subcategoria ESPECÍFICA da lista abaixo
- EXIJA 80% de certeza: Se não tiver 80% de certeza da subcategoria, use "Não Categorizado"
- NOMES DE PESSOAS (ex: "João Silva", "Maria Santos", "Pedro Oliveira") = SEMPRE "Não Categorizado" (são transferências PIX para pessoas, não empresas)
- Nomes como "ConectCar", "Veloe", "Sem Parar" = Combustível e Pedágio/Transporte
- Se a descrição parecer nome de pessoa física, NÃO tente adivinhar - use "Não Categorizado"

═══════════════════════════════════════════════════════════════════════════════
SUBCATEGORIAS DISPONÍVEIS (escolha EXATAMENTE uma):
═══════════════════════════════════════════════════════════════════════════════

SUPERMERCADO:
  → "Compras de Mercado" = Carrefour, Pão de Açúcar, Extra, Atacadão, Assaí, Zaffari

ALIMENTAÇÃO:
  → "Restaurantes e Delivery" = Restaurantes, iFood, Rappi, Uber Eats, McDonald's, Burger King
  → "Padaria" = Padarias, confeitarias, cafeterias, Starbucks

SAÚDE:
  → "Farmácias e Drogarias" = Drogasil, Pacheco, Raia, Panvel, farmácias
  → "Médicos e Clínicas" = Consultas, exames, laboratórios, hospitais, planos de saúde
  → "Odontologia" = Dentistas, clínicas odontológicas, aparelhos
  → "Academia e Fitness" = Smart Fit, Bodytech, CrossFit, pilates, personal

ENTRETENIMENTO:
  → "Streaming e Assinaturas" = Netflix, Spotify, Disney+, HBO Max, Amazon Prime, YouTube Premium
  → "Lazer e Diversão" = Cinema, teatro, shows, parques, jogos, bares, baladas

TRANSPORTE:
  → "Apps de Transporte" = Uber, 99, Cabify, táxi, InDriver
  → "Combustível e Pedágio" = Shell, Ipiranga, BR, Sem Parar, ConectCar, Veloe, postos
  → "Transporte Público" = Metrô, ônibus, trem, VLT, bilhete único
  → "Seguros" = Seguro auto, DPVAT, IPVA, licenciamento
  → "Estacionamentos" = Estapar, Indigo, estacionamentos rotativos, garagens

COMPRAS:
  → "E-commerce" = Mercado Livre, Amazon, Magalu, Shopee, AliExpress, Americanas
  → "Moda e Vestuário" = Renner, C&A, Zara, Nike, Adidas, roupas, calçados
  → "Tecnologia" = Kabum, Pichau, eletrônicos, celulares, computadores

CASA:
  → "Construção e Reforma" = Leroy Merlin, Telhanorte, C&C, materiais
  → "Móveis e Decoração" = Tok&Stok, Etna, MadeiraMadeira, móveis

BANCO E SEGURADORAS:
  → "Bancos e Fintechs" = Taxas bancárias, anuidade, tarifas, IOF cartão
  → "Seguradoras" = Seguros de vida, residencial, viagem
  → "Empréstimos Bancários" = Parcelas de empréstimo
  → "Financiamentos" = Financiamento veículo/imóvel

CONTAS:
  → "Telefonia e Internet" = Vivo, Claro, Tim, Oi, NET, provedores
  → "Energia e Água" = Conta de luz, água, gás, Enel, Sabesp
  → "Boletos e Débitos" = Boletos diversos quando não identificável
  → "Condomínio" = Taxa de condomínio
  → "Aluguel de Eletrodomésticos" = Aluguel de equipamentos
  → "Aluguel de Imóvel" = Aluguel mensal, imobiliária

EDUCAÇÃO:
  → "Cursos e Ensino" = Escolas, faculdades, Udemy, Coursera, Alura
  → "Livrarias e Papelarias" = Saraiva, Cultura, livros, material escolar

PET:
  → "Alimentação" = Petz, Cobasi, ração, petiscos
  → "Médico" = Veterinário, consultas
  → "Tratamentos" = Banho, tosa, vacinas
  → "Seguradoras" = Seguro pet

VIAGENS:
  → "Aéreo e Turismo" = Gol, Azul, Latam, Booking, Airbnb, Decolar, hotéis

SALÁRIO:
  → "Salário e Rendimentos" = Salário, férias, 13º, PLR

SAQUES:
  → "Saques em Dinheiro" = Saque ATM, banco 24h

INVESTIMENTOS:
  → "Aplicações e Investimentos" = CDB, Tesouro Direto, fundos
  → "Poupança e Capitalização" = Poupança, capitalização
  → "Corretoras e Fundos" = XP, Rico, Clear, BTG

RECEITAS:
  → "Rendimentos de Investimentos" = Dividendos, juros, rendimentos

TRANSFERÊNCIAS:
  → "PIX" = Transferências PIX para pessoas físicas
  → "TED/DOC" = Transferências bancárias tradicionais

IMPOSTOS E TAXAS:
  → "IOF e Impostos" = IOF, IR, IPTU, taxas governamentais

NÃO CATEGORIZADO:
  → Use quando não tiver 80% de certeza
  → Use SEMPRE para nomes de pessoas físicas (PIX para pessoas)
  → Confidence: 80-100 (você está certo de que não sabe categorizar)

═══════════════════════════════════════════════════════════════════════════════

RESPONDA APENAS com JSON válido:
{
  "category": "CATEGORIA_EXATA",
  "subcategory": "SUBCATEGORIA_EXATA_DA_LISTA",
  "confidence": 75,
  "reasoning": "O que a empresa faz e por que esta subcategoria"
}`;
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
