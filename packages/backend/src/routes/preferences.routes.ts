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
    categoryTypes.forEach((tipos, category) => {
      if (tipos.has('fixo') && tipos.has('variavel')) {
        hybridCategories.push(category);
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

    // 5. Para categorias híbridas, garantir que existam duas linhas em custom_budgets
    for (const category of hybridCategories) {
      const existingForCategory = existingBudgets?.filter(b => b.category_name === category) || [];
      const hasFixo = existingForCategory.some(b => b.tipo_custo === 'fixo');
      const hasVariavel = existingForCategory.some(b => b.tipo_custo === 'variavel');

      // Se categoria tem budget mas não tem as duas linhas, criar a faltante
      if (existingForCategory.length > 0) {
        const existingValue = existingForCategory[0].budget_value || 0;

        if (!hasFixo) {
          console.log(`  ➕ Criando linha FIXO para ${category} (valor: R$ ${(existingValue / 2).toFixed(2)})`);
          await supabase.from('custom_budgets').upsert({
            user_id,
            category_name: category,
            tipo_custo: 'fixo',
            budget_value: existingValue / 2, // Dividir valor existente
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,category_name,tipo_custo' });
        }

        if (!hasVariavel) {
          console.log(`  ➕ Criando linha VARIÁVEL para ${category} (valor: R$ ${(existingValue / 2).toFixed(2)})`);
          await supabase.from('custom_budgets').upsert({
            user_id,
            category_name: category,
            tipo_custo: 'variavel',
            budget_value: existingValue / 2, // Dividir valor existente
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,category_name,tipo_custo' });
        }
      }
      // Se não tem budget ainda, será calculado pela média quando o usuário for na página de budgets
    }

    // 6. Para categorias NÃO híbridas, garantir que só existe UMA linha com o tipo correto
    for (const [category, tipos] of categoryTypes.entries()) {
      if (hybridCategories.includes(category)) continue; // Pular híbridas

      const tipoCorreto = tipos.has('fixo') ? 'fixo' : 'variavel';
      const tipoErrado = tipoCorreto === 'fixo' ? 'variavel' : 'fixo';

      // Remover linha com tipo errado se existir
      const { error: deleteWrongError } = await supabase
        .from('custom_budgets')
        .delete()
        .eq('user_id', user_id)
        .eq('category_name', category)
        .eq('tipo_custo', tipoErrado);

      if (deleteWrongError) {
        console.error(`Error removing wrong tipo for ${category}:`, deleteWrongError);
      }

      // Atualizar tipo da linha existente se necessário
      const { error: updateError } = await supabase
        .from('custom_budgets')
        .update({ tipo_custo: tipoCorreto, updated_at: new Date().toISOString() })
        .eq('user_id', user_id)
        .eq('category_name', category);

      if (updateError && updateError.code !== 'PGRST116') {
        console.error(`Error updating tipo for ${category}:`, updateError);
      }
    }

    console.log(`✅ [PREFERENCES] Preferências salvas com sucesso!\n`);

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
