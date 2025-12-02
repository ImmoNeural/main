import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// Lista de emails de administradores (configurado via env ou hardcoded)
// ADMIN_EMAILS pode ser uma string separada por vírgulas: "email1@x.com,email2@x.com"
const ADMIN_EMAILS = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(',').map(e => e.trim())
  : [];

/**
 * Middleware para verificar se o usuário é admin
 */
const adminMiddleware = async (req: Request, res: Response, next: Function) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    // Buscar email do usuário
    const { data: user, error } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    if (!ADMIN_EMAILS.includes(user.email)) {
      return res.status(403).json({ error: 'Acesso negado - apenas administradores' });
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ error: 'Erro ao verificar permissões de admin' });
  }
};

/**
 * GET /api/admin/transactions
 * Lista transações de um usuário específico (apenas para admins)
 */
router.get('/transactions', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { user_id, limit = '10000' } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id é obrigatório' });
    }

    console.log(`[Admin] Buscando transações do usuário: ${user_id}`);

    // Buscar informações do usuário
    const { data: userInfo } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('id', user_id)
      .single();

    // Buscar transações do usuário
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*, bank_accounts!inner(user_id)')
      .eq('bank_accounts.user_id', user_id)
      .order('date', { ascending: false })
      .limit(Number(limit));

    if (error) {
      console.error('[Admin] Erro ao buscar transações:', error);
      throw error;
    }

    console.log(`[Admin] Encontradas ${transactions?.length || 0} transações`);

    res.json({
      user: userInfo || { id: user_id, email: 'Desconhecido', name: null },
      transactions: transactions || [],
      total: transactions?.length || 0,
    });
  } catch (error) {
    console.error('[Admin] Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

/**
 * GET /api/admin/user/:userId
 * Busca informações de um usuário específico (apenas para admins)
 */
router.get('/user/:userId', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Buscar informações do usuário
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, created_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Buscar contas bancárias do usuário
    const { data: accounts } = await supabase
      .from('bank_accounts')
      .select('id, bank_name, account_type, status, created_at')
      .eq('user_id', userId);

    // Contar transações
    const { count: transactionCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('bank_accounts.user_id', userId);

    res.json({
      user,
      accounts: accounts || [],
      transactionCount: transactionCount || 0,
    });
  } catch (error) {
    console.error('[Admin] Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

/**
 * GET /api/admin/users
 * Lista todos os usuários (apenas para admins)
 */
router.get('/users', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { limit = '100', offset = '0' } = req.query;

    const { data: users, error, count } = await supabase
      .from('users')
      .select('id, email, name, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      throw error;
    }

    res.json({
      users: users || [],
      total: count || 0,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    console.error('[Admin] Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
