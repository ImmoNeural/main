import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { authMiddleware } from '../middleware/auth.supabase.middleware';

const router = Router();

interface PreferenceItem {
  category: string;
  subcategory: string;
  tipo_custo: 'fixo' | 'variavel';
  tipo_categoria: 'hibrido' | 'normal';
}

/**
 * GET /api/preferences
 * Retorna todas as preferências do usuário
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!;

    const { data: preferences, error } = await supabase
      .from('preferences')
      .select('*')
      .eq('user_id', user_id)
      .order('category', { ascending: true });

    if (error) {
      console.error('Error fetching preferences:', error);
      throw error;
    }

    res.json(preferences || []);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

/**
 * POST /api/preferences
 * Salva todas as preferências do usuário e sincroniza com custom_budgets
 * Body: { preferences: PreferenceItem[] }
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!;
    const { preferences } = req.body as { preferences: PreferenceItem[] };

    if (!Array.isArray(preferences)) {
      return res.status(400).json({ error: 'preferences must be an array' });
    }

    console.log(`\n📝 [PREFERENCES] Salvando ${preferences.length} preferências para user ${user_id.substring(0, 8)}...`);

    // 1. Deletar preferências antigas do usuário
    const { error: deleteError } = await supabase
      .from('preferences')
      .delete()
      .eq('user_id', user_id);

    if (deleteError) {
      console.error('Error deleting old preferences:', deleteError);
      throw deleteError;
    }

    // 2. Inserir novas preferências
    const prefsToInsert = preferences.map(pref => ({
      user_id,
      category: pref.category,
      subcategory: pref.subcategory,
      tipo_custo: pref.tipo_custo,
      tipo_categoria: pref.tipo_categoria,
    }));

    const { error: insertError } = await supabase
      .from('preferences')
      .insert(prefsToInsert);

    if (insertError) {
      console.error('Error inserting preferences:', insertError);
      throw insertError;
    }

    // 3. Identificar categorias híbridas (tem subcategorias fixo E variavel)
    const categoryTypes = new Map<string, Set<string>>();
    preferences.forEach(pref => {
      if (!categoryTypes.has(pref.category)) {
        categoryTypes.set(pref.category, new Set());
      }
      categoryTypes.get(pref.category)!.add(pref.tipo_custo);
    });

    const hybridCategories: string[] = [];
    const normalCategories: Map<string, 'fixo' | 'variavel'> = new Map();

    categoryTypes.forEach((tipos, category) => {
      if (tipos.has('fixo') && tipos.has('variavel')) {
        hybridCategories.push(category);
      } else {
        normalCategories.set(category, tipos.has('fixo') ? 'fixo' : 'variavel');
      }
    });

    console.log(`🔀 [PREFERENCES] Categorias híbridas: ${hybridCategories.join(', ') || 'nenhuma'}`);

    // 4. Buscar budgets existentes
    const { data: existingBudgets, error: budgetsError } = await supabase
      .from('custom_budgets')
      .select('*')
      .eq('user_id', user_id);

    if (budgetsError) {
      console.error('Error fetching existing budgets:', budgetsError);
      throw budgetsError;
    }

    // 5. Buscar transações dos últimos 12 meses para calcular médias
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('category, amount, date')
      .eq('user_id', user_id)
      .eq('type', 'debit')
      .gte('date', twelveMonthsAgo.toISOString());

    if (txError) {
      console.error('Error fetching transactions:', txError);
    }

    // Calcular média mensal por categoria
    const categoryMonthlyTotals: Record<string, Record<string, number>> = {};

    transactions?.forEach(tx => {
      if (!tx.category || tx.amount >= 0) return; // Apenas débitos (valores negativos)

      const month = tx.date.substring(0, 7); // YYYY-MM
      const amount = Math.abs(tx.amount);

      if (!categoryMonthlyTotals[tx.category]) {
        categoryMonthlyTotals[tx.category] = {};
      }
      if (!categoryMonthlyTotals[tx.category][month]) {
        categoryMonthlyTotals[tx.category][month] = 0;
      }
      categoryMonthlyTotals[tx.category][month] += amount;
    });

    // Calcular média mensal
    const categoryAverages: Record<string, number> = {};
    Object.entries(categoryMonthlyTotals).forEach(([category, months]) => {
      const values = Object.values(months);
      if (values.length > 0) {
        categoryAverages[category] = values.reduce((a, b) => a + b, 0) / values.length;
      }
    });

    console.log(`📊 [PREFERENCES] Médias mensais calculadas para ${Object.keys(categoryAverages).length} categorias`);

    // 6. Para categorias HÍBRIDAS, garantir que existam DUAS linhas em custom_budgets
    for (const category of hybridCategories) {
      const existingForCategory = existingBudgets?.filter(b => b.category_name === category) || [];
      const hasFixo = existingForCategory.some(b => b.tipo_custo === 'fixo');
      const hasVariavel = existingForCategory.some(b => b.tipo_custo === 'variavel');

      // Calcular valor base: usar budget existente ou média mensal
      let baseValue = 0;
      if (existingForCategory.length > 0) {
        // Soma os valores existentes
        baseValue = existingForCategory.reduce((sum, b) => sum + (b.budget_value || 0), 0);
      } else if (categoryAverages[category]) {
        // Usar média mensal das transações
        baseValue = categoryAverages[category];
      }

      // Se não tem as duas linhas, criar
      if (!hasFixo || !hasVariavel) {
        // Dividir o valor entre fixo e variável (50% cada)
        const valuePerType = baseValue / 2;

        if (!hasFixo) {
          console.log(`  ➕ Criando linha FIXO para ${category} (valor: R$ ${valuePerType.toFixed(2)})`);
          const { error } = await supabase.from('custom_budgets').upsert({
            user_id,
            category_name: category,
            tipo_custo: 'fixo',
            budget_value: valuePerType,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,category_name,tipo_custo' });
          if (error) console.error(`Error creating fixo for ${category}:`, error);
        }

        if (!hasVariavel) {
          console.log(`  ➕ Criando linha VARIÁVEL para ${category} (valor: R$ ${valuePerType.toFixed(2)})`);
          const { error } = await supabase.from('custom_budgets').upsert({
            user_id,
            category_name: category,
            tipo_custo: 'variavel',
            budget_value: valuePerType,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,category_name,tipo_custo' });
          if (error) console.error(`Error creating variavel for ${category}:`, error);
        }
      }
    }

    // 7. Para categorias NÃO híbridas, garantir que só existe UMA linha com o tipo correto
    for (const [category, tipoCorreto] of normalCategories.entries()) {
      const tipoErrado = tipoCorreto === 'fixo' ? 'variavel' : 'fixo';
      const existingForCategory = existingBudgets?.filter(b => b.category_name === category) || [];

      // Remover linha com tipo errado se existir
      await supabase
        .from('custom_budgets')
        .delete()
        .eq('user_id', user_id)
        .eq('category_name', category)
        .eq('tipo_custo', tipoErrado);

      // Se tem budget existente, atualizar o tipo
      if (existingForCategory.length > 0) {
        // Mover o valor para o tipo correto
        const totalValue = existingForCategory.reduce((sum, b) => sum + (b.budget_value || 0), 0);

        await supabase.from('custom_budgets').upsert({
          user_id,
          category_name: category,
          tipo_custo: tipoCorreto,
          budget_value: totalValue,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,category_name,tipo_custo' });

        console.log(`  🔄 ${category}: tipo atualizado para ${tipoCorreto} (R$ ${totalValue.toFixed(2)})`);
      } else {
        // NÃO tem budget existente - CRIAR com média mensal ou 0
        const averageValue = categoryAverages[category] || 0;

        if (averageValue > 0) {
          console.log(`  ➕ Criando budget para ${category} (${tipoCorreto}): R$ ${averageValue.toFixed(2)} (média mensal)`);

          const { error } = await supabase.from('custom_budgets').upsert({
            user_id,
            category_name: category,
            tipo_custo: tipoCorreto,
            budget_value: averageValue,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,category_name,tipo_custo' });

          if (error) console.error(`Error creating budget for ${category}:`, error);
        } else {
          console.log(`  ⚠️ ${category}: sem transações históricas, budget não criado`);
        }
      }
    }

    console.log(`✅ [PREFERENCES] Preferências salvas e budgets sincronizados!\n`);

    res.json({ success: true, hybridCategories });
  } catch (error) {
    console.error('Error saving preferences:', error);
    res.status(500).json({ error: 'Failed to save preferences' });
  }
});

/**
 * GET /api/preferences/categories
 * Retorna o tipo de cada categoria (hibrido ou normal) baseado nas preferências
 */
router.get('/categories', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!;

    const { data: preferences, error } = await supabase
      .from('preferences')
      .select('category, tipo_custo')
      .eq('user_id', user_id);

    if (error) {
      console.error('Error fetching preferences:', error);
      throw error;
    }

    // Agrupar por categoria e determinar tipo
    const categoryTypes: Record<string, 'hibrido' | 'normal'> = {};
    const categoryTipos: Record<string, Set<string>> = {};

    preferences?.forEach(pref => {
      if (!categoryTipos[pref.category]) {
        categoryTipos[pref.category] = new Set();
      }
      categoryTipos[pref.category].add(pref.tipo_custo);
    });

    Object.entries(categoryTipos).forEach(([category, tipos]) => {
      categoryTypes[category] = (tipos.has('fixo') && tipos.has('variavel')) ? 'hibrido' : 'normal';
    });

    res.json(categoryTypes);
  } catch (error) {
    console.error('Error fetching category types:', error);
    res.status(500).json({ error: 'Failed to fetch category types' });
  }
});

export default router;
