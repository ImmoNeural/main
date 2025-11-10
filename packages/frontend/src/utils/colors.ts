// Paleta de cores única para categorias
// Cada categoria terá uma cor distinta e consistente

export const CATEGORY_COLORS: Record<string, string> = {
  // Despesas
  'Alimentação': '#ef4444', // Vermelho
  'Supermercado': '#f59e0b', // Laranja
  'Restaurante': '#dc2626', // Vermelho escuro
  'Transporte': '#3b82f6', // Azul
  'Combustível': '#1d4ed8', // Azul escuro
  'Saúde': '#ec4899', // Rosa
  'Farmácia': '#db2777', // Rosa escuro
  'Educação': '#8b5cf6', // Roxo
  'Entretenimento': '#a855f7', // Roxo claro
  'Streaming e Assinaturas': '#9333ea', // Roxo médio
  'Compras': '#10b981', // Verde água
  'Compras Online': '#059669', // Verde água escuro
  'Moda e Vestuário': '#14b8a6', // Teal
  'Eletrônicos': '#06b6d4', // Cyan
  'Casa': '#f97316', // Laranja escuro
  'Utilidades': '#ea580c', // Laranja queimado
  'Telefone': '#6366f1', // Indigo
  'Internet': '#4f46e5', // Indigo escuro
  'Impostos e Taxas': '#64748b', // Cinza azulado
  'Investimentos': '#0ea5e9', // Azul claro
  'Outros': '#94a3b8', // Cinza

  // Receitas
  'Salário': '#22c55e', // Verde
  'Transferência': '#84cc16', // Lima
  'Transferências': '#a3e635', // Lima mais claro (para evitar conflito)
  'Investimentos - Rendimento': '#16a34a', // Verde médio
  'PIX Recebido': '#15803d', // Verde escuro
  'Freelance': '#65a30d', // Lima escuro
  'Bonificação': '#4ade80', // Verde claro
  'Reembolso': '#86efac', // Verde muito claro
};

// Paleta expandida com 50+ cores únicas
const FALLBACK_COLORS = [
  // Vermelhos
  '#dc2626', '#ef4444', '#f87171', '#fca5a5',
  // Laranjas
  '#ea580c', '#f97316', '#fb923c', '#fdba74',
  // Amarelos
  '#ca8a04', '#eab308', '#facc15', '#fde047',
  // Verdes Lima
  '#65a30d', '#84cc16', '#a3e635', '#bef264',
  // Verdes
  '#16a34a', '#22c55e', '#4ade80', '#86efac',
  // Verdes água
  '#059669', '#10b981', '#34d399', '#6ee7b7',
  // Teal
  '#0f766e', '#14b8a6', '#2dd4bf', '#5eead4',
  // Cyan
  '#0891b2', '#06b6d4', '#22d3ee', '#67e8f9',
  // Azuis claros
  '#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc',
  // Azuis
  '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd',
  // Indigos
  '#4f46e5', '#6366f1', '#818cf8', '#a5b4fc',
  // Roxos
  '#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd',
  // Roxos claros
  '#9333ea', '#a855f7', '#c084fc', '#d8b4fe',
  // Rosas
  '#db2777', '#ec4899', '#f472b6', '#f9a8d4',
  // Cinzas
  '#475569', '#64748b', '#94a3b8', '#cbd5e1',
];

export function getCategoryColor(category: string, index: number = 0): string {
  // Tentar buscar cor específica da categoria
  if (CATEGORY_COLORS[category]) {
    return CATEGORY_COLORS[category];
  }

  // Se não encontrar, usar cor fallback baseada no índice
  return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

export function getAllCategoryColors(categories: string[]): Map<string, string> {
  const colorMap = new Map<string, string>();
  const usedColors = new Set<string>();

  // Criar pool de cores disponíveis (predefinidas + fallback)
  const allAvailableColors = [
    ...Object.values(CATEGORY_COLORS),
    ...FALLBACK_COLORS,
  ];

  // Remover duplicatas do pool
  const uniqueColors = Array.from(new Set(allAvailableColors));

  categories.forEach((category, index) => {
    let color: string;

    // Primeiro, tentar usar cor predefinida
    if (CATEGORY_COLORS[category]) {
      color = CATEGORY_COLORS[category];
    } else {
      // Procurar primeira cor não usada no pool
      const availableColor = uniqueColors.find(c => !usedColors.has(c));

      if (availableColor) {
        color = availableColor;
      } else {
        // Fallback final: usar cor do índice (não deveria acontecer com 50+ cores)
        color = FALLBACK_COLORS[index % FALLBACK_COLORS.length];
      }
    }

    colorMap.set(category, color);
    usedColors.add(color);
  });

  return colorMap;
}
