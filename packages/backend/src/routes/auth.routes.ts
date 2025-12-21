import { Router, Request, Response } from 'express';
import { supabaseAuth, supabase } from '../config/supabase';
import { emailService } from '../services/email.service';

const router = Router();

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

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
    const { name, email, password }: RegisterRequest = req.body;

    console.log('📝 Register attempt for:', email);

    // Validação
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    // Criar usuário no Supabase Auth
    const { data, error } = await supabaseAuth.auth.signUp({
      email: email.toLowerCase(),
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) {
      console.error('❌ Supabase signup error:', error);
      if (error.message.includes('already registered')) {
        return res.status(400).json({ error: 'Email já cadastrado' });
      }
      return res.status(400).json({ error: error.message });
    }

    if (!data.user) {
      return res.status(500).json({ error: 'Erro ao criar usuário' });
    }

    console.log('✅ User created:', data.user.id);

    // Criar assinatura trial de 7 dias automaticamente
    try {
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 7); // 7 dias de trial

      const { error: subscriptionError } = await supabase
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
        });

      if (subscriptionError) {
        console.error('⚠️ Error creating trial subscription:', subscriptionError);
        // Não bloqueia o cadastro se falhar ao criar trial
      } else {
        console.log('✅ Trial subscription created for user:', data.user.id);
      }
    } catch (trialError) {
      console.error('⚠️ Error creating trial:', trialError);
      // Não bloqueia o cadastro
    }

    // Enviar email de boas-vindas (assíncrono, não bloqueia)
    emailService.sendWelcomeEmail(email, name).catch((err) => {
      console.error('⚠️ Error sending welcome email:', err);
    });

    res.status(201).json({
      message: 'Usuário criado com sucesso! Você ganhou 7 dias grátis para testar.',
      token: data.session?.access_token,
      user: {
        id: data.user.id,
        name,
        email: data.user.email,
      },
      trial: {
        active: true,
        days: 7,
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error registering user:', error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

/**
 * POST /api/auth/login
 * Autentica um usuário usando Supabase Auth
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password }: LoginRequest = req.body;

    console.log('🔐 Login attempt for:', email);

    // Validação
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Autenticar com Supabase
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

    if (error) {
      console.error('❌ Supabase login error:', error);
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    if (!data.user || !data.session) {
      console.log('❌ No user or session returned');
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    console.log('✅ User authenticated:', data.user.id);

    res.json({
      message: 'Login realizado com sucesso',
      token: data.session.access_token,
      user: {
        id: data.user.id,
        name: data.user.user_metadata?.name || data.user.email?.split('@')[0],
        email: data.user.email,
      },
    });
  } catch (error) {
    console.error('❌ Error logging in:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

/**
 * POST /api/auth/logout
 * Logout do usuário (cliente deve descartar o token)
 */
router.post('/logout', (req: Request, res: Response) => {
  // O logout é feito no cliente removendo o token
  // Aqui apenas confirmamos o logout
  res.json({ message: 'Logout realizado com sucesso' });
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

    // Verificar se o usuário já existe no Supabase
    const { data: existingUsers, error: fetchError } = await supabase
      .from('auth.users')
      .select('id, email, raw_user_meta_data')
      .eq('email', email.toLowerCase())
      .limit(1);

    // Alternative approach: use Supabase admin to check if user exists
    // Try to get user by email through auth API
    let userId = provider_id; // Use provider_id as user ID (Supabase OAuth creates user with this ID)
    let isNewUser = false;

    // Check if user has a subscription already
    const { data: existingSubscription, error: subCheckError } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', provider_id)
      .limit(1);

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
    // The frontend should send the Supabase session token
    const authHeader = req.headers.authorization;
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // If no token in header, we'll return the provider_id and let frontend handle it
    // The frontend already has the Supabase session from the OAuth flow

    console.log('✅ OAuth user processed:', provider_id);

    res.json({
      message: isNewUser ? 'Usuário criado com sucesso! Você ganhou 7 dias grátis para testar.' : 'Login realizado com sucesso',
      token: token, // Return whatever token we have
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
 * GET /api/auth/me
 * Retorna o usuário autenticado usando Supabase Auth
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
    const { data, error } = await supabaseAuth.auth.getUser(token);

    if (error || !data.user) {
      console.error('❌ Token verification failed:', error);
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    res.json({
      user: {
        id: data.user.id,
        name: data.user.user_metadata?.name || data.user.email?.split('@')[0],
        email: data.user.email,
        created_at: data.user.created_at,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching user:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

export default router;
