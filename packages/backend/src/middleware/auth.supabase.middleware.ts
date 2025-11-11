import { Request, Response, NextFunction } from 'express';
import { supabaseAuth } from '../config/supabase';

// Extender interface do Express Request
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
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Auth middleware: No token provided');
      return res.status(401).json({ error: 'Token de autenticação não fornecido' });
    }

    const token = authHeader.substring(7);
    console.log(`🔑 Auth middleware: Validating token (${token.substring(0, 20)}...)`);

    // Verificar token com Supabase
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);

    if (error) {
      console.log('❌ Auth middleware: Supabase error:', error.message);
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    if (!user) {
      console.log('❌ Auth middleware: No user found for token');
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    // Adicionar user ID ao request
    req.userId = user.id;
    req.userEmail = user.email;
    console.log(`✅ Auth middleware: User authenticated - ${user.email} (${user.id.substring(0, 8)}...)`);

    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    return res.status(401).json({ error: 'Falha na autenticação' });
  }
};
