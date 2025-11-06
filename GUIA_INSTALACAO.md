# 🚀 Guia Completo de Instalação - Para Iniciantes

Este guia explica **passo a passo** como baixar e rodar a aplicação no seu computador.

---

## 📋 Pré-requisitos (O que você precisa ter instalado)

Antes de começar, você precisa ter instalado no seu computador:

### 1. **Git**
Git é a ferramenta que usamos para baixar código do GitHub.

**Como verificar se já tem:**
```bash
git --version
```

**Se não tiver, instale:**
- **Windows**: Baixe em https://git-scm.com/download/win
- **Mac**: Baixe em https://git-scm.com/download/mac
- **Linux**:
  ```bash
  sudo apt install git  # Ubuntu/Debian
  sudo yum install git  # RedHat/CentOS
  ```

### 2. **Node.js** (versão 18 ou superior)
Node.js é o ambiente que roda a aplicação.

**Como verificar se já tem:**
```bash
node --version
```

**Se não tiver ou a versão for menor que 18, instale:**
- Baixe em: https://nodejs.org/
- Escolha a versão **LTS** (recomendada)
- Durante a instalação, marque a opção "Add to PATH"

### 3. **npm** (vem junto com Node.js)
npm é o gerenciador de pacotes do Node.js.

**Como verificar:**
```bash
npm --version
```

---

## 🔽 Passo 1: Baixar o Código do GitHub

### O que é isso?
Você vai **clonar** (fazer uma cópia) do código que está no GitHub para o seu computador.

### Como fazer:

1. **Abra o terminal/prompt de comando:**
   - **Windows**: Pesquise "cmd" ou "PowerShell" no menu Iniciar
   - **Mac**: Abra o "Terminal" (Applications > Utilities > Terminal)
   - **Linux**: Abra o Terminal (Ctrl+Alt+T)

2. **Navegue até a pasta onde quer salvar o projeto:**
   ```bash
   # Exemplo: salvar na pasta Documentos
   cd ~/Documentos

   # Ou no Windows:
   cd C:\Users\SeuNome\Documents
   ```

3. **Clone o repositório:**
   ```bash
   git clone https://github.com/ImmoNeural/main.git
   ```

   **O que isso faz:**
   - Cria uma pasta chamada `main`
   - Baixa todos os arquivos do GitHub para essa pasta

4. **Entre na pasta do projeto:**
   ```bash
   cd main
   ```

5. **Baixe as últimas mudanças (o código que eu acabei de fazer):**
   ```bash
   # Baixa as mudanças mais recentes do GitHub
   git fetch origin

   # Muda para o branch com as novas funcionalidades
   git checkout claude/review-example-011CUs1fvaKkgh1rks31FTYi

   # Atualiza com as últimas mudanças
   git pull origin claude/review-example-011CUs1fvaKkgh1rks31FTYi
   ```

**✅ Pronto!** Agora você tem todo o código no seu computador.

---

## 📦 Passo 2: Instalar as Dependências

### O que é isso?
A aplicação usa várias bibliotecas (pedaços de código de terceiros). Você precisa baixá-las.

### Como fazer:

1. **Certifique-se de que está na pasta do projeto:**
   ```bash
   pwd  # Linux/Mac - mostra onde você está
   cd   # Windows - mostra onde você está
   ```

   Deve mostrar algo como: `/Users/SeuNome/Documentos/main`

2. **Instale todas as dependências:**
   ```bash
   npm install
   ```

   **O que isso faz:**
   - Lê o arquivo `package.json`
   - Baixa todas as bibliotecas necessárias
   - Salva tudo na pasta `node_modules`
   - **Pode demorar 2-5 minutos** (baixa muita coisa)

   **É normal ver:**
   - Muitas linhas passando na tela
   - Alguns "warnings" (avisos) - pode ignorar
   - Mensagens sobre vulnerabilidades - pode ignorar por enquanto

**✅ Pronto!** Todas as dependências foram instaladas.

---

## ⚙️ Passo 3: Configurar Variáveis de Ambiente

### O que é isso?
Variáveis de ambiente são configurações secretas (como senhas) que a aplicação precisa para funcionar.

### Como fazer:

1. **Copie o arquivo de exemplo:**
   ```bash
   # Linux/Mac:
   cp packages/backend/.env.example packages/backend/.env

   # Windows (PowerShell):
   Copy-Item packages/backend/.env.example packages/backend/.env

   # Windows (CMD):
   copy packages\backend\.env.example packages\backend\.env
   ```

2. **Abra o arquivo `.env` para editar:**

   **Opção A - Editor de código (recomendado):**
   - Abra a pasta `main` no VSCode ou outro editor
   - Navegue até `packages/backend/.env`
   - Edite o arquivo

   **Opção B - Editor de texto simples:**
   - **Windows**: Abra com Notepad
   - **Mac**: Abra com TextEdit
   - **Linux**: Abra com gedit ou nano

3. **O arquivo `.env` já vem configurado para modo DEMO:**
   ```env
   # Server Configuration
   PORT=3001
   NODE_ENV=development

   # Database
   DATABASE_PATH=./data/database.sqlite

   # Open Banking Configuration
   OPEN_BANKING_PROVIDER=mock  # ← Modo DEMO (dados falsos)

   # ... resto das configurações ...
   ```

4. **POR ENQUANTO, não mude nada!**

   O modo `mock` usa dados simulados - perfeito para testar primeiro.

   **Mais tarde**, se quiser conectar seu banco real, você vai:
   - Mudar `OPEN_BANKING_PROVIDER=mock` para `OPEN_BANKING_PROVIDER=nordigen`
   - Adicionar suas credenciais do GoCardless
   - Ver instruções completas em `OPEN_BANKING_SETUP.md`

**✅ Pronto!** A aplicação está configurada.

---

## 🚀 Passo 4: Rodar a Aplicação

### Como fazer:

1. **Certifique-se de que está na pasta raiz do projeto:**
   ```bash
   pwd  # Deve mostrar algo como: /Users/SeuNome/Documentos/main
   ```

2. **Inicie a aplicação:**
   ```bash
   npm run dev
   ```

3. **Aguarde alguns segundos. Você verá:**
   ```
   [0] 📦 Initializing database...
   [0] ✅ Database initialized successfully
   [0] 🚀 Server running on http://localhost:3001
   [1] ➜  Local:   http://localhost:3000/
   ```

4. **Sucesso! A aplicação está rodando:**
   - **Frontend**: http://localhost:3000 (interface que você usa)
   - **Backend**: http://localhost:3001 (API - funciona nos bastidores)

**✅ Pronto!** A aplicação está rodando no seu computador.

---

## 🌐 Passo 5: Acessar a Aplicação

### Como fazer:

1. **Abra seu navegador** (Chrome, Firefox, Safari, Edge...)

2. **Digite na barra de endereço:**
   ```
   http://localhost:3000
   ```

3. **Você verá o Dashboard!**

   Páginas disponíveis:
   - `http://localhost:3000/` - Dashboard principal
   - `http://localhost:3000/accounts` - Suas contas
   - `http://localhost:3000/transactions` - Transações
   - `http://localhost:3000/connect-bank` - Conectar banco

---

## 🧪 Passo 6: Testar com Dados Simulados

### Como fazer:

1. **No navegador, clique em "Conectar Banco"** (ou vá em http://localhost:3000/connect-bank)

2. **Selecione qualquer banco** (ex: Deutsche Bank)

3. **Clique em "Autorizar e Conectar"**

4. **Uma janela popup vai aparecer perguntando:**
   ```
   Você será redirecionado para Deutsche Bank para autorizar o acesso.

   Este é um ambiente de demonstração (modo mock).
   Deseja simular a conexão bem-sucedida?
   ```

5. **Clique em "OK"**

6. **Pronto!** Você verá:
   - Conta bancária simulada
   - Transações de exemplo
   - Gráficos de gastos
   - Categorização automática

---

## 🛑 Como Parar a Aplicação

### Como fazer:

1. **Volte ao terminal onde a aplicação está rodando**

2. **Pressione:**
   ```
   Ctrl + C
   ```

3. **A aplicação vai parar**

4. **Para rodar novamente:**
   ```bash
   npm run dev
   ```

---

## 🔄 Como Atualizar com Novas Mudanças do GitHub

Quando eu (ou outra pessoa) fizer mudanças no código e enviar para o GitHub:

### Como fazer:

1. **Pare a aplicação** (Ctrl+C)

2. **Baixe as novas mudanças:**
   ```bash
   git pull origin claude/review-example-011CUs1fvaKkgh1rks31FTYi
   ```

3. **Atualize as dependências (caso novas tenham sido adicionadas):**
   ```bash
   npm install
   ```

4. **Rode novamente:**
   ```bash
   npm run dev
   ```

---

## 📂 Estrutura de Pastas (Para Entender o Projeto)

```
main/
├── packages/
│   ├── backend/          ← Servidor (API, banco de dados)
│   │   ├── src/          ← Código-fonte do backend
│   │   ├── .env          ← CONFIGURAÇÕES (NÃO commitar!)
│   │   └── package.json  ← Dependências do backend
│   │
│   └── frontend/         ← Interface do usuário
│       ├── src/          ← Código-fonte do frontend
│       └── package.json  ← Dependências do frontend
│
├── node_modules/         ← Bibliotecas baixadas (NÃO commitar)
├── package.json          ← Configuração principal
├── README.md             ← Documentação geral
├── OPEN_BANKING_SETUP.md ← Como conectar banco real
└── GUIA_INSTALACAO.md    ← Este arquivo
```

---

## ❓ Perguntas Frequentes

### **P: A aplicação não inicia. O que fazer?**

**R: Verifique:**

1. Node.js está instalado?
   ```bash
   node --version
   ```
   Deve mostrar algo como: `v18.x.x` ou superior

2. Você rodou `npm install`?
   ```bash
   npm install
   ```

3. Você está na pasta correta?
   ```bash
   pwd  # Linux/Mac
   cd   # Windows
   ```
   Deve estar em: `.../main`

4. A porta 3000 ou 3001 já está em uso?
   - **Windows**: Abra Task Manager e mate processos do Node.js
   - **Mac/Linux**:
     ```bash
     lsof -ti:3000 -ti:3001 | xargs kill
     ```

### **P: Erro "ENOENT: no such file or directory"**

**R:** Você não criou o arquivo `.env`

Solução:
```bash
cp packages/backend/.env.example packages/backend/.env
```

### **P: Erro "Cannot find module..."**

**R:** Dependências não foram instaladas corretamente

Solução:
```bash
# Limpe tudo
rm -rf node_modules
rm -rf packages/*/node_modules
rm package-lock.json

# Reinstale
npm install
```

### **P: Como eu mudo para o branch principal?**

**R:**
```bash
git checkout main
```

### **P: Como eu vejo quais branches existem?**

**R:**
```bash
git branch -a
```

### **P: Posso deletar a pasta e começar de novo?**

**R:** Sim! Se algo der muito errado:

```bash
# Saia da pasta
cd ..

# Delete tudo
rm -rf main  # Linux/Mac
rmdir /s main  # Windows

# Clone novamente
git clone https://github.com/ImmoNeural/main.git
cd main
git checkout claude/review-example-011CUs1fvaKkgh1rks31FTYi
npm install
```

---

## 🎯 Resumo Rápido (Cola)

```bash
# 1. Clonar o repositório
git clone https://github.com/ImmoNeural/main.git
cd main

# 2. Baixar o branch com as novas funcionalidades
git checkout claude/review-example-011CUs1fvaKkgh1rks31FTYi

# 3. Instalar dependências
npm install

# 4. Configurar ambiente
cp packages/backend/.env.example packages/backend/.env

# 5. Rodar aplicação
npm run dev

# 6. Abrir no navegador
# http://localhost:3000
```

---

## 📞 Precisa de Ajuda?

Se tiver qualquer problema:

1. Leia a mensagem de erro com calma
2. Procure no Google: "npm [sua mensagem de erro]"
3. Verifique se seguiu todos os passos acima
4. Certifique-se de que Node.js e Git estão instalados

---

## 🎉 Próximos Passos

Depois que tudo estiver funcionando:

1. ✅ Explore a interface
2. ✅ Teste conectar um "banco" (em modo simulação)
3. ✅ Veja os gráficos e relatórios
4. ✅ Leia `OPEN_BANKING_SETUP.md` para conectar seu banco real
5. ✅ Customize categorias de gastos
6. ✅ Experimente adicionar novos recursos!

**Boa sorte! 🚀**
