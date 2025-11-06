/**
 * Serviço de categorização automática de transações
 * Usa keywords e padrões para categorizar transações automaticamente
 */

interface CategoryRule {
  category: string;
  keywords: string[];
  icon: string;
  color: string;
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'Supermercado',
    keywords: ['rewe', 'edeka', 'aldi', 'lidl', 'kaufland', 'netto', 'penny', 'supermarkt', 'grocery'],
    icon: '🛒',
    color: '#4CAF50',
  },
  {
    category: 'Restaurantes',
    keywords: ['restaurant', 'cafe', 'pizza', 'burger', 'mcdonald', 'kfc', 'subway', 'starbucks', 'imbiss'],
    icon: '🍽️',
    color: '#FF5722',
  },
  {
    category: 'Transporte',
    keywords: ['uber', 'taxi', 'shell', 'aral', 'tankstelle', 'deutsche bahn', 'db', 'mvg', 'bvg', 'bus', 'train'],
    icon: '🚗',
    color: '#2196F3',
  },
  {
    category: 'Compras',
    keywords: ['amazon', 'ebay', 'zalando', 'h&m', 'zara', 'ikea', 'mediamarkt', 'saturn', 'otto', 'shopping'],
    icon: '🛍️',
    color: '#E91E63',
  },
  {
    category: 'Saúde',
    keywords: ['apotheke', 'pharmacy', 'arzt', 'doctor', 'hospital', 'krankenhaus', 'dental', 'zahnarzt'],
    icon: '⚕️',
    color: '#009688',
  },
  {
    category: 'Entretenimento',
    keywords: ['netflix', 'spotify', 'disney', 'amazon prime', 'youtube', 'cinema', 'kino', 'theater', 'konzert'],
    icon: '🎬',
    color: '#9C27B0',
  },
  {
    category: 'Contas',
    keywords: ['vodafone', 'telekom', 'o2', 'strom', 'gas', 'water', 'wasser', 'miete', 'rent', 'insurance', 'versicherung'],
    icon: '📄',
    color: '#607D8B',
  },
  {
    category: 'Salário',
    keywords: ['gehalt', 'salary', 'lohn', 'wage', 'payment', 'income'],
    icon: '💰',
    color: '#4CAF50',
  },
  {
    category: 'Transferências',
    keywords: ['transfer', 'überweisung', 'sepa'],
    icon: '💸',
    color: '#FF9800',
  },
  {
    category: 'Educação',
    keywords: ['schule', 'school', 'university', 'universität', 'course', 'kurs', 'training'],
    icon: '📚',
    color: '#3F51B5',
  },
  {
    category: 'Casa',
    keywords: ['baumarkt', 'obi', 'hornbach', 'möbel', 'furniture', 'home'],
    icon: '🏠',
    color: '#795548',
  },
];

class CategorizationService {
  /**
   * Categoriza uma transação baseado na descrição
   */
  categorizeTransaction(description: string, merchant?: string): {
    category: string;
    icon: string;
    color: string;
  } {
    const text = `${description || ''} ${merchant || ''}`.toLowerCase();

    for (const rule of CATEGORY_RULES) {
      for (const keyword of rule.keywords) {
        if (text.includes(keyword.toLowerCase())) {
          return {
            category: rule.category,
            icon: rule.icon,
            color: rule.color,
          };
        }
      }
    }

    // Categoria padrão
    return {
      category: 'Outros',
      icon: '📊',
      color: '#9E9E9E',
    };
  }

  /**
   * Retorna todas as categorias disponíveis
   */
  getAllCategories(): CategoryRule[] {
    return [
      ...CATEGORY_RULES,
      {
        category: 'Outros',
        keywords: [],
        icon: '📊',
        color: '#9E9E9E',
      },
    ];
  }

  /**
   * Adiciona uma regra de categorização personalizada
   */
  addCustomRule(rule: CategoryRule): void {
    CATEGORY_RULES.push(rule);
  }
}

export default new CategorizationService();
