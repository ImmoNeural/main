/**
 * 🧠 Serviço de Categorização Inteligente - gurudodindin
 *
 * Sistema avançado de classificação automática de transações
 * Especializado no mercado brasileiro com IA e Machine Learning
 *
 * 🏗️ ARQUITETURA DE TRÊS CAMADAS:
 *
 * Camada 1: Regras Estáticas (BRAZILIAN_CATEGORY_RULES)
 *   - Classificação rápida e de alta confiança
 *   - Threshold: 80% ou mais
 *   - Em caso de falha: passa para Camada 2
 *
 * Camada 2: Inteligência Contextual (Histórico do Usuário)
 *   - Usa histórico de categorizações do usuário
 *   - Threshold: 70-90%
 *   - Em caso de falha: passa para Camada 3
 *
 * Camada 3: Busca Externa (Web Search)
 *   - Busca descrição na internet
 *   - Threshold: 40-70% (baixo risco)
 *   - Em caso de falha: "Não Categorizado"
 *
 * Recursos:
 * - Base de conhecimento de +500 marcas brasileiras
 * - Fuzzy matching inteligente (85% similaridade)
 * - Reconhecimento de padrões (PIX, TED, DOC, Boleto, CNPJ/CPF)
 * - Score de confiança
 * - Aprendizado contínuo via histórico do usuário
 *
 * 🌍 MULTI-PAÍS: além do Brasil, suporta a base alemã (GERMAN_CATEGORY_RULES).
 *   O país é escolhido na importação ('BR' = padrão, 'DE' = Alemanha).
 */
import { GERMAN_CATEGORY_RULES } from './categorization.germany';

export type CategorizationCountry = 'BR' | 'DE';

// Tipos para histórico do usuário (exportado para uso em outros módulos)
export interface UserCategorizationHistory {
  description_pattern: string;
  category: string;
  subcategory: string;
  count: number;
  last_used: Date;
}

// Interface para resultado de busca externa (exportado para uso em outros módulos)
export interface ExternalSearchResult {
  snippets: string[];
  source: string;
}

// Interface para resultado de categorização com camada
export interface ThreeLayerCategorizationResult {
  category: string;
  subcategory: string;
  icon: string;
  color: string;
  confidence: number;
  matchedBy: string;
  layer: 0 | 1 | 2 | 3;
}

export interface CategoryRule {
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

// 🔍 REGEX PATTERNS para CNPJ e CPF
const CNPJ_PATTERN = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/;
const CPF_PATTERN = /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/;

// 🇧🇷 BASE DE CONHECIMENTO - MERCADO BRASILEIRO
const BRAZILIAN_CATEGORY_RULES: CategoryRule[] = [
  // 🛒 SUPERMERCADOS E ALIMENTAÇÃO (Merge: Alimentação/Supermercado)
  {
    category: 'Supermercado',
    subcategory: 'Compras de Mercado',
    keywords: [
      'mercado', 'supermercado', 'hipermercado', 'atacado', 'hortifruit', 'sacolao', 'feira',
      // Adicionadas do JSON (Alimentação/Supermercado)
      'supermerc', 'hiper', 'compras'
    ],
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
      // Adicionadas do JSON (Alimentação/Supermercado)
      'zaffari', 'dia %', 'dia supermercado'
    ],
    icon: '🛒',
    color: '#4CAF50',
    priority: 8,
  },

  // 🍕 RESTAURANTES E DELIVERY (Merge: Alimentação/Restaurantes)
  {
    category: 'Alimentação',
    subcategory: 'Restaurantes e Delivery',
    keywords: [
      'restaurante', 'lanchonete', 'pizzaria', 'hamburgueria', 'delivery', 'ifood', 'rappi',
      // Adicionadas do JSON (Alimentação/Restaurantes)
      'rest', 'lanch', 'bar', 'comida', 'food', 'takeaway'
    ],
    brands: [
      // Delivery
      'ifood', 'rappi', 'uber eats', 'ubereats', '99 food', '99food',
      // Fast Food
      'mcdonalds', 'mc donalds', 'mcdonald\'s', 'bobs', 'girafas', 'habbibs', 'subway', 'burger king',
      'burguer king', 'kfc', 'pizza hut', 'dominos', 'spoleto', 'china in box',
      // Hamburguerias Premium
      'madero', 'madero container', 'outback', 'fogo de chao', 'barbecue', 'grill',
      // Cafeterias
      'starbucks', 'coffee', 'cafe', 'rei do mate', 'ofner', 'kopenhagen',
    ],
    icon: '🍕',
    color: '#FF5722',
    priority: 8, // Aumentar prioridade para evitar conflitos
  },

  // 🥖 PADARIA
  {
    category: 'Alimentação',
    subcategory: 'Padaria',
    keywords: ['padaria', 'panificadora', 'padoca', 'pao', 'confeitaria'],
    brands: [
      'padaria', 'panificadora', 'santa massa', 'bella paulista', 'panificação',
      'pao quente', 'casa do pao', 'padoca', 'panificacao',
    ],
    icon: '🥖',
    color: '#D2691E',
    priority: 9, // Alta prioridade para separar de restaurantes
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

  // 🏥 SAÚDE - FARMÁCIAS (Merge: Saúde/Farmácia)
  {
    category: 'Saúde',
    subcategory: 'Farmácias e Drogarias',
    keywords: [
      'farmacia', 'drogaria', 'remedio', 'medicamento',
      // Adicionadas do JSON (Saúde/Farmácia)
      'farm', 'droga', 'medic', 'saúde'
    ],
    brands: [
      'drogasil', 'droga raia', 'drogaraia', 'pacheco', 'sao paulo', 'saopaulofarma',
      'pague menos', 'paguemenos', 'ultrafarma', 'drogaria sp', 'farmasil',
      'panvel', 'nissei', 'araujo', 'popular', 'venancio',
      // Adicionadas do JSON (Saúde/Farmácia)
      'raia', 'dsp'
    ],
    icon: '💊',
    color: '#009688',
    priority: 8,
  },

  // 🏥 SAÚDE - GERAL (Merge: Saúde/Plano de Saúde)
  {
    category: 'Saúde',
    subcategory: 'Médicos e Clínicas',
    keywords: [
      'hospital', 'clinica', 'medico', 'consulta', 'exame', 'laboratorio',
      // Adicionadas do JSON (Saúde/Plano de Saúde)
      'seguro', 'plano', 'med'
    ],
    brands: [
      'hospital', 'einstein', 'sirio', 'sirio libanes', 'fleury', 'dasa', 'lavoisier',
      'hermes pardini', 'sabin', 'alta', 'labi', 'unico', 'unimed', 'amil',
      // Adicionadas do JSON (Saúde/Plano de Saúde)
      'sulamerica', 'sul america'
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

  // 📺 STREAMING E ASSINATURAS (PRIORIDADE MÁXIMA) (Merge: Entretenimento/Streaming)
  {
    category: 'Entretenimento',
    subcategory: 'Streaming e Assinaturas',
    keywords: [
      'streaming', 'assinatura', 'subscription',
      // Adicionadas do JSON (Entretenimento/Streaming)
      'stream', 'mensal', 'tv'
    ],
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

  // 🚗 TRANSPORTE - APPS (Merge: Transporte/Mobilidade)
  {
    category: 'Transporte',
    subcategory: 'Apps de Transporte',
    keywords: [
      'corrida', 'trip', 'ride',
      // Adicionadas do JSON (Transporte/Mobilidade)
      'taxi', 'transporte'
    ],
    brands: [
      'uber', '99', '99 pop', '99pop', 'cabify', 'indriver', 'lady driver',
      'vem de van', 'blablacar',
    ],
    icon: '🚗',
    color: '#2196F3',
    priority: 9,
  },

  // ⛽ TRANSPORTE - COMBUSTÍVEL (Merge: Transporte/Combustível)
  {
    category: 'Transporte',
    subcategory: 'Combustível e Pedágio',
    keywords: [
      'Auto Posto', 'combustivel', 'gasolina', 'etanol', 'diesel', 'pedagio', 'gnv',
      // Adicionadas do JSON (Transporte/Combustível)
      'combust'
    ],
    brands: [
      'shell', 'ipiranga', 'petrobras', 'posto br', 'ale', 'raizen', 'texaco',
      'sem parar', 'veloe', 'conectcar', 'taggy', 'greenpass',
      // Adicionadas do JSON (Transporte/Combustível)
      'br mania' // Já presente em Supermercado/Convenience, mas bom reforçar aqui.
    ],
    icon: '⛽',
    color: '#FF9800',
    priority: 10,
  },

  // 🚌 TRANSPORTE PÚBLICO
  {
    category: 'Transporte',
    subcategory: 'Transporte Público',
    keywords: ['metro', 'metrô', 'trem', 'onibus', 'ônibus'],
    brands: [
      'metro', 'metrô', 'cptm', 'sptrans', 'bilhete unico', 'bom',
      'riocard', 'circular', 'move', 'tem', 'estaçao', 'estacao',
    ],
    icon: '🚌',
    color: '#3F51B5',
    priority: 8,
  },

  // 🛡️ TRANSPORTE - Seguros de Veículos
  {
    category: 'Transporte',
    subcategory: 'Seguros',
    keywords: ['seguro auto', 'seguro carro', 'seguro moto', 'seguro veiculo', 'dpvat'],
    brands: [
      'porto seguro auto', 'bradesco auto', 'itau auto', 'liberty auto',
      'azul auto', 'mapfre auto', 'hdi auto', 'allianz auto',
    ],
    icon: '🛡️',
    color: '#3F51B5',
    priority: 9,
  },

  // 🅿️ TRANSPORTE - Estacionamentos
  {
    category: 'Transporte',
    subcategory: 'Estacionamentos',
    keywords: ['estacionamento', 'parking', 'vaga', 'garagem', 'rotativo'],
    brands: [
      'estapar', 'indigo', 'park indigo', 'allpark', 'multipark',
      'zaitt', 'quick park', 'saba', 'rede park', 'hora park',
    ],
    icon: '🅿️',
    color: '#607D8B',
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

  // 🏦 BANCO E SEGURADORAS - Bancos e Fintechs
  {
    category: 'Banco e Seguradoras',
    subcategory: 'Bancos e Fintechs',
    keywords: ['banco', 'pagamento', 'tarifa', 'anuidade', 'cartao'],
    brands: [
      'nubank', 'inter', 'c6 bank', 'next', 'neon', 'original',
      'itau', 'bradesco', 'santander', 'caixa', 'banco do brasil',
      'picpay', 'mercadopago', 'mercado pago', 'pagseguro', 'paypal',
    ],
    icon: '🏦',
    color: '#673AB7',
    priority: 8,
  },

  // 🛡️ BANCO E SEGURADORAS - Seguradoras
  {
    category: 'Banco e Seguradoras',
    subcategory: 'Seguradoras',
    keywords: ['seguro', 'seguradora', 'sinistro', 'apolice', 'cobertura'],
    brands: [
      'porto seguro', 'bradesco seguros', 'sulamerica', 'itau seguros',
      'azul seguros', 'liberty', 'mapfre', 'allianz', 'tokio marine',
      'hdi', 'sompo', 'zurich', 'caixa seguradora',
    ],
    icon: '🛡️',
    color: '#673AB7',
    priority: 9,
  },

  // 💰 BANCO E SEGURADORAS - Empréstimos Bancários
  {
    category: 'Banco e Seguradoras',
    subcategory: 'Empréstimos Bancários',
    keywords: ['emprestimo', 'credito pessoal', 'consignado', 'financiamento pessoal'],
    brands: [
      'creditas', 'geru', 'simplic', 'bom pra credito', 'crefisa',
    ],
    icon: '💰',
    color: '#673AB7',
    priority: 9,
  },

  // 📋 BANCO E SEGURADORAS - Financiamentos
  {
    category: 'Banco e Seguradoras',
    subcategory: 'Financiamentos',
    keywords: ['financiamento', 'parcela', 'prestacao', 'carne'],
    brands: [
      'santander financiamentos', 'bradesco financiamentos', 'itau financiamentos',
      'bn financeira', 'losango', 'portocred',
    ],
    icon: '📋',
    color: '#673AB7',
    priority: 9,
  },

  // 💳 BANCO E SEGURADORAS - Cheque Especial
  {
    category: 'Banco e Seguradoras',
    subcategory: 'Cheque Especial',
    keywords: [
      'cheque especial', 'limite da conta', 'juros limite', 'juros cheque',
      'utilizacao limite', 'encargos limite', 'juros s/ limite', 'juros sobre limite'
    ],
    brands: [],
    patterns: [
      /juros.*limite/i,
      /cheque\s*especial/i,
      /encargos.*limite/i,
      /utilizacao.*limite/i
    ],
    icon: '💳',
    color: '#F44336', // Vermelho para indicar que é despesa/custo
    priority: 11, // Alta prioridade para não confundir com receitas
  },

  // 📱 TELEFONIA E INTERNET (Merge: Comunicação/Internet e Comunicação/Telefone)
  {
    category: 'Contas',
    subcategory: 'Telefonia e Internet',
    keywords: [
      'telefone', 'celular', 'internet', 'banda larga', 'fibra', 'tv', 'cabo',
      // Adicionadas do JSON (Comunicação)
      'wifi', 'recarga', 'pre-pago', 'pre'
    ],
    brands: [
      'vivo', 'tim', 'claro', 'nextel', 'algar', 'sky', 'net',
      'virtua', 'unifique', 'copel', 'gvt', 'telefonica',
      // Adicionadas do JSON (Comunicação)
      'vivo fibra', 'vfibra', 'claro net', 'net virtua', 'oi fibra', 'oi telecom', 'tim live'
    ],
    icon: '📱',
    color: '#00BCD4',
    priority: 8,
  },

  // ⚡ CONTAS - UTILIDADES (Merge: Moradia/Energia Elétrica e Moradia/Água)
  {
    category: 'Contas',
    subcategory: 'Energia e Água',
    keywords: [
      'energia', 'luz', 'eletricidade', 'agua', 'saneamento', 'esgoto',
      // Adicionadas do JSON (Moradia)
      'eletric', 'sanear'
    ],
    brands: [
      'cpfl', 'enel', 'cemig', 'light', 'copel', 'celpe', 'coelba',
      'sabesp', 'cedae', 'sanepar', 'caesb', 'embasa', 'compesa',
      // Adicionadas do JSON (Moradia)
      'energisa', 'copasa'
    ],
    icon: '⚡',
    color: '#FFC107',
    priority: 8,
  },

  // 🏢 CONTAS - CONDOMÍNIO
  {
    category: 'Contas',
    subcategory: 'Condomínio',
    keywords: ['condominio', 'condominial', 'taxa condominial', 'sindico', 'administradora'],
    brands: [
      'condominio', 'adm condominio', 'administradora', 'lello', 'superlógica',
      'superlogica', 'mix', 'administração condominial',
    ],
    icon: '🏢',
    color: '#795548',
    priority: 9,
  },

  // 🔌 CONTAS - ALUGUEL DE ELETRODOMÉSTICOS
  {
    category: 'Contas',
    subcategory: 'Aluguel de Eletrodomésticos',
    keywords: ['aluguel eletrodomestico', 'locacao', 'rent', 'aluguel geladeira', 'aluguel maquina'],
    brands: [
      'resicolor', 'luiza aluga', 'magalu aluga', 'aluguel eletro',
      'rental', 'aluguel lavadora', 'aluguel fogao',
    ],
    icon: '🔌',
    color: '#9E9E9E',
    priority: 9,
  },

  // 🏠 CONTAS - ALUGUEL DE IMÓVEL
  {
    category: 'Contas',
    subcategory: 'Aluguel de Imóvel',
    keywords: ['aluguel', 'aluguer', 'locacao imovel', 'inquilino', 'rent', 'imobiliaria'],
    brands: [
      'aluguel', 'imobiliaria', 'lopes', 'tecimob', 'chaveiro imoveis',
      'credpago', 'pagaleve', 'quintoandar', 'quinto andar', 'housi',
    ],
    icon: '🏠',
    color: '#8D6E63',
    priority: 10, // Prioridade alta para evitar conflitos
  },

  // 📚 LIVRARIAS E PAPELARIAS (Merge: Educação/Livros)
  {
    category: 'Educação',
    subcategory: 'Livrarias e Papelarias',
    keywords: [
      'livraria', 'livros', 'papelaria', 'leitura', 'editora', 'livreiro',
      // Adicionadas do JSON (Educação/Livros)
      'ebook'
    ],
    brands: [
      'livraria', 'saraiva', 'cultura', 'fnac', 'travessa', 'curitiba',
      'leitura', 'nobel', 'payot', 'argumento', 'megastore', 'da vila',
      'kalunga', 'papelaria', 'loja do livro', 'amazon livros', 'estante virtual',
      // Adicionadas do JSON (Educação/Livros)
      'ebooks'
    ],
    icon: '📚',
    color: '#5C6BC0',
    priority: 9, // Alta prioridade para evitar conflitos
  },

  // 🏫 EDUCAÇÃO (Merge: Educação/Cursos)
  {
    category: 'Educação',
    subcategory: 'Cursos e Ensino',
    keywords: [
      'escola', 'faculdade', 'universidade', 'curso', 'aula', 'ensino', 'matricula',
      // Adicionadas do JSON (Educação/Cursos)
      'ead', 'treinamento'
    ],
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

  // 🐕 PET - Alimentação
  {
    category: 'Pet',
    subcategory: 'Alimentação',
    keywords: ['pet', 'racao', 'petisco', 'alimento pet', 'comida cachorro', 'comida gato'],
    brands: [
      'petz', 'cobasi', 'petlove', 'pet shop', 'petshop', 'ponto natural',
      'agropet', 'royal canin', 'pedigree', 'whiskas', 'premier',
    ],
    icon: '🦴',
    color: '#FF9800',
    priority: 8,
  },

  // 🏥 PET - Médico
  {
    category: 'Pet',
    subcategory: 'Médico',
    keywords: ['veterinario', 'vet', 'clinica veterinaria', 'consulta pet'],
    brands: [
      'vetecare', 'pet care', 'hospital veterinario', 'clinica vet',
    ],
    icon: '🏥',
    color: '#FF9800',
    priority: 9,
  },

  // 💊 PET - Tratamentos
  {
    category: 'Pet',
    subcategory: 'Tratamentos',
    keywords: ['vacina pet', 'vermifugo', 'antipulgas', 'medicamento pet', 'cirurgia pet'],
    brands: [
      'frontline', 'nexgard', 'bravecto', 'seresto',
    ],
    icon: '💊',
    color: '#FF9800',
    priority: 9,
  },

  // 🛡️ PET - Seguradoras
  {
    category: 'Pet',
    subcategory: 'Seguradoras',
    keywords: ['seguro pet', 'plano pet', 'convenio pet'],
    brands: [
      'porto seguro pet', 'petlove saude', 'plano de saude pet',
    ],
    icon: '🛡️',
    color: '#FF9800',
    priority: 9,
  },

  // ✈️ VIAGENS
  {
    category: 'Viagens',
    subcategory: 'Aéreo e Turismo',
    keywords: ['viagem', 'passagem', 'hotel', 'hospedagem', 'turismo', 'aereo', 'voo', 'cia aerea'],
    brands: [
      'decolar', 'booking', 'airbnb', 'latam', 'gol', 'azul', 'voepass',
      '123 milhas', '123milhas', 'max milhas', 'maxmilhas', 'hurb',
      'cvc', 'submarino viagens',
    ],
    icon: '✈️',
    color: '#2196F3',
    priority: 9, // Aumentar prioridade para evitar conflito com Transporte
  },

  // 💰 RECEITAS - SALÁRIO
  {
    category: 'Salário',
    subcategory: 'Salário e Rendimentos',
    keywords: [
      'salario', 'holerite', 'vencimento', 'pagamento', 'remuneracao',
      'prolabore', 'pro labore', 'credito salarial', 'cred salario',
      'cred. salario', 'credito folha', 'deposito salarial', 'ltda'
    ],
    brands: [],
    patterns: [
      /salario/i,
      /holerite/i,
      /cred.*salari/i,
      /credito\s+folha/i,
      /deposito\s+salari/i,
      /\bltda\b/i
    ],
    icon: '💰',
    color: '#4CAF50',
    priority: 10, // Alta prioridade
  },

  // 💵 SAQUES
  {
    category: 'Saques',
    subcategory: 'Saques em Dinheiro',
    keywords: ['saque', 'retirada', 'cash', 'atm', 'caixa eletronico', 'caixa 24h'],
    brands: [],
    patterns: [/saque/i, /retirada/i, /atm/i],
    icon: '💵',
    color: '#9E9E9E',
    priority: 10,
  },

  // 📈 INVESTIMENTOS - APLICAÇÃO (DÉBITO)
  {
    category: 'Investimentos',
    subcategory: 'Aplicações e Investimentos',
    keywords: ['investimento', 'aplicacao', 'cdb', 'lca', 'lci', 'tesouro', 'tesouro direto', 'fundo'],
    brands: [],
    patterns: [
      /\bcdb\b/i,
      /\blca\b/i,
      /\blci\b/i,
      /tesouro\s+direto/i,
      /aplicacao/i,
      /investimento/i
    ],
    icon: '📈',
    color: '#2196F3',
    priority: 11, // Prioridade muito alta
  },

  // 💹 RECEITAS DE INVESTIMENTOS (CRÉDITO)
  {
    category: 'Receitas',
    subcategory: 'Rendimentos de Investimentos',
    keywords: [
      'rendimento', 'remuneracao', 'juros', 'dividendo', 'resgate',
      'cdb rendimento', 'tesouro rendimento', 'rendimento cdb', 'rendimento tesouro',
      'credito rendimento', 'pagamento rendimento'
    ],
    brands: [],
    patterns: [
      /rendimento/i,
      /remuneracao.*investimento/i,
      /juros.*cdb/i,
      /dividendo/i,
      /resgate.*cdb/i,
      /resgate.*tesouro/i
    ],
    icon: '💹',
    color: '#4CAF50',
    priority: 10,
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
    brands: ['xp investimentos', 'xp inc', 'btg', 'rico', 'clear', 'inter invest', 'nuinvest', 'warren'],
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
 * 🗺️ MAPEAMENTO SUBCATEGORIA → CATEGORIA
 * Usado para normalizar nomes que são subcategorias para suas categorias correspondentes
 */
export const SUBCATEGORY_TO_CATEGORY_MAP: Record<string, string> = {
  // Supermercado
  'Compras de Mercado': 'Supermercado',

  // Alimentação
  'Restaurantes e Delivery': 'Alimentação',
  'Padaria': 'Alimentação',

  // Saúde
  'Odontologia': 'Saúde',
  'Farmácias e Drogarias': 'Saúde',
  'Médicos e Clínicas': 'Saúde',
  'Academia e Fitness': 'Saúde',

  // Entretenimento
  'Lazer e Diversão': 'Entretenimento',
  'Streaming e Assinaturas': 'Entretenimento',

  // Transporte
  'Apps de Transporte': 'Transporte',
  'Combustível e Pedágio': 'Transporte',
  'Transporte Público': 'Transporte',
  'Seguros': 'Transporte',

  // Compras
  'E-commerce': 'Compras',
  'Moda e Vestuário': 'Compras',
  'Tecnologia': 'Compras',

  // Casa
  'Construção e Reforma': 'Casa',
  'Móveis e Decoração': 'Casa',

  // Banco e Seguradoras
  'Bancos e Fintechs': 'Banco e Seguradoras',
  'Seguradoras': 'Banco e Seguradoras',
  'Empréstimos Bancários': 'Banco e Seguradoras',
  'Financiamentos': 'Banco e Seguradoras',
  'Cheque Especial': 'Banco e Seguradoras',

  // Contas
  'Telefonia e Internet': 'Contas',
  'Energia e Água': 'Contas',
  'Condomínio': 'Contas',
  'Aluguel de Eletrodomésticos': 'Contas',
  'Aluguel de Imóvel': 'Contas',
  'Boletos e Débitos': 'Contas',

  // Educação
  'Livrarias e Papelarias': 'Educação',
  'Cursos e Ensino': 'Educação',

  // Pet
  'Alimentação Pet': 'Pet',
  'Médico Pet': 'Pet',
  'Tratamentos Pet': 'Pet',
  'Seguradoras Pet': 'Pet',

  // Viagens
  'Aéreo e Turismo': 'Viagens',

  // Salário
  'Salário e Rendimentos': 'Salário',

  // Saques
  'Saques em Dinheiro': 'Saques',

  // Investimentos
  'Aplicações e Investimentos': 'Investimentos',
  'Poupança e Capitalização': 'Investimentos',
  'Corretoras e Fundos': 'Investimentos',

  // Receitas
  'Rendimentos de Investimentos': 'Receitas',

  // Transferências
  'PIX': 'Transferências',
  'TED/DOC': 'Transferências',

  // Impostos e Taxas
  'IOF e Impostos': 'Impostos e Taxas',
};

/**
 * 🏷️ Lista de todas as CATEGORIAS válidas (não subcategorias)
 */
export const VALID_CATEGORIES = [
  'Supermercado',
  'Alimentação',
  'Saúde',
  'Entretenimento',
  'Transporte',
  'Compras',
  'Casa',
  'Banco e Seguradoras',
  'Contas',
  'Educação',
  'Pet',
  'Viagens',
  'Salário',
  'Saques',
  'Investimentos',
  'Receitas',
  'Transferências',
  'Impostos e Taxas',
  'Não Categorizado',
];

/**
 * 🔄 Normaliza um nome de categoria/subcategoria para sua CATEGORIA correspondente
 *
 * @param categoryOrSubcategory - Nome da categoria ou subcategoria
 * @returns A categoria correspondente (ou o próprio valor se já for uma categoria válida)
 */
export function normalizeToCategory(categoryOrSubcategory: string): string {
  if (!categoryOrSubcategory) return 'Não Categorizado';

  // Se já é uma categoria válida, retornar como está
  if (VALID_CATEGORIES.includes(categoryOrSubcategory)) {
    return categoryOrSubcategory;
  }

  // Se é uma subcategoria conhecida, mapear para a categoria
  if (SUBCATEGORY_TO_CATEGORY_MAP[categoryOrSubcategory]) {
    return SUBCATEGORY_TO_CATEGORY_MAP[categoryOrSubcategory];
  }

  // Não é nem categoria nem subcategoria conhecida - retornar como está
  // (pode ser uma categoria personalizada)
  return categoryOrSubcategory;
}

/**
 * Serviço de Categorização Inteligente
 */
class CategorizationService {
  private rules: CategoryRule[] = BRAZILIAN_CATEGORY_RULES;
  private germanRules: CategoryRule[] = GERMAN_CATEGORY_RULES;

  /** Retorna o conjunto de regras estáticas do país selecionado (BR = padrão). */
  private getRulesForCountry(country: CategorizationCountry = 'BR'): CategoryRule[] {
    return country === 'DE' ? this.germanRules : this.rules;
  }

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
    amount?: number,
    country: CategorizationCountry = 'BR'
  ): {
    category: string;
    subcategory: string;
    icon: string;
    color: string;
    confidence: number; // 0-100
    matchedBy: string; // O que causou o match
  } {
    // Remover padrões comuns de cartão antes de categorizar
    let cleanedText = `${description || ''} ${merchant || ''}`;
    cleanedText = cleanedText.replace(/compra\s+cartao\s+deb/gi, ''); // Remove "COMPRA CARTAO DEB"

    const text = this.normalizeText(cleanedText);

    let bestMatch: {
      rule: CategoryRule;
      score: number;
      matchedBy: string;
    } | null = null;

    // Ordenar regras por prioridade (do país selecionado: BR padrão ou DE)
    const sortedRules = [...this.getRulesForCountry(country)].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      let score = 0;
      let matchedBy = '';
      let hasBrandMatch = false;
      let hasKeywordMatch = false;
      let brandMatched = '';
      let keywordMatched = '';

      // 1. Match por marcas específicas (peso alto)
      for (const brand of rule.brands) {
        if (text.includes(this.normalizeText(brand))) {
          hasBrandMatch = true;
          brandMatched = brand;
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

      // 3. Match por keywords (peso médio) - MATCH EXATO
      if (score === 0) {
        for (const keyword of rule.keywords) {
          if (text.includes(this.normalizeText(keyword))) {
            hasKeywordMatch = true;
            keywordMatched = keyword;
            score = 70 + rule.priority;
            matchedBy = `palavra-chave: ${keyword}`;
            break;
          }
        }
      }

      // 4. Match por CNPJ conhecido (prioridade máxima)
      if (score === 0 && rule.cnpjs && rule.cnpjs.length > 0) {
        for (const cnpj of rule.cnpjs) {
          // Normalizar CNPJ removendo pontuação
          const normalizedCnpj = cnpj.replace(/[.\-\/]/g, '');
          const textWithoutSpaces = text.replace(/\s/g, '');
          if (textWithoutSpaces.includes(normalizedCnpj)) {
            score = 100 + rule.priority; // Máxima confiança
            matchedBy = `CNPJ identificado: ${cnpj}`;
            break;
          }
        }
      }

      // 5. Match por Fuzzy Matching (FALLBACK - última linha de defesa)
      // Apenas se não houve nenhum match anterior e similaridade >= 85%
      if (score === 0) {
        for (const keyword of rule.keywords) {
          const normalizedKeyword = this.normalizeText(keyword);
          // Verificar cada palavra do texto contra a keyword
          const words = text.split(' ');
          for (const word of words) {
            if (word.length >= 4) { // Apenas palavras com 4+ caracteres
              const similarity = this.fuzzyMatch(word, normalizedKeyword);
              if (similarity >= 0.85) { // 85% de similaridade mínima
                score = 50 + rule.priority; // Score baixo (fuzzy match)
                matchedBy = `fuzzy match: "${word}" ≈ "${keyword}" (${(similarity * 100).toFixed(0)}%)`;
                break;
              }
            }
          }
          if (score > 0) break;
        }
        // Também verificar brands com fuzzy
        if (score === 0) {
          for (const brand of rule.brands) {
            const normalizedBrand = this.normalizeText(brand);
            const words = text.split(' ');
            for (const word of words) {
              if (word.length >= 4) {
                const similarity = this.fuzzyMatch(word, normalizedBrand);
                if (similarity >= 0.85) {
                  score = 55 + rule.priority; // Score um pouco maior para brands
                  matchedBy = `fuzzy match marca: "${word}" ≈ "${brand}" (${(similarity * 100).toFixed(0)}%)`;
                  break;
                }
              }
            }
            if (score > 0) break;
          }
        }
      }

      // REGRA ESPECIAL: Banco e Seguradoras requer TANTO brand quanto keyword
      if (rule.category === 'Banco e Seguradoras' && score > 0) {
        // Verificar se tem keyword match (mesmo se já deu match por brand)
        if (!hasKeywordMatch) {
          for (const keyword of rule.keywords) {
            if (text.includes(this.normalizeText(keyword))) {
              hasKeywordMatch = true;
              keywordMatched = keyword;
              break;
            }
          }
        }

        // Se não tiver AMBOS (brand E keyword), descartar este match
        if (!hasBrandMatch || !hasKeywordMatch) {
          score = 0; // Descartar match
          matchedBy = `descartado - Banco e Seguradoras requer brand E keyword (brand: ${hasBrandMatch ? brandMatched : 'não'}, keyword: ${hasKeywordMatch ? keywordMatched : 'não'})`;
          continue; // Pular para próxima regra
        } else {
          // Tem ambos! Ajustar matchedBy para mostrar isso
          matchedBy = `marca: ${brandMatched} + palavra-chave: ${keywordMatched}`;
          score = 95 + rule.priority; // Aumentar score por ter match duplo
        }
      }

      // FUZZY MATCHING REMOVIDO
      // Não categorizar por "adivinhação" - apenas matches exatos são permitidos

      // Atualizar melhor match
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { rule, score, matchedBy };
      }
    }

    // Retornar resultado - THRESHOLD DE CONFIANÇA: 80%
    // Se a confiança for menor que 80%, não categorizar
    if (bestMatch && bestMatch.score >= 80) {
      let finalCategory = bestMatch.rule.category;
      let finalSubcategory = bestMatch.rule.subcategory || 'Geral';
      let finalIcon = bestMatch.rule.icon;
      let finalColor = bestMatch.rule.color;
      let adjustmentReason = '';

      // 🔄 REGRA ESPECIAL: TRANSFERÊNCIAS vs MARCAS
      // Se a categoria é "Transferências" (PIX, TED/DOC), verificar se há uma marca conhecida
      // Ex: "PIX - Pagto Netflix" → deve ser categorizado como Streaming, não como Transferência
      if (finalCategory === 'Transferências') {
        // Buscar se há match de marca em outras categorias
        for (const rule of sortedRules) {
          // Ignorar regras de transferência
          if (rule.category === 'Transferências') continue;

          for (const brand of rule.brands) {
            if (text.includes(this.normalizeText(brand))) {
              // Encontrou uma marca! Usar esta categoria em vez de Transferência
              finalCategory = rule.category;
              finalSubcategory = rule.subcategory || 'Geral';
              finalIcon = rule.icon;
              finalColor = rule.color;
              adjustmentReason = ` → Reclassificado de Transferência para ${rule.category} (marca detectada: ${brand})`;
              break;
            }
          }
          if (adjustmentReason) break;
        }
      }

      // 🔍 VERIFICAÇÃO DE SINAL DA TRANSAÇÃO (INVESTIMENTOS, SALÁRIO, RECEITAS)
      // Aplicar lógica inteligente baseada no valor positivo/negativo
      if (amount !== undefined && amount !== null) {
        const isPositive = amount > 0;
        const isNegative = amount < 0;
        const hasDebitoKeyword = text.includes('debito') || text.includes('deb ');

        // 📈 REGRA 1: INVESTIMENTOS
        // Se categoria é Investimentos E valor é POSITIVO → mudar para RECEITAS (lucro do investimento)
        // Se categoria é Investimentos E valor é NEGATIVO → manter como INVESTIMENTOS (aplicação)
        if (finalCategory === 'Investimentos') {
          if (isPositive) {
            finalCategory = 'Receitas';
            finalSubcategory = 'Rendimentos de Investimentos';
            finalIcon = '💹';
            finalColor = '#4CAF50';
            adjustmentReason = ' → Ajustado para Receitas (valor positivo = lucro de investimento)';
          } else if (isNegative || hasDebitoKeyword) {
            // Manter como Investimentos (já está correto)
            adjustmentReason = ' → Confirmado como Investimentos (valor negativo ou débito = aplicação)';
          }
        }

        // 💰 REGRA 2: SALÁRIO
        // Se categoria é Salário E valor é POSITIVO → manter como SALÁRIO (dinheiro entrando)
        // Se categoria é Salário E valor é NEGATIVO → mudar para CONTAS (pagamento que o usuário faz)
        else if (finalCategory === 'Salário') {
          if (isNegative) {
            finalCategory = 'Contas';
            finalSubcategory = 'Boletos e Débitos';
            finalIcon = '📄';
            finalColor = '#607D8B';
            adjustmentReason = ' → Ajustado para Contas (valor negativo = pagamento a fazer)';
          } else if (isPositive) {
            // Manter como Salário (já está correto)
            adjustmentReason = ' → Confirmado como Salário (valor positivo = dinheiro entrando)';
          }
        }

        // 💹 REGRA 3: RECEITAS
        // Se categoria é Receitas E valor é POSITIVO → manter como RECEITAS (dinheiro entrando)
        // Se categoria é Receitas E valor é NEGATIVO → mudar para INVESTIMENTOS (dinheiro saindo)
        else if (finalCategory === 'Receitas') {
          if (isNegative) {
            finalCategory = 'Investimentos';
            finalSubcategory = 'Aplicações e Investimentos';
            finalIcon = '📈';
            finalColor = '#2196F3';
            adjustmentReason = ' → Ajustado para Investimentos (valor negativo = aplicação)';
          } else if (isPositive) {
            // Manter como Receitas (já está correto)
            adjustmentReason = ' → Confirmado como Receitas (valor positivo = dinheiro entrando)';
          }
        }
      }

      return {
        category: finalCategory,
        subcategory: finalSubcategory,
        icon: finalIcon,
        color: finalColor,
        confidence: Math.min(bestMatch.score, 100),
        matchedBy: bestMatch.matchedBy + adjustmentReason,
      };
    }

    // Categoria padrão para transações não identificadas
    // OU com confiança menor que 80%
    const confidence = bestMatch ? bestMatch.score : 0;
    const matchedBy = bestMatch
      ? `baixa confiança (${confidence}%) - ${bestMatch.matchedBy}`
      : 'nenhum match encontrado';

    return {
      category: 'Não Categorizado',
      subcategory: 'Requer Classificação Manual',
      icon: '❓',
      color: '#9CA3AF', // Cinza clarinho
      confidence,
      matchedBy,
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

  /**
   * 🔍 Busca a categoria correspondente a uma subcategoria
   * Útil para importação de CSV que tem apenas subcategoria
   *
   * @param subcategory - A subcategoria a ser buscada
   * @returns A categoria correspondente ou null se não encontrada
   */
  getCategoryFromSubcategory(subcategory: string): {
    category: string;
    subcategory: string;
    icon: string;
    color: string;
  } | null {
    if (!subcategory) return null;

    const normalizedSubcategory = this.normalizeText(subcategory);

    // Buscar nas regras a subcategoria correspondente
    for (const rule of this.rules) {
      if (rule.subcategory) {
        const normalizedRuleSubcategory = this.normalizeText(rule.subcategory);

        // Match exato ou parcial
        if (normalizedRuleSubcategory === normalizedSubcategory ||
            normalizedRuleSubcategory.includes(normalizedSubcategory) ||
            normalizedSubcategory.includes(normalizedRuleSubcategory)) {
          return {
            category: rule.category,
            subcategory: rule.subcategory,
            icon: rule.icon,
            color: rule.color,
          };
        }
      }
    }

    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🏗️ ARQUITETURA DE TRÊS CAMADAS - MÉTODOS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🔄 CAMADA 2: Inteligência Contextual
   * Categoriza usando o histórico de categorizações do usuário
   *
   * @param description - Descrição da transação
   * @param userHistory - Histórico de categorizações do usuário
   * @returns Resultado da categorização ou null se não encontrar
   */
  categorizeByUserHistory(
    description: string,
    userHistory: UserCategorizationHistory[]
  ): {
    category: string;
    subcategory: string;
    icon: string;
    color: string;
    confidence: number;
    matchedBy: string;
  } | null {
    if (!userHistory || userHistory.length === 0) {
      return null;
    }

    const normalizedDescription = this.normalizeText(description);
    let bestMatch: {
      history: UserCategorizationHistory;
      similarity: number;
    } | null = null;

    for (const hist of userHistory) {
      const normalizedPattern = this.normalizeText(hist.description_pattern);

      // 1. Verificar match exato
      if (normalizedDescription === normalizedPattern) {
        // Match exato! Alta confiança
        const rule = this.findRuleByCategory(hist.category);
        return {
          category: hist.category,
          subcategory: hist.subcategory || 'Geral',
          icon: rule?.icon || '📌',
          color: rule?.color || '#9CA3AF',
          confidence: 95, // Alta confiança por ser match exato do histórico
          matchedBy: `histórico do usuário (match exato, usado ${hist.count}x)`,
        };
      }

      // 2. Verificar se a descrição contém o padrão
      if (normalizedDescription.includes(normalizedPattern) ||
          normalizedPattern.includes(normalizedDescription)) {
        const similarity = this.fuzzyMatch(normalizedDescription, normalizedPattern);
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { history: hist, similarity };
        }
      }

      // 3. Fuzzy matching
      const similarity = this.fuzzyMatch(normalizedDescription, normalizedPattern);
      if (similarity >= 0.80 && (!bestMatch || similarity > bestMatch.similarity)) {
        bestMatch = { history: hist, similarity };
      }
    }

    if (bestMatch && bestMatch.similarity >= 0.80) {
      const rule = this.findRuleByCategory(bestMatch.history.category);
      // Confiança baseada na similaridade e frequência de uso
      const usageBonus = Math.min(bestMatch.history.count * 2, 10); // Máx +10%
      const confidence = Math.min(70 + (bestMatch.similarity * 20) + usageBonus, 95);

      return {
        category: bestMatch.history.category,
        subcategory: bestMatch.history.subcategory || 'Geral',
        icon: rule?.icon || '📌',
        color: rule?.color || '#9CA3AF',
        confidence,
        matchedBy: `histórico do usuário (${(bestMatch.similarity * 100).toFixed(0)}% similar, usado ${bestMatch.history.count}x)`,
      };
    }

    return null;
  }

  /**
   * 🔍 Helper: Encontra uma regra pela categoria
   */
  private findRuleByCategory(category: string): CategoryRule | undefined {
    return this.rules.find(r => r.category === category);
  }

  /**
   * 🌐 CAMADA 3: Busca Externa
   * Categoriza usando resultados de busca na web
   *
   * @param description - Descrição da transação
   * @param searchResults - Resultados da busca externa (snippets)
   * @returns Resultado da categorização ou null se não encontrar
   */
  categorizeByExternalSearch(
    description: string,
    searchResults: ExternalSearchResult
  ): {
    category: string;
    subcategory: string;
    icon: string;
    color: string;
    confidence: number;
    matchedBy: string;
  } | null {
    if (!searchResults || !searchResults.snippets || searchResults.snippets.length === 0) {
      return null;
    }

    // Combinar todos os snippets em um único texto normalizado
    const combinedSnippet = this.normalizeText(searchResults.snippets.join(' '));

    let bestMatch: {
      rule: CategoryRule;
      brand: string;
      confidence: number;
    } | null = null;

    // Tentar encontrar marcas conhecidas nos snippets
    for (const rule of this.rules) {
      // Ignorar regras de transferências
      if (rule.category === 'Transferências') {
        continue;
      }

      for (const brand of rule.brands) {
        const normalizedBrand = this.normalizeText(brand);
        if (combinedSnippet.includes(normalizedBrand)) {
          // Encontrou marca nos resultados da busca!
          const confidence = 60 + rule.priority; // Confiança média-baixa (busca externa)
          if (!bestMatch || confidence > bestMatch.confidence) {
            bestMatch = { rule, brand, confidence };
          }
        }
      }

      // Também verificar keywords
      for (const keyword of rule.keywords) {
        const normalizedKeyword = this.normalizeText(keyword);
        if (combinedSnippet.includes(normalizedKeyword) && normalizedKeyword.length >= 5) {
          const confidence = 55 + rule.priority;
          if (!bestMatch || confidence > bestMatch.confidence) {
            bestMatch = { rule, brand: keyword, confidence };
          }
        }
      }
    }

    if (bestMatch) {
      return {
        category: bestMatch.rule.category,
        subcategory: bestMatch.rule.subcategory || 'Geral',
        icon: bestMatch.rule.icon,
        color: bestMatch.rule.color,
        confidence: Math.min(bestMatch.confidence, 75), // Máximo 75% para busca externa
        matchedBy: `busca externa (${searchResults.source}): "${bestMatch.brand}" encontrado`,
      };
    }

    return null;
  }

  /**
   * 🎯 MÉTODO PRINCIPAL: Categorização em Três Camadas
   *
   * Executa a categorização seguindo a arquitetura de três camadas:
   * 1. Camada 1: Regras Estáticas (threshold: 80%)
   * 2. Camada 2: Histórico do Usuário (threshold: 70%)
   * 3. Camada 3: Busca Externa (threshold: 40%)
   *
   * @param description - Descrição da transação
   * @param merchant - Nome do merchant (opcional)
   * @param amount - Valor da transação (opcional)
   * @param userHistory - Histórico de categorizações do usuário (opcional)
   * @param externalSearchResults - Resultados de busca externa (opcional)
   * @returns Resultado da categorização com informação de qual camada foi usada
   */
  categorizeWithThreeLayers(
    description: string,
    merchant?: string | null,
    amount?: number | null,
    userHistory?: UserCategorizationHistory[],
    externalSearchResults?: ExternalSearchResult,
    country: CategorizationCountry = 'BR'
  ): {
    category: string;
    subcategory: string;
    icon: string;
    color: string;
    confidence: number;
    matchedBy: string;
    layer: 1 | 2 | 3 | 0; // 0 = não categorizado
  } {
    // ═══════════════════════════════════════════════════════════════════════
    // CAMADA 1: Regras Estáticas
    // ═══════════════════════════════════════════════════════════════════════
    const layer1Result = this.categorizeTransaction(description, merchant || undefined, amount || undefined, country);

    if (layer1Result.confidence >= 80) {
      return {
        ...layer1Result,
        layer: 1,
        matchedBy: `[Camada 1] ${layer1Result.matchedBy}`,
      };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CAMADA 2: Histórico do Usuário
    // ═══════════════════════════════════════════════════════════════════════
    if (userHistory && userHistory.length > 0) {
      const layer2Result = this.categorizeByUserHistory(description, userHistory);

      if (layer2Result && layer2Result.confidence >= 70) {
        return {
          ...layer2Result,
          layer: 2,
          matchedBy: `[Camada 2] ${layer2Result.matchedBy}`,
        };
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CAMADA 3: Busca Externa
    // ═══════════════════════════════════════════════════════════════════════
    if (externalSearchResults) {
      const layer3Result = this.categorizeByExternalSearch(description, externalSearchResults);

      if (layer3Result && layer3Result.confidence >= 40) {
        return {
          ...layer3Result,
          layer: 3,
          matchedBy: `[Camada 3] ${layer3Result.matchedBy}`,
        };
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FALLBACK: Se a Camada 1 teve algum resultado (mesmo que baixa confiança)
    // ═══════════════════════════════════════════════════════════════════════
    if (layer1Result.confidence > 0 && layer1Result.category !== 'Não Categorizado') {
      return {
        ...layer1Result,
        layer: 1,
        matchedBy: `[Camada 1 - Baixa Confiança] ${layer1Result.matchedBy}`,
      };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // NÃO CATEGORIZADO
    // ═══════════════════════════════════════════════════════════════════════
    return {
      category: 'Não Categorizado',
      subcategory: 'Requer Classificação Manual',
      icon: '❓',
      color: '#9CA3AF',
      confidence: 0,
      matchedBy: 'nenhuma camada conseguiu categorizar',
      layer: 0,
    };
  }

  /**
   * 📝 Extrai padrão de descrição para histórico
   * Remove números variáveis, datas, etc. para criar um padrão reutilizável
   *
   * @param description - Descrição original
   * @returns Padrão normalizado
   */
  extractDescriptionPattern(description: string): string {
    let pattern = this.normalizeText(description);

    // Remover datas (dd/mm/yyyy, dd-mm-yyyy, etc.)
    pattern = pattern.replace(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g, '');

    // Remover horários (hh:mm, hh:mm:ss)
    pattern = pattern.replace(/\d{1,2}:\d{2}(:\d{2})?/g, '');

    // Remover sequências numéricas longas (IDs, códigos)
    pattern = pattern.replace(/\d{6,}/g, '');

    // Remover valores monetários (R$ 123,45)
    pattern = pattern.replace(/r?\$?\s*\d+[,\.]\d{2}/g, '');

    // Normalizar espaços
    pattern = pattern.replace(/\s+/g, ' ').trim();

    return pattern;
  }

  /**
   * 📊 Gera sugestões de busca para Camada 3
   *
   * @param description - Descrição da transação
   * @returns Query sugerida para busca
   */
  generateSearchQuery(description: string): string {
    const pattern = this.extractDescriptionPattern(description);

    // Se tiver CNPJ, buscar pelo CNPJ
    const cnpjMatch = description.match(CNPJ_PATTERN);
    if (cnpjMatch) {
      return `CNPJ ${cnpjMatch[0]} empresa`;
    }

    // Caso contrário, buscar pela descrição
    return `O que é: ${pattern}`;
  }
}

export default new CategorizationService();
