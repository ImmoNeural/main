# ⚡ Configuração Rápida - Google Analytics no Netlify

## 📊 Seu ID do Google Analytics

```
G-NV4FW3DTW8
```

## 🚀 Como Adicionar no Netlify (2 minutos)

### Passo 1: Acessar Configurações

1. Entre no seu [Netlify Dashboard](https://app.netlify.com/)
2. Selecione seu site: **Guru do Dindin**
3. Vá em **Site settings** (Configurações do site)

### Passo 2: Adicionar Variável de Ambiente

1. No menu lateral, clique em **Environment variables** (Variáveis de ambiente)
2. Clique no botão **Add a variable** ou **Add environment variable**
3. Preencha:
   - **Key (Chave)**: `VITE_GA_MEASUREMENT_ID`
   - **Value (Valor)**: `G-NV4FW3DTW8`
   - **Scopes**: Selecione todos os ambientes (ou pelo menos "Production")
4. Clique em **Save** ou **Create variable**

### Passo 3: Fazer Deploy Novamente

**Opção A - Automático (Recomendado):**
- O próximo push para o GitHub já vai usar a variável

**Opção B - Manual (Imediato):**
1. Vá em **Deploys** (no menu superior)
2. Clique em **Trigger deploy** > **Deploy site**
3. Aguarde o deploy terminar (2-3 minutos)

## ✅ Verificar se Funcionou

### 1. Verificar no Site

Após o deploy:
1. Acesse seu site: https://gurudodindin.com
2. Abra o **DevTools** do navegador (F12)
3. Vá na aba **Console**
4. Digite: `window.gtag`
5. Se aparecer `function gtag()`, está funcionando! ✅

### 2. Verificar no Google Analytics

1. Acesse: https://analytics.google.com/
2. Selecione a propriedade **Guru do Dindin**
3. Vá em **Relatórios** > **Tempo real**
4. Navegue pelo seu site
5. Você deve ver sua visita em tempo real! 📊

## 📈 Métricas Importantes

Agora você pode ver:

- **Usuários em tempo real**: Quantas pessoas estão navegando agora
- **Páginas populares**: Quais páginas mais visitadas
- **Origens de tráfego**: Google, redes sociais, direto
- **Localização**: De onde vêm os visitantes (cidades, estados)
- **Dispositivos**: Desktop vs Mobile
- **Demografia**: Idade, gênero

## 🎯 Eventos Personalizados (Futuro)

Você pode rastrear eventos específicos como:

```typescript
// Exemplo: Rastrear quando alguém cria um orçamento
window.gtag?.('event', 'create_budget', {
  category: 'Alimentação',
  value: 1000
});

// Exemplo: Rastrear conexão de banco
window.gtag?.('event', 'bank_connected', {
  bank_name: 'Nubank'
});
```

## 🔗 Links Úteis

- **Google Analytics**: https://analytics.google.com/
- **Netlify Dashboard**: https://app.netlify.com/
- **Documentação Completa**: Ver arquivo `GUIA_SEO_ANALYTICS.md`

---

**Pronto!** Seu Google Analytics está configurado e funcionando! 🎉
