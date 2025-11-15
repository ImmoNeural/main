# 📊 Guia de SEO e Google Analytics - Guru do Dindin

## 🎯 Implementações de SEO Realizadas

### 1. Meta Tags Essenciais (index.html)

✅ **Title e Description otimizados**
- Title: "Guru do Dindin - Controle Financeiro Pessoal Inteligente e Gratuito"
- Description focada em palavras-chave relevantes

✅ **Open Graph (Facebook/LinkedIn)**
- Compartilhamento otimizado em redes sociais
- Preview com imagem, título e descrição

✅ **Twitter Cards**
- Cards grandes com imagem
- Otimização para compartilhamento no Twitter/X

✅ **Geo Tags**
- Marcação de região: Brasil (BR)
- Idioma: Português

✅ **Mobile Optimization**
- Tags de PWA (Progressive Web App)
- Theme color para barra de navegação mobile

### 2. Structured Data (Schema.org / JSON-LD)

Implementado em `StructuredData.tsx`:

- **Organization Schema**: Informações da empresa
- **WebApplication Schema**: Detalhes do app, features, ratings
- **BreadcrumbList**: Navegação estruturada
- **FAQPage**: Perguntas frequentes para rich snippets

### 3. Arquivos de SEO

✅ **robots.txt**
```
User-agent: *
Allow: /
Disallow: /app/*
Disallow: /api/*
Sitemap: https://gurudodindin.com/sitemap.xml
```

✅ **sitemap.xml**
- Todas as páginas públicas mapeadas
- Prioridades definidas (Homepage: 1.0, Login/Register: 0.8)
- Frequência de atualização configurada

### 4. Componente SEO Reutilizável

Componente `SEO.tsx` permite customizar meta tags por página:

```tsx
<SEO
  title="Login - Guru do Dindin"
  description="Faça login na sua conta do Guru do Dindin"
  keywords="login, entrar, conta financeira"
/>
```

### 5. Performance

- **Preconnect**: CDNs carregam mais rápido
- **DNS Prefetch**: Resolução antecipada de DNS
- Otimização para Core Web Vitals

---

## 📈 Google Analytics 4 - Configuração

### Passo 1: Criar Propriedade no Google Analytics

1. Acesse [Google Analytics](https://analytics.google.com/)
2. Clique em **"Administrador"** (ícone de engrenagem)
3. Clique em **"Criar propriedade"**
4. Preencha:
   - **Nome da propriedade**: Guru do Dindin
   - **Fuso horário**: (GMT-03:00) Brasília
   - **Moeda**: Real brasileiro (BRL)
5. Clique em **"Avançar"**
6. Selecione a categoria: **Finanças**
7. Selecione o tamanho da empresa
8. Clique em **"Criar"**

### Passo 2: Configurar o Data Stream

1. Selecione **"Web"** como plataforma
2. Preencha:
   - **URL do website**: https://gurudodindin.com
   - **Nome do stream**: Guru do Dindin - Web
3. Clique em **"Criar stream"**
4. **COPIE o ID DE MEDIÇÃO** (formato: G-XXXXXXXXXX)

### Passo 3: Configurar no Projeto

1. Crie arquivo `.env` no diretório `packages/frontend/`:

```bash
# Google Analytics 4
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX  # Cole seu ID aqui
```

2. Adicione também no Netlify:
   - Acesse: Site settings > Environment variables
   - Adicione: `VITE_GA_MEASUREMENT_ID` = `G-XXXXXXXXXX`

### Passo 4: Verificar Instalação

1. Acesse seu site
2. No Google Analytics, vá em **Relatórios > Tempo real**
3. Navegue pelo site - você deve ver as visitas em tempo real

---

## 📊 Métricas Importantes no Google Analytics

### Relatórios Principais

#### 1. **Tempo Real**
- Usuários ativos agora
- Visualizações de página por segundo
- Principais páginas visualizadas
- Localizações dos usuários

#### 2. **Aquisição** (De onde vêm os usuários)
- Busca orgânica (Google, Bing)
- Direto (digitaram URL)
- Referência (outros sites)
- Social (redes sociais)
- Campanhas pagas

#### 3. **Engajamento**
- Páginas mais visitadas
- Tempo médio na página
- Taxa de rejeição
- Eventos personalizados

#### 4. **Demografia**
- Idade dos usuários
- Gênero
- Localização (cidades/estados)
- Dispositivos (mobile/desktop)

---

## 🎯 Eventos Personalizados Sugeridos

Você pode adicionar tracking de eventos importantes:

```tsx
// Exemplo: Rastrear cadastro
window.gtag?.('event', 'sign_up', {
  method: 'email'
});

// Exemplo: Rastrear criação de orçamento
window.gtag?.('event', 'create_budget', {
  category: 'Alimentação',
  value: 1000
});

// Exemplo: Rastrear conexão de banco
window.gtag?.('event', 'bank_connected', {
  bank_name: 'Nubank'
});
```

---

## 🔍 Otimizações de SEO Adicionais Recomendadas

### 1. Criar Imagem Open Graph

Crie uma imagem 1200x630px chamada `og-image.png` e coloque em `packages/frontend/public/`

**Conteúdo sugerido:**
- Logo do Guru do Dindin
- Título: "Controle Financeiro Pessoal"
- Subtítulo: "Organize suas finanças de forma simples"
- Cores da marca (roxo/primary)

### 2. Adicionar Blog (Futuro)

Para SEO de longo prazo, considere criar:
- Blog com artigos sobre finanças pessoais
- Guias de educação financeira
- Dicas de economia e investimento
- Casos de uso do Guru do Dindin

### 3. Link Building

- Cadastre o site em:
  - Google Search Console
  - Bing Webmaster Tools
  - Diretórios de apps financeiros
  - Sites de review de apps

### 4. Performance

Execute auditorias regulares:
```bash
# Lighthouse (Chrome DevTools)
# PageSpeed Insights: https://pagespeed.web.dev/
```

Metas:
- Performance: > 90
- Acessibilidade: > 90
- Melhores práticas: > 90
- SEO: 100

### 5. Google Search Console

1. Acesse [Google Search Console](https://search.google.com/search-console)
2. Adicione a propriedade: https://gurudodindin.com
3. Verifique propriedade (via Google Analytics ou meta tag)
4. Envie o sitemap: https://gurudodindin.com/sitemap.xml

**Benefícios:**
- Ver quais palavras-chave trazem tráfego
- Identificar erros de indexação
- Solicitar reindexação de páginas
- Ver backlinks

---

## 📝 Palavras-chave Alvo

### Principais
- controle financeiro
- finanças pessoais
- orçamento pessoal
- planejamento financeiro
- gestão financeira

### Secundárias
- app de finanças
- controlar gastos
- organizar dinheiro
- economia doméstica
- aplicativo de orçamento
- controle de despesas

### Long-tail
- "como controlar gastos mensais"
- "melhor app para controle financeiro"
- "como fazer orçamento familiar"
- "planejamento financeiro pessoal gratuito"

---

## ✅ Checklist de SEO

- [x] Meta tags essenciais (title, description, keywords)
- [x] Open Graph tags
- [x] Twitter Cards
- [x] Structured Data (JSON-LD)
- [x] robots.txt
- [x] sitemap.xml
- [x] Canonical URLs
- [x] Mobile optimization
- [x] Google Analytics integrado
- [ ] Imagem Open Graph criada (og-image.png)
- [ ] Google Search Console configurado
- [ ] Lighthouse score > 90 em todas categorias
- [ ] SSL/HTTPS configurado (Netlify já fornece)

---

## 🚀 Próximos Passos

1. **Criar og-image.png** (1200x630px) e colocar em `public/`
2. **Configurar Google Analytics** com seu ID real
3. **Cadastrar no Google Search Console**
4. **Monitorar métricas** semanalmente
5. **Criar conteúdo** (blog posts) para SEO orgânico
6. **Otimizar performance** (Core Web Vitals)
7. **Testar compartilhamento** em redes sociais

---

## 📞 Suporte

Para dúvidas sobre SEO ou Analytics, consulte:
- [Google Analytics Help](https://support.google.com/analytics)
- [Google Search Console Help](https://support.google.com/webmasters)
- [Schema.org Documentation](https://schema.org/)
