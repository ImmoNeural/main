import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { initDatabase } from './db/database';
import bankRoutes from './routes/bank.routes';
import transactionRoutes from './routes/transaction.routes';
import dashboardRoutes from './routes/dashboard.routes';

// Carregar .env do diretório do backend
const envPath = path.resolve(__dirname, '../.env');
console.log('📂 Loading .env from:', envPath);
dotenv.config({ path: envPath });

// Log para debug
console.log('');
console.log('🔧 Environment Configuration:');
console.log('   PORT:', process.env.PORT || '3001');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('   OPEN_BANKING_PROVIDER:', process.env.OPEN_BANKING_PROVIDER || 'mock (not set!)');
console.log('   PLUGGY_CLIENT_ID:', process.env.PLUGGY_CLIENT_ID ? process.env.PLUGGY_CLIENT_ID.substring(0, 8) + '...' : 'NOT SET');
console.log('   PLUGGY_CLIENT_SECRET:', process.env.PLUGGY_CLIENT_SECRET ? 'SET ✅' : 'NOT SET ❌');
console.log('');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Inicializar banco de dados
initDatabase();

// Rotas
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

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard API ready`);
});
