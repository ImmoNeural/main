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

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

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
    const subject = 'Você deu o primeiro passo! Bem-vindo ao Guru do Dindin';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo ao Guru do Dindin</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                Guru do Dindin
              </h1>
              <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">
                Seu assistente financeiro inteligente
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">
                Oi, ${userName || 'novo usuário'}!
              </h2>

              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Organizar as finanças pode parecer complicado no início, mas você já deu o passo mais importante: <strong>começar</strong> 👏
              </p>

              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Para seguir pelo caminho certo, complete o card <strong>"Primeiros Passos"</strong> que aparece na tela inicial. É rápido e ajuda muito a ganhar controle do seu dinheiro desde o começo.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="https://gurudodindin.com.br/app/dashboard"
                       style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: bold;">
                      👉 Acessar Primeiros Passos
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Trial Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                <tr>
                  <td style="padding: 20px; background-color: #f0fdf4; border-radius: 12px; border: 1px solid #bbf7d0;">
                    <p style="margin: 0; color: #166534; font-size: 15px; line-height: 1.6;">
                      🎉 <strong>Seu teste grátis de 7 dias já está ativo.</strong><br>
                      Aproveite para explorar os recursos e ver como o Guru do Dindin pode facilitar sua vida financeira.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 25px 0 5px 0;">
                Nos vemos por aqui!
              </p>
              <p style="color: #10b981; font-size: 16px; font-weight: bold; margin: 0;">
                Equipe Guru do Dindin 💰
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Guru do Dindin. Todos os direitos reservados.
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">
                Você recebeu este email porque se cadastrou no Guru do Dindin.
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

    const text = `
Oi, ${userName || 'novo usuário'}!

Organizar as finanças pode parecer complicado no início, mas você já deu o passo mais importante: começar 👏

Para seguir pelo caminho certo, complete o card "Primeiros Passos" que aparece na tela inicial. É rápido e ajuda muito a ganhar controle do seu dinheiro desde o começo.

👉 Acessar Primeiros Passos: https://gurudodindin.com.br/app/dashboard

🎉 Seu teste grátis de 7 dias já está ativo. Aproveite para explorar os recursos e ver como o Guru do Dindin pode facilitar sua vida financeira.

Nos vemos por aqui!
Equipe Guru do Dindin 💰

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
      ? `Plano ${planName} ativado - Cobrança em ${trialDaysRemaining} dias`
      : `Confirmação de assinatura - ${planName}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmação de Assinatura</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                Guru do Dindin
              </h1>
              <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">
                Confirmação de Assinatura
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">
                ${isTrialActive ? 'Seu plano foi ativado!' : 'Pagamento confirmado!'}
              </h2>

              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Olá, ${userName || 'usuário'}! ${isTrialActive
                  ? `Você escolheu o <strong>${planName}</strong> e seu período de teste continua ativo.`
                  : `Sua assinatura do <strong>${planName}</strong> foi confirmada com sucesso.`}
              </p>

              <!-- Plan Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 12px; margin: 20px 0; border: 1px solid #e5e7eb;">
                <tr>
                  <td style="padding: 25px;">
                    <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">
                      Detalhes da Assinatura
                    </h3>

                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Plano:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right; font-weight: bold;">${planName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Valor mensal:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right; font-weight: bold;">${formattedPrice}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">${isTrialActive ? 'Primeira cobrança:' : 'Próxima cobrança:'}</td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right; font-weight: bold;">${formattedDate}</td>
                      </tr>
                      ${isTrialActive ? `
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Dias restantes de teste:</td>
                        <td style="padding: 8px 0; color: #10b981; font-size: 14px; text-align: right; font-weight: bold;">${trialDaysRemaining} dias</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              ${isTrialActive ? `
              <div style="background-color: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="color: #92400e; font-size: 14px; margin: 0;">
                  <strong>Importante:</strong> Seu cartão só será cobrado no dia ${formattedDate}.
                  Você pode cancelar a qualquer momento antes dessa data sem nenhum custo.
                </p>
              </div>
              ` : ''}

              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                A cobrança será feita automaticamente todo mês na mesma data.
                Você pode gerenciar sua assinatura a qualquer momento na página de Planos.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="https://gurudodindin.com.br/app/planos"
                       style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: bold;">
                      Gerenciar Assinatura
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0; text-align: center;">
                Dúvidas sobre sua assinatura? Entre em contato conosco.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Guru do Dindin. Todos os direitos reservados.
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">
                Este é um email transacional referente à sua assinatura.
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

    const text = `
Olá, ${userName || 'usuário'}!

${isTrialActive
  ? `Você escolheu o ${planName} e seu período de teste continua ativo.`
  : `Sua assinatura do ${planName} foi confirmada com sucesso.`}

Detalhes da Assinatura:
- Plano: ${planName}
- Valor mensal: ${formattedPrice}
- ${isTrialActive ? 'Primeira cobrança' : 'Próxima cobrança'}: ${formattedDate}
${isTrialActive ? `- Dias restantes de teste: ${trialDaysRemaining} dias` : ''}

${isTrialActive
  ? `Importante: Seu cartão só será cobrado no dia ${formattedDate}. Você pode cancelar a qualquer momento antes dessa data sem nenhum custo.`
  : ''}

A cobrança será feita automaticamente todo mês na mesma data.
Você pode gerenciar sua assinatura a qualquer momento na página de Planos.

Gerenciar: https://gurudodindin.com.br/app/planos

---
© ${new Date().getFullYear()} Guru do Dindin. Todos os direitos reservados.
    `;

    return this.sendEmail({ to, subject, html, text });
  }
}

export const emailService = new EmailService();
