// IMPORTANTE: Carregar .env ANTES de qualquer outro import!
// Isso garante que process.env está populado antes dos services serem instanciados
import './config/env';

import express from 'express';
import cors from 'cors';
import { initDatabase } from './db/database';
import authRoutes from './routes/auth.routes';
import bankRoutes from './routes/bank.routes';
import transactionRoutes from './routes/transaction.routes';
import dashboardRoutes from './routes/dashboard.routes';

const app = express();

// Middleware - CORS configurado para aceitar Netlify e localhost
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://mycleverbot.com.br',
      'http://mycleverbot.com.br',
      process.env.FRONTEND_URL,
    ];

    // Permitir qualquer domínio *.netlify.app
    if (!origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.netlify.app') ||
        origin.endsWith('.render.com') ||
        origin.endsWith('.mycleverbot.com.br')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Inicializar banco de dados
initDatabase();

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/bank', bankRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500
    }
  });
});

// Export the app for serverless use (Vercel)
export default app;
