import { Resend } from 'resend';

// Inicializar Resend apenas se a chave estiver configurada
const resendKey = process.env.RESEND_API_KEY;
const resend = resendKey ? new Resend(resendKey) : null;

if (!resend) {
  console.warn('⚠️ Resend não configurado - funcionalidades de email desabilitadas');
}

// Email de origem (configurar no Resend dashboard)
const FROM_EMAIL = process.env.FROM_EMAIL || 'Guru do Dindin <noreply@gurudodindin.com.br>';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'suporte@gurudodindin.com.br';

// URL do logo branco para emails (hospedado no site)
const LOGO_URL = 'https://gurudodindin.com.br/logobranco.png';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

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
        from: FROM_EMAIL,
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
}

export const emailService = new EmailService();
