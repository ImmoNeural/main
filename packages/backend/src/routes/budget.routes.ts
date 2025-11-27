import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { authMiddleware } from '../middleware/auth.supabase.middleware';
import { normalizeToCategory, SUBCATEGORY_TO_CATEGORY_MAP, VALID_CATEGORIES } from '../services/categorization.service';

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
 * GET /api/budgets/:categoryName/:tipoCusto
 * Retorna o budget de uma categoria específica para um tipo de custo específico (fixo ou variavel)
 */
router.get('/:categoryName/:tipoCusto', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!;
    const { categoryName, tipoCusto } = req.params;

    const { data: budget, error } = await supabase
      .from('custom_budgets')
      .select('*')
      .eq('user_id', user_id)
      .eq('category_name', categoryName)
      .eq('tipo_custo', tipoCusto)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching budget:', error);
      throw error;
    }

    if (!budget) {
      return res.json({ category_name: categoryName, budget_value: null, tipo_custo: tipoCusto });
    }

    res.json({
      category_name: categoryName,
      budget_value: budget.budget_value,
      tipo_custo: budget.tipo_custo,
      id: budget.id
    });
  } catch (error) {
    console.error('Error fetching budget for category/tipo:', error);
    res.status(500).json({ error: 'Failed to fetch budget' });
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

    // tipo_custo é obrigatório agora
    const finalTipoCusto = tipo_custo || 'fixo';

    console.log(`💾 [BUDGET] Salvando budget para ${category_name} (${finalTipoCusto}): R$ ${budget_value.toFixed(2)}`);

    // Usar UPSERT para atualizar ou inserir
    const { data, error } = await supabase
      .from('custom_budgets')
      .upsert({
        user_id,
        category_name,
        budget_value,
        tipo_custo: finalTipoCusto,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,category_name,tipo_custo'
      })
      .select();

    if (error) {
      console.error('❌ [BUDGET] Erro no upsert:', error.message);
      console.error('❌ [BUDGET] Detalhes:', JSON.stringify(error));
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ [BUDGET] Salvo com sucesso:`, data);
    res.json({ success: true, category_name, budget_value, tipo_custo: finalTipoCusto, data });

  } catch (error: any) {
    console.error('❌ [BUDGET] Erro geral:', error.message || error);
    res.status(500).json({ error: error.message || 'Failed to save custom budget' });
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

/**
 * POST /api/budgets/cleanup
 * Remove subcategorias da tabela custom_budgets e normaliza para categorias
 *
 * LÓGICA:
 * 1. Busca todos os budgets do usuário
 * 2. Identifica quais têm subcategorias no category_name
 * 3. Agrupa por categoria normalizada, somando valores
 * 4. Deleta os budgets antigos com subcategorias
 * 5. Cria novos budgets com categorias corretas
 */
router.post('/cleanup', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!;

    console.log(`\n🧹 [CLEANUP] Iniciando limpeza de budgets para user ${user_id.substring(0, 8)}...`);

    // 1. Buscar todos os budgets do usuário
    const { data: budgets, error: fetchError } = await supabase
      .from('custom_budgets')
      .select('*')
      .eq('user_id', user_id);

    if (fetchError) {
      console.error('❌ [CLEANUP] Erro ao buscar budgets:', fetchError);
      throw fetchError;
    }

    if (!budgets || budgets.length === 0) {
      console.log('ℹ️ [CLEANUP] Nenhum budget encontrado');
      return res.json({ message: 'No budgets to clean', cleaned: 0 });
    }

    console.log(`📊 [CLEANUP] Encontrados ${budgets.length} budgets`);

    // 2. Separar budgets que têm subcategorias das que têm categorias
    const subcategoryBudgets: any[] = [];
    const categoryBudgets: any[] = [];

    budgets.forEach(budget => {
      const categoryName = budget.category_name;
      if (SUBCATEGORY_TO_CATEGORY_MAP[categoryName]) {
        // É uma subcategoria - precisa ser normalizada
        subcategoryBudgets.push(budget);
        console.log(`   🔄 Subcategoria encontrada: "${categoryName}" → "${SUBCATEGORY_TO_CATEGORY_MAP[categoryName]}"`);
      } else if (VALID_CATEGORIES.includes(categoryName)) {
        // É uma categoria válida - mantém
        categoryBudgets.push(budget);
      } else {
        // Não é nem subcategoria conhecida nem categoria válida
        // Pode ser categoria personalizada - mantém
        categoryBudgets.push(budget);
        console.log(`   ⚠️ Categoria desconhecida (mantendo): "${categoryName}"`);
      }
    });

    if (subcategoryBudgets.length === 0) {
      console.log('✅ [CLEANUP] Nenhuma subcategoria encontrada - tabela já está limpa');
      return res.json({ message: 'No subcategories found - table is clean', cleaned: 0 });
    }

    console.log(`🔍 [CLEANUP] Encontradas ${subcategoryBudgets.length} subcategorias para limpar`);

    // 3. Agrupar subcategorias por categoria normalizada
    const normalizedBudgets: Record<string, { fixo: number; variavel: number; noType: number }> = {};

    subcategoryBudgets.forEach(budget => {
      const normalizedCategory = normalizeToCategory(budget.category_name);
      if (!normalizedBudgets[normalizedCategory]) {
        normalizedBudgets[normalizedCategory] = { fixo: 0, variavel: 0, noType: 0 };
      }

      const value = budget.budget_value || 0;
      if (budget.tipo_custo === 'fixo') {
        normalizedBudgets[normalizedCategory].fixo += value;
      } else if (budget.tipo_custo === 'variavel') {
        normalizedBudgets[normalizedCategory].variavel += value;
      } else {
        normalizedBudgets[normalizedCategory].noType += value;
      }
    });

    console.log(`📋 [CLEANUP] Categorias normalizadas:`, Object.keys(normalizedBudgets));

    // 4. Deletar budgets com subcategorias
    const subcategoryIds = subcategoryBudgets.map(b => b.id);
    const { error: deleteError } = await supabase
      .from('custom_budgets')
      .delete()
      .in('id', subcategoryIds);

    if (deleteError) {
      console.error('❌ [CLEANUP] Erro ao deletar subcategorias:', deleteError);
      throw deleteError;
    }

    console.log(`🗑️ [CLEANUP] Deletados ${subcategoryIds.length} budgets com subcategorias`);

    // 5. Verificar budgets existentes para as categorias normalizadas e adicionar/atualizar
    let created = 0;
    let updated = 0;

    for (const [category, values] of Object.entries(normalizedBudgets)) {
      // Verificar se já existe budget para esta categoria
      const existingForCategory = categoryBudgets.filter(b => b.category_name === category);

      // Se tem valor sem tipo, distribuir entre fixo e variavel
      if (values.noType > 0) {
        values.fixo += values.noType / 2;
        values.variavel += values.noType / 2;
      }

      // Verificar se já existe fixo
      const existingFixo = existingForCategory.find(b => b.tipo_custo === 'fixo');
      if (existingFixo && values.fixo > 0) {
        // Atualizar valor existente somando
        await supabase
          .from('custom_budgets')
          .update({
            budget_value: existingFixo.budget_value + values.fixo,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingFixo.id);
        updated++;
        console.log(`   ✏️ Atualizado FIXO para ${category}: +R$ ${values.fixo.toFixed(2)}`);
      } else if (values.fixo > 0) {
        // Criar novo budget fixo
        await supabase.from('custom_budgets').insert({
          user_id,
          category_name: category,
          budget_value: values.fixo,
          tipo_custo: 'fixo',
        });
        created++;
        console.log(`   ➕ Criado FIXO para ${category}: R$ ${values.fixo.toFixed(2)}`);
      }

      // Verificar se já existe variavel
      const existingVariavel = existingForCategory.find(b => b.tipo_custo === 'variavel');
      if (existingVariavel && values.variavel > 0) {
        // Atualizar valor existente somando
        await supabase
          .from('custom_budgets')
          .update({
            budget_value: existingVariavel.budget_value + values.variavel,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingVariavel.id);
        updated++;
        console.log(`   ✏️ Atualizado VARIÁVEL para ${category}: +R$ ${values.variavel.toFixed(2)}`);
      } else if (values.variavel > 0) {
        // Criar novo budget variavel
        await supabase.from('custom_budgets').insert({
          user_id,
          category_name: category,
          budget_value: values.variavel,
          tipo_custo: 'variavel',
        });
        created++;
        console.log(`   ➕ Criado VARIÁVEL para ${category}: R$ ${values.variavel.toFixed(2)}`);
      }
    }

    console.log(`\n✅ [CLEANUP] Limpeza concluída!`);
    console.log(`   - Deletados: ${subcategoryIds.length} budgets com subcategorias`);
    console.log(`   - Criados: ${created} novos budgets com categorias`);
    console.log(`   - Atualizados: ${updated} budgets existentes`);

    res.json({
      message: 'Cleanup completed successfully',
      deleted: subcategoryIds.length,
      created,
      updated,
      normalizedCategories: Object.keys(normalizedBudgets),
    });

  } catch (error: any) {
    console.error('❌ [CLEANUP] Erro geral:', error.message || error);
    res.status(500).json({ error: error.message || 'Failed to cleanup budgets' });
  }
});

export default router;
