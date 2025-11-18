# Configuração do Belvo - Open Finance para América Latina 🌎

Este guia explica como configurar o Belvo como provedor de Open Finance no seu projeto.

## O que é Belvo?

Belvo é uma plataforma de Open Finance líder na América Latina, oferecendo acesso a dados bancários de instituições no Brasil, México, Colômbia e outros países da região.

## Credenciais Fornecidas

Você já possui suas credenciais do Belvo:
- **Secret ID**: `d337660a-6fc2-471f-bdb9-04e4824604c7`
- **Secret Password**: `3lIh2yWx#EBSvE1Z79tSQQGCs-2VboJS581g*r_ZiguZDav5IRxoPB9KgPEytSIV`

## Configuração

### 1. Adicionar Variáveis de Ambiente

No arquivo `.env` do backend (`packages/backend/.env`), adicione:

```bash
# Provedor Open Banking
OPEN_BANKING_PROVIDER=belvo

# Credenciais Belvo
BELVO_SECRET_ID=d337660a-6fc2-471f-bdb9-04e4824604c7
BELVO_SECRET_PASSWORD=3lIh2yWx#EBSvE1Z79tSQQGCs-2VboJS581g*r_ZiguZDav5IRxoPB9KgPEytSIV
BELVO_BASE_URL=https://api.belvo.com
```

### 2. Reiniciar o Backend

Após configurar as variáveis de ambiente, reinicie o servidor backend:

```bash
cd packages/backend
npm run dev
```

## Alternar entre Provedores

Para alternar entre Belvo e Pluggy, basta mudar a variável `OPEN_BANKING_PROVIDER`:

### Usar Belvo:
```bash
OPEN_BANKING_PROVIDER=belvo
```

### Usar Pluggy:
```bash
OPEN_BANKING_PROVIDER=pluggy
```

### Usar Mock (desenvolvimento):
```bash
OPEN_BANKING_PROVIDER=mock
```

## Como Funciona

1. **Listar Bancos**: O Belvo retorna uma lista de instituições bancárias disponíveis no país selecionado (ex: Brasil)

2. **Conectar Banco**: O usuário seleciona um banco e fornece suas credenciais (usuário/senha ou chave PIX)

3. **Criar Link**: O Belvo cria um "Link" que representa a conexão com a instituição bancária

4. **Sincronizar Dados**: O sistema busca automaticamente contas e transações do banco conectado

## Bancos Suportados no Brasil

Belvo suporta os principais bancos brasileiros:
- Nubank 💜
- Banco Inter 🧡
- C6 Bank
- Santander
- Itaú
- Bradesco
- Banco do Brasil
- Caixa Econômica
- PagBank
- E muitos outros...

## Diferenças entre Belvo e Pluggy

| Característica | Belvo | Pluggy |
|----------------|-------|--------|
| Cobertura | América Latina | Brasil |
| Países | BR, MX, CO, etc | Só BR |
| Autenticação | Widget + API | Pluggy Connect |
| Modelo de Preço | Por transação | Por conexão |
| Open Finance | Sim | Sim |

## Recursos Implementados

✅ Listagem de instituições bancárias
✅ Criação de links (conexões)
✅ Busca de contas bancárias
✅ Busca de transações
✅ Revogação de consentimento
✅ Refresh de tokens
✅ Mapeamento automático de dados

## Links Úteis

- [Dashboard Belvo](https://dashboard.belvo.com/)
- [Documentação Belvo](https://developers.belvo.com/docs)
- [API Reference](https://developers.belvo.com/reference)
- [Instituições Suportadas](https://developers.belvo.com/docs/institution-coverage)

## Suporte

Em caso de problemas:
1. Verifique se as variáveis de ambiente estão corretas
2. Confirme que o provedor está definido como `belvo`
3. Consulte os logs do backend para mensagens detalhadas
4. Verifique a documentação do Belvo
