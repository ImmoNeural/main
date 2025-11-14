# 📧 Configuração de Email de Recuperação de Senha no Supabase

## Problema Atual
- Email chega em **inglês** no formato padrão do Supabase
- Link redireciona para **localhost** ao invés do domínio em produção

## Solução: Configurar Email Template no Supabase

### 1️⃣ Acessar Dashboard do Supabase

1. Vá em: https://app.supabase.com
2. Selecione seu projeto **GuruDoDindin**
3. Menu lateral → **Authentication** → **Email Templates**

### 2️⃣ Configurar Template "Reset Password"

Encontre o template **"Reset Password"** e substitua por este template em **português**:

```html
<h2>Redefinir sua senha</h2>

<p>Olá,</p>

<p>Você solicitou a redefinição de senha da sua conta no <strong>Guru do Dindin</strong>.</p>

<p>Clique no botão abaixo para criar uma nova senha:</p>

<p>
  <a href="{{ .SiteURL }}/reset-password?token={{ .TokenHash }}&type=recovery"
     style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
    Redefinir Senha
  </a>
</p>

<p>Ou copie e cole este link no seu navegador:</p>
<p>{{ .SiteURL }}/reset-password?token={{ .TokenHash }}&type=recovery</p>

<p><strong>Este link expira em 1 hora.</strong></p>

<p>Se você não solicitou a redefinição de senha, ignore este email.</p>

<hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">

<p style="color: #666; font-size: 12px;">
  © 2025 Guru do Dindin. Todos os direitos reservados.<br>
  Este é um email automático, por favor não responda.
</p>
```

### 3️⃣ Configurar URL do Site

Na mesma página de **Email Templates**, role até a seção **"Settings"** ou vá em:

**Authentication** → **URL Configuration**

Configure:

- **Site URL**: `https://gurudodindin.com.br` (ou `https://seu-dominio.netlify.app`)
- **Redirect URLs**: Adicione:
  ```
  https://gurudodindin.com.br/reset-password
  https://gurudodindin.com.br/login
  ```

### 4️⃣ Configurar Variáveis de Ambiente

No arquivo `.env` do frontend (criar se não existir):

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

**No Netlify:**
1. Vá em **Site settings** → **Environment variables**
2. Adicione as mesmas variáveis acima

### 5️⃣ Testar

1. Vá em `/forgot-password` no seu site
2. Digite seu email
3. Clique em "Enviar instruções"
4. Verifique o email (deve estar em **português** agora)
5. Clique no link - deve abrir `/reset-password` no seu domínio
6. Digite nova senha (deve mostrar o indicador de força)
7. Clique em "Redefinir senha"
8. ✅ Redireciona para login

## 🎯 Checklist de Configuração

- [ ] Template de email configurado em português
- [ ] Site URL configurada (https://gurudodindin.com.br)
- [ ] Redirect URLs adicionadas
- [ ] Variáveis de ambiente configuradas no Netlify
- [ ] Tabela `custom_budgets` criada (migration SQL executada)
- [ ] Testado fluxo completo de recuperação de senha

## ⚠️ Importante

- O email **sempre virá de `noreply@mail.app.supabase.io`** (conta free do Supabase)
- Para email personalizado (ex: noreply@gurudodindin.com.br), precisa de plano pago e configurar SMTP customizado
- O template usa variáveis do Supabase:
  - `{{ .SiteURL }}` - URL configurada
  - `{{ .TokenHash }}` - Token de recuperação
  - `{{ .Token }}` - Token alternativo

## 🔧 Troubleshooting

### Email continua em inglês?
- Verifique se clicou em **Save** após editar o template
- Limpe o cache do navegador
- Teste com um email novo

### Link vai para localhost?
- Verifique a **Site URL** nas configurações
- Deve ser `https://` e não `http://`
- Não pode ter barra `/` no final

### Página reset-password não funciona?
- Verifique se a rota está no App.tsx
- Faça novo build e deploy
- Verifique console do navegador (F12) por erros

## 📝 Exemplo de Email Final

**Assunto:** Redefinir sua senha - Guru do Dindin

**Corpo:**
> # Redefinir sua senha
>
> Olá,
>
> Você solicitou a redefinição de senha da sua conta no **Guru do Dindin**.
>
> [Botão: Redefinir Senha]
>
> Este link expira em 1 hora.
>
> Se você não solicitou a redefinição de senha, ignore este email.
