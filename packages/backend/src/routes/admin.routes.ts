import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { emailService } from '../services/email.service';

const router = Router();

// Lista de emails de administradores
const ADMIN_EMAILS = [
  'neurekaai@gmail.com',
];

/**
 * Middleware para verificar se o usuário é admin
 * Usa req.userEmail que já vem do auth middleware
 */
const adminMiddleware = async (req: Request, res: Response, next: Function) => {
  try {
    const userEmail = req.userEmail;

    if (!userEmail) {
      console.log('[Admin] ❌ Email não encontrado no request');
      return res.status(401).json({ error: 'Não autenticado' });
    }

    console.log(`[Admin] Verificando permissão para: ${userEmail}`);

    if (!ADMIN_EMAILS.includes(userEmail)) {
      console.log(`[Admin] ❌ ${userEmail} não é admin`);
      return res.status(403).json({ error: 'Acesso negado - apenas administradores' });
    }

    console.log(`[Admin] ✅ ${userEmail} é admin`);
    next();
  } catch (error) {
    console.error('[Admin] Middleware error:', error);
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

/**
 * POST /api/admin/fix-credit-card-transactions
 * Corrige transações de cartão de crédito existentes (apenas para admins)
 *
 * No cartão de crédito via Open Finance:
 * - Valores POSITIVOS = despesas (compras) → devem virar NEGATIVOS
 * - Valores NEGATIVOS = pagamentos de fatura → devem ser DELETADOS
 *
 * Query params:
 * - user_id (opcional): corrigir apenas para um usuário específico
 * - dry_run (opcional): se "true", apenas mostra o que seria feito sem alterar
 */
router.post('/fix-credit-card-transactions', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { user_id, dry_run } = req.query;
    const isDryRun = dry_run === 'true';

    console.log(`[Admin] 💳 Iniciando correção de transações de cartão de crédito${isDryRun ? ' (DRY RUN)' : ''}`);

    // 1. Buscar todas as contas de cartão de crédito
    let accountsQuery = supabase
      .from('bank_accounts')
      .select('id, user_id, bank_name')
      .eq('account_type', 'card');

    if (user_id) {
      accountsQuery = accountsQuery.eq('user_id', user_id);
    }

    const { data: creditCardAccounts, error: accountsError } = await accountsQuery;

    if (accountsError) {
      throw accountsError;
    }

    if (!creditCardAccounts || creditCardAccounts.length === 0) {
      return res.json({
        success: true,
        message: 'Nenhuma conta de cartão de crédito encontrada',
        accountsProcessed: 0,
        transactionsInverted: 0,
        transactionsDeleted: 0,
      });
    }

    console.log(`[Admin] 💳 Encontradas ${creditCardAccounts.length} contas de cartão de crédito`);

    let totalInverted = 0;
    let totalDeleted = 0;
    const details: any[] = [];

    for (const account of creditCardAccounts) {
      console.log(`[Admin] 💳 Processando conta: ${account.bank_name} (${account.id})`);

      // Buscar transações positivas (precisam ser invertidas)
      const { data: positiveTransactions, error: posError } = await supabase
        .from('transactions')
        .select('id, amount, description')
        .eq('account_id', account.id)
        .gt('amount', 0);

      if (posError) {
        console.error(`[Admin] Erro ao buscar transações positivas:`, posError);
        continue;
      }

      // Buscar transações negativas (precisam ser deletadas - pagamentos de fatura)
      const { data: negativeTransactions, error: negError } = await supabase
        .from('transactions')
        .select('id, amount, description')
        .eq('account_id', account.id)
        .lt('amount', 0);

      if (negError) {
        console.error(`[Admin] Erro ao buscar transações negativas:`, negError);
        continue;
      }

      const positiveCount = positiveTransactions?.length || 0;
      const negativeCount = negativeTransactions?.length || 0;

      console.log(`[Admin] 💳 ${account.bank_name}: ${positiveCount} positivas (inverter), ${negativeCount} negativas (deletar)`);

      if (!isDryRun) {
        // INVERTER transações positivas para negativas (uma query por conta)
        if (positiveTransactions && positiveTransactions.length > 0) {
          // Update todas transações positivas desta conta de uma vez
          // Multiplica amount por -1 para inverter
          const { error: updateError, count } = await supabase
            .from('transactions')
            .update({
              type: 'debit',
              updated_at: new Date().toISOString()
            })
            .eq('account_id', account.id)
            .gt('amount', 0);

          if (updateError) {
            console.error(`[Admin] Erro ao atualizar tipo:`, updateError);
          }

          // Agora inverter os valores (precisa fazer um por um infelizmente)
          // Mas fazemos em paralelo com Promise.all
          const updatePromises = positiveTransactions.map(trans =>
            supabase
              .from('transactions')
              .update({ amount: -Math.abs(trans.amount) })
              .eq('id', trans.id)
          );

          // Executar em batches de 50 para não sobrecarregar
          const BATCH_SIZE = 50;
          for (let i = 0; i < updatePromises.length; i += BATCH_SIZE) {
            await Promise.all(updatePromises.slice(i, i + BATCH_SIZE));
          }

          totalInverted += positiveTransactions.length;
        }

        // DELETAR transações negativas - uma única query por conta
        if (negativeTransactions && negativeTransactions.length > 0) {
          const { error: deleteError } = await supabase
            .from('transactions')
            .delete()
            .eq('account_id', account.id)
            .lt('amount', 0);

          if (deleteError) {
            console.error(`[Admin] Erro ao deletar:`, deleteError);
          } else {
            totalDeleted += negativeTransactions.length;
          }
        }
      } else {
        // Dry run - apenas contar
        totalInverted += positiveCount;
        totalDeleted += negativeCount;
      }

      details.push({
        account_id: account.id,
        bank_name: account.bank_name,
        user_id: account.user_id,
        transactionsToInvert: positiveCount,
        transactionsToDelete: negativeCount,
        samplePositive: positiveTransactions?.slice(0, 3).map(t => ({
          amount: t.amount,
          description: t.description?.substring(0, 50)
        })),
        sampleNegative: negativeTransactions?.slice(0, 3).map(t => ({
          amount: t.amount,
          description: t.description?.substring(0, 50)
        })),
      });
    }

    const message = isDryRun
      ? `DRY RUN: ${totalInverted} transações seriam invertidas, ${totalDeleted} seriam deletadas`
      : `Correção concluída: ${totalInverted} transações invertidas, ${totalDeleted} deletadas`;

    console.log(`[Admin] 💳 ${message}`);

    res.json({
      success: true,
      dry_run: isDryRun,
      message,
      accountsProcessed: creditCardAccounts.length,
      transactionsInverted: totalInverted,
      transactionsDeleted: totalDeleted,
      details,
    });
  } catch (error) {
    console.error('[Admin] Error fixing credit card transactions:', error);
    res.status(500).json({ error: 'Failed to fix credit card transactions' });
  }
});

/**
 * POST /api/admin/test-negative-balance-email
 * Envia um email de teste de saldo negativo (apenas para admins)
 * Body: { email: string } - email para enviar o teste
 */
router.post('/test-negative-balance-email', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'email é obrigatório' });
    }

    console.log(`[Admin] 📧 Enviando email de teste de saldo negativo para: ${email}`);

    const sent = await emailService.sendTestNegativeBalanceAlert(email);

    if (sent) {
      console.log(`[Admin] ✅ Email de teste enviado com sucesso para ${email}`);
      res.json({
        success: true,
        message: `Email de teste enviado para ${email}`,
      });
    } else {
      console.log(`[Admin] ❌ Falha ao enviar email de teste para ${email}`);
      res.status(500).json({
        success: false,
        error: 'Falha ao enviar email - verifique as configurações do Resend',
      });
    }
  } catch (error: any) {
    console.error('[Admin] Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email: ' + error.message });
  }
});

/**
 * POST /api/admin/send-tutorial-email
 * Envia um email com o tutorial do app (apenas para admins)
 * Body: { email: string, userName?: string } - email para enviar e nome do usuário
 */
router.post('/send-tutorial-email', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { email, userName } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'email é obrigatório' });
    }

    console.log(`[Admin] 📧 Enviando email de tutorial para: ${email}`);

    const sent = await emailService.sendTutorialEmail(email, userName || 'usuário');

    if (sent) {
      console.log(`[Admin] ✅ Email de tutorial enviado com sucesso para ${email}`);
      res.json({
        success: true,
        message: `Email de tutorial enviado para ${email}`,
      });
    } else {
      console.log(`[Admin] ❌ Falha ao enviar email de tutorial para ${email}`);
      res.status(500).json({
        success: false,
        error: 'Falha ao enviar email - verifique as configurações do Resend',
      });
    }
  } catch (error: any) {
    console.error('[Admin] Error sending tutorial email:', error);
    res.status(500).json({ error: 'Failed to send tutorial email: ' + error.message });
  }
});

/**
 * POST /api/admin/send-openfinance-email
 * Envia um email explicando Open Finance e como conectar banco (apenas para admins)
 * Body: { email: string, userName?: string, simple?: boolean } - email para enviar, nome do usuário, e se deve usar versão simples
 */
router.post('/send-openfinance-email', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { email, userName, simple } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'email é obrigatório' });
    }

    // Por padrão, usar versão simples (melhor deliverability)
    const useSimple = simple !== false;

    console.log(`[Admin] 📧 Enviando email de Open Finance (${useSimple ? 'simples' : 'marketing'}) para: ${email}`);

    const sent = useSimple
      ? await emailService.sendOpenFinanceEmailSimple(email, userName || 'usuário')
      : await emailService.sendOpenFinanceEmail(email, userName || 'usuário');

    if (sent) {
      console.log(`[Admin] ✅ Email de Open Finance enviado com sucesso para ${email}`);
      res.json({
        success: true,
        message: `Email de Open Finance enviado para ${email}`,
      });
    } else {
      console.log(`[Admin] ❌ Falha ao enviar email de Open Finance para ${email}`);
      res.status(500).json({
        success: false,
        error: 'Falha ao enviar email - verifique as configurações do Resend',
      });
    }
  } catch (error: any) {
    console.error('[Admin] Error sending Open Finance email:', error);
    res.status(500).json({ error: 'Failed to send Open Finance email: ' + error.message });
  }
});

/**
 * POST /api/admin/send-openfinance-email-all
 * Envia email de Open Finance para TODOS os usuários cadastrados (apenas para admins)
 * Body: { simple?: boolean } - se deve usar versão simples (default: false para versão colorida)
 */
router.post('/send-openfinance-email-all', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { simple } = req.body;
    const useSimple = simple === true; // Por padrão, usar versão colorida para envio em massa

    console.log(`[Admin] 📧 Buscando todos os usuários para enviar email de Open Finance (${useSimple ? 'simples' : 'colorido'})...`);

    // Buscar todos os usuários do Supabase Auth usando service role
    const { data: users, error: fetchError } = await supabase.auth.admin.listUsers();

    if (fetchError) {
      console.error('[Admin] Erro ao buscar usuários:', fetchError);
      return res.status(500).json({ error: 'Erro ao buscar usuários: ' + fetchError.message });
    }

    if (!users || users.users.length === 0) {
      return res.json({ success: true, message: 'Nenhum usuário encontrado', sent: 0, failed: 0 });
    }

    console.log(`[Admin] 📧 Encontrados ${users.users.length} usuários`);

    let sent = 0;
    let failed = 0;
    const results: any[] = [];

    for (const user of users.users) {
      if (!user.email) continue;

      // Pegar nome do usuário dos metadados
      const userName = user.user_metadata?.name ||
                       user.user_metadata?.full_name ||
                       user.email.split('@')[0];

      try {
        const emailSent = useSimple
          ? await emailService.sendOpenFinanceEmailSimple(user.email, userName)
          : await emailService.sendOpenFinanceEmail(user.email, userName);

        if (emailSent) {
          sent++;
          results.push({ email: user.email, status: 'sent' });
          console.log(`[Admin] ✅ Enviado para ${user.email}`);
        } else {
          failed++;
          results.push({ email: user.email, status: 'failed' });
          console.log(`[Admin] ❌ Falha ao enviar para ${user.email}`);
        }
      } catch (err: any) {
        failed++;
        results.push({ email: user.email, status: 'error', error: err.message });
        console.error(`[Admin] ❌ Erro ao enviar para ${user.email}:`, err.message);
      }

      // Aguardar 500ms entre emails para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[Admin] 📧 Envio concluído: ${sent} enviados, ${failed} falharam`);

    res.json({
      success: true,
      message: `Envio concluído: ${sent} enviados, ${failed} falharam`,
      total: users.users.length,
      sent,
      failed,
      results
    });
  } catch (error: any) {
    console.error('[Admin] Error sending Open Finance email to all:', error);
    res.status(500).json({ error: 'Failed to send emails: ' + error.message });
  }
});

/**
 * POST /api/admin/send-connect-bank-email
 * Envia email atraente para convencer usuário a conectar banco via Open Finance
 * Body: { email: string, userName?: string }
 */
router.post('/send-connect-bank-email', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { email, userName } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'email é obrigatório' });
    }

    console.log(`[Admin] 📧 Enviando email "Conectar Banco" para: ${email}`);

    const sent = await emailService.sendConnectBankEmail(email, userName || 'usuário');

    if (sent) {
      console.log(`[Admin] ✅ Email "Conectar Banco" enviado com sucesso para ${email}`);
      res.json({
        success: true,
        message: `Email enviado para ${email}`,
      });
    } else {
      console.log(`[Admin] ❌ Falha ao enviar email para ${email}`);
      res.status(500).json({
        success: false,
        error: 'Falha ao enviar email - verifique as configurações do Resend',
      });
    }
  } catch (error: any) {
    console.error('[Admin] Error sending connect bank email:', error);
    res.status(500).json({ error: 'Failed to send email: ' + error.message });
  }
});

/**
 * POST /api/admin/send-connect-bank-email-bulk
 * Envia email "Conectar Banco" para múltiplos usuários
 * Body: { users: Array<{name: string, email: string}> }
 */
router.post('/send-connect-bank-email-bulk', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { users } = req.body;

    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ error: 'users array é obrigatório' });
    }

    console.log(`[Admin] 📧 Enviando email "Conectar Banco" para ${users.length} usuários...`);

    let sent = 0;
    let failed = 0;
    const results: any[] = [];

    for (const user of users) {
      if (!user.email) continue;

      const userName = user.name || user.email.split('@')[0];

      try {
        const emailSent = await emailService.sendConnectBankEmail(user.email, userName);

        if (emailSent) {
          sent++;
          results.push({ email: user.email, name: userName, status: 'sent' });
          console.log(`[Admin] ✅ Enviado para ${user.email}`);
        } else {
          failed++;
          results.push({ email: user.email, name: userName, status: 'failed' });
          console.log(`[Admin] ❌ Falha ao enviar para ${user.email}`);
        }
      } catch (err: any) {
        failed++;
        results.push({ email: user.email, name: userName, status: 'error', error: err.message });
        console.error(`[Admin] ❌ Erro ao enviar para ${user.email}:`, err.message);
      }

      // Aguardar 500ms entre emails para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[Admin] 📧 Envio concluído: ${sent} enviados, ${failed} falharam`);

    res.json({
      success: true,
      message: `Envio concluído: ${sent} enviados, ${failed} falharam`,
      total: users.length,
      sent,
      failed,
      results
    });
  } catch (error: any) {
    console.error('[Admin] Error sending connect bank emails:', error);
    res.status(500).json({ error: 'Failed to send emails: ' + error.message });
  }
});

export default router;
