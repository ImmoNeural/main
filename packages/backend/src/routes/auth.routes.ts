import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d'; // Token válido por 7 dias

interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: number;
  updated_at: number;
}

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

/**
 * POST /api/auth/register
 * Registra um novo usuário
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password }: RegisterRequest = req.body;

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

    // Verificar se o email já existe
    const existingUser = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(email.toLowerCase()) as User | undefined;

    if (existingUser) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Hash da senha
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Criar usuário
    const userId = uuidv4();
    const now = Date.now();

    db.prepare(
      `INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(userId, name, email.toLowerCase(), password_hash, now, now);

    // Gerar token JWT
    const token = jwt.sign({ userId, email: email.toLowerCase() }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      token,
      user: {
        id: userId,
        name,
        email: email.toLowerCase(),
      },
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

/**
 * POST /api/auth/login
 * Autentica um usuário
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

    // Buscar usuário
    const user = db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email.toLowerCase()) as User | undefined;

    if (!user) {
      console.log('❌ User not found:', email.toLowerCase());
      // Listar todos os usuários para debug (apenas em dev/staging)
      const allUsers = db.prepare('SELECT email FROM users').all();
      console.log('📋 All users in DB:', allUsers);
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    console.log('✅ User found:', user.email);

    // Verificar senha
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    console.log('✅ Password valid, generating token');

    // Gerar token JWT
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    console.log('🎉 Login successful for:', email);

    res.json({
      message: 'Login realizado com sucesso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
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
 * GET /api/auth/me
 * Retorna o usuário autenticado
 */
router.get('/me', (req: Request, res: Response) => {
  try {
    // Extrair token do header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.substring(7);

    // Verificar e decodificar token
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };

    // Buscar usuário
    const user = db
      .prepare('SELECT id, name, email, created_at FROM users WHERE id = ?')
      .get(decoded.userId) as Omit<User, 'password_hash' | 'updated_at'> | undefined;

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ user });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Token inválido' });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expirado' });
    }
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

export default router;
