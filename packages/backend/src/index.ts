// Local development server entry point
import app from './app';
import { initCronJobs } from './services/cron.service';

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard API ready`);

  // Inicializar tarefas agendadas (cron jobs)
  initCronJobs();
});

// Aumentar timeout para 5 minutos (para suportar importações grandes)
server.timeout = 300000; // 5 minutos em ms
