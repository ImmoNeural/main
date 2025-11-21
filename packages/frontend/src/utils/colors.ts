// Paleta de cores única para categorias
// Cada categoria terá uma cor distinta e consistente

export const CATEGORY_COLORS: Record<string, string> = {
  // Despesas - TONS SUAVES
  'Alimentação': '#fca5a5', // Vermelho suave
  'Supermercado': '#fdba74', // Laranja suave
  'Restaurante': '#f87171', // Vermelho médio suave
  'Transporte': '#93c5fd', // Azul suave
  'Combustível': '#60a5fa', // Azul médio suave
  'Saúde': '#f9a8d4', // Rosa suave
  'Farmácia': '#f472b6', // Rosa médio suave
  'Educação': '#c4b5fd', // Roxo suave
  'Entretenimento': '#d8b4fe', // Roxo claro suave
  'Streaming e Assinaturas': '#c084fc', // Roxo médio suave
  'Compras': '#6ee7b7', // Verde água suave
  'Compras Online': '#5eead4', // Verde água médio suave
  'Moda e Vestuário': '#5eead4', // Teal suave
  'Eletrônicos': '#67e8f9', // Cyan suave
  'Casa': '#fed7aa', // Laranja suave
  'Utilidades': '#fdba74', // Laranja queimado suave
  'Telefone': '#a5b4fc', // Indigo suave
  'Internet': '#818cf8', // Indigo médio suave
  'Impostos e Taxas': '#94a3b8', // Cinza azulado
  'Investimentos': '#7dd3fc', // Azul claro suave
  'Banco e Seguradoras': '#c4b5fd', // Roxo suave
  'Outros': '#cbd5e1', // Cinza suave

  // Receitas - TONS SUAVES
  'Salário': '#86efac', // Verde suave
  'Transferência': '#bef264', // Lima suave
  'Transferências': '#d9f99d', // Lima mais claro suave
  'Investimentos - Rendimento': '#6ee7b7', // Verde médio suave
  'PIX Recebido': '#5eead4', // Verde/teal suave
  'Freelance': '#a3e635', // Lima médio suave
  'Bonificação': '#a7f3d0', // Verde claro suave
  'Reembolso': '#bbf7d0', // Verde muito claro suave
};

// Paleta com MÁXIMA VARIEDADE de cores - TONS SUAVES
// Cores organizadas para ter diferenças visuais GRANDES entre as primeiras
const FALLBACK_COLORS = [
  // Primeira rodada: Tons suaves e pastéis (espectro completo)
  '#fca5a5', // Vermelho suave
  '#93c5fd', // Azul suave
  '#86efac', // Verde suave
  '#fdba74', // Laranja suave
  '#d8b4fe', // Roxo suave
  '#5eead4', // Teal suave
  '#f9a8d4', // Rosa suave
  '#fde047', // Amarelo suave
  '#a5b4fc', // Índigo suave
  '#bef264', // Lima suave
  '#67e8f9', // Ciano suave
  '#fed7aa', // Laranja claro suave
  '#c4b5fd', // Violeta suave
  '#6ee7b7', // Esmeralda suave
  '#f0abfc', // Fuchsia suave

  // Segunda rodada: Tons médios suaves
  '#f87171', // Vermelho médio suave
  '#60a5fa', // Azul médio suave
  '#4ade80', // Verde médio suave
  '#fb923c', // Laranja médio suave
  '#c084fc', // Roxo médio suave
  '#2dd4bf', // Teal médio suave
  '#f472b6', // Rosa médio suave
  '#facc15', // Amarelo médio suave
  '#818cf8', // Índigo médio suave
  '#a3e635', // Lima médio suave
  '#22d3ee', // Ciano médio suave
  '#fbbf24', // Laranja/âmbar médio suave
  '#a78bfa', // Violeta médio suave
  '#34d399', // Esmeralda médio suave
  '#e879f9', // Fuchsia médio suave

  // Terceira rodada: Tons claros e pastéis extras
  '#fecaca', // Vermelho muito claro
  '#bfdbfe', // Azul muito claro
  '#bbf7d0', // Verde muito claro
  '#fed7aa', // Laranja muito claro
  '#e9d5ff', // Roxo muito claro
  '#99f6e4', // Teal muito claro
  '#fbcfe8', // Rosa muito claro
  '#fef3c7', // Amarelo muito claro
  '#c7d2fe', // Índigo muito claro
  '#d9f99d', // Lima muito claro
  '#a5f3fc', // Ciano muito claro
  '#ffe4e6', // Laranja/rosa muito claro
  '#ddd6fe', // Violeta muito claro
  '#a7f3d0', // Esmeralda muito claro
  '#f5d0fe', // Fuchsia muito claro

  // Quarta rodada: Tons pastéis adicionais
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
  '#f0fdfa', // Teal bebê
  '#fef2f2', // Vermelho bebê
  '#eff6ff', // Azul bebê
  '#f0fdf4', // Verde bebê
  '#fffbeb', // Âmbar bebê

  // Quinta rodada: Tons bege/areia suaves
  '#fef3c7', // Âmbar muito claro
  '#fed7aa', // Pêssego claro
  '#e7e5e4', // Bege neutro
  '#fafaf9', // Cinza muito claro
  '#f5f5f4', // Cinza suave

  // Sexta rodada: Cinzas claros e neutros
  '#f3f4f6', // Cinza muito claro
  '#e5e7eb', // Cinza claro
  '#d1d5db', // Cinza médio claro
  '#cbd5e1', // Cinza azulado claro
  '#e2e8f0', // Cinza azulado muito claro
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
