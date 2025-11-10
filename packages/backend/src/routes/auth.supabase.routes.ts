import { Router, Request, Response } from 'express';
import { supabaseAuth, supabase } from '../config/supabase';

const router = Router();

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

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      token: data.session?.access_token,
      user: {
        id: data.user.id,
        name,
        email: data.user.email,
      },
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
