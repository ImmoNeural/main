/**
 * Carrega variáveis de ambiente ANTES de qualquer outro import
 * Este arquivo deve ser o PRIMEIRO a ser executado
 */
import dotenv from 'dotenv';
import path from 'path';

// Carregar .env do diretório do backend (precisa subir 2 níveis: config -> src -> backend)
const envPath = path.resolve(__dirname, '../../.env');
console.log('📂 Loading .env from:', envPath);
console.log('📂 Current __dirname:', __dirname);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn('⚠️  Warning: Could not load .env file:', result.error.message);
  console.warn('   Make sure the file exists at:', envPath);
}

// Log para debug
console.log('');
console.log('🔧 Environment Configuration:');
console.log('   PORT:', process.env.PORT || '3001');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('   OPEN_BANKING_PROVIDER:', process.env.OPEN_BANKING_PROVIDER || 'mock (not set!)');
console.log('   PLUGGY_CLIENT_ID:', process.env.PLUGGY_CLIENT_ID ? process.env.PLUGGY_CLIENT_ID.substring(0, 8) + '...' : 'NOT SET');
console.log('   PLUGGY_CLIENT_SECRET:', process.env.PLUGGY_CLIENT_SECRET ? 'SET ✅' : 'NOT SET ❌');
console.log('');
