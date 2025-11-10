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

// Paleta expandida com 120+ cores únicas
// Organizada por famílias de cores com tons muito claros → muito escuros
const FALLBACK_COLORS = [
  // Pretos e Cinzas escuros
  '#000000', '#111827', '#1f2937', '#374151', '#4b5563',
  // Cinzas médios e claros
  '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6',

  // Vermelhos (muito claro → muito escuro)
  '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#450a0a',

  // Rosas (muito claro → muito escuro)
  '#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9f1239', '#831843', '#500724',

  // Magentas/Fuchsias (muito claro → muito escuro)
  '#fae8ff', '#f5d0fe', '#f0abfc', '#e879f9', '#d946ef', '#c026d3', '#a21caf', '#86198f', '#701a75', '#4a044e',

  // Laranjas (muito claro → muito escuro)
  '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12', '#431407',

  // Âmbares (muito claro → muito escuro)
  '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f', '#451a03',

  // Amarelos (muito claro → muito escuro)
  '#fef9c3', '#fef08a', '#fde047', '#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e', '#713f12', '#422006',

  // Limas (muito claro → muito escuro)
  '#ecfccb', '#d9f99d', '#bef264', '#a3e635', '#84cc16', '#65a30d', '#4d7c0f', '#3f6212', '#365314', '#1a2e05',

  // Verdes (muito claro → muito escuro)
  '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d', '#052e16',

  // Esmeraldas (muito claro → muito escuro)
  '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b', '#022c22',

  // Teals (muito claro → muito escuro)
  '#ccfbf1', '#99f6e4', '#5eead4', '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#115e59', '#134e4a', '#042f2e',

  // Cyans (muito claro → muito escuro)
  '#cffafe', '#a5f3fc', '#67e8f9', '#22d3ee', '#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63', '#083344',

  // Azuis céu (muito claro → muito escuro)
  '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e', '#082f49',

  // Azuis (muito claro → muito escuro)
  '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554',

  // Azuis escuros / Navy
  '#1e3a8a', '#1e40af', '#1d4ed8', '#1a3c8a', '#172554', '#0f172a', '#0c1229', '#020617', '#000814', '#00040a',

  // Índigos (muito claro → muito escuro)
  '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81', '#1e1b4b',

  // Violetas (muito claro → muito escuro)
  '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95', '#2e1065',

  // Roxos (muito claro → muito escuro)
  '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#581c87', '#3b0764',

  // Marrons (muito claro → muito escuro)
  '#e7ddd7', '#d6c6b8', '#c4a793', '#b08968', '#9c6e4f', '#8b5a3c', '#7a4e2f', '#6d4530', '#5c3d2e', '#4a3228',
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

  // Criar pool de cores disponíveis: primeiro as predefinidas, depois fallback
  // Remover duplicatas imediatamente
  const uniqueColors = Array.from(new Set([
    ...Object.values(CATEGORY_COLORS),
    ...FALLBACK_COLORS,
  ]));

  console.log(`Total de cores únicas disponíveis: ${uniqueColors.length}`);
  console.log(`Total de categorias para colorir: ${categories.length}`);

  categories.forEach((category, index) => {
    let color: string;

    // Primeiro, verificar se existe cor predefinida E se não está em uso
    if (CATEGORY_COLORS[category] && !usedColors.has(CATEGORY_COLORS[category])) {
      color = CATEGORY_COLORS[category];
    } else if (CATEGORY_COLORS[category] && usedColors.has(CATEGORY_COLORS[category])) {
      // Se a cor predefinida já está em uso, pegar próxima disponível
      console.warn(`Cor predefinida para ${category} já em uso, usando cor alternativa`);
      const availableColor = uniqueColors.find(c => !usedColors.has(c));
      color = availableColor || `#${Math.floor(Math.random()*16777215).toString(16)}`;
    } else {
      // Procurar primeira cor não usada no pool
      const availableColor = uniqueColors.find(c => !usedColors.has(c));

      if (availableColor) {
        color = availableColor;
      } else {
        // Fallback final: gerar cor aleatória se esgotar as 120+ cores
        console.error('TODAS as cores foram usadas! Gerando cor aleatória.');
        color = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
      }
    }

    colorMap.set(category, color);
    usedColors.add(color);
  });

  // Verificar se há duplicatas (não deveria haver)
  const colorsUsed = Array.from(colorMap.values());
  const uniqueColorsUsed = new Set(colorsUsed);
  if (colorsUsed.length !== uniqueColorsUsed.size) {
    console.error('ERRO: Cores duplicadas detectadas!');
  }

  return colorMap;
}
