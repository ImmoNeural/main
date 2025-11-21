import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { authMiddleware } from '../middleware/auth.supabase.middleware';

const router = Router();

/**
 * GET /api/budgets
 * Retorna todos os budgets customizados do usuário
 * Agora agrupa por categoria e soma fixo + variável para o radar
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!;

    const { data: budgets, error } = await supabase
      .from('custom_budgets')
      .select('*')
      .eq('user_id', user_id)
      .order('category_name', { ascending: true });

    if (error) {
      console.error('Error fetching budgets:', error);
      throw error;
    }

    // Converter para o formato { [category_name]: budget_value }
    // Se categoria tem fixo E variável, soma os dois para o total
    const budgetsMap = budgets?.reduce((acc, budget) => {
      const categoryName = budget.category_name;
      const currentValue = acc[categoryName] || 0;
      acc[categoryName] = currentValue + (budget.budget_value || 0);
      return acc;
    }, {} as Record<string, number>) || {};

    res.json(budgetsMap);
  } catch (error) {
    console.error('Error fetching custom budgets:', error);
    res.status(500).json({ error: 'Failed to fetch custom budgets' });
  }
});

/**
 * GET /api/budgets/detailed
 * Retorna todos os budgets COM detalhes de tipo_custo (fixo/variável)
 */
router.get('/detailed', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!;

    const { data: budgets, error } = await supabase
      .from('custom_budgets')
      .select('*')
      .eq('user_id', user_id)
      .order('category_name', { ascending: true });

    if (error) {
      console.error('Error fetching budgets:', error);
      throw error;
    }

    res.json(budgets || []);
  } catch (error) {
    console.error('Error fetching detailed budgets:', error);
    res.status(500).json({ error: 'Failed to fetch detailed budgets' });
  }
});

/**
 * GET /api/budgets/:categoryName
 * Retorna o budget de uma categoria específica
 */
router.get('/:categoryName', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!;
    const { categoryName } = req.params;

    const { data: budget, error } = await supabase
      .from('custom_budgets')
      .select('*')
      .eq('user_id', user_id)
      .eq('category_name', categoryName)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found - retornar null
        return res.json({ category_name: categoryName, budget_value: null });
      }
      console.error('Error fetching budget:', error);
      throw error;
    }

    res.json(budget);
  } catch (error) {
    console.error('Error fetching budget for category:', error);
    res.status(500).json({ error: 'Failed to fetch budget' });
  }
});

/**
 * POST /api/budgets
 * Cria ou atualiza um budget customizado
 * Body: { category_name: string, budget_value: number, tipo_custo?: 'fixo' | 'variavel', subcategory?: string }
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!;
    const { category_name, budget_value, tipo_custo = 'variavel', subcategory } = req.body;

    // Validação
    if (!category_name || typeof category_name !== 'string') {
      return res.status(400).json({ error: 'category_name is required and must be a string' });
    }

    if (budget_value === undefined || budget_value === null || typeof budget_value !== 'number') {
      return res.status(400).json({ error: 'budget_value is required and must be a number' });
    }

    if (budget_value < 0) {
      return res.status(400).json({ error: 'budget_value must be non-negative' });
    }

    if (tipo_custo && !['fixo', 'variavel'].includes(tipo_custo)) {
      return res.status(400).json({ error: 'tipo_custo must be "fixo" or "variavel"' });
    }

    // Upsert (inserir ou atualizar se já existir)
    // Agora a chave única é: user_id + category_name + tipo_custo
    const { data, error } = await supabase
      .from('custom_budgets')
      .upsert(
        {
          user_id,
          category_name,
          budget_value,
          tipo_custo: tipo_custo || 'variavel',
          subcategory: subcategory || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,category_name,tipo_custo',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error saving budget:', error);
      throw error;
    }

    console.log(`💾 Budget saved for user ${user_id.substring(0, 8)}..., category: ${category_name} (${tipo_custo}), value: R$ ${budget_value.toFixed(2)}`);

    res.json(data);
  } catch (error) {
    console.error('Error saving custom budget:', error);
    res.status(500).json({ error: 'Failed to save custom budget' });
  }
});

/**
 * PUT /api/budgets/:categoryName
 * Atualiza um budget existente
 * Body: { budget_value: number }
 */
router.put('/:categoryName', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!;
    const { categoryName } = req.params;
    const { budget_value } = req.body;

    // Validação
    if (budget_value === undefined || budget_value === null || typeof budget_value !== 'number') {
      return res.status(400).json({ error: 'budget_value is required and must be a number' });
    }

    if (budget_value < 0) {
      return res.status(400).json({ error: 'budget_value must be non-negative' });
    }

    const { data, error } = await supabase
      .from('custom_budgets')
      .update({
        budget_value,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user_id)
      .eq('category_name', categoryName)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Budget not found for this category' });
      }
      console.error('Error updating budget:', error);
      throw error;
    }

    console.log(`💾 Budget updated for user ${user_id.substring(0, 8)}..., category: ${categoryName}, value: R$ ${budget_value.toFixed(2)}`);

    res.json(data);
  } catch (error) {
    console.error('Error updating custom budget:', error);
    res.status(500).json({ error: 'Failed to update custom budget' });
  }
});

/**
 * DELETE /api/budgets/:categoryName
 * Remove um budget customizado (volta para o budget padrão/sugerido)
 */
router.delete('/:categoryName', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!;
    const { categoryName } = req.params;

    const { error } = await supabase
      .from('custom_budgets')
      .delete()
      .eq('user_id', user_id)
      .eq('category_name', categoryName);

    if (error) {
      console.error('Error deleting budget:', error);
      throw error;
    }

    console.log(`🗑️ Budget deleted for user ${user_id.substring(0, 8)}..., category: ${categoryName}`);

    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    console.error('Error deleting custom budget:', error);
    res.status(500).json({ error: 'Failed to delete custom budget' });
  }
});

export default router;
