import { Capacitor } from '@capacitor/core';

interface BudgetStatus {
  categoryName: string;
  budgetValue: number;
  spent: number;
  percentUsed: number;
  tipoCusto: string;
}

class NotificationService {
  private isNative: boolean;
  private LocalNotifications: any = null;

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }

  private async loadPlugin() {
    if (this.isNative && !this.LocalNotifications) {
      const module = await import('@capacitor/local-notifications');
      this.LocalNotifications = module.LocalNotifications;
    }
  }

  async checkPermission(): Promise<boolean> {
    if (!this.isNative) return false;

    try {
      await this.loadPlugin();
      const permission = await this.LocalNotifications.checkPermissions();
      return permission.display === 'granted';
    } catch (error) {
      console.error('Error checking notification permission:', error);
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isNative) return false;

    try {
      await this.loadPlugin();
      const permission = await this.LocalNotifications.requestPermissions();
      return permission.display === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async sendBudgetAlert(budget: BudgetStatus): Promise<void> {
    if (!this.isNative) return;

    const enabled = localStorage.getItem('notifications_enabled') === 'true';
    if (!enabled) return;

    try {
      await this.loadPlugin();

      let title = '';
      let body = '';
      const id = Math.floor(Math.random() * 100000);

      if (budget.percentUsed >= 100) {
        // Budget estourado
        title = `🚨 Budget estourado: ${budget.categoryName}`;
        body = `Você já gastou R$ ${budget.spent.toFixed(2)} de R$ ${budget.budgetValue.toFixed(2)} (${budget.percentUsed.toFixed(0)}%)`;
      } else if (budget.percentUsed >= 75) {
        // Alerta de 75%
        title = `⚠️ Atenção: ${budget.categoryName}`;
        body = `Você já usou ${budget.percentUsed.toFixed(0)}% do seu budget. Restam R$ ${(budget.budgetValue - budget.spent).toFixed(2)}`;
      } else if (budget.percentUsed >= 50) {
        // Alerta de 50%
        title = `📊 ${budget.categoryName}`;
        body = `Metade do mês e ${budget.percentUsed.toFixed(0)}% do budget usado. Restam R$ ${(budget.budgetValue - budget.spent).toFixed(2)}`;
      }

      if (title) {
        await this.LocalNotifications.schedule({
          notifications: [
            {
              id,
              title,
              body,
              schedule: { at: new Date(Date.now() + 1000) }, // 1 segundo
              sound: 'default',
              smallIcon: 'ic_stat_icon_config_sample',
              iconColor: '#22c55e',
            },
          ],
        });
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  async checkBudgetsAndNotify(budgets: BudgetStatus[]): Promise<void> {
    if (!this.isNative) return;

    const enabled = localStorage.getItem('notifications_enabled') === 'true';
    if (!enabled) return;

    // Calcular dia do mês e porcentagem do mês
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const currentDay = today.getDate();
    const monthProgress = (currentDay / daysInMonth) * 100;

    // Chave para controlar notificações já enviadas hoje
    const notificationKey = `budget_notifications_${today.toISOString().split('T')[0]}`;
    const sentNotifications = JSON.parse(localStorage.getItem(notificationKey) || '{}');

    for (const budget of budgets) {
      const budgetKey = `${budget.categoryName}_${budget.tipoCusto}`;

      // Não enviar notificação se já enviou hoje para este budget
      if (sentNotifications[budgetKey]) continue;

      // Verificar se deve notificar
      let shouldNotify = false;

      if (budget.percentUsed >= 100 && !sentNotifications[`${budgetKey}_100`]) {
        shouldNotify = true;
        sentNotifications[`${budgetKey}_100`] = true;
      } else if (budget.percentUsed >= 75 && budget.percentUsed < 100 && !sentNotifications[`${budgetKey}_75`]) {
        shouldNotify = true;
        sentNotifications[`${budgetKey}_75`] = true;
      } else if (budget.percentUsed >= monthProgress && budget.percentUsed >= 50 && !sentNotifications[`${budgetKey}_50`]) {
        // Notificar se gasto está acima do esperado para o dia do mês
        shouldNotify = true;
        sentNotifications[`${budgetKey}_50`] = true;
      }

      if (shouldNotify) {
        await this.sendBudgetAlert(budget);
        sentNotifications[budgetKey] = true;
      }
    }

    localStorage.setItem(notificationKey, JSON.stringify(sentNotifications));
  }

  // Limpar notificações antigas (manter apenas últimos 7 dias)
  cleanOldNotificationKeys(): void {
    const today = new Date();
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('budget_notifications_')) {
        const dateStr = key.replace('budget_notifications_', '');
        const keyDate = new Date(dateStr);
        const daysDiff = Math.floor((today.getTime() - keyDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff > 7) {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
}

export const notificationService = new NotificationService();
export default notificationService;
