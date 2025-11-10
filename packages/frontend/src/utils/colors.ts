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
  'Investimentos - Rendimento': '#16a34a', // Verde médio
  'PIX Recebido': '#15803d', // Verde escuro
  'Freelance': '#65a30d', // Lima escuro
  'Bonificação': '#4ade80', // Verde claro
  'Reembolso': '#86efac', // Verde muito claro
};

const FALLBACK_COLORS = [
  '#0ea5e9', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#06b6d4',
  '#a855f7', '#84cc16', '#64748b', '#94a3b8', '#fb923c',
  '#fbbf24', '#34d399', '#60a5fa', '#c084fc', '#f472b6',
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

  categories.forEach((category, index) => {
    let color = CATEGORY_COLORS[category];

    // Se não tem cor específica ou cor já foi usada, pegar uma nova
    if (!color || usedColors.has(color)) {
      // Procurar primeira cor não usada
      color = FALLBACK_COLORS.find(c => !usedColors.has(c)) || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
    }

    colorMap.set(category, color);
    usedColors.add(color);
  });

  return colorMap;
}
