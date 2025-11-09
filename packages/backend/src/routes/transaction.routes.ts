import { Router, Request, Response } from 'express';
import db from '../db/database';
import categorizationService from '../services/categorization.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { Transaction } from '../types';

const router = Router();

/**
 * GET /api/transactions
 * Lista transações com filtros opcionais
 */
router.get('/', authMiddleware, (req: Request, res: Response) => {
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

    let query = `
      SELECT t.* FROM transactions t
      INNER JOIN bank_accounts ba ON t.account_id = ba.id
      WHERE ba.user_id = ?
    `;
    const params: any[] = [user_id];

    if (account_id) {
      query += ' AND t.account_id = ?';
      params.push(account_id);
    }

    if (category) {
      query += ' AND t.category = ?';
      params.push(category);
    }

    if (type) {
      query += ' AND t.type = ?';
      params.push(type);
    }

    if (start_date) {
      query += ' AND t.date >= ?';
      params.push(new Date(start_date as string).getTime());
    }

    if (end_date) {
      query += ' AND t.date <= ?';
      params.push(new Date(end_date as string).getTime());
    }

    query += ' ORDER BY t.date DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const transactions = db.prepare(query).all(...params) as Transaction[];

    // Contar total
    let countQuery = `
      SELECT COUNT(*) as total FROM transactions t
      INNER JOIN bank_accounts ba ON t.account_id = ba.id
      WHERE ba.user_id = ?
    `;
    const countParams: any[] = [user_id];

    if (account_id) {
      countQuery += ' AND t.account_id = ?';
      countParams.push(account_id);
    }

    if (category) {
      countQuery += ' AND t.category = ?';
      countParams.push(category);
    }

    if (type) {
      countQuery += ' AND t.type = ?';
      countParams.push(type);
    }

    if (start_date) {
      countQuery += ' AND t.date >= ?';
      countParams.push(new Date(start_date as string).getTime());
    }

    if (end_date) {
      countQuery += ' AND t.date <= ?';
      countParams.push(new Date(end_date as string).getTime());
    }

    const { total } = db.prepare(countQuery).get(...countParams) as { total: number };

    res.json({
      transactions,
      total,
      limit: Number(limit),
      offset: Number(offset),
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
router.get('/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const transaction = db
      .prepare('SELECT * FROM transactions WHERE id = ?')
      .get(id) as Transaction | undefined;

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

/**
 * PATCH /api/transactions/:id/category
 * Atualiza a categoria de uma transação
 */
router.patch('/:id/category', authMiddleware, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { category } = req.body;

    if (!category) {
      return res.status(400).json({ error: 'category is required' });
    }

    const transaction = db
      .prepare('SELECT * FROM transactions WHERE id = ?')
      .get(id) as Transaction | undefined;

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    db.prepare('UPDATE transactions SET category = ?, updated_at = ? WHERE id = ?')
      .run(category, Date.now(), id);

    const updated = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);

    res.json(updated);
  } catch (error) {
    console.error('Error updating transaction category:', error);
    res.status(500).json({ error: 'Failed to update transaction category' });
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
router.post('/recategorize', authMiddleware, (req: Request, res: Response) => {
  try {
    const user_id = req.userId!;

    console.log('🤖 Iniciando recategorização automática para user:', user_id);

    // Buscar todas as transações do usuário
    const transactions = db.prepare(`
      SELECT t.* FROM transactions t
      INNER JOIN bank_accounts ba ON t.account_id = ba.id
      WHERE ba.user_id = ?
    `).all(user_id) as Transaction[];

    console.log(`📊 Encontradas ${transactions.length} transações para recategorizar`);

    let updated = 0;
    let unchanged = 0;

    for (const transaction of transactions) {
      const categorization = categorizationService.categorizeTransaction(
        transaction.description || '',
        transaction.merchant || '',
        transaction.amount
      );

      // Atualizar apenas se a categoria mudou ou se estava vazia/Outros
      if (transaction.category !== categorization.category) {
        db.prepare('UPDATE transactions SET category = ?, updated_at = ? WHERE id = ?')
          .run(categorization.category, Date.now(), transaction.id);
        updated++;

        console.log(`✅ ${transaction.description?.substring(0, 50)} → ${categorization.category} (${categorization.confidence}%)`);
      } else {
        unchanged++;
      }
    }

    console.log(`✨ Recategorização concluída: ${updated} atualizadas, ${unchanged} mantidas`);

    res.json({
      success: true,
      total: transactions.length,
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
