import { Request, Response, NextFunction } from 'express';
import { supabaseAuth } from '../config/supabase';

// Estender o tipo Request do Express para incluir userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

/**
 * Middleware de autenticação usando Supabase Auth
 * Verifica se o token é válido e adiciona userId ao request
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
