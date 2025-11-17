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
    let categorized = 0; // Transações com categoria válida (confiança >= 80%)
    let uncategorized = 0; // Transações com "Não Categorizado" (confiança < 80%)

    for (const transaction of transactions || []) {
      const oldCategory = transaction.category;

      // RECATEGORIZAR usando IA com threshold de 80%
      const categorization = categorizationService.categorizeTransaction(
        transaction.description || '',
        transaction.merchant || '',
        transaction.amount
      );

      const newCategory = categorization.category;
      const confidence = categorization.confidence;

      // Contar estatísticas
      if (newCategory === 'Não Categorizado') {
        uncategorized++;
      } else {
        categorized++;
      }

      // Atualizar SEMPRE, mesmo que seja a mesma categoria
      // Isso garante que transações antigas sejam reavaliadas com as novas regras
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          category: newCategory,
          updated_at: toISOString(Date.now())
        })
        .eq('id', transaction.id);

      if (!updateError) {
        if (oldCategory !== newCategory) {
          updated++;
          console.log(`✅ [${confidence}%] ${transaction.description?.substring(0, 40)} | ${oldCategory || 'VAZIO'} → ${newCategory}`);
        } else {
          unchanged++;
        }
      } else {
        console.error(`❌ Erro ao atualizar transação ${transaction.id}:`, updateError);
      }
    }

    console.log(`✨ Recategorização concluída:`);
    console.log(`   📊 Total: ${transactions?.length || 0} transações`);
    console.log(`   ✅ Atualizadas: ${updated}`);
    console.log(`   ➖ Sem alteração: ${unchanged}`);
    console.log(`   🎯 Categorizadas (≥80%): ${categorized}`);
    console.log(`   ❓ Não Categorizadas (<80%): ${uncategorized}`);

    res.json({
      success: true,
      total: transactions?.length || 0,
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
 * POST /api/transactions/find-similar
 * Busca transações similares com base em palavras-chave
 */
router.post('/find-similar', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!;
    const { description, merchant, excludeId, newCategory } = req.body;

    if (!description && !merchant) {
      return res.status(400).json({ error: 'Descrição ou merchant obrigatório' });
    }

    // Extrair palavras-chave (mínimo 3 caracteres)
    const text = `${description || ''} ${merchant || ''}`.toLowerCase();
    const words = text
      .split(/\s+/)
      .filter(word => word.length >= 3)
      .filter(word => !['the', 'and', 'for', 'with', 'from', 'que', 'para', 'com', 'por'].includes(word));

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
        const tText = `${t.description || ''} ${t.merchant || ''}`.toLowerCase();
        const matchedWords = words.filter(word => tText.includes(word));
        const score = matchedWords.length / words.length;

        return {
          ...t,
          matchScore: score,
          matchedWords: matchedWords,
        };
      })
      .filter(t => t.matchScore >= 0.4) // Mínimo 40% de match
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
router.post('/bulk-update-category', authMiddleware, async (req: Request, res: Response) => {
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
router.post('/debug-categorization', authMiddleware, async (req: Request, res: Response) => {
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
router.post('/import', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!;
    const { transactions: importedTransactions, account_id } = req.body;

    console.log(`📥 [Import] User ${user_id} importing ${importedTransactions?.length || 0} transactions`);

    if (!importedTransactions || !Array.isArray(importedTransactions)) {
      return res.status(400).json({ error: 'transactions array is required' });
    }

    if (importedTransactions.length === 0) {
      return res.status(400).json({ error: 'No transactions to import' });
    }

    if (importedTransactions.length > 1000) {
      return res.status(400).json({ error: 'Maximum 1000 transactions per import' });
    }

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

    for (let i = 0; i < importedTransactions.length; i++) {
      const trans = importedTransactions[i];

      // Validação básica
      if (!trans.date) {
        errors.push(`Linha ${i + 1}: data é obrigatória`);
        continue;
      }

      if (trans.amount === undefined || trans.amount === null) {
        errors.push(`Linha ${i + 1}: valor é obrigatório`);
        continue;
      }

      if (!trans.description && !trans.merchant) {
        errors.push(`Linha ${i + 1}: descrição ou merchant é obrigatório`);
        continue;
      }

      // Converter data para timestamp
      let dateTimestamp: number;
      try {
        const dateObj = new Date(trans.date);
        if (isNaN(dateObj.getTime())) {
          errors.push(`Linha ${i + 1}: data inválida "${trans.date}"`);
          continue;
        }
        dateTimestamp = dateObj.getTime();
      } catch (e) {
        errors.push(`Linha ${i + 1}: erro ao processar data "${trans.date}"`);
        continue;
      }

      // Converter amount para número
      let amount: number;
      try {
        amount = typeof trans.amount === 'string'
          ? parseFloat(trans.amount.replace(',', '.').replace(/[^\d.-]/g, ''))
          : Number(trans.amount);

        if (isNaN(amount)) {
          errors.push(`Linha ${i + 1}: valor inválido "${trans.amount}"`);
          continue;
        }
      } catch (e) {
        errors.push(`Linha ${i + 1}: erro ao processar valor "${trans.amount}"`);
        continue;
      }

      const description = trans.description || trans.merchant || '';
      const merchant = trans.merchant || '';

      // Categorizar automaticamente se não foi fornecida categoria
      let category = trans.category || '';
      if (!category) {
        const categorization = categorizationService.categorizeTransaction(description, merchant);
        category = categorization.category;
      }

      // Determinar tipo (debit/credit)
      const type = amount < 0 ? 'debit' : 'credit';

      transactionsToInsert.push({
        id: uuidv4(),
        account_id: targetAccountId,
        transaction_id: `MANUAL_${user_id}_${Date.now()}_${i}`,
        date: dateTimestamp,
        amount,
        currency: trans.currency || 'BRL',
        description,
        merchant,
        category,
        type,
        status: 'completed',
        created_at: toISOString(now),
        updated_at: toISOString(now),
      });
    }

    // Se houver muitos erros, retornar sem importar
    if (errors.length > importedTransactions.length * 0.5) {
      return res.status(400).json({
        error: 'Too many errors in import',
        errors: errors.slice(0, 10), // Primeiros 10 erros
        totalErrors: errors.length,
      });
    }

    // Inserir transações em batch
    if (transactionsToInsert.length > 0) {
      const BATCH_SIZE = 500;
      let totalInserted = 0;

      for (let i = 0; i < transactionsToInsert.length; i += BATCH_SIZE) {
        const batch = transactionsToInsert.slice(i, i + BATCH_SIZE);

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

      console.log(`✅ [Import] Successfully imported ${totalInserted} transactions for user ${user_id}`);

      res.json({
        success: true,
        imported: totalInserted,
        errors: errors.length > 0 ? errors : undefined,
        account_id: targetAccountId,
        message: `${totalInserted} transações importadas com sucesso!${errors.length > 0 ? ` (${errors.length} erros)` : ''}`,
      });
    } else {
      res.status(400).json({
        error: 'No valid transactions to import',
        errors,
      });
    }
  } catch (error) {
    console.error('❌ [Import] Error importing transactions:', error);
    res.status(500).json({ error: 'Failed to import transactions' });
  }
});

export default router;
