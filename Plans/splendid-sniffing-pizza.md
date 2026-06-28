# Plano: Seletor de País Persistente (BR/DE) no Menu Lateral

## Contexto

**Problema:** O parâmetro `country` (`'BR'` | `'DE'`) só é usado durante importação de CSV. Os botões de recategorização (`/recategorize`, `/recategorize-ai`) e o debug sempre usam regras brasileiras. Um usuário com dados bancários alemães não consegue recategorizar com a base alemã.

**Objetivo:** Adicionar toggle de bandeira (🇧🇷/🇩🇪) no menu lateral esquerdo, persistente em localStorage, que define qual base de estabelecimentos usar em **todas** as funcionalidades de categorização.

## Arquivos a modificar (8 arquivos)

### 1. NOVO: `packages/frontend/src/contexts/CountryContext.tsx`
- Criar contexto React seguindo o padrão de `ThemeContext.tsx`
- Tipo: `'BR' | 'DE'`, default `'BR'`
- localStorage key: `guru_country`
- Exportar `CountryProvider`, `useCountry` (com `country`, `setCountry`, `toggleCountry`)

### 2. `packages/frontend/src/App.tsx`
- Importar e envolver a árvore com `<CountryProvider>` (dentro de `<ThemeProvider>`)

### 3. `packages/frontend/src/components/Layout.tsx`
- **Sidebar desktop expandida:** adicionar seletor com dois botões (🇧🇷 BR / 🇩🇪 DE) entre a navegação e a seção do usuário
- **Sidebar desktop colapsada:** ícone de bandeira única que alterna com `toggleCountry()`
- **Sidebar mobile:** botão com bandeira na barra inferior

### 4. `packages/frontend/src/services/api.ts`
- `recategorizeAll(country)` — adicionar parâmetro
- `recategorizeAI(onlyUncategorized, country)` — adicionar parâmetro
- `debugCategorization(params)` — já aceita objeto, só propagar

### 5. `packages/backend/src/routes/transaction.routes.ts`
- **`/recategorize`:** Extrair `country` do body, passar no 4º argumento de `categorizeTransaction()`
- **`/recategorize-ai`:** Extrair `country` do body, passar no 4º argumento de `categorizeTransaction()` (Camada 1)
- **`/debug-categorization`:** Extrair `country` do body, passar no 4º argumento

### 6. `packages/frontend/src/pages/Transactions.tsx`
- Importar `useCountry`
- Passar `country` em `transactionApi.recategorizeAI(true, country)`

### 7. `packages/frontend/src/components/ImportTransactionsModal.tsx`
- Trocar `useState<'BR' | 'DE'>('BR')` local por `useCountry()` do contexto

### 8. `packages/frontend/src/pages/Dashboard.tsx`
- Nenhuma mudança necessária — só abre o modal, que já lê do contexto

## Design decisions

- **localStorage**, não Supabase — sem migração de banco, sem endpoint novo
- **Contexto React**, não prop drilling — evita passar `country` por 5 camadas de componente
- **Backend mantém default `'BR'`** — retrocompatível com clientes antigos
- **Taxonomia única** — regras BR e DE compartilham as mesmas categorias/subcategorias/ícones/cores, só mudam brands e keywords

## Verificação

1. Abrir app → bandeira BR selecionada por padrão
2. Clicar em 🇩🇪 → toggle muda para Alemanha
3. Recarregar página → Alemanha mantida (localStorage)
4. Abrir Importar CSV → modal já abre com 🇩🇪 selecionado
5. Clicar "Categorizar" → backend loga `country: DE`
6. Debug endpoint → retorna categorização com regras alemãs
7. Sidebar colapsada → clicar na bandeira alterna entre BR/DE
8. Mobile → mesma funcionalidade
