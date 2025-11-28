import { supabase } from '../config/supabase';
import { normalizeToCategory } from './categorization.service';

/**
 * Sincroniza budgets com transações
 *
 * LÓGICA:
 * 1. Busca todas as categorias marcadas como 'hibrido' na tabela preferences
 * 2. Para cada categoria híbrida:
 *    - Se não existe em custom_budgets → cria 2 linhas (fixo + variavel)
 *    - Se existe 1 linha → adiciona a linha faltante
 *    - Se já existem 2 linhas → não faz nada
 * 3. Para categorias normais com transações: cria 1 linha se não existir
 */
export async function syncBudgetsWithTransactions(user_id: string): Promise<void> {
  console.log(`\n🔄 [SYNC BUDGETS] Iniciando sincronização para user ${user_id}`);

  try {
    // 1. Buscar todas as transações do usuário (últimos 12 meses) para calcular médias
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('category, amount, date')
      .eq('user_id', user_id)
      .lt('amount', 0); // Apenas despesas

    if (txError) {
      console.error('❌ [SYNC] Erro ao buscar transações:', txError.message);
      return;
    }

    // 2. Calcular média mensal por categoria (NORMALIZADA para evitar subcategorias)
    const categoryTotals: Record<string, { total: number; months: Set<string> }> = {};

    (transactions || []).forEach(tx => {
      // ⚠️ NORMALIZAR: converter subcategorias para categorias
      const category = normalizeToCategory(tx.category);
      if (!category || category === 'Não Categorizado') return;

      const dateStr = typeof tx.date === 'number'
        ? new Date(tx.date).toISOString().substring(0, 7)
        : String(tx.date).substring(0, 7);
      const amount = Math.abs(tx.amount);

      if (!categoryTotals[category]) {
        categoryTotals[category] = { total: 0, months: new Set() };
      }

      categoryTotals[category].total += amount;
      categoryTotals[category].months.add(dateStr);
    });

    const categoryAverages: Record<string, number> = {};
    for (const [category, data] of Object.entries(categoryTotals)) {
      const monthCount = Math.max(data.months.size, 1);
      categoryAverages[category] = Math.round(data.total / monthCount);
    }

    console.log(`📊 [SYNC] Médias calculadas para ${Object.keys(categoryAverages).length} categorias`);

    // 3. Buscar budgets existentes
    const { data: existingBudgets, error: budgetError } = await supabase
      .from('custom_budgets')
      .select('*')
      .eq('user_id', user_id);

    if (budgetError) {
      console.error('❌ [SYNC] Erro ao buscar budgets:', budgetError.message);
      return;
    }

    // Mapear budgets existentes por categoria (NORMALIZADA)
    const budgetsByCategory: Record<string, any[]> = {};
    existingBudgets?.forEach(b => {
      // ⚠️ NORMALIZAR: converter subcategorias para categorias
      const normalizedCategory = normalizeToCategory(b.category_name);
      if (!budgetsByCategory[normalizedCategory]) {
        budgetsByCategory[normalizedCategory] = [];
      }
      budgetsByCategory[normalizedCategory].push(b);
    });

    // 4. Buscar preferências - encontrar categorias HÍBRIDAS
    const { data: preferences, error: prefError } = await supabase
      .from('preferences')
      .select('category, subcategory, tipo_custo, tipo_categoria')
      .eq('user_id', user_id);

    if (prefError) {
      console.log('⚠️ [SYNC] Tabela preferences não encontrada ou erro:', prefError.message);
    }

    // Identificar categorias híbridas (onde tipo_categoria = 'hibrido')
    // ⚠️ NORMALIZAR: converter subcategorias para categorias
    const hybridCategories = new Set<string>();
    preferences?.forEach(p => {
      if (p.tipo_categoria === 'hibrido') {
        hybridCategories.add(normalizeToCategory(p.category));
      }
    });

    console.log(`🔀 [SYNC] Categorias híbridas encontradas: ${[...hybridCategories].join(', ') || 'nenhuma'}`);

    // 5. PROCESSAR CATEGORIAS HÍBRIDAS
    for (const category of hybridCategories) {
      const existingForCategory = budgetsByCategory[category] || [];
      const avgValue = categoryAverages[category] || 0;
      const valuePerType = Math.round(avgValue / 2);

      console.log(`\n📂 [SYNC] Processando categoria HÍBRIDA: ${category}`);
      console.log(`   Média: R$ ${avgValue.toFixed(2)}, Linhas existentes: ${existingForCategory.length}`);
      console.log(`   Linhas encontradas:`, existingForCategory.map(b => ({ id: b.id, tipo_custo: b.tipo_custo, budget_value: b.budget_value })));

      const hasFixo = existingForCategory.some(b => b.tipo_custo === 'fixo');
      const hasVariavel = existingForCategory.some(b => b.tipo_custo === 'variavel');
      console.log(`   hasFixo: ${hasFixo}, hasVariavel: ${hasVariavel}`);

      // CASO 1: Não existe nenhuma linha → criar 2 (fixo + variavel) com valor ZERO
      // ALTERADO: Não calcular média, usar 0 como valor inicial (usuário define depois)
      if (existingForCategory.length === 0) {
        console.log(`   ➕ CASO 1: Criando 2 linhas (categoria não existia) com valor 0`);

        // ⚠️ SEMPRE usar categoria normalizada ao inserir
        const normalizedCategory = normalizeToCategory(category);

        const { error: err1 } = await supabase.from('custom_budgets').insert({
          user_id,
          category_name: normalizedCategory,
          budget_value: 0, // ALTERADO: Usar 0 ao invés de média
          tipo_custo: 'fixo',
        });
        if (err1) {
          console.error(`      ❌ Erro ao criar FIXO:`, err1.message);
        } else {
          console.log(`      ✅ Criado FIXO: R$ 0.00`);
        }

        const { error: err2 } = await supabase.from('custom_budgets').insert({
          user_id,
          category_name: normalizedCategory,
          budget_value: 0, // ALTERADO: Usar 0 ao invés de média
          tipo_custo: 'variavel',
        });
        if (err2) {
          console.error(`      ❌ Erro ao criar VARIÁVEL:`, err2.message);
        } else {
          console.log(`      ✅ Criado VARIÁVEL: R$ 0.00`);
        }

      // CASO 2: Existe 1 linha
      } else if (existingForCategory.length === 1) {
        const existingBudget = existingForCategory[0];
        const existingValue = existingBudget.budget_value;
        const existingTipo = existingBudget.tipo_custo;
        console.log(`   ➕ CASO 2: Existe 1 linha (tipo=${existingTipo}, valor=${existingValue})`);

        // Se valor = 0 ou null → manter 0 e criar outra linha com 0
        // ALTERADO: Não calcular média, manter 0
        if (!existingValue || existingValue === 0) {
          console.log(`      Valor é 0 - mantendo 0 e criando segunda com 0`);

          // Criar a segunda (variavel) com valor 0
          // ⚠️ SEMPRE usar categoria normalizada ao inserir
          const normalizedCategory = normalizeToCategory(category);
          const tipoFaltante = existingTipo === 'fixo' ? 'variavel' : 'fixo';
          const { error: errInsert } = await supabase.from('custom_budgets').insert({
            user_id,
            category_name: normalizedCategory,
            budget_value: 0, // ALTERADO: Usar 0
            tipo_custo: tipoFaltante,
          });
          if (errInsert) {
            console.error(`      ❌ Erro ao criar ${tipoFaltante.toUpperCase()}:`, errInsert.message);
          } else {
            console.log(`      ✅ Criado ${tipoFaltante.toUpperCase()}: R$ 0.00`);
          }

        } else {
          // Se já tem valor → NÃO mexer no valor, criar outra com MESMO valor
          console.log(`      Valor existe (${existingValue}) - criando segunda com mesmo valor`);

          // Determinar qual tipo falta
          const tipoFaltante = existingTipo === 'fixo' ? 'variavel' : 'fixo';
          console.log(`      Tipo faltante: ${tipoFaltante}`);

          // ⚠️ SEMPRE usar categoria normalizada ao inserir
          const normalizedCat = normalizeToCategory(category);
          const { error: errInsert } = await supabase.from('custom_budgets').insert({
            user_id,
            category_name: normalizedCat,
            budget_value: existingValue,
            tipo_custo: tipoFaltante,
          });
          if (errInsert) {
            console.error(`      ❌ Erro ao criar ${tipoFaltante.toUpperCase()}:`, errInsert.message);
          } else {
            console.log(`      ✅ Criado ${tipoFaltante.toUpperCase()}: R$ ${existingValue.toFixed(2)} (mesmo valor)`);
          }
        }

      // CASO 3: Já existem 2+ linhas com fixo E variavel
      } else if (hasFixo && hasVariavel) {
        console.log(`   ✓ CASO 3: Já possui 2 linhas (fixo + variavel) - nenhuma ação necessária`);
        // ALTERADO: NÃO atualizar budgets com valor 0 automaticamente
        // O usuário deve definir o budget manualmente

      // CASO 4: Existem linhas mas falta fixo ou variavel
      } else {
        console.log(`   ➕ CASO 4: Completando linhas faltantes`);

        // ALTERADO: Usar 0 como fallback ao invés de média - usuário define o budget
        const existingValue = existingForCategory[0]?.budget_value || 0;
        // ⚠️ SEMPRE usar categoria normalizada ao inserir
        const normalizedCat = normalizeToCategory(category);

        if (!hasFixo) {
          const { error: errInsert } = await supabase.from('custom_budgets').insert({
            user_id,
            category_name: normalizedCat,
            budget_value: existingValue,
            tipo_custo: 'fixo',
          });
          if (errInsert) {
            console.error(`      ❌ Erro ao criar FIXO:`, errInsert.message);
          } else {
            console.log(`      ✅ Criado FIXO: R$ ${existingValue.toFixed(2)}`);
          }
        }

        if (!hasVariavel) {
          const { error: errInsert } = await supabase.from('custom_budgets').insert({
            user_id,
            category_name: normalizedCat,
            budget_value: existingValue,
            tipo_custo: 'variavel',
          });
          if (errInsert) {
            console.error(`      ❌ Erro ao criar VARIÁVEL:`, errInsert.message);
          } else {
            console.log(`      ✅ Criado VARIÁVEL: R$ ${existingValue.toFixed(2)}`);
          }
        }
      }
    }

    // 6. PROCESSAR CATEGORIAS NORMAIS (não híbridas) que têm transações
    for (const [category, avgValue] of Object.entries(categoryAverages)) {
      // ⚠️ category já está normalizado porque categoryAverages foi construído com normalizeToCategory
      // Pular se é categoria híbrida (já foi processada)
      if (hybridCategories.has(category)) {
        continue;
      }

      const existingForCategory = budgetsByCategory[category] || [];

      // Se não existe nenhuma linha, criar uma com valor 0
      // ALTERADO: Não calcular média, usar 0 (usuário define depois)
      if (existingForCategory.length === 0) {
        console.log(`\n📂 [SYNC] Processando categoria NORMAL: ${category}`);
        console.log(`   ➕ Criando linha com valor 0 (usuário define o budget)`);

        // ⚠️ SEMPRE usar categoria normalizada ao inserir (garantia extra)
        const normalizedCat = normalizeToCategory(category);
        await supabase.from('custom_budgets').insert({
          user_id,
          category_name: normalizedCat,
          budget_value: 0, // ALTERADO: Usar 0 ao invés de média
        });

      // Se existe 1 linha sem valor, NÃO atualizar automaticamente
      // ALTERADO: Deixar o usuário definir o budget
      } else if (existingForCategory.length === 1) {
        const budget = existingForCategory[0];
        if (!budget.budget_value || budget.budget_value === 0) {
          console.log(`\n📂 [SYNC] Categoria NORMAL ${category} sem budget definido - aguardando usuário`);
          // ALTERADO: Não atualizar automaticamente com média
        }
      }
      // Se já tem valor, não mexer
    }

    console.log(`\n✅ [SYNC BUDGETS] Sincronização concluída!\n`);

  } catch (error: any) {
    console.error('❌ [SYNC BUDGETS] Erro geral:', error.message || error);
  }
}
