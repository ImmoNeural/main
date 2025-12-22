import { Router, Request, Response } from 'express';
import { supabaseAuth, supabase } from '../config/supabase';
import { emailService } from '../services/email.service';

const router = Router();

interface OAuthCallbackRequest {
  provider_id: string;
  email: string;
  name: string;
  avatar_url?: string;
  provider: string;
}

/**
 * POST /api/auth/register
 * Registra um novo usuário usando Supabase Auth
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    console.log('📝 Registration attempt for:', email);

    // Validação
    if (!name || !email || !password) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    if (password.length < 6) {
      console.log('❌ Password too short');
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    // Criar usuário no Supabase Auth
    const { data, error } = await supabaseAuth.auth.signUp({
      email: email.toLowerCase(),
      password,
      options: {
        data: {
          name,
        },
        // Desabilitar confirmação de email para permitir login imediato
        emailRedirectTo: undefined,
      },
    });

    if (error) {
      console.error('❌ Supabase signup error:', error);

      // Mensagens de erro mais claras
      if (error.message.includes('already registered')) {
        return res.status(400).json({ error: 'Este email já está cadastrado. Tente fazer login.' });
      }

      return res.status(400).json({ error: error.message });
    }

    if (!data.user) {
      console.error('❌ No user returned from Supabase');
      return res.status(400).json({ error: 'Erro ao criar usuário' });
    }

    // Verificar se precisa confirmar email
    if (data.user && !data.session) {
      console.log('⚠️ Email confirmation required for:', email);
      return res.status(200).json({
        message: 'Conta criada com sucesso! Verifique seu email para confirmar o cadastro.',
        requiresEmailConfirmation: true,
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      });
    }

    console.log('✅ Registration successful for:', email);

    // O profile é criado automaticamente via trigger no Supabase

    // Criar assinatura trial de 7 dias automaticamente
    let trialCreated = false;
    try {
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 7); // 7 dias de trial

      console.log('🎁 Creating trial subscription for user:', data.user.id);

      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: data.user.id,
          plan_type: 'manual',
          plan_name: 'Trial - Plano Manual',
          plan_price: 0,
          status: 'trial',
          start_date: new Date().toISOString(),
          end_date: trialEndDate.toISOString(),
          trial_end_date: trialEndDate.toISOString(),
          payment_method: null,
          payment_processor: null,
          max_connected_accounts: 0,
          auto_renew: false,
          metadata: {
            trial_days: 7,
            created_on_signup: true
          }
        })
        .select()
        .single();

      if (subscriptionError) {
        console.error('❌ Error creating trial subscription:', subscriptionError);
        console.error('   Error details:', JSON.stringify(subscriptionError, null, 2));
        // Não bloqueia o cadastro se falhar ao criar trial, mas loga detalhadamente
      } else {
        console.log('✅ Trial subscription created successfully:', subscriptionData);
        trialCreated = true;
      }
    } catch (trialError) {
      console.error('❌ Exception creating trial:', trialError);
      // Não bloqueia o cadastro
    }

    // Enviar email de boas-vindas (assíncrono, não bloqueia)
    emailService.sendWelcomeEmail(email, name).catch((err) => {
      console.error('⚠️ Error sending welcome email:', err);
    });

    res.status(201).json({
      message: trialCreated
        ? 'Usuário criado com sucesso! Você ganhou 7 dias grátis para testar.'
        : 'Usuário criado com sucesso! Conecte seu banco para começar.',
      token: data.session?.access_token,
      user: {
        id: data.user.id,
        name,
        email: data.user.email,
      },
      trial: trialCreated ? {
        active: true,
        days: 7,
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      } : {
        active: false,
        message: 'Trial será criado ao conectar seu primeiro banco'
      }
    });
  } catch (error) {
    console.error('❌ Error registering user:', error);
    res.status(500).json({ error: 'Erro ao criar usuário. Tente novamente mais tarde.' });
  }
});

/**
 * POST /api/auth/login
 * Autentica um usuário usando Supabase Auth
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Login attempt for:', email);

    // Validação
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Login com Supabase Auth
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

    if (error) {
      console.log('❌ Login error:', error.message);
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    if (!data.user || !data.session) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    // Buscar profile do usuário
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', data.user.id)
      .single();

    console.log('🎉 Login successful for:', email);

    res.json({
      message: 'Login realizado com sucesso',
      token: data.session.access_token,
      user: {
        id: data.user.id,
        name: profile?.name || 'Usuário',
        email: data.user.email,
      },
    });
  } catch (error) {
    console.error('❌ Error logging in:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

/**
 * POST /api/auth/oauth-callback
 * Processa callback de OAuth (Google/Facebook)
 * Cria ou atualiza usuário com base no provedor
 */
router.post('/oauth-callback', async (req: Request, res: Response) => {
  try {
    const { provider_id, email, name, avatar_url, provider }: OAuthCallbackRequest = req.body;

    console.log('🔐 OAuth callback for:', email, 'provider:', provider);

    // Validação
    if (!provider_id || !email) {
      return res.status(400).json({ error: 'Provider ID e email são obrigatórios' });
    }

    // Check if user has a subscription already
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', provider_id)
      .limit(1);

    let isNewUser = false;

    if (!existingSubscription || existingSubscription.length === 0) {
      // New user - create trial subscription
      isNewUser = true;
      console.log('🆕 New OAuth user detected:', email);

      try {
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 7); // 7 dias de trial

        const { error: subscriptionError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: provider_id,
            plan_type: 'manual',
            plan_name: 'Trial - Plano Manual',
            plan_price: 0,
            status: 'trial',
            start_date: new Date().toISOString(),
            end_date: trialEndDate.toISOString(),
            trial_end_date: trialEndDate.toISOString(),
            payment_method: null,
            payment_processor: null,
            max_connected_accounts: 0,
            auto_renew: false,
            metadata: {
              trial_days: 7,
              created_on_signup: true,
              oauth_provider: provider
            }
          });

        if (subscriptionError) {
          console.error('⚠️ Error creating trial subscription:', subscriptionError);
        } else {
          console.log('✅ Trial subscription created for OAuth user:', provider_id);
        }
      } catch (trialError) {
        console.error('⚠️ Error creating trial:', trialError);
      }

      // Send welcome email for new users
      emailService.sendWelcomeEmail(email, name).catch((err) => {
        console.error('⚠️ Error sending welcome email:', err);
      });
    } else {
      console.log('👤 Existing OAuth user:', email);
    }

    // Get the session token from the Authorization header (if present)
    const authHeader = req.headers.authorization;
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    console.log('✅ OAuth user processed:', provider_id);

    res.json({
      message: isNewUser ? 'Usuário criado com sucesso! Você ganhou 7 dias grátis para testar.' : 'Login realizado com sucesso',
      token: token,
      user: {
        id: provider_id,
        name: name || email.split('@')[0],
        email: email,
        avatar_url: avatar_url,
        provider: provider,
      },
      isNewUser,
      trial: isNewUser ? {
        active: true,
        days: 7,
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      } : undefined
    });
  } catch (error) {
    console.error('❌ Error processing OAuth callback:', error);
    res.status(500).json({ error: 'Erro ao processar autenticação' });
  }
});

/**
 * POST /api/auth/logout
 * Logout do usuário
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await supabaseAuth.auth.signOut();
    }

    res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('Error logging out:', error);
    res.json({ message: 'Logout realizado com sucesso' });
  }
});

/**
 * GET /api/auth/me
 * Retorna o usuário autenticado
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    // Extrair token do header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.substring(7);

    // Verificar token com Supabase
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    // Buscar profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({
      user: {
        id: user.id,
        name: profile.name,
        email: profile.email,
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

export default router;
