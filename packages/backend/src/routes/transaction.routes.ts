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
 * POST /api/transactions/:id/find-similar
 * Busca transações similares baseadas no merchant/descrição
 */
router.post('/:id/find-similar', authMiddleware, (req: Request, res: Response) => {
  try {
    const user_id = req.userId!;
    const { id } = req.params;

    // Buscar a transação original
    const transaction = db
      .prepare(`
        SELECT t.* FROM transactions t
        INNER JOIN bank_accounts ba ON t.account_id = ba.id
        WHERE t.id = ? AND ba.user_id = ?
      `)
      .get(id, user_id) as Transaction | undefined;

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Buscar transações similares (mesmo merchant ou descrição parecida)
    // Excluir a transação original
    let similarTransactions: Transaction[] = [];

    if (transaction.merchant) {
      similarTransactions = db
        .prepare(`
          SELECT t.* FROM transactions t
          INNER JOIN bank_accounts ba ON t.account_id = ba.id
          WHERE ba.user_id = ?
            AND t.id != ?
            AND t.merchant = ?
          ORDER BY t.date DESC
          LIMIT 50
        `)
        .all(user_id, id, transaction.merchant) as Transaction[];
    }

    // Se não encontrou por merchant, buscar por descrição similar
    if (similarTransactions.length === 0 && transaction.description) {
      const descWords = transaction.description.toLowerCase().split(' ').filter(w => w.length > 3);
      if (descWords.length > 0) {
        const searchPattern = `%${descWords[0]}%`;
        similarTransactions = db
          .prepare(`
            SELECT t.* FROM transactions t
            INNER JOIN bank_accounts ba ON t.account_id = ba.id
            WHERE ba.user_id = ?
              AND t.id != ?
              AND (LOWER(t.description) LIKE ? OR LOWER(t.merchant) LIKE ?)
            ORDER BY t.date DESC
            LIMIT 50
          `)
          .all(user_id, id, searchPattern, searchPattern) as Transaction[];
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
 * PATCH /api/transactions/bulk-update-category
 * Atualiza a categoria de múltiplas transações
 */
router.patch('/bulk-update-category', authMiddleware, (req: Request, res: Response) => {
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
    const placeholders = transaction_ids.map(() => '?').join(',');
    const userTransactions = db
      .prepare(`
        SELECT t.id FROM transactions t
        INNER JOIN bank_accounts ba ON t.account_id = ba.id
        WHERE t.id IN (${placeholders}) AND ba.user_id = ?
      `)
      .all(...transaction_ids, user_id) as Array<{ id: string }>;

    if (userTransactions.length !== transaction_ids.length) {
      return res.status(403).json({ error: 'Some transactions do not belong to this user' });
    }

    // Atualizar todas as transações
    const updateStmt = db.prepare('UPDATE transactions SET category = ?, updated_at = ? WHERE id = ?');
    const now = Date.now();

    let updatedCount = 0;
    for (const id of transaction_ids) {
      const result = updateStmt.run(category, now, id);
      if (result.changes > 0) updatedCount++;
    }

    res.json({
      success: true,
      updated: updatedCount,
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

export default router;
