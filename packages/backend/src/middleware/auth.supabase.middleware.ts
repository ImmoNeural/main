import { Request, Response, NextFunction } from 'express';
import { supabaseAuth } from '../config/supabase';

// Lista de emails de administradores (para impersonação)
const ADMIN_EMAILS = [
  'neurekaai@gmail.com',
];

// Extender interface do Express Request
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
    req.isImpersonating = false;

    // Verificar se admin está tentando impersonar outro usuário
    const impersonateUserId = req.headers['x-impersonate-user'] as string;

    if (impersonateUserId) {
      console.log(`🎭 [Impersonate] Header recebido: ${impersonateUserId}`);
      console.log(`🎭 [Impersonate] Email do usuário: ${user.email}`);
      console.log(`🎭 [Impersonate] É admin? ${ADMIN_EMAILS.includes(user.email || '')}`);
    }

    if (impersonateUserId && user.email && ADMIN_EMAILS.includes(user.email)) {
      console.log(`🎭 [Impersonate] ✅ Admin ${user.email} impersonando usuário ${impersonateUserId}`);
      req.originalUserId = user.id;
      req.userId = impersonateUserId;
      req.isImpersonating = true;
    }

    console.log(`✅ Auth middleware: User authenticated - ${user.email} (${req.userId.substring(0, 8)}...)${req.isImpersonating ? ' [IMPERSONATING]' : ''}`);

    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    return res.status(401).json({ error: 'Falha na autenticação' });
  }
};
