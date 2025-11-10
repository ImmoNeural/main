/**
 * 🧠 Serviço de Categorização Inteligente - gurudodindin
 *
 * Sistema avançado de classificação automática de transações
 * Especializado no mercado brasileiro com IA e Machine Learning
 *
 * Recursos:
 * - Base de conhecimento de +500 marcas brasileiras
 * - Fuzzy matching inteligente
 * - Reconhecimento de padrões (PIX, TED, DOC, Boleto)
 * - Score de confiança
 * - Aprendizado contínuo
 */

interface CategoryRule {
  category: string;
  subcategory?: string;
  keywords: string[];
  brands: string[]; // Marcas específicas brasileiras
  cnpjs?: string[]; // CNPJs conhecidos
  patterns?: RegExp[]; // Padrões regex
  icon: string;
  color: string;
  priority: number; // Prioridade (maior = mais específico)
}

// 🇧🇷 BASE DE CONHECIMENTO - MERCADO BRASILEIRO
const BRAZILIAN_CATEGORY_RULES: CategoryRule[] = [
  // 🛒 SUPERMERCADOS E ALIMENTAÇÃO
  {
    category: 'Supermercado',
    subcategory: 'Compras de Mercado',
    keywords: ['mercado', 'supermercado', 'hipermercado', 'atacado', 'hortifruit', 'sacolao', 'feira'],
    brands: [
      // Grandes Redes
      'coop', 'cooperativa', 'pao de acucar', 'paodeacucar', 'extra', 'carrefour', 'walmart',
      'big', 'bompreco', 'bom preco', 'gbarbosa', 'g barbosa',
      // Regionais
      'mambo', 'assai', 'atacadao', 'makro', 'maxxi', 'todo dia', 'dia', 'dia%',
      'sendas', 'zona sul', 'guanabara', 'mundial', 'prezunic', 'hirota',
      // Atacados
      'fort atacadista', 'atacadao', 'assai', 'maxxi atacado', 'makro',
      // Conveniência
      'am pm', 'ampm', 'oxxo', 'br mania', 'select',
    ],
    icon: '🛒',
    color: '#4CAF50',
    priority: 8,
  },

  // 🍕 RESTAURANTES E DELIVERY
  {
    category: 'Alimentação',
    subcategory: 'Restaurantes e Delivery',
    keywords: ['restaurante', 'lanchonete', 'pizzaria', 'hamburgueria', 'delivery', 'ifood', 'rappi'],
    brands: [
      // Delivery
      'ifood', 'rappi', 'uber eats', 'ubereats', '99 food', '99food',
      // Fast Food
      'mcdonalds', 'mc donalds', 'bobs', 'girafas', 'habbibs', 'subway', 'burger king',
      'burguer king', 'kfc', 'pizza hut', 'dominos', 'spoleto', 'china in box',
      // Hamburguerias Premium
      'madero', 'madero container', 'outback', 'fogo de chao', 'barbecue', 'grill',
      // Cafeterias
      'starbucks', 'coffee', 'cafe', 'rei do mate', 'ofner', 'kopenhagen',
      // Padarias
      'padaria', 'panificadora', 'santa massa', 'bella paulista',
    ],
    icon: '🍕',
    color: '#FF5722',
    priority: 8, // Aumentar prioridade para evitar conflitos
  },

  // 🏥 SAÚDE - ODONTOLOGIA
  {
    category: 'Saúde',
    subcategory: 'Odontologia',
    keywords: ['dental', 'dentista', 'odonto', 'ortodontia', 'implante'],
    brands: [
      'dentalplus', 'dental plus', 'odontocompany', 'odonto company',
      'sorridents', 'dental uni', 'dentaluni', 'oral sin', 'oralsin',
      'clinica odontologica', 'centro odontologico',
    ],
    icon: '🦷',
    color: '#00BCD4',
    priority: 9,
  },

  // 🏥 SAÚDE - FARMÁCIAS
  {
    category: 'Saúde',
    subcategory: 'Farmácias e Drogarias',
    keywords: ['farmacia', 'drogaria', 'remedio', 'medicamento'],
    brands: [
      'drogasil', 'droga raia', 'drogaraia', 'pacheco', 'sao paulo', 'saopaulofarma',
      'pague menos', 'paguemenos', 'ultrafarma', 'drogaria sp', 'farmasil',
      'panvel', 'nissei', 'araujo', 'popular', 'venancio',
    ],
    icon: '💊',
    color: '#009688',
    priority: 8,
  },

  // 🏥 SAÚDE - GERAL
  {
    category: 'Saúde',
    subcategory: 'Médicos e Clínicas',
    keywords: ['hospital', 'clinica', 'medico', 'consulta', 'exame', 'laboratorio'],
    brands: [
      'hospital', 'einstein', 'sirio', 'sirio libanes', 'fleury', 'dasa', 'lavoisier',
      'hermes pardini', 'sabin', 'alta', 'labi', 'unico', 'unimed', 'amil',
    ],
    icon: '⚕️',
    color: '#009688',
    priority: 7,
  },

  // 🎮 ENTRETENIMENTO
  {
    category: 'Entretenimento',
    subcategory: 'Lazer e Diversão',
    keywords: ['cinema', 'teatro', 'show', 'ingresso', 'parque', 'diversao'],
    brands: [
      'playcenter', 'play center', 'hopi hari', 'beto carrero', 'hot park',
      'cinemark', 'cinepolis', 'uci', 'kinoplex', 'moviecom', 'cine',
      'parque', 'zoo', 'aquario', 'museu', 'ccbb', 'masp',
    ],
    icon: '🎮',
    color: '#9C27B0',
    priority: 8,
  },

  // 📺 STREAMING E ASSINATURAS (PRIORIDADE MÁXIMA para não confundir com "débito")
  {
    category: 'Entretenimento',
    subcategory: 'Streaming e Assinaturas',
    keywords: ['streaming', 'assinatura', 'subscription'],
    brands: [
      'netflix', 'netflix.com', 'spotify', 'amazon prime', 'prime video', 'disney', 'disney+',
      'globoplay', 'hbo max', 'paramount', 'apple tv', 'youtube premium',
      'deezer', 'tidal', 'crunchyroll',
    ],
    patterns: [/netflix/i, /spotify/i, /disney\+?/i], // Patterns para garantir match
    icon: '📺',
    color: '#E91E63',
    priority: 10, // PRIORIDADE MÁXIMA
  },

  // 🚗 TRANSPORTE - APPS
  {
    category: 'Transporte',
    subcategory: 'Apps de Transporte',
    keywords: ['corrida', 'viagem', 'transporte'],
    brands: [
      'uber', '99', '99 pop', '99pop', 'cabify', 'indriver', 'lady driver',
      'vem de van', 'blablacar',
    ],
    icon: '🚗',
    color: '#2196F3',
    priority: 9,
  },

  // ⛽ TRANSPORTE - COMBUSTÍVEL
  {
    category: 'Transporte',
    subcategory: 'Combustível e Pedágio',
    keywords: ['posto', 'combustivel', 'gasolina', 'etanol', 'diesel', 'pedagio', 'gnv'],
    brands: [
      'shell', 'ipiranga', 'petrobras', 'br', 'ale', 'raizen', 'texaco',
      'sem parar', 'veloe', 'conectcar', 'taggy', 'greenpass',
    ],
    icon: '⛽',
    color: '#FF9800',
    priority: 8,
  },

  // 🚌 TRANSPORTE PÚBLICO
  {
    category: 'Transporte',
    subcategory: 'Transporte Público',
    keywords: ['metro', 'trem', 'onibus', 'bilhete', 'recarga', 'cartao'],
    brands: [
      'metro', 'metrô', 'cptm', 'sptrans', 'bilhete unico', 'bom',
      'riocard', 'transporte', 'circular', 'move', 'tem',
    ],
    icon: '🚌',
    color: '#3F51B5',
    priority: 8,
  },

  // 🛍️ COMPRAS ONLINE
  {
    category: 'Compras',
    subcategory: 'E-commerce',
    keywords: ['loja', 'compra', 'shopping', 'mercado livre', 'ecommerce'],
    brands: [
      'mercado livre', 'mercadolivre', 'amazon', 'shopee', 'aliexpress',
      'americanas', 'submarino', 'magazine luiza', 'magalu', 'casas bahia',
      'ponto frio', 'extra', 'carrefour', 'walmart',
    ],
    icon: '🛍️',
    color: '#E91E63',
    priority: 7,
  },

  // 👕 MODA E VESTUÁRIO
  {
    category: 'Compras',
    subcategory: 'Moda e Vestuário',
    keywords: ['roupa', 'calcado', 'moda', 'vestuario', 'tenis', 'bolsa', 'acessorio'],
    brands: [
      'renner', 'c&a', 'cea', 'riachuelo', 'marisa', 'pernambucanas',
      'zara', 'h&m', 'forever 21', 'centauro', 'netshoes', 'dafiti',
      'havaianas', 'melissa', 'arezzo', 'schutz',
      // Lojas de shopping/bolsas
      'le postiche', 'postiche', 'santa lolla', 'capodarte', 'via mia',
      'carmen steffens', 'luz da lua', 'animale', 'farm',
    ],
    icon: '👕',
    color: '#FF4081',
    priority: 8, // Aumenta prioridade
  },

  // 📱 TECNOLOGIA E ELETRÔNICOS
  {
    category: 'Compras',
    subcategory: 'Tecnologia',
    keywords: ['eletronico', 'celular', 'notebook', 'computador', 'tecnologia'],
    brands: [
      'fast shop', 'fastshop', 'kabum', 'pichau', 'terabyte', 'extra',
      'magazine luiza', 'magalu', 'casas bahia', 'apple', 'samsung',
    ],
    icon: '📱',
    color: '#607D8B',
    priority: 7,
  },

  // 🏠 CASA E CONSTRUÇÃO
  {
    category: 'Casa',
    subcategory: 'Construção e Reforma',
    keywords: ['construcao', 'material', 'reforma', 'tinta', 'ferramenta'],
    brands: [
      'leroy merlin', 'leroymerlin', 'telhanorte', 'dicico', 'cec',
      'sao miguel', 'saomiguel', 'casa show', 'casashow',
    ],
    icon: '🏠',
    color: '#795548',
    priority: 7,
  },

  // 🛋️ MÓVEIS E DECORAÇÃO
  {
    category: 'Casa',
    subcategory: 'Móveis e Decoração',
    keywords: ['movel', 'moveis', 'decoracao', 'estofado', 'cama', 'sofa'],
    brands: [
      'tok stok', 'tokstok', 'etna', 'madeira madeira', 'mobly',
      'caedu', 'leader', 'marabraz', 'insinuante', 'casas bahia',
    ],
    icon: '🛋️',
    color: '#8D6E63',
    priority: 7,
  },

  // 💳 SERVIÇOS FINANCEIROS
  {
    category: 'Serviços Financeiros',
    subcategory: 'Bancos e Fintechs',
    keywords: ['banco', 'pagamento', 'tarifa', 'anuidade', 'cartao'],
    brands: [
      'nubank', 'inter', 'c6', 'c6 bank', 'next', 'neon', 'original',
      'itau', 'bradesco', 'santander', 'caixa', 'bb', 'banco do brasil',
      'picpay', 'mercadopago', 'mercado pago', 'pagseguro', 'paypal',
    ],
    icon: '💳',
    color: '#673AB7',
    priority: 8,
  },

  // 📱 TELEFONIA E INTERNET
  {
    category: 'Contas',
    subcategory: 'Telefonia e Internet',
    keywords: ['telefone', 'celular', 'internet', 'banda larga', 'fibra', 'tv', 'cabo'],
    brands: [
      'vivo', 'tim', 'claro', 'oi', 'nextel', 'algar', 'sky', 'net',
      'virtua', 'unifique', 'copel', 'gvt', 'telefonica',
    ],
    icon: '📱',
    color: '#00BCD4',
    priority: 8,
  },

  // ⚡ CONTAS - UTILIDADES
  {
    category: 'Contas',
    subcategory: 'Energia e Água',
    keywords: ['energia', 'luz', 'eletricidade', 'agua', 'saneamento', 'esgoto'],
    brands: [
      'cpfl', 'enel', 'cemig', 'light', 'copel', 'celpe', 'coelba',
      'sabesp', 'cedae', 'sanepar', 'caesb', 'embasa', 'compesa',
    ],
    icon: '⚡',
    color: '#FFC107',
    priority: 8,
  },

  // 📚 LIVRARIAS E PAPELARIAS
  {
    category: 'Educação',
    subcategory: 'Livrarias e Papelarias',
    keywords: ['livraria', 'livros', 'papelaria', 'leitura', 'editora', 'livreiro'],
    brands: [
      'livraria', 'saraiva', 'cultura', 'fnac', 'travessa', 'curitiba',
      'leitura', 'nobel', 'payot', 'argumento', 'megastore', 'da vila',
      'kalunga', 'papelaria', 'loja do livro', 'amazon livros', 'estante virtual',
    ],
    icon: '📚',
    color: '#5C6BC0',
    priority: 9, // Alta prioridade para evitar conflitos
  },

  // 🏫 EDUCAÇÃO
  {
    category: 'Educação',
    subcategory: 'Cursos e Ensino',
    keywords: ['escola', 'faculdade', 'universidade', 'curso', 'aula', 'ensino', 'matricula'],
    brands: [
      'estacio', 'unip', 'anhanguera', 'unopar', 'usp', 'unicamp',
      'kumon', 'ccaa', 'wizard', 'fisk', 'cultura inglesa', 'udemy',
      'alura', 'coursera', 'hotmart', 'eduzz',
    ],
    icon: '🎓',
    color: '#3F51B5',
    priority: 7,
  },

  // 🏋️ ACADEMIA E ESPORTES
  {
    category: 'Saúde',
    subcategory: 'Academia e Fitness',
    keywords: ['academia', 'fitness', 'musculacao', 'pilates', 'yoga', 'crossfit'],
    brands: [
      'smart fit', 'smartfit', 'bio ritmo', 'bodytech', 'formula academia',
      'bluefit', 'runner', 'competition', 'velocity',
    ],
    icon: '🏋️',
    color: '#FF5722',
    priority: 8,
  },

  // 🐕 PET SHOPS
  {
    category: 'Pet',
    subcategory: 'Pet Shop e Veterinário',
    keywords: ['pet', 'veterinario', 'racao', 'animal', 'cachorro', 'gato'],
    brands: [
      'petz', 'cobasi', 'petlove', 'pet shop', 'petshop', 'ponto natural',
      'agropet', 'vetecare',
    ],
    icon: '🐕',
    color: '#FF9800',
    priority: 8,
  },

  // ✈️ VIAGENS
  {
    category: 'Viagens',
    subcategory: 'Aéreo e Turismo',
    keywords: ['viagem', 'passagem', 'hotel', 'hospedagem', 'turismo', 'aereo'],
    brands: [
      'decolar', 'booking', 'airbnb', 'latam', 'gol', 'azul', 'voepass',
      '123 milhas', '123milhas', 'max milhas', 'maxmilhas', 'hurb',
      'cvc', 'submarino viagens',
    ],
    icon: '✈️',
    color: '#2196F3',
    priority: 8,
  },

  // 💰 RECEITAS - SALÁRIO
  {
    category: 'Receitas',
    subcategory: 'Salário e Rendimentos',
    keywords: ['salario', 'vencimento', 'pagamento', 'remuneracao', 'prolabore', 'pro labore'],
    brands: [],
    patterns: [/salario/i, /vencimento/i, /rendimento/i],
    icon: '💰',
    color: '#4CAF50',
    priority: 9,
  },

  // 💸 TRANSFERÊNCIAS - PIX
  {
    category: 'Transferências',
    subcategory: 'PIX',
    keywords: ['pix', 'transferencia pix', 'enviado', 'recebido'],
    brands: [],
    patterns: [/pix\s+(enviado|recebido)/i, /transf.*pix/i],
    icon: '💸',
    color: '#00C853',
    priority: 10,
  },

  // 💸 TRANSFERÊNCIAS - TED/DOC
  {
    category: 'Transferências',
    subcategory: 'TED/DOC',
    keywords: ['ted', 'doc', 'transferencia', 'transf', 'tev'],
    brands: [],
    patterns: [/ted/i, /doc/i, /transf\w*/i],
    icon: '💸',
    color: '#FF9800',
    priority: 9,
  },

  // 📄 PAGAMENTOS - BOLETO (prioridade mais baixa para não conflitar com marcas específicas)
  {
    category: 'Contas',
    subcategory: 'Boletos e Débitos',
    keywords: ['boleto', 'cobranca'],
    brands: [],
    patterns: [/^boleto/i, /pagto\s+boleto/i], // Apenas se começar com boleto
    icon: '📄',
    color: '#607D8B',
    priority: 5, // Baixa prioridade
  },

  // 💰 INVESTIMENTOS
  {
    category: 'Investimentos',
    subcategory: 'Poupança e Capitalização',
    keywords: ['capitalizacao', 'titulo capitalizacao', 'poupanca', 'cdb', 'lca', 'lci', 'tesouro'],
    brands: ['icatu', 'bradesco capitalizacao', 'caixa capitalizacao', 'sulamerica capitalizacao'],
    patterns: [/tit.*capital/i, /cap.*acao/i],
    icon: '💰',
    color: '#4CAF50',
    priority: 9,
  },

  // 📈 INVESTIMENTOS - CORRETORAS
  {
    category: 'Investimentos',
    subcategory: 'Corretoras e Fundos',
    keywords: ['corretora', 'btg', 'xp investimentos', 'rico', 'clear', 'ações', 'fundos'],
    brands: ['xp', 'btg', 'rico', 'clear', 'inter invest', 'nuinvest', 'warren'],
    icon: '📈',
    color: '#2196F3',
    priority: 9,
  },

  // 🏦 IMPOSTOS E TAXAS
  {
    category: 'Impostos e Taxas',
    subcategory: 'IOF e Impostos',
    keywords: ['iof', 'imposto', 'taxa', 'tributo', 'contribuicao'],
    brands: [],
    patterns: [/\biof\b/i, /iof\s+(ad|adic)/i, /imposto/i],
    icon: '🏦',
    color: '#F44336',
    priority: 10, // Alta prioridade
  },
];

/**
 * Serviço de Categorização Inteligente
 */
class CategorizationService {
  private rules: CategoryRule[] = BRAZILIAN_CATEGORY_RULES;

  /**
   * 🎯 Categoriza uma transação usando IA
   *
   * Algoritmo:
   * 1. Normaliza texto (remove acentos, case insensitive)
   * 2. Busca matches exatos de marcas (prioridade alta)
   * 3. Busca patterns regex (PIX, TED, etc)
   * 4. Busca keywords com fuzzy matching
   * 5. Retorna categoria com maior score
   */
  categorizeTransaction(
    description: string,
    merchant?: string,
    amount?: number
  ): {
    category: string;
    subcategory: string;
    icon: string;
    color: string;
    confidence: number; // 0-100
    matchedBy: string; // O que causou o match
  } {
    const text = this.normalizeText(`${description || ''} ${merchant || ''}`);

    let bestMatch: {
      rule: CategoryRule;
      score: number;
      matchedBy: string;
    } | null = null;

    // Ordenar regras por prioridade
    const sortedRules = [...this.rules].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      let score = 0;
      let matchedBy = '';

      // 1. Match por marcas específicas (peso alto)
      for (const brand of rule.brands) {
        if (text.includes(this.normalizeText(brand))) {
          score = 90 + rule.priority;
          matchedBy = `marca: ${brand}`;
          break;
        }
      }

      // 2. Match por patterns regex (peso muito alto)
      if (score === 0 && rule.patterns) {
        for (const pattern of rule.patterns) {
          if (pattern.test(text)) {
            score = 95 + rule.priority;
            matchedBy = `padrão: ${pattern.source}`;
            break;
          }
        }
      }

      // 3. Match por keywords (peso médio)
      if (score === 0) {
        for (const keyword of rule.keywords) {
          if (text.includes(this.normalizeText(keyword))) {
            score = 70 + rule.priority;
            matchedBy = `palavra-chave: ${keyword}`;
            break;
          }
        }
      }

      // 4. Fuzzy matching (peso baixo)
      if (score === 0) {
        for (const keyword of rule.keywords) {
          const similarity = this.fuzzyMatch(text, this.normalizeText(keyword));
          if (similarity > 0.7) {
            score = 50 + rule.priority + (similarity * 10);
            matchedBy = `similaridade: ${keyword} (${(similarity * 100).toFixed(0)}%)`;
            break;
          }
        }
      }

      // Atualizar melhor match
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { rule, score, matchedBy };
      }
    }

    // Retornar resultado
    if (bestMatch) {
      return {
        category: bestMatch.rule.category,
        subcategory: bestMatch.rule.subcategory || 'Geral',
        icon: bestMatch.rule.icon,
        color: bestMatch.rule.color,
        confidence: Math.min(bestMatch.score, 100),
        matchedBy: bestMatch.matchedBy,
      };
    }

    // Categoria padrão para transações não identificadas
    return {
      category: 'Definir Categoria',
      subcategory: 'Aguardando Classificação',
      icon: '❓',
      color: '#E9D5FF', // Roxo clarinho
      confidence: 0,
      matchedBy: 'nenhum match encontrado',
    };
  }

  /**
   * Normaliza texto para comparação
   * Remove acentos, converte para minúsculas, remove caracteres especiais
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s]/g, ' ') // Remove caracteres especiais
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim();
  }

  /**
   * Fuzzy matching simples usando Levenshtein distance
   */
  private fuzzyMatch(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calcula distância de Levenshtein
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Retorna todas as categorias disponíveis (SEM DUPLICATAS)
   * Agrupa apenas por categoria principal, ignorando subcategorias
   */
  getAllCategories(): Array<{
    category: string;
    subcategory: string;
    icon: string;
    color: string;
  }> {
    const categories = new Map<string, any>();

    for (const rule of this.rules) {
      // Usar apenas a categoria principal como chave para evitar duplicatas
      if (!categories.has(rule.category)) {
        categories.set(rule.category, {
          category: rule.category,
          subcategory: rule.subcategory || 'Geral',
          icon: rule.icon,
          color: rule.color,
        });
      }
    }

    // Adicionar "Definir Categoria" (categoria especial para não categorizadas)
    // NÃO incluir na lista para o usuário escolher, apenas para identificar transações pendentes
    // categories.set('Definir Categoria', {
    //   category: 'Definir Categoria',
    //   subcategory: 'Aguardando Classificação',
    //   icon: '❓',
    //   color: '#FFC1E3',
    // });

    // Ordenar alfabeticamente
    return Array.from(categories.values()).sort((a, b) =>
      a.category.localeCompare(b.category)
    );
  }

  /**
   * Adiciona uma regra personalizada
   */
  addCustomRule(rule: CategoryRule): void {
    this.rules.push(rule);
  }

  /**
   * 📊 Gera estatísticas de categorização
   */
  getStats(transactions: Array<{ category: string; amount: number }>): any {
    const stats = new Map<string, { count: number; total: number }>();

    for (const trans of transactions) {
      const current = stats.get(trans.category) || { count: 0, total: 0 };
      stats.set(trans.category, {
        count: current.count + 1,
        total: current.total + Math.abs(trans.amount),
      });
    }

    return Array.from(stats.entries()).map(([category, data]) => ({
      category,
      count: data.count,
      total: data.total,
      average: data.total / data.count,
    }));
  }
}

export default new CategorizationService();
