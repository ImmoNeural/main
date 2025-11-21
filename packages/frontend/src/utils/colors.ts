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
  'Banco e Seguradoras': '#673AB7', // Roxo
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

// Paleta com MÁXIMA VARIEDADE de cores
// Cores organizadas para ter diferenças visuais GRANDES entre as primeiras
const FALLBACK_COLORS = [
  // Primeira rodada: Cores MUITO diferentes (espectro completo)
  '#ef4444', // Vermelho vibrante
  '#3b82f6', // Azul vibrante
  '#22c55e', // Verde vibrante
  '#f59e0b', // Laranja vibrante
  '#a855f7', // Roxo vibrante
  '#14b8a6', // Teal vibrante
  '#ec4899', // Rosa vibrante
  '#eab308', // Amarelo vibrante
  '#6366f1', // Índigo vibrante
  '#84cc16', // Lima vibrante
  '#06b6d4', // Ciano vibrante
  '#f97316', // Laranja escuro
  '#8b5cf6', // Violeta vibrante
  '#10b981', // Esmeralda vibrante
  '#d946ef', // Fuchsia vibrante

  // Segunda rodada: Tons médios variados
  '#dc2626', // Vermelho médio
  '#2563eb', // Azul médio
  '#16a34a', // Verde médio
  '#ea580c', // Laranja queimado
  '#9333ea', // Roxo médio
  '#0d9488', // Teal escuro
  '#db2777', // Rosa escuro
  '#ca8a04', // Amarelo escuro
  '#4f46e5', // Índigo escuro
  '#65a30d', // Lima escuro
  '#0891b2', // Ciano escuro
  '#c2410c', // Laranja muito escuro
  '#7c3aed', // Violeta médio
  '#059669', // Esmeralda escuro
  '#c026d3', // Fuchsia escuro

  // Terceira rodada: Tons claros variados
  '#fca5a5', // Vermelho claro
  '#93c5fd', // Azul claro
  '#86efac', // Verde claro
  '#fdba74', // Laranja claro
  '#d8b4fe', // Roxo claro
  '#5eead4', // Teal claro
  '#f9a8d4', // Rosa claro
  '#fde047', // Amarelo claro
  '#a5b4fc', // Índigo claro
  '#bef264', // Lima claro
  '#67e8f9', // Ciano claro
  '#fed7aa', // Laranja muito claro
  '#c4b5fd', // Violeta claro
  '#6ee7b7', // Esmeralda claro
  '#f0abfc', // Fuchsia claro

  // Quarta rodada: Tons escuros variados
  '#991b1b', // Vermelho escuro
  '#1e40af', // Azul escuro
  '#15803d', // Verde escuro
  '#9a3412', // Laranja marrom
  '#6b21a8', // Roxo escuro
  '#115e59', // Teal muito escuro
  '#9f1239', // Rosa escuro
  '#854d0e', // Amarelo marrom
  '#3730a3', // Índigo muito escuro
  '#4d7c0f', // Lima marrom
  '#155e75', // Ciano escuro
  '#7c2d12', // Laranja marrom escuro
  '#5b21b6', // Violeta escuro
  '#065f46', // Esmeralda muito escuro
  '#86198f', // Fuchsia escuro

  // Marrons e terrosos (variedade)
  '#b08968', // Marrom claro
  '#8b5a3c', // Marrom médio
  '#6d4530', // Marrom escuro
  '#d6c6b8', // Bege
  '#c4a793', // Areia

  // Cinzas (apenas no final, se necessário)
  '#6b7280', // Cinza médio
  '#9ca3af', // Cinza claro
  '#4b5563', // Cinza escuro
  '#374151', // Cinza muito escuro
  '#d1d5db', // Cinza muito claro

  // Tons pastéis (variedade adicional)
  '#fee2e2', // Rosa bebê
  '#dbeafe', // Azul bebê
  '#dcfce7', // Verde bebê
  '#ffedd5', // Pêssego
  '#f3e8ff', // Lavanda
  '#ccfbf1', // Menta
  '#fce7f3', // Rosa pastel
  '#fef9c3', // Amarelo pastel
  '#e0e7ff', // Índigo pastel
  '#ecfccb', // Lima pastel

  // Tons muito escuros (apenas se esgotar tudo)
  '#7f1d1d', // Vermelho muito escuro
  '#1e3a8a', // Azul muito escuro
  '#14532d', // Verde muito escuro
  '#431407', // Laranja muito escuro
  '#581c87', // Roxo muito escuro
  '#042f2e', // Teal muito escuro
  '#831843', // Rosa muito escuro
  '#713f12', // Amarelo muito escuro
  '#312e81', // Índigo muito escuro
  '#365314', // Lima muito escuro

  // Preto/branco (apenas último recurso)
  '#000000', // Preto
  '#111827', // Quase preto
  '#1f2937', // Cinza muito escuro
  '#e5e7eb', // Quase branco
  '#f3f4f6', // Cinza muito claro
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

  console.log(`🎨 Iniciando atribuição de cores`);
  console.log(`📊 Total de entradas para colorir: ${categories.length}`);
  console.log(`📝 Entradas:`, categories);

  // Sistema ULTRA-SIMPLIFICADO: pegar cores sequencialmente do pool
  // SEM lógica complexa, SEM cores predefinidas, APENAS sequencial
  categories.forEach((category, index) => {
    // Pegar cor do pool de forma sequencial e cíclica
    const color = FALLBACK_COLORS[index % FALLBACK_COLORS.length];

    colorMap.set(category, color);
    console.log(`${index + 1}. ${category} → ${color}`);
  });

  // Verificação final de duplicatas
  const colorsUsed = Array.from(colorMap.values());
  const uniqueColorsUsed = new Set(colorsUsed);

  if (colorsUsed.length !== uniqueColorsUsed.size) {
    console.error('❌ ERRO CRÍTICO: Cores duplicadas detectadas!');
    console.error('Total usado:', colorsUsed.length, 'Únicos:', uniqueColorsUsed.size);

    // Encontrar e mostrar duplicatas
    const duplicates: string[] = [];
    colorsUsed.forEach((color, idx) => {
      if (colorsUsed.indexOf(color) !== idx) {
        duplicates.push(color);
      }
    });
    console.error('Cores duplicadas:', [...new Set(duplicates)]);
  } else {
    console.log(`✅ SUCESSO! ${colorsUsed.length} cores únicas atribuídas. Zero duplicatas.`);
  }

  return colorMap;
}
