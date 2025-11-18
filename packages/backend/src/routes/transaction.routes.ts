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
 * DELETE /api/transactions/all
 * Apaga TODAS as transações do usuário (IRREVERSÍVEL)
 */
router.delete('/all', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!;

    console.log('🗑️ [Delete All] Iniciando deleção de todas as transações para user:', user_id);

    // Deletar todas as transações do usuário usando user_id diretamente
    const { data: deleted, error } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', user_id)
      .select('id');

    if (error) {
      console.error('❌ [Delete All] Erro ao deletar transações:', error);
      throw error;
    }

    const deletedCount = deleted?.length || 0;
    console.log(`✅ [Delete All] ${deletedCount} transações deletadas com sucesso`);

    res.json({
      success: true,
      deleted: deletedCount,
      message: `${deletedCount} ${deletedCount === 1 ? 'transação deletada' : 'transações deletadas'} com sucesso!`,
    });
  } catch (error) {
    console.error('❌ [Delete All] Erro:', error);
    res.status(500).json({ error: 'Erro ao deletar transações' });
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

      // 1. SALDO ANTERIOR (saldo inicial do período)
      if (descricaoLower.includes('saldo anterior')) {
        console.log(`💰 [Linha ${i + 1}] DETECTADO: Saldo Anterior`);
        if (trans.saldo !== undefined && trans.saldo !== null && trans.saldo !== '') {
          try {
            const saldoStr = typeof trans.saldo === 'string' ? trans.saldo : String(trans.saldo);
            saldoAnterior = parseFloat(
              saldoStr
                .replace(/\s/g, '')
                .replace(/\./g, '')
                .replace(',', '.')
                .replace(/[^\d.-]/g, '')
            );
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
            saldoContaCorrente = parseFloat(
              saldoStr
                .replace(/\s/g, '')
                .replace(/\./g, '')
                .replace(',', '.')
                .replace(/[^\d.-]/g, '')
            );
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

      // Converter data para timestamp - suporta DD/MM/YYYY e YYYY-MM-DD
      let dateTimestamp: number;
      try {
        const dateStr = trans.date || trans.data;
        let dateObj: Date;

        if (dateStr.includes('/')) {
          // Formato brasileiro: DD/MM/YYYY
          const parts = dateStr.split('/');
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

      // Converter amount para número - suporta formato brasileiro (vírgula decimal)
      let amount: number;
      try {
        if (hasAmount) {
          // Formato padrão: amount pode ser positivo ou negativo
          const amountStr = typeof trans.amount === 'string' ? trans.amount : String(trans.amount);
          amount = parseFloat(
            amountStr
              .replace(/\s/g, '') // Remove espaços
              .replace(/\./g, '') // Remove pontos de milhar
              .replace(',', '.') // Converte vírgula decimal para ponto
              .replace(/[^\d.-]/g, '') // Remove caracteres não numéricos exceto - e .
          );
        } else {
          // Formato Santander: crédito (positivo) ou débito (negativo)
          if (hasCredito) {
            const creditoStr = typeof trans.credito === 'string' ? trans.credito : String(trans.credito);
            amount = parseFloat(
              creditoStr
                .replace(/\s/g, '')
                .replace(/\./g, '')
                .replace(',', '.')
                .replace(/[^\d.-]/g, '')
            );
            // Crédito é sempre positivo
            amount = Math.abs(amount);
          } else {
            // hasDebito
            const debitoStr = typeof trans.debito === 'string' ? trans.debito : String(trans.debito);
            amount = parseFloat(
              debitoStr
                .replace(/\s/g, '')
                .replace(/\./g, '')
                .replace(',', '.')
                .replace(/[^\d.-]/g, '')
            );
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
      let category = trans.category || trans.categoria || '';
      if (!category) {
        const categorization = categorizationService.categorizeTransaction(description, merchant);
        category = categorization.category;
      }

      // Determinar tipo (debit/credit)
      const type = amount < 0 ? 'debit' : 'credit';

      // Balance after (se disponível no formato Santander)
      let balanceAfter = null;
      if (trans.saldo !== undefined && trans.saldo !== null && trans.saldo !== '') {
        try {
          const saldoStr = typeof trans.saldo === 'string' ? trans.saldo : String(trans.saldo);
          console.log(`   💰 [Linha ${i + 1}] Processando saldo: "${trans.saldo}" → "${saldoStr}"`);
          balanceAfter = parseFloat(
            saldoStr
              .replace(/\s/g, '')
              .replace(/\./g, '')
              .replace(',', '.')
              .replace(/[^\d.-]/g, '')
          );
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
        type,
        balance_after: balanceAfter,
        status: trans.situacao || trans.status || 'completed',
        created_at: toISOString(now),
        updated_at: toISOString(now),
      };

      transactionsToInsert.push(transactionToInsert);
      console.log(`✅ [Linha ${i + 1}] ACEITA - Descrição: "${description}", Valor: R$ ${amount.toFixed(2)}, Categoria: ${category}`);
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

      // 💰 CALCULAR SALDO INICIAL E FINAL DO CSV (se não foram detectados nas linhas especiais)
      if (uniqueTransactions.length > 0) {
        // PRIMEIRA transação do CSV = saldo inicial
        const firstTransaction = uniqueTransactions[0];
        if (firstTransaction.balance_after !== undefined && firstTransaction.balance_after !== null) {
          const calculatedInitialBalance = firstTransaction.balance_after - firstTransaction.amount;

          // Se não detectou "Saldo Anterior" nas linhas especiais, usar o calculado
          if (saldoAnterior === null) {
            saldoAnterior = calculatedInitialBalance;
            console.log(`\n💰 [CSV Import] Saldo Inicial calculado da PRIMEIRA transação:`);
            console.log(`   📅 Data: ${new Date(firstTransaction.date).toLocaleDateString('pt-BR')}`);
            console.log(`   📝 Descrição: ${firstTransaction.description}`);
            console.log(`   💵 balance_after: R$ ${firstTransaction.balance_after.toFixed(2)}`);
            console.log(`   💵 amount: R$ ${firstTransaction.amount.toFixed(2)}`);
            console.log(`   ✅ Saldo Inicial = ${firstTransaction.balance_after.toFixed(2)} - (${firstTransaction.amount.toFixed(2)}) = R$ ${saldoAnterior.toFixed(2)}`);
          }
        }

        // ÚLTIMA transação do CSV = saldo conta corrente
        const lastTransaction = uniqueTransactions[uniqueTransactions.length - 1];
        if (lastTransaction.balance_after !== undefined && lastTransaction.balance_after !== null) {
          // Se não detectou "Saldo de Conta Corrente" nas linhas especiais, usar o da última transação
          if (saldoContaCorrente === null) {
            const balanceAfter = lastTransaction.balance_after;
            saldoContaCorrente = balanceAfter;
            console.log(`\n💰 [CSV Import] Saldo Conta Corrente da ÚLTIMA transação:`);
            console.log(`   📅 Data: ${new Date(lastTransaction.date).toLocaleDateString('pt-BR')}`);
            console.log(`   📝 Descrição: ${lastTransaction.description}`);
            console.log(`   ✅ Saldo Atual = R$ ${balanceAfter.toFixed(2)}`);
          }
        }
      }
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

      // 💰 ATUALIZAR SALDO ATUAL E INICIAL DA CONTA BANCÁRIA
      if (saldoContaCorrente !== null || saldoAnterior !== null) {
        console.log('\n💰 [Import] Atualizando saldo da conta bancária...');

        const updateData: any = {
          updated_at: toISOString(Date.now()),
        };

        if (saldoContaCorrente !== null) {
          updateData.balance = saldoContaCorrente;
          console.log(`   💰 Saldo Atual (Conta Corrente): R$ ${saldoContaCorrente.toFixed(2)}`);
        }

        if (saldoAnterior !== null && uniqueTransactions.length > 0) {
          updateData.initial_balance = saldoAnterior;
          updateData.initial_balance_date = uniqueTransactions[0].date; // Data da primeira transação
          console.log(`   💰 Saldo Inicial: R$ ${saldoAnterior.toFixed(2)}`);
          console.log(`   📅 Data Início: ${new Date(uniqueTransactions[0].date).toLocaleDateString('pt-BR')}`);
        }

        const { error: updateError } = await supabase
          .from('bank_accounts')
          .update(updateData)
          .eq('id', targetAccountId);

        if (updateError) {
          console.error('⚠️ [Import] Erro ao atualizar saldo da conta:', updateError);
        } else {
          console.log('✅ [Import] Saldo da conta atualizado com sucesso!');
        }
      }

      // Log do saldo anterior para referência
      if (saldoAnterior !== null) {
        console.log(`💰 [Import] Saldo Anterior detectado: R$ ${saldoAnterior.toFixed(2)} (salvo em balance_after das transações)`);
      }

      const message = totalInserted === 0
        ? 'Nenhuma transação nova foi importada (todas já existiam)'
        : `${totalInserted} ${totalInserted === 1 ? 'transação importada' : 'transações importadas'} com sucesso!${duplicatesCount > 0 ? ` (${duplicatesCount} ${duplicatesCount === 1 ? 'duplicata ignorada' : 'duplicatas ignoradas'})` : ''}`;

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
