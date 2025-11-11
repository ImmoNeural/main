import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import categorizationService from '../services/categorization.service';
import { authMiddleware } from '../middleware/auth.supabase.middleware';
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
router.get('/', authMiddleware, async (req: Request, res: Response) => {
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

    res.json({
      transactions: transactions || [],
      total: count || 0,
      limit: limitNum,
      offset: offsetNum,
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
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
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
router.post('/:id/find-similar', authMiddleware, async (req: Request, res: Response) => {
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
 */
router.patch('/:id/category', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { category } = req.body;

    if (!category) {
      return res.status(400).json({ error: 'category is required' });
    }

    // Verificar se transação existe
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Atualizar categoria
    const { data: updated, error: updateError } = await supabase
      .from('transactions')
      .update({ category, updated_at: toISOString(Date.now()) })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
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
router.patch('/bulk-update-category', authMiddleware, async (req: Request, res: Response) => {
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
 */
router.post('/recategorize', authMiddleware, async (req: Request, res: Response) => {
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

    let updated = 0;
    let unchanged = 0;

    for (const transaction of transactions || []) {
      const categorization = categorizationService.categorizeTransaction(
        transaction.description || '',
        transaction.merchant || '',
        transaction.amount
      );

      // Atualizar apenas se a categoria mudou ou se estava vazia/Outros
      if (transaction.category !== categorization.category) {
        const { error: updateError } = await supabase
          .from('transactions')
          .update({ category: categorization.category, updated_at: toISOString(Date.now()) })
          .eq('id', transaction.id);

        if (!updateError) {
          updated++;
          console.log(`✅ ${transaction.description?.substring(0, 50)} → ${categorization.category} (${categorization.confidence}%)`);
        }
      } else {
        unchanged++;
      }
    }

    console.log(`✨ Recategorização concluída: ${updated} atualizadas, ${unchanged} mantidas`);

    res.json({
      success: true,
      total: transactions?.length || 0,
      updated,
      unchanged,
      message: `${updated} transações foram recategorizadas automaticamente`
    });
  } catch (error) {
    console.error('❌ Error recategorizing transactions:', error);
    res.status(500).json({ error: 'Erro ao recategorizar transações' });
  }
});

export default router;
