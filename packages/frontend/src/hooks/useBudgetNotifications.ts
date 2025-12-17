import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { budgetApi } from '../services/api';
import notificationService from '../services/notificationService';

export const useBudgetNotifications = () => {
  const hasChecked = useRef(false);

  useEffect(() => {
    // Só verificar uma vez por sessão e apenas em mobile
    if (hasChecked.current || !Capacitor.isNativePlatform()) return;

    const checkBudgets = async () => {
      try {
        // Verificar se notificações estão habilitadas
        const enabled = localStorage.getItem('notifications_enabled') === 'true';
        if (!enabled) return;

        // Verificar se já checou hoje
        const today = new Date().toISOString().split('T')[0];
        const lastCheck = localStorage.getItem('last_budget_notification_check');
        if (lastCheck === today) return;

        hasChecked.current = true;

        // Buscar budgets da API
        const response = await budgetApi.getAllBudgets();
        const budgets = response.data;

        if (!budgets || Object.keys(budgets).length === 0) return;

        // Buscar dados de gastos do mês atual
        const detailedResponse = await budgetApi.getDetailedBudgets();
        const detailedBudgets = detailedResponse.data || [];

        // Calcular status de cada budget
        const budgetStatuses = detailedBudgets
          .filter((b: any) => b.budget_value > 0)
          .map((b: any) => ({
            categoryName: b.category_name,
            budgetValue: b.budget_value,
            spent: Math.abs(b.current_spent || 0),
            percentUsed: b.budget_value > 0
              ? (Math.abs(b.current_spent || 0) / b.budget_value) * 100
              : 0,
            tipoCusto: b.tipo_custo,
          }));

        // Verificar e enviar notificações
        await notificationService.checkBudgetsAndNotify(budgetStatuses);

        // Marcar como verificado hoje
        localStorage.setItem('last_budget_notification_check', today);

        // Limpar chaves antigas
        notificationService.cleanOldNotificationKeys();
      } catch (error) {
        console.error('Error checking budgets for notifications:', error);
      }
    };

    // Aguardar um pouco para não atrapalhar o carregamento inicial
    const timer = setTimeout(checkBudgets, 3000);

    return () => clearTimeout(timer);
  }, []);
};

export default useBudgetNotifications;
