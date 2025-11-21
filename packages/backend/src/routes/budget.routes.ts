import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { authMiddleware } from '../middleware/auth.supabase.middleware';

const router = Router();

/**
 * GET /api/budgets
 * Retorna todos os budgets customizados do usuário
 * Agrupa por categoria e soma fixo + variável para o radar
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
 * Retorna o budget de uma categoria específica (soma fixo + variável se houver)
 */
router.get('/:categoryName', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!;
    const { categoryName } = req.params;

    const { data: budgets, error } = await supabase
      .from('custom_budgets')
      .select('*')
      .eq('user_id', user_id)
      .eq('category_name', categoryName);

    if (error) {
      console.error('Error fetching budget:', error);
      throw error;
    }

    if (!budgets || budgets.length === 0) {
      return res.json({ category_name: categoryName, budget_value: null });
    }

    // Soma todos os budgets da categoria (fixo + variável)
    const totalBudget = budgets.reduce((sum, b) => sum + (b.budget_value || 0), 0);

    res.json({ category_name: categoryName, budget_value: totalBudget, budgets });
  } catch (error) {
    console.error('Error fetching budget for category:', error);
    res.status(500).json({ error: 'Failed to fetch budget' });
  }
});

/**
 * POST /api/budgets
 * Cria ou atualiza um budget customizado
 * Verifica preferências para determinar se categoria é híbrida
 * Body: { category_name: string, budget_value: number, tipo_custo?: 'fixo' | 'variavel' }
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!;

    console.log(`\n📥 [BUDGET POST] Body recebido:`, JSON.stringify(req.body));

    const { category_name, budget_value, tipo_custo } = req.body;

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

    console.log(`\n💾 [BUDGET] ============================================`);
    console.log(`💾 [BUDGET] Salvando budget para ${category_name}`);
    console.log(`💾 [BUDGET] Valor recebido: ${budget_value} (tipo: ${typeof budget_value})`);
    console.log(`💾 [BUDGET] Valor formatado: R$ ${budget_value.toFixed(2)}`);
    console.log(`💾 [BUDGET] tipo_custo recebido: ${tipo_custo || 'não informado'}`);
    console.log(`💾 [BUDGET] ============================================`);

    // 1. Buscar preferências do usuário para esta categoria
    const { data: preferences, error: prefError } = await supabase
      .from('preferences')
      .select('tipo_custo')
      .eq('user_id', user_id)
      .eq('category', category_name);

    if (prefError) {
      console.error('Error fetching preferences:', prefError);
    }

    // 2. Determinar se categoria é híbrida
    const tiposNaCategoria = new Set(preferences?.map(p => p.tipo_custo) || []);
    const isHybrid = tiposNaCategoria.has('fixo') && tiposNaCategoria.has('variavel');

    console.log(`   Categoria ${category_name}: ${isHybrid ? 'HÍBRIDA' : 'NORMAL'} (tipos: ${[...tiposNaCategoria].join(', ') || 'nenhum definido'})`);

    // 3. Salvar budget(s) de acordo com o tipo
    if (isHybrid) {
      // Categoria híbrida: criar/atualizar DUAS linhas (50% cada)
      const valuePerType = budget_value / 2;

      console.log(`   Criando 2 linhas: FIXO R$ ${valuePerType.toFixed(2)} + VARIÁVEL R$ ${valuePerType.toFixed(2)}`);

      // Salvar linha FIXO
      const { error: errorFixo } = await supabase
        .from('custom_budgets')
        .upsert({
          user_id,
          category_name,
          budget_value: valuePerType,
          tipo_custo: 'fixo',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,category_name,tipo_custo' });

      if (errorFixo) {
        console.error('Error saving fixo budget:', errorFixo);
        throw errorFixo;
      }

      // Salvar linha VARIÁVEL
      const { error: errorVariavel } = await supabase
        .from('custom_budgets')
        .upsert({
          user_id,
          category_name,
          budget_value: valuePerType,
          tipo_custo: 'variavel',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,category_name,tipo_custo' });

      if (errorVariavel) {
        console.error('Error saving variavel budget:', errorVariavel);
        throw errorVariavel;
      }

      console.log(`✅ Budget híbrido salvo para ${category_name}\n`);
      res.json({ success: true, category_name, budget_value, isHybrid: true });

    } else {
      // Categoria normal: criar/atualizar UMA linha
      // Determinar tipo_custo: usar o informado, ou o único tipo da categoria, ou 'variavel' como default
      let finalTipoCusto = tipo_custo;
      if (!finalTipoCusto) {
        if (tiposNaCategoria.size === 1) {
          finalTipoCusto = [...tiposNaCategoria][0];
        } else {
          finalTipoCusto = 'variavel';
        }
      }

      console.log(`   Criando 1 linha: ${finalTipoCusto.toUpperCase()} R$ ${budget_value.toFixed(2)}`);

      // Primeiro, remover qualquer linha do outro tipo
      const outroTipo = finalTipoCusto === 'fixo' ? 'variavel' : 'fixo';
      await supabase
        .from('custom_budgets')
        .delete()
        .eq('user_id', user_id)
        .eq('category_name', category_name)
        .eq('tipo_custo', outroTipo);

      // Salvar a linha com o tipo correto
      const { error } = await supabase
        .from('custom_budgets')
        .upsert({
          user_id,
          category_name,
          budget_value,
          tipo_custo: finalTipoCusto,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,category_name,tipo_custo' });

      if (error) {
        console.error('Error saving budget:', error);
        throw error;
      }

      console.log(`✅ Budget normal salvo para ${category_name}\n`);
      res.json({ success: true, category_name, budget_value, tipo_custo: finalTipoCusto });
    }

  } catch (error) {
    console.error('Error saving custom budget:', error);
    res.status(500).json({ error: 'Failed to save custom budget' });
  }
});

/**
 * PUT /api/budgets/:categoryName
 * Atualiza budget(s) existente(s)
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

    // Buscar budgets existentes para esta categoria
    const { data: existingBudgets, error: fetchError } = await supabase
      .from('custom_budgets')
      .select('*')
      .eq('user_id', user_id)
      .eq('category_name', categoryName);

    if (fetchError) {
      console.error('Error fetching existing budgets:', fetchError);
      throw fetchError;
    }

    if (!existingBudgets || existingBudgets.length === 0) {
      return res.status(404).json({ error: 'Budget not found for this category' });
    }

    // Se tem 2 linhas (híbrida), divide o valor
    if (existingBudgets.length === 2) {
      const valuePerType = budget_value / 2;

      for (const budget of existingBudgets) {
        await supabase
          .from('custom_budgets')
          .update({ budget_value: valuePerType, updated_at: new Date().toISOString() })
          .eq('id', budget.id);
      }

      console.log(`💾 Budget híbrido atualizado para ${categoryName}: R$ ${budget_value.toFixed(2)} (${valuePerType.toFixed(2)} cada)`);
    } else {
      // Atualiza a única linha
      await supabase
        .from('custom_budgets')
        .update({ budget_value, updated_at: new Date().toISOString() })
        .eq('user_id', user_id)
        .eq('category_name', categoryName);

      console.log(`💾 Budget atualizado para ${categoryName}: R$ ${budget_value.toFixed(2)}`);
    }

    res.json({ success: true, category_name: categoryName, budget_value });
  } catch (error) {
    console.error('Error updating custom budget:', error);
    res.status(500).json({ error: 'Failed to update custom budget' });
  }
});

/**
 * DELETE /api/budgets/:categoryName
 * Remove todos os budgets de uma categoria
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

    console.log(`🗑️ Budget(s) deletado(s) para ${categoryName}`);
    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    console.error('Error deleting custom budget:', error);
    res.status(500).json({ error: 'Failed to delete custom budget' });
  }
});

export default router;
