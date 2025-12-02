import { Request, Response, NextFunction } from 'express';
import { supabaseAuth } from '../config/supabase';

// Lista de emails de administradores (para impersonação)
const ADMIN_EMAILS = [
  'neurekaai@gmail.com',
];

// Estender o tipo Request do Express para incluir userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
      isImpersonating?: boolean;
      originalUserId?: string;
    }
  }
}

/**
 * Middleware de autenticação usando Supabase Auth
 * Verifica se o token é válido e adiciona userId ao request
 * Suporta impersonação para admins via header X-Impersonate-User
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
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
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    // Adicionar userId e email ao request
    req.userId = data.user.id;
    req.userEmail = data.user.email;
    req.isImpersonating = false;

    // Verificar se admin está tentando impersonar outro usuário
    const impersonateUserId = req.headers['x-impersonate-user'] as string;
    if (impersonateUserId && data.user.email && ADMIN_EMAILS.includes(data.user.email)) {
      console.log(`🎭 [Impersonate] Admin ${data.user.email} impersonando usuário ${impersonateUserId}`);
      req.originalUserId = data.user.id;
      req.userId = impersonateUserId;
      req.isImpersonating = true;
    }

    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    return res.status(500).json({ error: 'Erro na autenticação' });
  }
};

/**
 * Middleware opcional de autenticação
 * Se o token existir e for válido, adiciona userId ao request
 * Se não existir ou for inválido, continua sem adicionar userId
 */
export const optionalAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    // Verificar token com Supabase
    const { data, error } = await supabaseAuth.auth.getUser(token);

    if (!error && data.user) {
      req.userId = data.user.id;
      req.userEmail = data.user.email;
    }
  } catch (error) {
    // Ignorar erros e continuar sem autenticação
  }

  next();
};
