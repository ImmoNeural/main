# 🔄 Como Atualizar o Projeto (Sincronizar com GitHub)

Use este guia quando você já tiver o projeto no seu PC e quiser baixar as novas mudanças que foram feitas no GitHub.

---

## 📝 Passo a Passo

### **1. Pare a aplicação (se estiver rodando)**

Se a aplicação estiver rodando no terminal, pare ela:

```
Ctrl + C
```

### **2. Abra o terminal na pasta do projeto**

**Opção A - Usando terminal:**
```bash
# Vá para a pasta do projeto (ajuste o caminho conforme necessário)
cd ~/Documentos/main

# Ou no Windows:
cd C:\Users\SeuNome\Documents\main
```

**Opção B - Usando VSCode:**
- Abra a pasta do projeto no VSCode
- Menu: Terminal > New Terminal
- Já abre direto na pasta certa!

### **3. Verifique em qual branch você está**

```bash
git branch
```

Você vai ver algo como:
```
* main
```

Ou:
```
* claude/review-example-011CUs1fvaKkgh1rks31FTYi
```

### **4. Mude para o branch com as novas funcionalidades**

Se você estiver no branch `main`, mude para o branch correto:

```bash
git checkout claude/review-example-011CUs1fvaKkgh1rks31FTYi
```

### **5. Baixe as atualizações do GitHub**

```bash
git pull origin claude/review-example-011CUs1fvaKkgh1rks31FTYi
```

**O que acontece:**
- Git compara o código do seu PC com o do GitHub
- Baixa apenas as mudanças (arquivos novos ou modificados)
- Atualiza seu código local

**Você verá algo como:**
```
remote: Counting objects: 15, done.
remote: Compressing objects: 100% (10/10), done.
Unpacking objects: 100% (15/15), done.
From https://github.com/ImmoNeural/main
   a38b6cf..d9d7b19  claude/review-example-011CUs1fvaKkgh1rks31FTYi -> origin/claude/review-example-011CUs1fvaKkgh1rks31FTYi
Updating a38b6cf..d9d7b19
Fast-forward
 OPEN_BANKING_SETUP.md                                   | 582 ++++++++++++++++++++++
 GUIA_INSTALACAO.md                                      | 480 +++++++++++++++++
 packages/backend/.env.example                           |  18 +-
 packages/backend/src/services/openBanking.service.ts    | 220 +-------
 packages/backend/src/services/providers/nordigen.service.ts | 340 ++++++++++++
 packages/backend/src/services/providers/tink.service.ts | 294 +++++++++++
 packages/backend/src/services/providers/provider.factory.ts | 215 ++++++++
 9 files changed, 1920 insertions(+), 220 deletions(-)
```

### **6. Atualize as dependências (caso tenham mudado)**

```bash
npm install
```

**Por quê?**
- Pode ser que eu tenha adicionado novas bibliotecas
- `npm install` baixa apenas o que falta (é rápido)
- Se nada mudou, termina em segundos

### **7. Rode a aplicação novamente**

```bash
npm run dev
```

### **8. Acesse no navegador**

```
http://localhost:3000
```

**✅ Pronto! Você está com a versão mais recente!**

---

## 🎯 Resumo Rápido (Cola)

```bash
# 1. Pare a aplicação (Ctrl+C)

# 2. Vá para a pasta do projeto
cd caminho/para/main

# 3. Mude para o branch correto (se necessário)
git checkout claude/review-example-011CUs1fvaKkgh1rks31FTYi

# 4. Baixe as atualizações
git pull origin claude/review-example-011CUs1fvaKkgh1rks31FTYi

# 5. Atualize dependências
npm install

# 6. Rode novamente
npm run dev

# 7. Abra: http://localhost:3000
```

---

## 🆕 O que foi adicionado nesta atualização?

### **Novos Arquivos:**
- ✅ `OPEN_BANKING_SETUP.md` - Guia completo para conectar bancos reais
- ✅ `GUIA_INSTALACAO.md` - Guia de instalação para iniciantes
- ✅ `COMO_ATUALIZAR.md` - Este arquivo!
- ✅ `packages/backend/src/services/providers/nordigen.service.ts` - Serviço Nordigen
- ✅ `packages/backend/src/services/providers/tink.service.ts` - Serviço Tink
- ✅ `packages/backend/src/services/providers/provider.factory.ts` - Factory de provedores

### **Arquivos Modificados:**
- ✅ `packages/backend/.env.example` - Novas variáveis de ambiente
- ✅ `packages/backend/src/services/openBanking.service.ts` - Refatorado para usar provedores reais
- ✅ `packages/frontend/src/pages/ConnectBank.tsx` - Suporte a redirecionamento real

### **Novas Funcionalidades:**
- ✅ Conexão com bancos reais via Open Banking (Nordigen e Tink)
- ✅ Suporte para Deutsche Bank, Sparkasse, N26, ING, e outros
- ✅ Sistema de provedores plugável (fácil adicionar novos)
- ✅ Documentação completa

---

## ⚠️ Possíveis Problemas e Soluções

### **Problema: "Your local changes would be overwritten by merge"**

**Causa:** Você modificou arquivos localmente que também foram modificados no GitHub.

**Solução 1 - Descartar suas mudanças locais (cuidado!):**
```bash
git reset --hard HEAD
git pull origin claude/review-example-011CUs1fvaKkgh1rks31FTYi
```

**Solução 2 - Salvar suas mudanças antes:**
```bash
git stash  # Guarda suas mudanças
git pull origin claude/review-example-011CUs1fvaKkgh1rks31FTYi
git stash pop  # Recupera suas mudanças
```

### **Problema: "Already up to date"**

**Causa:** Você já tem a versão mais recente.

**Solução:** Nada! Está tudo certo. Pode rodar `npm run dev`.

### **Problema: "fatal: not a git repository"**

**Causa:** Você não está na pasta correta.

**Solução:**
```bash
# Veja onde você está
pwd  # Mac/Linux
cd   # Windows

# Navegue até a pasta correta
cd caminho/para/main
```

### **Problema: Erro ao rodar `npm run dev`**

**Solução:**
```bash
# Limpe e reinstale as dependências
rm -rf node_modules
rm -rf packages/*/node_modules
npm install
```

---

## 🔍 Como Ver o Que Mudou?

### **Ver lista de arquivos modificados:**
```bash
git log --oneline -5
```

### **Ver detalhes das mudanças:**
```bash
git log -p -1
```

### **Ver diferença entre sua versão e a do GitHub:**
```bash
git fetch origin
git diff origin/claude/review-example-011CUs1fvaKkgh1rks31FTYi
```

---

## 🔄 Voltar para o Branch Principal

Se quiser voltar para o branch `main` (versão estável):

```bash
git checkout main
git pull origin main
npm install
npm run dev
```

---

## 📅 Quando Atualizar?

Sempre que:
- ✅ Eu avisar que fiz novas mudanças
- ✅ Quiser testar novos recursos
- ✅ Houver correções de bugs
- ✅ Antes de começar a trabalhar (para ter a versão mais recente)

---

## 💡 Dica Pro

Crie um alias (atalho) para atualizar rapidamente:

**Linux/Mac (adicione ao ~/.bashrc ou ~/.zshrc):**
```bash
alias update-dashboard='git pull origin claude/review-example-011CUs1fvaKkgh1rks31FTYi && npm install'
```

**Depois, basta rodar:**
```bash
update-dashboard
```

---

## 🆘 Precisa de Ajuda?

Se algo não funcionar:
1. Leia a mensagem de erro com calma
2. Copie o erro e pesquise no Google
3. Verifique se está na pasta correta: `pwd` (Mac/Linux) ou `cd` (Windows)
4. Me pergunte! Estou aqui para ajudar

---

**Boa sincronização! 🚀**
