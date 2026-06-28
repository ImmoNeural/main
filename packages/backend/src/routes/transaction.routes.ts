import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import categorizationService, { UserCategorizationHistory } from '../services/categorization.service';
import openaiService from '../services/openai.service';
import { syncBudgetsWithTransactions } from '../services/budget.service';
// authMiddleware removido - já é aplicado no app.ts
import { Transaction } from '../types';

const router = Router();

/**
 * Converte timestamp em milissegundos para formato ISO string (para TIMESTAMPTZ do PostgreSQL)
 */
function toISOString(timestamp: number | undefined): string | null {
  if (!timestamp) return null;
  return new Date(timestamp).toISOString();
}

/**
 * GET /api/transactions
 * Lista transações com filtros opcionais
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!; // Obtido do token JWT
    const {
      account_id,
      category,
      type,
      start_date,
      end_date,
      limit = '100',
      offset = '0',
    } = req.query;

    // Construir query base com JOIN
    let query = supabase
      .from('transactions')
      .select('*, bank_accounts!inner(user_id)', { count: 'exact' })
      .eq('bank_accounts.user_id', user_id);

    // Aplicar filtros
    if (account_id) {
      query = query.eq('account_id', account_id as string);
    }

    if (category) {
      query = query.eq('category', category as string);
    }

    if (type) {
      query = query.eq('type', type as string);
    }

    if (start_date) {
      query = query.gte('date', new Date(start_date as string).getTime());
    }

    if (end_date) {
      query = query.lte('date', new Date(end_date as string).getTime());
    }

    // Ordenar e paginar
    const limitNum = Number(limit);
    const offsetNum = Number(offset);
    query = query
      .order('date', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    const { data: transactions, error, count } = await query;

    if (error) {
      throw error;
    }

    // Buscar initial_balance da conta bancária do usuário
    const { data: accounts } = await supabase
      .from('bank_accounts')
      .select('initial_balance, initial_balance_date')
      .eq('user_id', user_id)
      .eq('status', 'active')
      .limit(1)
      .single();

    res.json({
      transactions: transactions || [],
      total: count || 0,
      limit: limitNum,
      offset: offsetNum,
      initial_balance: accounts?.initial_balance || null,
      initial_balance_date: accounts?.initial_balance_date || null,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

/**
 * GET /api/transactions/:id
 * Busca uma transação específica
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: transaction, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

/**
 * POST /api/transactions/:id/find-similar
 * Busca transações similares baseadas no merchant/descrição
 */
router.post('/:id/find-similar', async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!;
    const { id } = req.params;

    // Buscar a transação original
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*, bank_accounts!inner(user_id)')
      .eq('id', id)
      .eq('bank_accounts.user_id', user_id)
      .single();

    if (fetchError || !transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Buscar transações similares (mesmo merchant ou descrição parecida)
    // Excluir a transação original
    let similarTransactions: Transaction[] = [];

    if (transaction.merchant) {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, bank_accounts!inner(user_id)')
        .eq('bank_accounts.user_id', user_id)
        .neq('id', id)
        .eq('merchant', transaction.merchant)
        .order('date', { ascending: false })
        .limit(50);

      if (!error && data) {
        similarTransactions = data as Transaction[];
      }
    }

    // Se não encontrou por merchant, buscar por descrição similar
    if (similarTransactions.length === 0 && transaction.description) {
      const descWords = transaction.description.toLowerCase().split(' ').filter((w: string) => w.length > 3);
      if (descWords.length > 0) {
        const searchPattern = `%${descWords[0]}%`;
        const { data, error } = await supabase
          .from('transactions')
          .select('*, bank_accounts!inner(user_id)')
          .eq('bank_accounts.user_id', user_id)
          .neq('id', id)
          .or(`description.ilike.${searchPattern},merchant.ilike.${searchPattern}`)
          .order('date', { ascending: false })
          .limit(50);

        if (!error && data) {
          similarTransactions = data as Transaction[];
        }
      }
    }

    res.json({
      transaction,
      similar: similarTransactions,
      count: similarTransactions.length,
    });
  } catch (error) {
    console.error('Error finding similar transactions:', error);
    res.status(500).json({ error: 'Failed to find similar transactions' });
  }
});

/**
 * PATCH /api/transactions/:id/category
 * Atualiza a categoria de uma transação
 * APRENDIZADO: Salva padrão no histórico do usuário e global
 */
router.patch('/:id/category', async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!;
    const { id } = req.params;
    const { category, subcategory } = req.body;

    if (!category) {
      return res.status(400).json({ error: 'category is required' });
    }

    // Verificar se transação existe e pertence ao usuário
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*, bank_accounts!inner(user_id)')
      .eq('id', id)
      .eq('bank_accounts.user_id', user_id)
      .single();

    if (fetchError || !transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Atualizar categoria, subcategoria e marcar como categorizado manualmente
    const updateData: any = {
      category,
      manually_categorized: true,
      updated_at: toISOString(Date.now())
    };
    if (subcategory !== undefined) {
      updateData.subcategory = subcategory;
    }

    const { data: updated, error: updateError } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // 🧠 APRENDIZADO: Salvar padrão para uso futuro
    const descriptionPattern = categorizationService.extractDescriptionPattern(
      transaction.description || ''
    );

    if (descriptionPattern && descriptionPattern.length >= 3) {
      // Salvar no histórico do usuário (Camada 2A)
      try {
        await supabase
          .from('user_category_preferences')
          .upsert({
            user_id,
            description_pattern: descriptionPattern,
            category,
            subcategory: subcategory || null,
            usage_count: 1,
            last_used_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,description_pattern',
            ignoreDuplicates: false
          });
      } catch (prefError) {
        console.warn('⚠️ Failed to save user preference:', prefError);
      }

      // Salvar no padrão global (Camada 2B)
      try {
        // Tentar INSERT/UPDATE manual (mais seguro que RPC)
        const { data: existing } = await supabase
          .from('global_category_patterns')
          .select('*')
          .eq('description_pattern', descriptionPattern)
          .single();

        if (!existing) {
          await supabase.from('global_category_patterns').insert({
            description_pattern: descriptionPattern,
            category,
            subcategory: subcategory || null
          });
        } else if (existing.category === category) {
          await supabase
            .from('global_category_patterns')
            .update({
              user_count: existing.user_count + 1,
              usage_count: existing.usage_count + 1,
              confidence: Math.min(1.0, existing.confidence + 0.05)
            })
            .eq('id', existing.id);
        } else {
          // Conflito: diferentes categorias
          await supabase
            .from('global_category_patterns')
            .update({
              has_conflict: true,
              conflict_categories: [
                ...(existing.conflict_categories || []),
                { category, count: 1 }
              ]
            })
            .eq('id', existing.id);
        }
      } catch (globalError) {
        console.warn('⚠️ Failed to save global pattern:', globalError);
      }

      console.log(`🧠 Padrão aprendido: "${descriptionPattern}" → ${category}`);
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating transaction category:', error);
    res.status(500).json({ error: 'Failed to update transaction category' });
  }
});

/**
 * PATCH /api/transactions/bulk-update-category
 * Atualiza a categoria de múltiplas transações
 */
router.patch('/bulk-update-category', async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!;
    const { transaction_ids, category } = req.body;

    if (!transaction_ids || !Array.isArray(transaction_ids) || transaction_ids.length === 0) {
      return res.status(400).json({ error: 'transaction_ids array is required' });
    }

    if (!category) {
      return res.status(400).json({ error: 'category is required' });
    }

    // Verificar se todas as transações pertencem ao usuário
    const { data: userTransactions, error: fetchError } = await supabase
      .from('transactions')
      .select('id, bank_accounts!inner(user_id)')
      .in('id', transaction_ids)
      .eq('bank_accounts.user_id', user_id);

    if (fetchError) {
      throw fetchError;
    }

    if (!userTransactions || userTransactions.length !== transaction_ids.length) {
      return res.status(403).json({ error: 'Some transactions do not belong to this user' });
    }

    // Atualizar todas as transações
    const { data: updated, error: updateError } = await supabase
      .from('transactions')
      .update({ category, updated_at: toISOString(Date.now()) })
      .in('id', transaction_ids)
      .select();

    if (updateError) {
      throw updateError;
    }

    res.json({
      success: true,
      updated: updated?.length || 0,
      total: transaction_ids.length,
    });
  } catch (error) {
    console.error('Error bulk updating transaction categories:', error);
    res.status(500).json({ error: 'Failed to bulk update transaction categories' });
  }
});

/**
 * GET /api/transactions/categories/list
 * Lista todas as categorias disponíveis
 */
router.get('/categories/list', (req: Request, res: Response) => {
  try {
    const categories = categorizationService.getAllCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * POST /api/transactions/recategorize
 * Recategoriza todas as transações do usuário usando IA
 * OTIMIZADO: Usa batch updates para evitar timeout
 */
router.post('/recategorize', async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!;

    console.log('🤖 Iniciando recategorização automática para user:', user_id);

    // Buscar todas as transações do usuário
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*, bank_accounts!inner(user_id)')
      .eq('bank_accounts.user_id', user_id);

    if (error) {
      throw error;
    }

    console.log(`📊 Encontradas ${transactions?.length || 0} transações para recategorizar`);

    if (!transactions || transactions.length === 0) {
      return res.json({
        success: true,
        total: 0,
        updated: 0,
        unchanged: 0,
        categorized: 0,
        uncategorized: 0,
        message: 'Nenhuma transação encontrada para recategorizar'
      });
    }

    // FASE 1: Categorizar todas as transações em memória (rápido)
    const categorizationResults: Array<{
      id: string;
      oldCategory: string | null;
      newCategory: string;
      newSubcategory: string;
      confidence: number;
    }> = [];

    for (const transaction of transactions) {
      const categorization = categorizationService.categorizeTransaction(
        transaction.description || '',
        transaction.merchant || '',
        transaction.amount
      );

      categorizationResults.push({
        id: transaction.id,
        oldCategory: transaction.category,
        newCategory: categorization.category,
        newSubcategory: categorization.subcategory,
        confidence: categorization.confidence
      });
    }

    // FASE 2: Agrupar por categoria para batch update
    const updatesByCategory = new Map<string, Array<{ id: string; subcategory: string }>>();

    for (const result of categorizationResults) {
      const key = result.newCategory;
      if (!updatesByCategory.has(key)) {
        updatesByCategory.set(key, []);
      }
      updatesByCategory.get(key)!.push({
        id: result.id,
        subcategory: result.newSubcategory
      });
    }

    // FASE 3: Executar batch updates em paralelo (máximo 10 categorias por vez)
    const BATCH_SIZE = 10;
    const categories = Array.from(updatesByCategory.entries());
    const now = toISOString(Date.now());
    let totalUpdated = 0;

    for (let i = 0; i < categories.length; i += BATCH_SIZE) {
      const batch = categories.slice(i, i + BATCH_SIZE);

      const updatePromises = batch.map(async ([category, items]) => {
        // Para cada categoria, podemos ter diferentes subcategorias
        // Agrupar por subcategoria dentro de cada categoria
        const bySubcategory = new Map<string, string[]>();
        for (const item of items) {
          if (!bySubcategory.has(item.subcategory)) {
            bySubcategory.set(item.subcategory, []);
          }
          bySubcategory.get(item.subcategory)!.push(item.id);
        }

        // Atualizar cada grupo de subcategoria
        const subPromises = Array.from(bySubcategory.entries()).map(async ([subcategory, ids]) => {
          const { error: updateError, count } = await supabase
            .from('transactions')
            .update({
              category,
              subcategory,
              updated_at: now
            })
            .in('id', ids);

          if (updateError) {
            console.error(`❌ Erro ao atualizar categoria ${category}/${subcategory}:`, updateError);
            return 0;
          }
          return ids.length;
        });

        const results = await Promise.all(subPromises);
        return results.reduce((a, b) => a + b, 0);
      });

      const batchResults = await Promise.all(updatePromises);
      totalUpdated += batchResults.reduce((a, b) => a + b, 0);
    }

    // FASE 4: Calcular estatísticas
    let updated = 0;
    let unchanged = 0;
    let categorized = 0;
    let uncategorized = 0;

    for (const result of categorizationResults) {
      if (result.newCategory === 'Não Categorizado') {
        uncategorized++;
      } else {
        categorized++;
      }

      if (result.oldCategory !== result.newCategory) {
        updated++;
        if (updated <= 20) { // Log apenas as primeiras 20 mudanças
          console.log(`✅ [${result.confidence}%] ${result.id.substring(0, 8)}... | ${result.oldCategory || 'VAZIO'} → ${result.newCategory}`);
        }
      } else {
        unchanged++;
      }
    }

    console.log(`✨ Recategorização concluída:`);
    console.log(`   📊 Total: ${transactions.length} transações`);
    console.log(`   ✅ Atualizadas: ${updated}`);
    console.log(`   ➖ Sem alteração: ${unchanged}`);
    console.log(`   🎯 Categorizadas (≥80%): ${categorized}`);
    console.log(`   ❓ Não Categorizadas (<80%): ${uncategorized}`);

    res.json({
      success: true,
      total: transactions.length,
      updated,
      unchanged,
      categorized,
      uncategorized,
      message: `Recategorização concluída! ${categorized} com categoria válida, ${uncategorized} requerem categorização manual (confiança < 80%)`
    });
  } catch (error) {
    console.error('❌ Error recategorizing transactions:', error);
    res.status(500).json({ error: 'Erro ao recategorizar transações' });
  }
});

/**
 * POST /api/transactions/recategorize-ai
 * Recategoriza transações usando arquitetura de 3 camadas:
 * - Camada 1: Regras estáticas (BRAZILIAN_CATEGORY_RULES)
 * - Camada 2A: Histórico pessoal do usuário
 * - Camada 2B: Padrões globais de todos os usuários
 * - Camada 3: ChatGPT/IA externa
 */
router.post('/recategorize-ai', async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!;
    const { only_uncategorized = true } = req.body; // Por padrão, só recategoriza "Não Categorizado"

    console.log('🤖 Iniciando recategorização com IA (3 camadas) para user:', user_id);

    // Check if user has Plus plan (required for Layer 3 - ChatGPT)
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_type, status')
      .eq('user_id', user_id)
      .in('status', ['active', 'trial'])
      .maybeSingle();

    const planType = subscription?.plan_type || 'manual';
    const canUseAI = planType === 'conectado_plus';

    console.log(`📋 User plan: ${planType}, AI enabled: ${canUseAI}`);

    // Buscar transações do usuário
    let query = supabase
      .from('transactions')
      .select('*, bank_accounts!inner(user_id)')
      .eq('bank_accounts.user_id', user_id);

    // Se only_uncategorized, filtrar apenas as não categorizadas
    if (only_uncategorized) {
      query = query.or('category.is.null,category.eq.Não Categorizado');
    }

    const { data: transactions, error } = await query;

    if (error) {
      throw error;
    }

    if (!transactions || transactions.length === 0) {
      return res.json({
        success: true,
        total: 0,
        layer1: 0,
        layer2a: 0,
        layer2b: 0,
        layer3: 0,
        uncategorized: 0,
        message: 'Nenhuma transação para recategorizar'
      });
    }

    console.log(`📊 Encontradas ${transactions.length} transações para recategorizar com IA`);

    // ═══════════════════════════════════════════════════════════════════════
    // BUSCAR DADOS PARA CAMADA 2
    // ═══════════════════════════════════════════════════════════════════════

    // Camada 2A: Histórico pessoal do usuário
    const { data: userPreferences } = await supabase
      .from('user_category_preferences')
      .select('*')
      .eq('user_id', user_id)
      .order('usage_count', { ascending: false });

    const userHistory: UserCategorizationHistory[] = (userPreferences || []).map(p => ({
      description_pattern: p.description_pattern,
      category: p.category,
      subcategory: p.subcategory || 'Geral',
      count: p.usage_count,
      last_used: new Date(p.last_used_at)
    }));

    console.log(`   📁 Histórico pessoal: ${userHistory.length} padrões`);

    // Camada 2B: Padrões globais (apenas com alta confiança e sem conflito)
    const { data: globalPatterns } = await supabase
      .from('global_category_patterns')
      .select('*')
      .eq('has_conflict', false)
      .gte('confidence', 0.7)
      .order('confidence', { ascending: false });

    const globalHistory: UserCategorizationHistory[] = (globalPatterns || []).map(p => ({
      description_pattern: p.description_pattern,
      category: p.category,
      subcategory: p.subcategory || 'Geral',
      count: p.user_count,
      last_used: new Date(p.updated_at)
    }));

    console.log(`   🌍 Padrões globais: ${globalHistory.length} padrões`);

    // ═══════════════════════════════════════════════════════════════════════
    // PROCESSAR TRANSAÇÕES COM 3 CAMADAS
    // ═══════════════════════════════════════════════════════════════════════

    const results: Array<{
      id: string;
      oldCategory: string | null;
      newCategory: string;
      newSubcategory: string;
      layer: 0 | 1 | 2 | 3;
      confidence: number;
    }> = [];

    // Transações que precisam de Camada 3 (ChatGPT)
    const needsLayer3: Array<{ id: string; description: string; merchant?: string }> = [];

    // FASE 1: Tentar Camadas 1, 2A e 2B
    for (const transaction of transactions) {
      const description = transaction.description || '';
      const merchant = transaction.merchant || undefined;

      // Tentar Camada 1 (regras estáticas)
      const layer1Result = categorizationService.categorizeTransaction(
        description,
        merchant,
        transaction.amount
      );

      if (layer1Result.confidence >= 80) {
        console.log(`   🎯 [L1] "${description.substring(0, 40)}..." → ${layer1Result.category} (${layer1Result.confidence}%)`);
        results.push({
          id: transaction.id,
          oldCategory: transaction.category,
          newCategory: layer1Result.category,
          newSubcategory: layer1Result.subcategory,
          layer: 1,
          confidence: layer1Result.confidence
        });
        continue;
      }

      // Tentar Camada 2A (histórico pessoal)
      const layer2aResult = categorizationService.categorizeByUserHistory(description, userHistory);
      if (layer2aResult && layer2aResult.confidence >= 70) {
        console.log(`   👤 [L2A] "${description.substring(0, 40)}..." → ${layer2aResult.category} (${layer2aResult.confidence}%) [pessoal]`);
        results.push({
          id: transaction.id,
          oldCategory: transaction.category,
          newCategory: layer2aResult.category,
          newSubcategory: layer2aResult.subcategory,
          layer: 2,
          confidence: layer2aResult.confidence
        });
        continue;
      }

      // Tentar Camada 2B (padrões globais)
      const layer2bResult = categorizationService.categorizeByUserHistory(description, globalHistory);
      if (layer2bResult && layer2bResult.confidence >= 70) {
        console.log(`   🌍 [L2B] "${description.substring(0, 40)}..." → ${layer2bResult.category} (${layer2bResult.confidence}%) [global]`);
        results.push({
          id: transaction.id,
          oldCategory: transaction.category,
          newCategory: layer2bResult.category,
          newSubcategory: layer2bResult.subcategory,
          layer: 2,
          confidence: layer2bResult.confidence
        });
        continue;
      }

      // Não conseguiu categorizar - precisa Camada 3
      needsLayer3.push({
        id: transaction.id,
        description,
        merchant
      });
    }

    console.log(`   🤖 ${needsLayer3.length} transações precisam de Camada 3 (ChatGPT)`);

    // FASE 2: Processar Camada 3 (ChatGPT) para transações restantes
    // AI is only available for conectado_plus plan
    if (needsLayer3.length > 0 && openaiService.isConfigured() && canUseAI) {
      console.log('   🌐 Chamando ChatGPT para categorização...');

      // Processar em batches de 5 para não sobrecarregar a API
      const BATCH_SIZE = 5;
      for (let i = 0; i < needsLayer3.length; i += BATCH_SIZE) {
        const batch = needsLayer3.slice(i, i + BATCH_SIZE);

        const batchResults = await Promise.all(
          batch.map(async (t) => {
            const aiResult = await openaiService.categorizeTransaction(t.description, t.merchant);
            const originalTx = transactions.find(tx => tx.id === t.id);

            // Se ChatGPT retornou resultado válido
            if (aiResult) {
              // Aceitar "Não Categorizado" sempre (ChatGPT tem certeza que não sabe)
              // Ou aceitar outras categorias com confidence >= 80%
              if (aiResult.category === 'Não Categorizado' || aiResult.confidence >= 80) {
                console.log(`   🤖 [L3] "${t.description.substring(0, 40)}..." → ${aiResult.category} (${aiResult.confidence}%) [ChatGPT]`);
                return {
                  id: t.id,
                  oldCategory: originalTx?.category || null,
                  newCategory: aiResult.category,
                  newSubcategory: aiResult.subcategory,
                  layer: 3 as const,
                  confidence: aiResult.confidence
                };
              }
            }

            // Fallback: Usar "Não Categorizado" quando ChatGPT não tem certeza
            // NÃO usar Layer 1 pois pode gerar categorizações erradas
            console.log(`   ❓ [L0] "${t.description.substring(0, 40)}..." → Não Categorizado [sem certeza]`);
            return {
              id: t.id,
              oldCategory: originalTx?.category || null,
              newCategory: 'Não Categorizado',
              newSubcategory: 'Geral',
              layer: 0 as const,
              confidence: 0
            };
          })
        );

        results.push(...batchResults);

        // Pequena pausa entre batches
        if (i + BATCH_SIZE < needsLayer3.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } else if (needsLayer3.length > 0) {
      // ChatGPT not available - either not configured or user doesn't have Plus plan
      if (!canUseAI) {
        console.log('   ⚠️ IA desabilitada - Plano não é Conectado Plus');
        console.log('   ⚠️ Usando apenas Camadas 1 e 2 (regras e histórico)...');
      } else {
        console.log('   ⚠️ ChatGPT NÃO CONFIGURADO! Configure OPENAI_KEY no Render.');
      }
      console.log('   ⚠️ Marcando transações restantes como "Não Categorizado"...');

      for (const t of needsLayer3) {
        const originalTx = transactions.find(tx => tx.id === t.id);

        console.log(`   ❓ [L0] "${t.description.substring(0, 40)}..." → Não Categorizado [sem ChatGPT]`);
        results.push({
          id: t.id,
          oldCategory: originalTx?.category || null,
          newCategory: 'Não Categorizado',
          newSubcategory: 'Geral',
          layer: 0,
          confidence: 0
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FASE 3: ATUALIZAR BANCO DE DADOS
    // ═══════════════════════════════════════════════════════════════════════

    // Agrupar por categoria/subcategoria para batch update
    const updatesByCategory = new Map<string, string[]>();

    for (const result of results) {
      const key = `${result.newCategory}|||${result.newSubcategory}`;
      if (!updatesByCategory.has(key)) {
        updatesByCategory.set(key, []);
      }
      updatesByCategory.get(key)!.push(result.id);
    }

    const now = toISOString(Date.now());

    // Executar updates em paralelo
    const updatePromises = Array.from(updatesByCategory.entries()).map(async ([key, ids]) => {
      const [category, subcategory] = key.split('|||');

      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          category,
          subcategory,
          updated_at: now
        })
        .in('id', ids);

      if (updateError) {
        console.error(`❌ Erro ao atualizar ${category}:`, updateError);
        return 0;
      }
      return ids.length;
    });

    await Promise.all(updatePromises);

    // ═══════════════════════════════════════════════════════════════════════
    // CALCULAR ESTATÍSTICAS
    // ═══════════════════════════════════════════════════════════════════════

    const stats = {
      layer1: results.filter(r => r.layer === 1).length,
      layer2a: results.filter(r => r.layer === 2 && userHistory.some(h =>
        r.newCategory === h.category
      )).length,
      layer2b: results.filter(r => r.layer === 2).length,
      layer3: results.filter(r => r.layer === 3).length,
      uncategorized: results.filter(r => r.layer === 0 || r.newCategory === 'Não Categorizado').length,
      updated: results.filter(r => r.oldCategory !== r.newCategory).length
    };

    // Ajustar layer2b para não contar layer2a duas vezes
    stats.layer2b = stats.layer2b - stats.layer2a;

    console.log(`✨ Recategorização com IA concluída:`);
    console.log(`   📊 Total: ${transactions.length} transações`);
    console.log(`   🎯 Camada 1 (regras): ${stats.layer1}`);
    console.log(`   👤 Camada 2A (pessoal): ${stats.layer2a}`);
    console.log(`   🌍 Camada 2B (global): ${stats.layer2b}`);
    console.log(`   🤖 Camada 3 (ChatGPT): ${stats.layer3}`);
    console.log(`   ❓ Não categorizadas: ${stats.uncategorized}`);
    console.log(`   ✅ Atualizadas: ${stats.updated}`);

    res.json({
      success: true,
      total: transactions.length,
      ...stats,
      message: `Recategorização com IA concluída! Camada 1: ${stats.layer1}, Camada 2: ${stats.layer2a + stats.layer2b}, Camada 3: ${stats.layer3}, Não categorizadas: ${stats.uncategorized}`
    });
  } catch (error) {
    console.error('❌ Error in AI recategorization:', error);
    res.status(500).json({ error: 'Erro ao recategorizar com IA' });
  }
});

/**
 * POST /api/transactions/reset-categories
 * Reseta todas as transações para "Não Categorizado"
 * Se account_id for fornecido, reseta apenas dessa conta
 */
router.post('/reset-categories', async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!;
    const { account_id } = req.body;

    console.log('🔄 Resetando categorias para "Não Categorizado"...');

    let query = supabase
      .from('transactions')
      .update({
        category: 'Não Categorizado',
        subcategory: 'Geral',
        updated_at: toISOString(Date.now())
      });

    if (account_id) {
      // Resetar apenas transações de uma conta específica
      const { data: account } = await supabase
        .from('bank_accounts')
        .select('id')
        .eq('id', account_id)
        .eq('user_id', user_id)
        .single();

      if (!account) {
        return res.status(404).json({ error: 'Conta não encontrada' });
      }

      query = query.eq('account_id', account_id);
      console.log(`   📁 Conta: ${account_id}`);
    } else {
      // Resetar todas as transações do usuário
      const { data: accounts } = await supabase
        .from('bank_accounts')
        .select('id')
        .eq('user_id', user_id);

      if (!accounts || accounts.length === 0) {
        return res.json({ success: true, updated: 0, message: 'Nenhuma conta encontrada' });
      }

      const accountIds = accounts.map(a => a.id);
      query = query.in('account_id', accountIds);
      console.log(`   📁 Todas as contas (${accountIds.length})`);
    }

    const { data, error } = await query.select('id');

    if (error) {
      throw error;
    }

    const updated = data?.length || 0;
    console.log(`✅ ${updated} transações resetadas para "Não Categorizado"`);

    res.json({
      success: true,
      updated,
      message: `${updated} transações resetadas para "Não Categorizado"`
    });
  } catch (error) {
    console.error('❌ Error resetting categories:', error);
    res.status(500).json({ error: 'Erro ao resetar categorias' });
  }
});

/**
 * DELETE /api/transactions/all
 * Apaga transações do usuário (IRREVERSÍVEL)
 * Se account_id for fornecido via query param, apaga apenas dessa conta
 * Se não, apaga TODAS as transações e contas do usuário
 */
router.delete('/all', async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!;
    const { account_id } = req.query;

    // Se account_id foi fornecido, deletar apenas transações dessa conta
    if (account_id && typeof account_id === 'string') {
      console.log(`🗑️ [Delete] Deletando transações da conta ${account_id} para user:`, user_id);

      // Verificar se a conta pertence ao usuário
      const { data: account, error: accountCheckError } = await supabase
        .from('bank_accounts')
        .select('id, bank_name')
        .eq('id', account_id)
        .eq('user_id', user_id)
        .single();

      if (accountCheckError || !account) {
        return res.status(404).json({ error: 'Conta não encontrada ou não pertence ao usuário' });
      }

      // Deletar apenas transações desta conta
      const { data: deleted, error: transError } = await supabase
        .from('transactions')
        .delete()
        .eq('account_id', account_id)
        .eq('user_id', user_id)
        .select('id');

      if (transError) {
        console.error('❌ [Delete] Erro ao deletar transações:', transError);
        throw transError;
      }

      const deletedCount = deleted?.length || 0;
      console.log(`✅ [Delete] ${deletedCount} transações deletadas da conta ${account.bank_name}`);

      return res.json({
        success: true,
        deleted: deletedCount,
        account_id: account_id,
        message: `${deletedCount} ${deletedCount === 1 ? 'transação deletada' : 'transações deletadas'} da conta ${account.bank_name}!`,
      });
    }

    // Caso contrário, deletar TODAS as transações e contas do usuário
    console.log('🗑️ [Delete All] Iniciando deleção de todas as transações e contas bancárias para user:', user_id);

    // 1. Deletar todas as transações do usuário
    const { data: deleted, error: transError } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', user_id)
      .select('id');

    if (transError) {
      console.error('❌ [Delete All] Erro ao deletar transações:', transError);
      throw transError;
    }

    const deletedCount = deleted?.length || 0;
    console.log(`✅ [Delete All] ${deletedCount} transações deletadas com sucesso`);

    // 2. Deletar todas as contas bancárias do usuário
    const { data: deletedAccounts, error: accountError } = await supabase
      .from('bank_accounts')
      .delete()
      .eq('user_id', user_id)
      .select('id');

    if (accountError) {
      console.error('❌ [Delete All] Erro ao deletar contas bancárias:', accountError);
      throw accountError;
    }

    const deletedAccountsCount = deletedAccounts?.length || 0;
    console.log(`✅ [Delete All] ${deletedAccountsCount} contas bancárias deletadas com sucesso`);

    res.json({
      success: true,
      deleted: deletedCount,
      deletedAccounts: deletedAccountsCount,
      message: `${deletedCount} ${deletedCount === 1 ? 'transação deletada' : 'transações deletadas'} e ${deletedAccountsCount} ${deletedAccountsCount === 1 ? 'conta bancária deletada' : 'contas bancárias deletadas'} com sucesso!`,
    });
  } catch (error) {
    console.error('❌ [Delete All] Erro:', error);
    res.status(500).json({ error: 'Erro ao deletar transações e contas bancárias' });
  }
});

/**
 * POST /api/transactions/find-similar
 * Busca transações similares com base em palavras-chave
 */
router.post('/find-similar', async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!;
    const { description, merchant, excludeId, newCategory } = req.body;

    if (!description && !merchant) {
      return res.status(400).json({ error: 'Descrição ou merchant obrigatório' });
    }

    // Extrair palavras-chave (mínimo 3 caracteres)
    // Remover padrões irrelevantes: "COMPRA CARTAO DEB", "MC DEB", "MC CRE", números/códigos como "12/34"
    let text = `${description || ''} ${merchant || ''}`.toLowerCase();

    // Remover string completa "COMPRA CARTAO DEB" (frase comum em transações de cartão)
    text = text.replace(/compra\s+cartao\s+deb/gi, '');

    // Remover padrões de cartão (MC DEB, MC CRE, etc)
    text = text.replace(/\bmc\s+(deb|cre|credito|debito)\b/gi, '');

    // Remover códigos numéricos (padrões como 12/34, 1234, etc)
    text = text.replace(/\b\d+\/\d+\b/g, ''); // Remove padrões XX/YY
    text = text.replace(/\b\d{4,}\b/g, ''); // Remove sequências de 4+ dígitos

    const words = text
      .split(/\s+/)
      .filter(word => word.length >= 3)
      .filter(word => !['the', 'and', 'for', 'with', 'from', 'que', 'para', 'com', 'por', 'ltda', 'sa', 'cia'].includes(word))
      .filter(word => !/^\d+$/.test(word)); // Remove palavras que são apenas números

    if (words.length === 0) {
      return res.json({ similar: [] });
    }

    // Buscar todas as transações do usuário
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*, bank_accounts!inner(user_id)')
      .eq('bank_accounts.user_id', user_id);

    if (error) {
      throw error;
    }

    // Filtrar transações similares
    const similar = (transactions || [])
      .filter(t => t.id !== excludeId)
      // IMPORTANTE: Excluir transações que já estão na categoria de destino
      .filter(t => !newCategory || t.category !== newCategory)
      .map(t => {
        // Aplicar mesma limpeza no texto da transação
        let tText = `${t.description || ''} ${t.merchant || ''}`.toLowerCase();
        tText = tText.replace(/compra\s+cartao\s+deb/gi, ''); // Remover "COMPRA CARTAO DEB"
        tText = tText.replace(/\bmc\s+(deb|cre|credito|debito)\b/gi, '');
        tText = tText.replace(/\b\d+\/\d+\b/g, '');
        tText = tText.replace(/\b\d{4,}\b/g, '');

        const matchedWords = words.filter(word => tText.includes(word));
        const score = matchedWords.length / words.length;

        return {
          ...t,
          matchScore: score,
          matchedWords: matchedWords,
        };
      })
      .filter(t => t.matchScore === 1.0) // 🎯 MATCH 100% EXATO - todas as palavras devem estar presentes
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 20); // Máximo 20 resultados

    console.log(`🔍 Encontradas ${similar.length} transações similares a: "${description || merchant}" (excluindo categoria: ${newCategory || 'nenhuma'})`);

    res.json({
      similar,
      keywords: words,
      totalMatches: similar.length,
    });
  } catch (error) {
    console.error('Error finding similar transactions:', error);
    res.status(500).json({ error: 'Erro ao buscar transações similares' });
  }
});

/**
 * POST /api/transactions/bulk-update-category
 * Atualiza categoria de múltiplas transações
 */
router.post('/bulk-update-category', async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!;
    const { transactionIds, newCategory } = req.body;

    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({ error: 'IDs de transações obrigatórios' });
    }

    if (!newCategory) {
      return res.status(400).json({ error: 'Nova categoria obrigatória' });
    }

    console.log(`📝 Atualizando categoria de ${transactionIds.length} transações para: ${newCategory}`);

    // Verificar se todas as transações pertencem ao usuário
    const { data: userTransactions, error: checkError } = await supabase
      .from('transactions')
      .select('id, bank_accounts!inner(user_id)')
      .eq('bank_accounts.user_id', user_id)
      .in('id', transactionIds);

    if (checkError) {
      throw checkError;
    }

    if (!userTransactions || userTransactions.length !== transactionIds.length) {
      return res.status(403).json({ error: 'Algumas transações não pertencem ao usuário' });
    }

    // Atualizar em lote
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        category: newCategory,
        updated_at: toISOString(Date.now()),
      })
      .in('id', transactionIds);

    if (updateError) {
      throw updateError;
    }

    console.log(`✅ ${transactionIds.length} transações atualizadas com sucesso`);

    res.json({
      success: true,
      updated: transactionIds.length,
      category: newCategory,
      message: `${transactionIds.length} transações foram recategorizadas para "${newCategory}"`,
    });
  } catch (error) {
    console.error('Error bulk updating category:', error);
    res.status(500).json({ error: 'Erro ao atualizar transações em lote' });
  }
});

/**
 * POST /api/transactions/debug-categorization
 * Debug: Mostra como uma transação seria categorizada
 */
router.post('/debug-categorization', async (req: Request, res: Response) => {
  console.log('\n\n🐛🐛🐛 ===============================================');
  console.log('🐛 DEBUG CATEGORIZATION ENDPOINT CHAMADO!');
  console.log('🐛 ===============================================\n');

  try {
    const { description, merchant, amount, transactionId } = req.body;
    const user_id = req.userId!;

    console.log('🐛 Parâmetros recebidos:');
    console.log('   User ID:', user_id);
    console.log('   Transaction ID:', transactionId);
    console.log('   Description:', description);
    console.log('   Merchant:', merchant);
    console.log('   Amount:', amount);

    // Se foi passado um ID de transação, buscar os dados dela
    let actualDescription = description;
    let actualMerchant = merchant;
    let actualAmount = amount;

    if (transactionId) {
      const { data: transaction } = await supabase
        .from('transactions')
        .select('*, bank_accounts!inner(user_id)')
        .eq('bank_accounts.user_id', user_id)
        .eq('id', transactionId)
        .single();

      if (transaction) {
        actualDescription = transaction.description;
        actualMerchant = transaction.merchant;
        actualAmount = transaction.amount;
        console.log('   Usando dados da transação:', transactionId);
      }
    }

    // Categorizar
    const result = categorizationService.categorizeTransaction(
      actualDescription || '',
      actualMerchant || '',
      actualAmount
    );

    // Preparar resposta detalhada
    const response = {
      input: {
        description: actualDescription,
        merchant: actualMerchant,
        amount: actualAmount,
        transactionId: transactionId || null,
      },
      result: {
        category: result.category,
        subcategory: result.subcategory,
        icon: result.icon,
        color: result.color,
        confidence: result.confidence,
        matchedBy: result.matchedBy,
      },
      analysis: {
        isPassing: result.confidence >= 80,
        threshold: 80,
        willBeCategorizad: result.confidence >= 80 ? 'SIM' : 'NÃO',
        reason: result.confidence >= 80
          ? `Confiança de ${result.confidence}% está acima do threshold de 80%`
          : result.confidence > 0
            ? `Confiança de ${result.confidence}% está ABAIXO do threshold de 80% - ficará como "Não Categorizado"`
            : 'Nenhum padrão encontrado - ficará como "Não Categorizado"',
      },
    };

    console.log('\n✅ Resultado do Debug:');
    console.log(JSON.stringify(response, null, 2));
    console.log('\n🐛 ===============================================');
    console.log('🐛 DEBUG CATEGORIZATION FINALIZADO COM SUCESSO!');
    console.log('🐛 ===============================================\n\n');

    res.json(response);
  } catch (error) {
    console.error('\n❌❌❌ ERRO no debug categorization:', error);
    console.error('Stack:', error);
    res.status(500).json({ error: 'Erro ao debugar categorização', details: String(error) });
  }
});

/**
 * POST /api/transactions/import
 * Importa transações manualmente (CSV ou JSON)
 */
router.post('/import', async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!;
    const { transactions: importedTransactions, account_id } = req.body;
    // País para a base de categorização: 'BR' (padrão) ou 'DE' (Alemanha)
    const country: 'BR' | 'DE' = req.body.country === 'DE' ? 'DE' : 'BR';

    console.log(`📥 [Import] User ${user_id} importing ${importedTransactions?.length || 0} transactions (country: ${country})`);

    if (!importedTransactions || !Array.isArray(importedTransactions)) {
      return res.status(400).json({ error: 'transactions array is required' });
    }

    if (importedTransactions.length === 0) {
      return res.status(400).json({ error: 'No transactions to import' });
    }

    if (importedTransactions.length > 20000) {
      return res.status(400).json({ error: `Máximo de 20000 transações por importação. Você está tentando importar ${importedTransactions.length}. Divida em arquivos menores.` });
    }

    // 💰 DETECTAR SALDOS ESPECIAIS DO CSV
    let saldoAnterior: number | null = null; // Saldo inicial do período
    let saldoContaCorrente: number | null = null; // Saldo final (atual) da conta

    // Verificar se account_id existe e pertence ao usuário
    let targetAccountId = account_id;

    if (account_id) {
      const { data: account, error: accountError } = await supabase
        .from('bank_accounts')
        .select('id, user_id')
        .eq('id', account_id)
        .eq('user_id', user_id)
        .single();

      if (accountError || !account) {
        return res.status(404).json({ error: 'Account not found or does not belong to user' });
      }
    } else {
      // Se não especificou account, buscar ou criar conta "Importação Manual"
      const { data: manualAccount, error: fetchError } = await supabase
        .from('bank_accounts')
        .select('id')
        .eq('user_id', user_id)
        .eq('bank_name', 'Importação Manual')
        .single();

      if (manualAccount) {
        targetAccountId = manualAccount.id;
      } else {
        // Criar conta de importação manual
        const { v4: uuidv4 } = await import('uuid');
        const newAccountId = uuidv4();
        const now = Date.now();

        const { error: createError } = await supabase
          .from('bank_accounts')
          .insert({
            id: newAccountId,
            user_id,
            bank_name: 'Importação Manual',
            account_number: '****',
            balance: 0,
            currency: 'BRL',
            status: 'active',
            connected_at: toISOString(now),
            created_at: toISOString(now),
            updated_at: toISOString(now),
          });

        if (createError) {
          console.error('Error creating manual account:', createError);
          return res.status(500).json({ error: 'Failed to create manual import account' });
        }

        targetAccountId = newAccountId;
        console.log('✅ [Import] Created manual import account:', newAccountId);
      }
    }

    // Processar e validar transações
    const { v4: uuidv4 } = await import('uuid');
    const now = Date.now();
    const transactionsToInsert: any[] = [];
    const errors: string[] = [];

    console.log(`\n📥 [CSV Import] Iniciando processamento de ${importedTransactions.length} transações`);
    console.log('═══════════════════════════════════════════════════════════════');

    for (let i = 0; i < importedTransactions.length; i++) {
      const trans = importedTransactions[i];

      console.log(`\n🔍 [Linha ${i + 1}] Processando:`, JSON.stringify(trans, null, 2));
      console.log(`   📋 [Linha ${i + 1}] Campo 'saldo' presente: ${trans.saldo !== undefined}, valor: "${trans.saldo}"`);

      // 💰 DETECTAR LINHAS ESPECIAIS DE SALDO
      const descricaoLower = (trans.description || trans.descricao || '').toLowerCase();

      // Função helper para parse de valores (definida no escopo do loop)
      const parseNumberWithAutoDetectLocal = (numStr: string): number => {
        let cleaned = numStr.trim().replace(/\s/g, '').replace(/[^\d.,-]/g, '');
        const lastComma = cleaned.lastIndexOf(',');
        const lastDot = cleaned.lastIndexOf('.');

        if (lastComma > -1 && lastDot > -1) {
          if (lastComma > lastDot) {
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
          } else {
            cleaned = cleaned.replace(/,/g, '');
          }
        } else if (lastComma > -1) {
          cleaned = cleaned.replace(',', '.');
        }

        return parseFloat(cleaned);
      };

      // 1. SALDO ANTERIOR (saldo inicial do período)
      if (descricaoLower.includes('saldo anterior')) {
        console.log(`💰 [Linha ${i + 1}] DETECTADO: Saldo Anterior`);
        if (trans.saldo !== undefined && trans.saldo !== null && trans.saldo !== '') {
          try {
            const saldoStr = typeof trans.saldo === 'string' ? trans.saldo : String(trans.saldo);
            saldoAnterior = parseNumberWithAutoDetectLocal(saldoStr);
            console.log(`✅ [Linha ${i + 1}] Saldo Anterior capturado: R$ ${saldoAnterior.toFixed(2)}`);
          } catch (e) {
            console.log(`⚠️ [Linha ${i + 1}] Erro ao processar Saldo Anterior:`, e);
          }
        }
        // Pular esta linha (não é uma transação real)
        continue;
      }

      // 2. SALDO DE CONTA CORRENTE (saldo atual/final da conta)
      if (descricaoLower.includes('saldo de conta corrente') || descricaoLower.includes('saldo conta corrente')) {
        console.log(`💰 [Linha ${i + 1}] DETECTADO: Saldo de Conta Corrente`);
        if (trans.saldo !== undefined && trans.saldo !== null && trans.saldo !== '') {
          try {
            const saldoStr = typeof trans.saldo === 'string' ? trans.saldo : String(trans.saldo);
            saldoContaCorrente = parseNumberWithAutoDetectLocal(saldoStr);
            console.log(`✅ [Linha ${i + 1}] Saldo de Conta Corrente capturado: R$ ${saldoContaCorrente.toFixed(2)}`);
          } catch (e) {
            console.log(`⚠️ [Linha ${i + 1}] Erro ao processar Saldo de Conta Corrente:`, e);
          }
        }
        // Pular esta linha (não é uma transação real)
        continue;
      }

      // Validação básica - suporta "date" ou "data" (português)
      if (!trans.date && !trans.data) {
        const erro = `Linha ${i + 1}: data é obrigatória`;
        console.log(`❌ [Linha ${i + 1}] DESCARTADA - ${erro}`);
        errors.push(erro);
        continue;
      }

      // Suporte para formato Santander: pode ter crédito OU débito separados
      const hasAmount = trans.amount !== undefined && trans.amount !== null;
      const hasCredito = trans.credito !== undefined && trans.credito !== null && trans.credito !== '' && trans.credito !== '0' && trans.credito !== '0,00';
      const hasDebito = trans.debito !== undefined && trans.debito !== null && trans.debito !== '' && trans.debito !== '0' && trans.debito !== '0,00';

      console.log(`   💰 [Linha ${i + 1}] Valores detectados: hasAmount=${hasAmount}, hasCredito=${hasCredito}, hasDebito=${hasDebito}`);
      console.log(`   💰 [Linha ${i + 1}] Dados brutos: amount=${trans.amount}, credito=${trans.credito}, debito=${trans.debito}`);

      if (!hasAmount && !hasCredito && !hasDebito) {
        const erro = `Linha ${i + 1}: valor é obrigatório (amount, crédito ou débito)`;
        console.log(`❌ [Linha ${i + 1}] DESCARTADA - ${erro}`);
        errors.push(erro);
        continue;
      }

      // Descrição: tentar pegar de múltiplos campos
      // Se nenhum campo tiver valor, usar um placeholder com informações disponíveis
      const description = trans.description || trans.descricao || trans.merchant || trans.estabelecimento || trans.docto || 'Transação importada';
      console.log(`   📝 [Linha ${i + 1}] Descrição: "${description}"`)

      // Converter data para timestamp - suporta DD/MM/YYYY, DD.MM.YYYY e YYYY-MM-DD
      let dateTimestamp: number;
      try {
        const dateStr = trans.date || trans.data;
        let dateObj: Date;

        if (dateStr.includes('/') || dateStr.includes('.')) {
          // Formato brasileiro/alemão: DD/MM/YYYY ou DD.MM.YYYY
          const separator = dateStr.includes('/') ? '/' : '.';
          const parts = dateStr.split(separator);
          if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1; // Month is 0-indexed
            const year = parseInt(parts[2]);
            dateObj = new Date(year, month, day);
          } else {
            throw new Error('Formato de data inválido');
          }
        } else {
          // Formato ISO: YYYY-MM-DD
          dateObj = new Date(dateStr);
        }

        if (isNaN(dateObj.getTime())) {
          const erro = `Linha ${i + 1}: data inválida "${dateStr}"`;
          console.log(`❌ [Linha ${i + 1}] DESCARTADA - ${erro}`);
          errors.push(erro);
          continue;
        }
        dateTimestamp = dateObj.getTime();
        console.log(`   📅 [Linha ${i + 1}] Data convertida: ${dateStr} → ${new Date(dateTimestamp).toLocaleDateString('pt-BR')}`);
      } catch (e) {
        const erro = `Linha ${i + 1}: erro ao processar data "${trans.date || trans.data}"`;
        console.log(`❌ [Linha ${i + 1}] DESCARTADA - ${erro}`);
        errors.push(erro);
        continue;
      }

      // Converter amount para número - auto-detecta formato (brasileiro vs anglo-saxão)
      const parseNumberWithAutoDetect = (numStr: string): number => {
        // Remove espaços e caracteres de moeda
        let cleaned = numStr.trim().replace(/\s/g, '').replace(/[^\d.,-]/g, '');

        // Auto-detectar formato baseado na posição de vírgula e ponto
        const lastComma = cleaned.lastIndexOf(',');
        const lastDot = cleaned.lastIndexOf('.');

        if (lastComma > -1 && lastDot > -1) {
          // Tem ambos vírgula e ponto - verificar qual vem por último
          if (lastComma > lastDot) {
            // Formato brasileiro: 1.234,56 (vírgula é decimal)
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
          } else {
            // Formato anglo-saxão: 1,234.56 (ponto é decimal)
            cleaned = cleaned.replace(/,/g, '');
          }
        } else if (lastComma > -1) {
          // Só tem vírgula - assumir formato brasileiro (vírgula é decimal)
          cleaned = cleaned.replace(',', '.');
        }
        // Se só tem ponto, já está no formato correto

        return parseFloat(cleaned);
      };

      let amount: number;
      try {
        if (hasAmount) {
          // Formato padrão: amount pode ser positivo ou negativo
          const amountStr = typeof trans.amount === 'string' ? trans.amount : String(trans.amount);
          amount = parseNumberWithAutoDetect(amountStr);
        } else {
          // Formato Santander: crédito (positivo) ou débito (negativo)
          if (hasCredito) {
            const creditoStr = typeof trans.credito === 'string' ? trans.credito : String(trans.credito);
            amount = parseNumberWithAutoDetect(creditoStr);
            // Crédito é sempre positivo
            amount = Math.abs(amount);
          } else {
            // hasDebito
            const debitoStr = typeof trans.debito === 'string' ? trans.debito : String(trans.debito);
            amount = parseNumberWithAutoDetect(debitoStr);
            // Débito é sempre negativo
            amount = -Math.abs(amount);
          }
        }

        console.log(`   💵 [Linha ${i + 1}] Valor convertido: R$ ${amount.toFixed(2)}`);

        if (isNaN(amount) || amount === 0) {
          const erro = `Linha ${i + 1}: valor inválido (NaN ou zero)`;
          console.log(`❌ [Linha ${i + 1}] DESCARTADA - ${erro}`);
          errors.push(erro);
          continue;
        }
      } catch (e) {
        const erro = `Linha ${i + 1}: erro ao processar valor - ${e}`;
        console.log(`❌ [Linha ${i + 1}] DESCARTADA - ${erro}`);
        errors.push(erro);
        continue;
      }

      const merchant = trans.merchant || trans.estabelecimento || '';

      // Categorizar automaticamente se não foi fornecida categoria
      // Também suporta subcategoria do CSV para não precisar reclassificar
      let category = trans.category || trans.categoria || '';
      let subcategory = trans.subcategory || trans.subcategoria || '';

      // 🔍 CASO 1: Tem subcategoria mas NÃO tem categoria → inferir categoria da subcategoria
      if (subcategory && !category) {
        const categoryFromSubcat = categorizationService.getCategoryFromSubcategory(subcategory);
        if (categoryFromSubcat) {
          category = categoryFromSubcat.category;
          console.log(`   🏷️ [Linha ${i + 1}] Categoria inferida da subcategoria: "${subcategory}" → "${category}"`);
        }
      }

      // 🔍 CASO 2: Não tem categoria nem subcategoria → classificar automaticamente
      if (!category || !subcategory) {
        const categorization = categorizationService.categorizeTransaction(description, merchant, undefined, country);
        // Só usa a categoria automática se não tiver no CSV E não foi inferida
        if (!category) {
          category = categorization.category;
        }
        // Só usa a subcategoria automática se não tiver no CSV
        if (!subcategory) {
          subcategory = categorization.subcategory || '';
        }
      }

      // Determinar tipo (debit/credit)
      const type = amount < 0 ? 'debit' : 'credit';

      // Balance after (se disponível no formato Santander)
      let balanceAfter = null;
      if (trans.saldo !== undefined && trans.saldo !== null && trans.saldo !== '') {
        try {
          const saldoStr = typeof trans.saldo === 'string' ? trans.saldo : String(trans.saldo);
          console.log(`   💰 [Linha ${i + 1}] Processando saldo: "${trans.saldo}" → "${saldoStr}"`);
          balanceAfter = parseNumberWithAutoDetect(saldoStr);
          if (isNaN(balanceAfter)) {
            console.log(`   ⚠️ [Linha ${i + 1}] Saldo resultou em NaN, setando para null`);
            balanceAfter = null;
          } else {
            console.log(`   ✅ [Linha ${i + 1}] Saldo convertido: R$ ${balanceAfter.toFixed(2)}`);
          }
        } catch (e) {
          console.log(`   ❌ [Linha ${i + 1}] Erro ao processar saldo:`, e);
          balanceAfter = null;
        }
      } else {
        console.log(`   ⏭️  [Linha ${i + 1}] Campo saldo não disponível ou vazio: trans.saldo = ${trans.saldo}`);
      }

      // Transaction ID (pode vir do campo Docto do Santander)
      const transactionId = trans.docto || trans.documento || `MANUAL_${user_id}_${Date.now()}_${i}`;

      const transactionToInsert = {
        id: uuidv4(),
        user_id, // Adicionar user_id para queries mais eficientes
        account_id: targetAccountId,
        transaction_id: transactionId,
        date: dateTimestamp,
        amount,
        currency: trans.currency || trans.moeda || 'BRL',
        description,
        merchant,
        category,
        subcategory, // Subcategoria do CSV ou classificação automática
        type,
        balance_after: balanceAfter,
        status: trans.situacao || trans.status || 'completed',
        created_at: toISOString(now),
        updated_at: toISOString(now),
      };

      transactionsToInsert.push(transactionToInsert);
      console.log(`✅ [Linha ${i + 1}] ACEITA - Descrição: "${description}", Valor: R$ ${amount.toFixed(2)}, Categoria: ${category}${subcategory ? ` > ${subcategory}` : ''}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`📊 [CSV Import] Resumo do processamento:`);
    console.log(`   ✅ Transações aceitas: ${transactionsToInsert.length}`);
    console.log(`   ❌ Linhas descartadas: ${errors.length}`);
    console.log(`   📥 Total de linhas processadas: ${importedTransactions.length}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Se houver muitos erros, retornar sem importar
    if (errors.length > importedTransactions.length * 0.5) {
      return res.status(400).json({
        error: 'Too many errors in import',
        errors: errors.slice(0, 10), // Primeiros 10 erros
        totalErrors: errors.length,
      });
    }

    // 💰 CALCULAR SALDO INICIAL E FINAL DO CSV (ANTES de verificar duplicatas)
    // IMPORTANTE: CSV Santander vem de cima para baixo = MAIS RECENTE → MAIS ANTIGA
    // transactionsToInsert[0] = primeira linha lida = transação MAIS RECENTE
    // transactionsToInsert[length-1] = última linha lida = transação MAIS ANTIGA
    if (transactionsToInsert.length > 0) {
      // ÚLTIMA transação do array (mais ANTIGA cronologicamente) = saldo inicial
      const oldestTransaction = transactionsToInsert[transactionsToInsert.length - 1];
      if (oldestTransaction.balance_after !== undefined && oldestTransaction.balance_after !== null) {
        const calculatedInitialBalance = oldestTransaction.balance_after - oldestTransaction.amount;

        // Se não detectou "Saldo Anterior" nas linhas especiais, usar o calculado
        if (saldoAnterior === null) {
          saldoAnterior = calculatedInitialBalance;
          console.log(`\n💰 [CSV Import] Saldo Inicial calculado da transação MAIS ANTIGA:`);
          console.log(`   📅 Data: ${new Date(oldestTransaction.date).toLocaleDateString('pt-BR')}`);
          console.log(`   📝 Descrição: ${oldestTransaction.description}`);
          console.log(`   💵 balance_after: R$ ${oldestTransaction.balance_after.toFixed(2)}`);
          console.log(`   💵 amount: R$ ${oldestTransaction.amount.toFixed(2)}`);
          console.log(`   ✅ Saldo Inicial = ${oldestTransaction.balance_after.toFixed(2)} - (${oldestTransaction.amount.toFixed(2)}) = R$ ${saldoAnterior.toFixed(2)}`);
        }
      }

      // PRIMEIRA transação do array (mais RECENTE cronologicamente) = saldo conta corrente
      const newestTransaction = transactionsToInsert[0];
      if (newestTransaction.balance_after !== undefined && newestTransaction.balance_after !== null) {
        // Se não detectou "Saldo de Conta Corrente" nas linhas especiais, usar o da mais recente
        if (saldoContaCorrente === null) {
          const balanceAfter = newestTransaction.balance_after;
          saldoContaCorrente = balanceAfter;
          console.log(`\n💰 [CSV Import] Saldo Conta Corrente da transação MAIS RECENTE:`);
          console.log(`   📅 Data: ${new Date(newestTransaction.date).toLocaleDateString('pt-BR')}`);
          console.log(`   📝 Descrição: ${newestTransaction.description}`);
          console.log(`   ✅ Saldo Atual = R$ ${balanceAfter.toFixed(2)}`);
        }
      }
    }

    // Verificar duplicatas antes de inserir
    console.log('\n🔍 [CSV Import] Verificando duplicatas...');
    const uniqueTransactions: any[] = [];
    let duplicatesCount = 0;

    if (transactionsToInsert.length > 0) {
      // Buscar transações existentes do usuário para comparação
      const { data: existingTransactions, error: fetchError } = await supabase
        .from('transactions')
        .select('date, description, amount, user_id')
        .eq('user_id', user_id);

      if (fetchError) {
        console.error('❌ [Import] Error fetching existing transactions:', fetchError);
      }

      const existingSet = new Set(
        (existingTransactions || []).map(t =>
          `${t.date}_${t.description}_${t.amount}`
        )
      );

      console.log(`📊 [CSV Import] Transações existentes no banco: ${existingSet.size}`);

      for (const trans of transactionsToInsert) {
        const key = `${trans.date}_${trans.description}_${trans.amount}`;
        if (existingSet.has(key)) {
          duplicatesCount++;
          console.log(`⏭️  [CSV Import] Duplicata detectada: "${trans.description}" (${new Date(trans.date).toLocaleDateString('pt-BR')}) R$ ${trans.amount.toFixed(2)}`);
        } else {
          uniqueTransactions.push(trans);
          existingSet.add(key); // Adicionar ao set para evitar duplicatas dentro do mesmo lote
        }
      }

      console.log(`\n📊 [CSV Import] Após verificação de duplicatas:`);
      console.log(`   ✅ Transações únicas para importar: ${uniqueTransactions.length}`);
      console.log(`   ⏭️  Duplicatas ignoradas: ${duplicatesCount}`);
    }

    // Inserir transações únicas em batch
    let totalInserted = 0;
    if (uniqueTransactions.length > 0) {
      const BATCH_SIZE = 500;

      for (let i = 0; i < uniqueTransactions.length; i += BATCH_SIZE) {
        const batch = uniqueTransactions.slice(i, i + BATCH_SIZE);

        const { error: insertError } = await supabase
          .from('transactions')
          .insert(batch);

        if (insertError) {
          console.error(`❌ [Import] Error inserting batch ${i / BATCH_SIZE + 1}:`, insertError);
          errors.push(`Erro ao inserir lote ${i / BATCH_SIZE + 1}: ${insertError.message}`);
        } else {
          totalInserted += batch.length;
          console.log(`✅ [Import] Batch ${i / BATCH_SIZE + 1}: inserted ${batch.length} transactions`);
        }
      }

      console.log(`✅ [Import] Successfully imported ${totalInserted} new transactions for user ${user_id}`);
    }

    // 💰 ATUALIZAR SALDO ATUAL E INICIAL DA CONTA BANCÁRIA
    // Isso deve acontecer SEMPRE que houver CSV válido, mesmo que todas sejam duplicatas
    console.log(`\n🔍 [DEBUG] Verificando se deve atualizar banco:`);
    console.log(`   saldoContaCorrente: ${saldoContaCorrente}`);
    console.log(`   saldoAnterior: ${saldoAnterior}`);
    console.log(`   transactionsToInsert.length: ${transactionsToInsert.length}`);

    if (saldoContaCorrente !== null || saldoAnterior !== null) {
      console.log('\n💰 [Import] Atualizando saldo da conta bancária...');
      console.log(`   🔑 targetAccountId: ${targetAccountId}`);

      const updateData: any = {
        updated_at: toISOString(Date.now()),
      };

      if (saldoContaCorrente !== null) {
        updateData.balance = saldoContaCorrente;
        console.log(`   💰 Saldo Atual (Conta Corrente): R$ ${saldoContaCorrente.toFixed(2)}`);
      }

      if (saldoAnterior !== null && transactionsToInsert.length > 0) {
        updateData.initial_balance = saldoAnterior;
        // A data do saldo inicial deve ser da transação MAIS ANTIGA (última do array)
        // Converter timestamp para formato ISO que o PostgreSQL aceita
        updateData.initial_balance_date = toISOString(transactionsToInsert[transactionsToInsert.length - 1].date);
        console.log(`   💰 Saldo Inicial: R$ ${saldoAnterior.toFixed(2)}`);
        console.log(`   📅 Data Início: ${new Date(transactionsToInsert[transactionsToInsert.length - 1].date).toLocaleDateString('pt-BR')}`);
      }

      console.log(`\n🔍 [DEBUG] Dados que serão atualizados no banco:`);
      console.log(JSON.stringify(updateData, null, 2));

      const { error: updateError } = await supabase
        .from('bank_accounts')
        .update(updateData)
        .eq('id', targetAccountId);

      if (updateError) {
        console.error('⚠️ [Import] Erro ao atualizar saldo da conta:', updateError);
        console.error('⚠️ [Import] Detalhes do erro:', JSON.stringify(updateError, null, 2));
      } else {
        console.log('✅ [Import] Saldo da conta atualizado com sucesso!');

        // Verificar se realmente foi salvo
        const { data: verifyData, error: verifyError } = await supabase
          .from('bank_accounts')
          .select('id, balance, initial_balance, initial_balance_date')
          .eq('id', targetAccountId)
          .single();

        if (!verifyError && verifyData) {
          console.log('\n🔍 [DEBUG] Dados APÓS update no banco:');
          console.log(`   balance: ${verifyData.balance}`);
          console.log(`   initial_balance: ${verifyData.initial_balance}`);
          console.log(`   initial_balance_date: ${verifyData.initial_balance_date}`);
        }
      }
    } else {
      console.log('\n⚠️ [DEBUG] NÃO vai atualizar banco (ambos são null)');
    }

    // Log do saldo anterior para referência
    if (saldoAnterior !== null) {
      console.log(`💰 [Import] Saldo Anterior detectado: R$ ${saldoAnterior.toFixed(2)} (salvo em balance_after das transações)`);
    }

    const message = totalInserted === 0
      ? 'Nenhuma transação nova foi importada (todas já existiam)'
      : `${totalInserted} ${totalInserted === 1 ? 'transação importada' : 'transações importadas'} com sucesso!${duplicatesCount > 0 ? ` (${duplicatesCount} ${duplicatesCount === 1 ? 'duplicata ignorada' : 'duplicatas ignoradas'})` : ''}`;

    // 🔄 SINCRONIZAR BUDGETS após importação de CSV
    try {
      await syncBudgetsWithTransactions(user_id);
    } catch (syncError) {
      console.error('⚠️ [Import] Erro ao sincronizar budgets (não crítico):', syncError);
    }

    res.json({
      success: true,
      imported: totalInserted,
      duplicates: duplicatesCount,
      errors: errors.length > 0 ? errors : undefined,
      account_id: targetAccountId,
      saldo_inicial: saldoAnterior,
      saldo_atual: saldoContaCorrente,
      message,
    });
  } catch (error) {
    console.error('❌ [Import] Error importing transactions:', error);
    res.status(500).json({ error: 'Failed to import transactions' });
  }
});

export default router;
