import { Resend } from 'resend';

// Inicializar Resend apenas se a chave estiver configurada
const resendKey = process.env.RESEND_API_KEY;
const resend = resendKey ? new Resend(resendKey) : null;

if (!resend) {
  console.warn('⚠️ Resend não configurado - funcionalidades de email desabilitadas');
}

// Email de origem (configurar no Resend dashboard)
const FROM_EMAIL = process.env.FROM_EMAIL || 'Guru do Dindin <noreply@gurudodindin.com.br>';
const FROM_EMAIL_PERSONAL = 'Thiago do Guru do Dindin <thiago@gurudodindin.com.br>';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'suporte@gurudodindin.com.br';

// URL do logo branco para emails (hospedado no site)
const LOGO_URL = 'https://gurudodindin.com.br/logobranco.png';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

// Template SIMPLES para emails pessoais (melhor deliverability)
const getSimpleEmailTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333;">
  ${content}
</body>
</html>
`;

// Template base do email com estilo azul do login
const getEmailTemplate = (content: string, preheader: string = '') => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Guru do Dindin</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <!-- Preheader text (aparece no preview do email) -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${preheader}
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header Azul com Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #0284c7 0%, #0ea5e9 50%, #0284c7 100%); padding: 30px; text-align: center;">
              <img
                src="${LOGO_URL}"
                alt="Guru do Dindin"
                width="60"
                height="60"
                style="display: block; margin: 0 auto 15px auto;"
              />
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">
                Guru do Dindin
              </h1>
              <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0; font-size: 14px;">
                Seu Guru das Finanças
              </p>
            </td>
          </tr>

          <!-- Conteúdo -->
          ${content}

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 25px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 11px; margin: 0;">
                © ${new Date().getFullYear()} Guru do Dindin. Todos os direitos reservados.
              </p>
              <p style="color: #9ca3af; font-size: 11px; margin: 8px 0 0 0;">
                <a href="https://gurudodindin.com.br/privacidade" style="color: #9ca3af; text-decoration: underline;">Privacidade</a>
                &nbsp;•&nbsp;
                <a href="https://gurudodindin.com.br/termos" style="color: #9ca3af; text-decoration: underline;">Termos</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

class EmailService {
  /**
   * Verificar se o serviço de email está disponível
   */
  isAvailable(): boolean {
    return resend !== null;
  }

  /**
   * Enviar email genérico
   */
  async sendEmail(params: SendEmailParams): Promise<boolean> {
    if (!resend) {
      console.warn('⚠️ Email não enviado - Resend não configurado');
      return false;
    }

    try {
      const { data, error } = await resend.emails.send({
        from: params.from || FROM_EMAIL,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });

      if (error) {
        console.error('❌ Erro ao enviar email:', error);
        return false;
      }

      console.log('✅ Email enviado:', data?.id, 'para:', params.to);
      return true;
    } catch (error: any) {
      console.error('❌ Erro ao enviar email:', error.message);
      return false;
    }
  }

  /**
   * Email de boas-vindas no cadastro
   */
  async sendWelcomeEmail(to: string, userName: string): Promise<boolean> {
    const subject = 'Bem-vindo ao Guru do Dindin!';
    const preheader = 'Você deu o primeiro passo para organizar suas finanças. Seu teste grátis de 7 dias já está ativo!';

    const content = `
      <tr>
        <td style="padding: 35px;">
          <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 20px;">
            Oi, ${userName || 'novo usuário'}!
          </h2>

          <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 15px 0;">
            Organizar as finanças pode parecer complicado, mas você já deu o passo mais importante: <strong>começar</strong>.
          </p>

          <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
            Complete o card <strong>"Primeiros Passos"</strong> na tela inicial para ganhar controle do seu dinheiro desde o começo.
          </p>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
            <tr>
              <td align="center">
                <a href="https://gurudodindin.com.br/app/dashboard"
                   style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-size: 14px; font-weight: bold;">
                  Acessar Primeiros Passos
                </a>
              </td>
            </tr>
          </table>

          <!-- Trial Info Box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
            <tr>
              <td style="padding: 15px; background-color: #eff6ff; border-radius: 10px; border: 1px solid #bfdbfe;">
                <p style="margin: 0; color: #1e40af; font-size: 13px; line-height: 1.5;">
                  <strong>Seu teste grátis de 7 dias já está ativo!</strong><br>
                  Explore os recursos e veja como o Guru pode facilitar sua vida financeira.
                </p>
              </td>
            </tr>
          </table>

          <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 20px 0 5px 0;">
            Nos vemos por aqui!
          </p>
          <p style="color: #0284c7; font-size: 14px; font-weight: bold; margin: 0;">
            Equipe Guru do Dindin
          </p>
        </td>
      </tr>
    `;

    const html = getEmailTemplate(content, preheader);

    const text = `
Oi, ${userName || 'novo usuário'}!

Organizar as finanças pode parecer complicado, mas você já deu o passo mais importante: começar.

Complete o card "Primeiros Passos" na tela inicial para ganhar controle do seu dinheiro desde o começo.

Acessar: https://gurudodindin.com.br/app/dashboard

Seu teste grátis de 7 dias já está ativo! Explore os recursos e veja como o Guru pode facilitar sua vida financeira.

Nos vemos por aqui!
Equipe Guru do Dindin

---
© ${new Date().getFullYear()} Guru do Dindin. Todos os direitos reservados.
    `;

    return this.sendEmail({ to, subject, html, text });
  }

  /**
   * Email de confirmação de compra/assinatura
   */
  async sendPurchaseConfirmationEmail(
    to: string,
    userName: string,
    planName: string,
    price: number,
    nextBillingDate: Date,
    isTrialActive: boolean = false,
    trialDaysRemaining: number = 0
  ): Promise<boolean> {
    const formattedPrice = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);

    const formattedDate = nextBillingDate.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const subject = isTrialActive
      ? `Plano ${planName} ativado`
      : `Confirmação de assinatura - ${planName}`;

    const preheader = isTrialActive
      ? `Seu plano foi ativado! Primeira cobrança em ${trialDaysRemaining} dias.`
      : `Pagamento confirmado para o ${planName}.`;

    const content = `
      <tr>
        <td style="padding: 35px;">
          <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 20px;">
            ${isTrialActive ? 'Seu plano foi ativado!' : 'Pagamento confirmado!'}
          </h2>

          <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
            Olá, ${userName || 'usuário'}! ${isTrialActive
              ? `Você escolheu o <strong>${planName}</strong> e seu período de teste continua ativo.`
              : `Sua assinatura do <strong>${planName}</strong> foi confirmada.`}
          </p>

          <!-- Plan Details Box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 10px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <tr>
              <td style="padding: 20px;">
                <h3 style="color: #1f2937; margin: 0 0 12px 0; font-size: 15px;">
                  Detalhes da Assinatura
                </h3>

                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Plano:</td>
                    <td style="padding: 6px 0; color: #1f2937; font-size: 13px; text-align: right; font-weight: bold;">${planName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Valor mensal:</td>
                    <td style="padding: 6px 0; color: #1f2937; font-size: 13px; text-align: right; font-weight: bold;">${formattedPrice}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">${isTrialActive ? 'Primeira cobrança:' : 'Próxima cobrança:'}</td>
                    <td style="padding: 6px 0; color: #1f2937; font-size: 13px; text-align: right; font-weight: bold;">${formattedDate}</td>
                  </tr>
                  ${isTrialActive ? `
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Dias restantes de teste:</td>
                    <td style="padding: 6px 0; color: #0284c7; font-size: 13px; text-align: right; font-weight: bold;">${trialDaysRemaining} dias</td>
                  </tr>
                  ` : ''}
                </table>
              </td>
            </tr>
          </table>

          ${isTrialActive ? `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 15px 0;">
            <tr>
              <td style="background-color: #fef3c7; border-radius: 8px; padding: 12px;">
                <p style="color: #92400e; font-size: 12px; margin: 0; line-height: 1.5;">
                  <strong>Importante:</strong> Seu cartão só será cobrado em ${formattedDate}. Você pode cancelar antes sem custo.
                </p>
              </td>
            </tr>
          </table>
          ` : ''}

          <p style="color: #4b5563; font-size: 13px; line-height: 1.6; margin: 15px 0;">
            A cobrança é automática. Gerencie sua assinatura na página de Planos.
          </p>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
            <tr>
              <td align="center">
                <a href="https://gurudodindin.com.br/app/planos"
                   style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-size: 14px; font-weight: bold;">
                  Gerenciar Assinatura
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;

    const html = getEmailTemplate(content, preheader);

    const text = `
Olá, ${userName || 'usuário'}!

${isTrialActive
  ? `Você escolheu o ${planName} e seu período de teste continua ativo.`
  : `Sua assinatura do ${planName} foi confirmada.`}

Detalhes:
- Plano: ${planName}
- Valor: ${formattedPrice}/mês
- ${isTrialActive ? 'Primeira cobrança' : 'Próxima cobrança'}: ${formattedDate}
${isTrialActive ? `- Dias restantes de teste: ${trialDaysRemaining}` : ''}

${isTrialActive
  ? `Importante: Seu cartão só será cobrado em ${formattedDate}. Você pode cancelar antes sem custo.`
  : ''}

Gerenciar: https://gurudodindin.com.br/app/planos

---
© ${new Date().getFullYear()} Guru do Dindin. Todos os direitos reservados.
    `;

    return this.sendEmail({ to, subject, html, text });
  }
  /**
   * Email de alerta de saldo negativo
   * Enviado quando uma conta bancária fica com saldo negativo
   */
  async sendNegativeBalanceAlert(
    to: string,
    userName: string,
    accountName: string,
    currentBalance: number,
    previousBalance?: number
  ): Promise<boolean> {
    const formattedCurrentBalance = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(currentBalance);

    const formattedPreviousBalance = previousBalance !== undefined
      ? new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(previousBalance)
      : null;

    const subject = `Atenção: Saldo negativo em ${accountName}`;
    const preheader = `Sua conta ${accountName} está com saldo de ${formattedCurrentBalance}. Confira no Guru do Dindin.`;

    const content = `
      <tr>
        <td style="padding: 35px;">
          <!-- Alert Icon -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
            <tr>
              <td align="center">
                <div style="width: 70px; height: 70px; background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 50%; display: inline-block; text-align: center; line-height: 70px;">
                  <span style="font-size: 35px;">⚠️</span>
                </div>
              </td>
            </tr>
          </table>

          <h2 style="color: #dc2626; margin: 0 0 15px 0; font-size: 20px; text-align: center;">
            Saldo Negativo Detectado
          </h2>

          <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0; text-align: center;">
            Olá, ${userName || 'usuário'}! Identificamos que sua conta <strong>${accountName}</strong> está com saldo negativo.
          </p>

          <!-- Balance Box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 12px; margin: 20px 0; border: 1px solid #fecaca;">
            <tr>
              <td style="padding: 25px; text-align: center;">
                <p style="color: #991b1b; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 1px;">
                  Saldo Atual
                </p>
                <p style="color: #dc2626; font-size: 32px; font-weight: bold; margin: 0;">
                  ${formattedCurrentBalance}
                </p>
                ${formattedPreviousBalance ? `
                <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">
                  Saldo anterior: ${formattedPreviousBalance}
                </p>
                ` : ''}
              </td>
            </tr>
          </table>

          <!-- Tips Box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fffbeb; border-radius: 10px; margin: 20px 0; border: 1px solid #fde68a;">
            <tr>
              <td style="padding: 18px;">
                <p style="color: #92400e; font-size: 13px; font-weight: bold; margin: 0 0 10px 0;">
                  💡 Dicas do Guru:
                </p>
                <ul style="color: #78350f; font-size: 12px; margin: 0; padding-left: 18px; line-height: 1.8;">
                  <li>Verifique suas despesas recentes</li>
                  <li>Confira se há cobranças inesperadas</li>
                  <li>Considere transferir fundos de outra conta</li>
                  <li>Evite juros do cheque especial se possível</li>
                </ul>
              </td>
            </tr>
          </table>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
            <tr>
              <td align="center">
                <a href="https://gurudodindin.com.br/app/transactions"
                   style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-size: 14px; font-weight: bold;">
                  Ver Minhas Transações
                </a>
              </td>
            </tr>
          </table>

          <p style="color: #9ca3af; font-size: 11px; text-align: center; margin: 20px 0 0 0;">
            Este alerta é enviado automaticamente quando detectamos saldo negativo em sua conta durante a sincronização diária.
          </p>
        </td>
      </tr>
    `;

    const html = getEmailTemplate(content, preheader);

    const text = `
⚠️ ALERTA: Saldo Negativo Detectado

Olá, ${userName || 'usuário'}!

Identificamos que sua conta ${accountName} está com saldo negativo.

Saldo Atual: ${formattedCurrentBalance}
${formattedPreviousBalance ? `Saldo Anterior: ${formattedPreviousBalance}` : ''}

Dicas do Guru:
- Verifique suas despesas recentes
- Confira se há cobranças inesperadas
- Considere transferir fundos de outra conta
- Evite juros do cheque especial se possível

Acesse: https://gurudodindin.com.br/app/transactions

---
© ${new Date().getFullYear()} Guru do Dindin. Todos os direitos reservados.
    `;

    return this.sendEmail({ to, subject, html, text });
  }

  /**
   * Enviar email de teste de saldo negativo
   * Usado apenas para testes manuais
   */
  async sendTestNegativeBalanceAlert(to: string): Promise<boolean> {
    return this.sendNegativeBalanceAlert(
      to,
      'Thiago',
      'Itaú Conta Corrente',
      -523.47,
      1250.00
    );
  }

  /**
   * Email de convite para teste Alpha do app
   */
  async sendTutorialEmail(to: string, userName: string = 'usuário'): Promise<boolean> {
    const subject = '🎉 Obrigado por participar do Teste Alpha - Guru do Dindin';
    const preheader = 'Você foi convidado para testar o Guru do Dindin! Instale e mantenha o app por 14 dias.';

    const content = `
      <tr>
        <td style="padding: 35px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px; text-align: center;">
            🎉 Obrigado por Testar o Guru do Dindin!
          </h2>

          <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 15px 0; text-align: center;">
            Olá, ${userName}! Muito obrigado por aceitar participar do nosso <strong>Teste Closed Alpha</strong> na Google Play Store.
          </p>

          <!-- Alpha Test Info Box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%); border-radius: 12px; margin: 20px 0; border: 1px solid #fde68a;">
            <tr>
              <td style="padding: 20px;">
                <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 15px;">📋 O que você precisa fazer:</h3>
                <ul style="color: #78350f; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li><strong>Instalar o app</strong> pelo link abaixo</li>
                  <li><strong>Manter instalado por 14 dias</strong> (requisito do Google)</li>
                  <li>Não precisa usar ativamente, mas se quiser testar, fique à vontade!</li>
                  <li>Se possível, nos dê <strong>feedbacks</strong> sobre sua experiência</li>
                </ul>
              </td>
            </tr>
          </table>

          <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 25px 0; text-align: center;">
            Abaixo está um guia rápido caso queira explorar o app:
          </p>

          <!-- PASSO 1 -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
            <tr>
              <td style="background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%); border-radius: 12px; padding: 20px; border-left: 4px solid #3b82f6;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="50" valign="top">
                      <div style="width: 40px; height: 40px; background: #3b82f6; border-radius: 50%; text-align: center; line-height: 40px; color: white; font-weight: bold; font-size: 18px;">1</div>
                    </td>
                    <td valign="top">
                      <h3 style="color: #1e40af; margin: 0 0 8px 0; font-size: 16px;">🏦 Conecte suas Contas Bancárias</h3>
                      <p style="color: #4b5563; font-size: 13px; margin: 0; line-height: 1.5;">
                        Vá em <strong>Configurações → Conexões Bancárias</strong> e conecte suas contas via Open Finance.
                        Seus dados são sincronizados automaticamente e com total segurança.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- PASSO 2 -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
            <tr>
              <td style="background: linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%); border-radius: 12px; padding: 20px; border-left: 4px solid #22c55e;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="50" valign="top">
                      <div style="width: 40px; height: 40px; background: #22c55e; border-radius: 50%; text-align: center; line-height: 40px; color: white; font-weight: bold; font-size: 18px;">2</div>
                    </td>
                    <td valign="top">
                      <h3 style="color: #166534; margin: 0 0 8px 0; font-size: 16px;">📊 Veja seu Dashboard</h3>
                      <p style="color: #4b5563; font-size: 13px; margin: 0; line-height: 1.5;">
                        O <strong>Dashboard</strong> mostra uma visão geral das suas finanças: saldo total,
                        receitas, despesas e gráficos de evolução. Tudo em um só lugar!
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- PASSO 3 -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
            <tr>
              <td style="background: linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%); border-radius: 12px; padding: 20px; border-left: 4px solid #f59e0b;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="50" valign="top">
                      <div style="width: 40px; height: 40px; background: #f59e0b; border-radius: 50%; text-align: center; line-height: 40px; color: white; font-weight: bold; font-size: 18px;">3</div>
                    </td>
                    <td valign="top">
                      <h3 style="color: #92400e; margin: 0 0 8px 0; font-size: 16px;">🏷️ Categorize suas Transações</h3>
                      <p style="color: #4b5563; font-size: 13px; margin: 0; line-height: 1.5;">
                        Na página <strong>Transações</strong>, clique em qualquer transação para categorizar.
                        O Guru aprende com suas escolhas e categoriza automaticamente transações similares!
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- PASSO 4 -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
            <tr>
              <td style="background: linear-gradient(135deg, #fce7f3 0%, #fdf2f8 100%); border-radius: 12px; padding: 20px; border-left: 4px solid #ec4899;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="50" valign="top">
                      <div style="width: 40px; height: 40px; background: #ec4899; border-radius: 50%; text-align: center; line-height: 40px; color: white; font-weight: bold; font-size: 18px;">4</div>
                    </td>
                    <td valign="top">
                      <h3 style="color: #9d174d; margin: 0 0 8px 0; font-size: 16px;">📈 Analise seus Gastos</h3>
                      <p style="color: #4b5563; font-size: 13px; margin: 0; line-height: 1.5;">
                        Use os <strong>filtros</strong> para ver gastos por período, categoria ou conta.
                        Identifique onde você mais gasta e tome decisões melhores!
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- PASSO 5 -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
            <tr>
              <td style="background: linear-gradient(135deg, #e0e7ff 0%, #eef2ff 100%); border-radius: 12px; padding: 20px; border-left: 4px solid #6366f1;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="50" valign="top">
                      <div style="width: 40px; height: 40px; background: #6366f1; border-radius: 50%; text-align: center; line-height: 40px; color: white; font-weight: bold; font-size: 18px;">5</div>
                    </td>
                    <td valign="top">
                      <h3 style="color: #4338ca; margin: 0 0 8px 0; font-size: 16px;">🔔 Receba Alertas Importantes</h3>
                      <p style="color: #4b5563; font-size: 13px; margin: 0; line-height: 1.5;">
                        O Guru te avisa quando seu <strong>saldo ficar negativo</strong> ou quando detectar
                        <strong>transações duplicadas</strong>. Fique sempre no controle!
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Recursos Box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 12px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <tr>
              <td style="padding: 20px;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 15px; text-align: center;">
                  ✨ Recursos Especiais
                </h3>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="50%" style="padding: 8px; vertical-align: top;">
                      <p style="margin: 0; font-size: 12px; color: #4b5563;">
                        <strong style="color: #0284c7;">🔄 Sincronização Automática</strong><br>
                        Suas transações são atualizadas diariamente
                      </p>
                    </td>
                    <td width="50%" style="padding: 8px; vertical-align: top;">
                      <p style="margin: 0; font-size: 12px; color: #4b5563;">
                        <strong style="color: #0284c7;">🔍 Detecção de Duplicadas</strong><br>
                        Identificamos transações repetidas
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td width="50%" style="padding: 8px; vertical-align: top;">
                      <p style="margin: 0; font-size: 12px; color: #4b5563;">
                        <strong style="color: #0284c7;">🤖 Categorização Inteligente</strong><br>
                        IA que aprende com você
                      </p>
                    </td>
                    <td width="50%" style="padding: 8px; vertical-align: top;">
                      <p style="margin: 0; font-size: 12px; color: #4b5563;">
                        <strong style="color: #0284c7;">📱 Acesse de Qualquer Lugar</strong><br>
                        Web e aplicativo mobile
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
            <tr>
              <td align="center">
                <a href="https://play.google.com/store/apps/details?id=com.gurudodindin.app"
                   style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-size: 14px; font-weight: bold;">
                  📲 Instalar o App na Play Store
                </a>
              </td>
            </tr>
          </table>

          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 20px 0 0 0;">
            Dúvidas ou feedbacks? Responda este email diretamente - sua opinião é muito importante!
          </p>
        </td>
      </tr>
    `;

    const html = getEmailTemplate(content, preheader);

    const text = `
🎉 OBRIGADO POR PARTICIPAR DO TESTE ALPHA - GURU DO DINDIN

Olá, ${userName}!

Muito obrigado por aceitar participar do nosso Teste Closed Alpha na Google Play Store.

📋 O QUE VOCÊ PRECISA FAZER:
- Instalar o app pelo link abaixo
- Manter instalado por 14 dias (requisito do Google)
- Não precisa usar ativamente, mas se quiser testar, fique à vontade!
- Se possível, nos dê feedbacks sobre sua experiência

📲 INSTALAR O APP:
https://play.google.com/store/apps/details?id=com.gurudodindin.app

---

GUIA RÁPIDO (opcional):

1. 🏦 CONECTE SUAS CONTAS BANCÁRIAS
Vá em Configurações → Conexões Bancárias e conecte suas contas via Open Finance.

2. 📊 VEJA SEU DASHBOARD
O Dashboard mostra uma visão geral das suas finanças.

3. 🏷️ CATEGORIZE SUAS TRANSAÇÕES
Na página Transações, clique em qualquer transação para categorizar.

4. 📈 ANALISE SEUS GASTOS
Use os filtros para ver gastos por período, categoria ou conta.

5. 🔔 RECEBA ALERTAS IMPORTANTES
O Guru te avisa quando seu saldo ficar negativo ou detectar transações duplicadas.

Dúvidas ou feedbacks? Responda este email diretamente!

---
© ${new Date().getFullYear()} Guru do Dindin. Todos os direitos reservados.
    `;

    return this.sendEmail({ to, subject, html, text });
  }
  /**
   * Email explicando Open Finance e como conectar banco
   */
  async sendOpenFinanceEmail(to: string, userName: string = 'usuário'): Promise<boolean> {
    const subject = '🏦 Conecte seu banco em segundos com Open Finance - Guru do Dindin';
    const preheader = 'Descubra como é fácil e seguro conectar suas contas bancárias automaticamente!';

    const content = `
      <tr>
        <td style="padding: 35px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px; text-align: center;">
            🏦 Conecte seu Banco em Segundos!
          </h2>

          <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 15px 0; text-align: center;">
            Olá, <strong>${userName}</strong>! Você sabia que pode conectar suas contas bancárias automaticamente no Guru do Dindin?
          </p>

          <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 25px 0; text-align: center;">
            Com o <strong>Open Finance</strong>, seus dados financeiros são sincronizados automaticamente, de forma <strong>100% segura</strong> e regulamentada pelo <strong>Banco Central</strong>.
          </p>

          <!-- O que é Open Finance -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%); border-radius: 12px; margin: 20px 0; border: 1px solid #bfdbfe;">
            <tr>
              <td style="padding: 20px;">
                <h3 style="color: #1e40af; margin: 0 0 10px 0; font-size: 16px;">🔐 O que é Open Finance?</h3>
                <p style="color: #4b5563; font-size: 13px; margin: 0; line-height: 1.6;">
                  Open Finance é um sistema criado pelo <strong>Banco Central do Brasil</strong> que permite que você compartilhe seus dados bancários de forma segura entre instituições financeiras autorizadas. <strong>Você tem total controle</strong> sobre quais dados compartilhar e pode revogar o acesso a qualquer momento.
                </p>
              </td>
            </tr>
          </table>

          <h3 style="color: #1f2937; margin: 25px 0 15px 0; font-size: 16px; text-align: center;">
            📱 Como funciona? É muito simples!
          </h3>

          <!-- Passo 1 -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 15px;">
            <tr>
              <td style="background-color: #f0f9ff; border-radius: 10px; padding: 15px; border-left: 4px solid #0284c7;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="45" valign="top">
                      <div style="width: 35px; height: 35px; background: #0284c7; border-radius: 50%; text-align: center; line-height: 35px; color: white; font-weight: bold; font-size: 16px;">1</div>
                    </td>
                    <td valign="top">
                      <h4 style="color: #0369a1; margin: 0 0 5px 0; font-size: 14px;">Consentimento</h4>
                      <p style="color: #4b5563; font-size: 12px; margin: 0; line-height: 1.5;">
                        No Guru do Dindin, você escolhe quais bancos quer conectar e quais dados compartilhar.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Passo 2 -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 15px;">
            <tr>
              <td style="background-color: #f0fdf4; border-radius: 10px; padding: 15px; border-left: 4px solid #22c55e;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="45" valign="top">
                      <div style="width: 35px; height: 35px; background: #22c55e; border-radius: 50%; text-align: center; line-height: 35px; color: white; font-weight: bold; font-size: 16px;">2</div>
                    </td>
                    <td valign="top">
                      <h4 style="color: #166534; margin: 0 0 5px 0; font-size: 14px;">Redirecionamento</h4>
                      <p style="color: #4b5563; font-size: 12px; margin: 0; line-height: 1.5;">
                        Você é direcionado para o app/site oficial do seu banco para autorizar a conexão.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Passo 3 -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 15px;">
            <tr>
              <td style="background-color: #fffbeb; border-radius: 10px; padding: 15px; border-left: 4px solid #f59e0b;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="45" valign="top">
                      <div style="width: 35px; height: 35px; background: #f59e0b; border-radius: 50%; text-align: center; line-height: 35px; color: white; font-weight: bold; font-size: 16px;">3</div>
                    </td>
                    <td valign="top">
                      <h4 style="color: #92400e; margin: 0 0 5px 0; font-size: 14px;">Autenticação</h4>
                      <p style="color: #4b5563; font-size: 12px; margin: 0; line-height: 1.5;">
                        Faça login no seu banco normalmente (com sua senha de sempre). Nós nunca vemos sua senha!
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Passo 4 -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 15px;">
            <tr>
              <td style="background-color: #fdf2f8; border-radius: 10px; padding: 15px; border-left: 4px solid #ec4899;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="45" valign="top">
                      <div style="width: 35px; height: 35px; background: #ec4899; border-radius: 50%; text-align: center; line-height: 35px; color: white; font-weight: bold; font-size: 16px;">4</div>
                    </td>
                    <td valign="top">
                      <h4 style="color: #9d174d; margin: 0 0 5px 0; font-size: 14px;">Confirmação</h4>
                      <p style="color: #4b5563; font-size: 12px; margin: 0; line-height: 1.5;">
                        Você confirma no próprio banco que autoriza o compartilhamento dos seus dados.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Passo 5 -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 15px;">
            <tr>
              <td style="background-color: #f5f3ff; border-radius: 10px; padding: 15px; border-left: 4px solid #8b5cf6;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="45" valign="top">
                      <div style="width: 35px; height: 35px; background: #8b5cf6; border-radius: 50%; text-align: center; line-height: 35px; color: white; font-weight: bold; font-size: 16px;">5</div>
                    </td>
                    <td valign="top">
                      <h4 style="color: #6d28d9; margin: 0 0 5px 0; font-size: 14px;">Redirecionamento de volta</h4>
                      <p style="color: #4b5563; font-size: 12px; margin: 0; line-height: 1.5;">
                        Você volta para o Guru do Dindin e a conexão é finalizada automaticamente.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Passo 6 -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
            <tr>
              <td style="background-color: #ecfdf5; border-radius: 10px; padding: 15px; border-left: 4px solid #10b981;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="45" valign="top">
                      <div style="width: 35px; height: 35px; background: #10b981; border-radius: 50%; text-align: center; line-height: 35px; color: white; font-weight: bold; font-size: 16px;">✓</div>
                    </td>
                    <td valign="top">
                      <h4 style="color: #047857; margin: 0 0 5px 0; font-size: 14px;">Pronto! Efetivação</h4>
                      <p style="color: #4b5563; font-size: 12px; margin: 0; line-height: 1.5;">
                        Suas transações são sincronizadas automaticamente. Sem digitar nada manualmente! 🎉
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Segurança Box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%); border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0;">
            <tr>
              <td style="padding: 20px;">
                <h3 style="color: #166534; margin: 0 0 10px 0; font-size: 15px;">🛡️ Segurança garantida:</h3>
                <ul style="color: #4b5563; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li>Regulamentado pelo <strong>Banco Central</strong></li>
                  <li>Seus dados são <strong>criptografados</strong></li>
                  <li><strong>Nunca pedimos</strong> sua senha do banco</li>
                  <li>Você pode <strong>desconectar</strong> a qualquer momento</li>
                  <li>Mais de <strong>800 bancos</strong> disponíveis</li>
                </ul>
              </td>
            </tr>
          </table>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
            <tr>
              <td align="center">
                <a href="https://gurudodindin.com.br/app/connect-bank"
                   style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(2, 132, 199, 0.3);">
                  🏦 Conectar Meu Banco Agora
                </a>
              </td>
            </tr>
          </table>

          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 20px 0 0 0;">
            Leva menos de 2 minutos! Experimente e veja suas transações aparecerem automaticamente.
          </p>
        </td>
      </tr>
    `;

    const html = getEmailTemplate(content, preheader);

    const text = `
🏦 CONECTE SEU BANCO EM SEGUNDOS!

Olá, ${userName}!

Você sabia que pode conectar suas contas bancárias automaticamente no Guru do Dindin?

Com o Open Finance, seus dados financeiros são sincronizados automaticamente, de forma 100% segura e regulamentada pelo Banco Central.

🔐 O QUE É OPEN FINANCE?
Open Finance é um sistema criado pelo Banco Central do Brasil que permite que você compartilhe seus dados bancários de forma segura entre instituições financeiras autorizadas.

📱 COMO FUNCIONA:
1. Consentimento - No Guru do Dindin, você escolhe quais bancos conectar
2. Redirecionamento - Você é direcionado para o app/site do seu banco
3. Autenticação - Faça login no seu banco normalmente
4. Confirmação - Autorize o compartilhamento no seu banco
5. Volta - Você retorna para o Guru do Dindin
6. Pronto! - Suas transações são sincronizadas automaticamente

🛡️ SEGURANÇA GARANTIDA:
- Regulamentado pelo Banco Central
- Seus dados são criptografados
- Nunca pedimos sua senha do banco
- Você pode desconectar a qualquer momento
- Mais de 800 bancos disponíveis

👉 CONECTAR AGORA: https://gurudodindin.com.br/app/connect-bank

Leva menos de 2 minutos!

---
© ${new Date().getFullYear()} Guru do Dindin. Todos os direitos reservados.
    `;

    return this.sendEmail({ to, subject, html, text });
  }

  /**
   * Email SIMPLES sobre Open Finance (melhor deliverability - vai para Inbox)
   * Versão mais pessoal, sem formatação pesada de marketing
   */
  async sendOpenFinanceEmailSimple(to: string, userName: string = 'usuário'): Promise<boolean> {
    const subject = 'Como conectar seu banco no Guru do Dindin';

    const html = getSimpleEmailTemplate(`
      <p>Oi ${userName}!</p>

      <p>Tudo bem? Aqui é o Thiago, do Guru do Dindin.</p>

      <p>Queria te contar uma coisa legal: você pode conectar suas contas bancárias automaticamente no app, sem precisar digitar nada manualmente. Isso se chama <strong>Open Finance</strong>.</p>

      <p><strong>Como funciona?</strong></p>

      <p>É bem simples e leva menos de 2 minutos:</p>

      <ol>
        <li>No app, vá em Contas e clique em "Conectar Banco"</li>
        <li>Escolha seu banco na lista (tem mais de 800 disponíveis)</li>
        <li>Você vai ser redirecionado para o site/app oficial do seu banco</li>
        <li>Faça login normalmente e autorize o compartilhamento</li>
        <li>Pronto! Suas transações aparecem automaticamente</li>
      </ol>

      <p><strong>É seguro?</strong></p>

      <p>Sim! O Open Finance é regulamentado pelo Banco Central. A gente nunca vê sua senha do banco - você faz login diretamente no site oficial do seu banco. E você pode desconectar a qualquer momento.</p>

      <p>Se quiser testar agora, é só acessar:<br>
      <a href="https://gurudodindin.com.br/app/connect-bank">https://gurudodindin.com.br/app/connect-bank</a></p>

      <p>Qualquer dúvida, é só responder esse email!</p>

      <p>Abraço,<br>
      <strong>Thiago</strong><br>
      Guru do Dindin</p>

      <p style="color: #999; font-size: 12px; margin-top: 30px;">
        PS: Para garantir que nossos emails cheguem na sua caixa de entrada, adicione thiago@gurudodindin.com.br aos seus contatos.
      </p>
    `);

    const text = `
Oi ${userName}!

Tudo bem? Aqui é o Thiago, do Guru do Dindin.

Queria te contar uma coisa legal: você pode conectar suas contas bancárias automaticamente no app, sem precisar digitar nada manualmente. Isso se chama Open Finance.

COMO FUNCIONA?

É bem simples e leva menos de 2 minutos:

1. No app, vá em Contas e clique em "Conectar Banco"
2. Escolha seu banco na lista (tem mais de 800 disponíveis)
3. Você vai ser redirecionado para o site/app oficial do seu banco
4. Faça login normalmente e autorize o compartilhamento
5. Pronto! Suas transações aparecem automaticamente

É SEGURO?

Sim! O Open Finance é regulamentado pelo Banco Central. A gente nunca vê sua senha do banco - você faz login diretamente no site oficial do seu banco. E você pode desconectar a qualquer momento.

Se quiser testar agora: https://gurudodindin.com.br/app/connect-bank

Qualquer dúvida, é só responder esse email!

Abraço,
Thiago
Guru do Dindin

PS: Para garantir que nossos emails cheguem na sua caixa de entrada, adicione thiago@gurudodindin.com.br aos seus contatos.
    `;

    return this.sendEmail({
      to,
      subject,
      html,
      text,
      from: FROM_EMAIL_PERSONAL
    });
  }
}

export const emailService = new EmailService();
