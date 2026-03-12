# NexoMail

**Gerenciador de e-mail inteligente com IA.** Unifique múltiplas caixas de entrada (Gmail, Outlook, IMAP) em uma interface moderna com um agente de IA integrado para organização, busca e automação.

🌐 **[nexomail.app](https://nexomail.app)**

---

## Funcionalidades

### Inbox & Organização
- Múltiplas contas simultâneas (Gmail, Outlook, IMAP)
- Inbox unificada com threads agrupadas
- Pastas: Caixa de entrada, Enviados, Rascunhos, Com estrela, Arquivados, Spam, Lixeira
- Labels personalizadas com cores — criar, editar, deletar, atribuir a threads
- Agrupamento por data, remetente ou assunto
- Modo de visualização normal e compacto
- Busca full-text por assunto, remetente e conteúdo
- Ações em thread: arquivar, mover para lixeira, marcar como spam, estrela, responder

### Compose
- Destinatários com chips (To, Cc, Bcc)
- Resposta com quote do email original
- Assistente IA integrado para gerar rascunhos a partir de instruções

### Agente de IA
- Chat em linguagem natural para gerenciar e-mails
- Ferramentas: buscar, marcar como lido, arquivar, mover para lixeira, criar labels, obter estatísticas
- **AI Organizar**: classifica automaticamente emails recentes sem label (Claude Haiku)
- Powered by Anthropic Claude Sonnet 4.6 (principal) + Claude Haiku 4.5 (classificação em lote)

### Dashboard
- Cards de resumo: não lidos, total 30 dias, remetentes únicos, contas
- Gráfico de barras: emails recebidos nos últimos 7 dias
- Top remetentes com barra de proporção
- Gráfico de distribuição por pasta (Inbox / Arquivados / Spam / Lixeira)
- Lista de contas conectadas

### Settings
- Gerenciamento de contas de email (conectar, desconectar, sincronizar)
- Perfil do usuário
- Notificações (preferências locais)
- Aparência (tema claro / escuro / sistema)
- Labels (criar, editar cor, renomear, deletar)

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 15 (App Router, Turbopack) |
| Banco de dados | PostgreSQL 16 + Drizzle ORM |
| Cache | Redis + ioredis |
| Autenticação | better-auth v1.5 (Google OAuth + Microsoft OAuth) |
| Email | Gmail API (googleapis), Microsoft Graph API, IMAP (imapflow) |
| IA | Anthropic Claude (Sonnet 4.6 + Haiku 4.5), OpenAI GPT-4o (fallback) |
| UI | Tailwind CSS v3, shadcn/ui, Radix UI, Framer Motion, Recharts |
| Estado | TanStack Query v5, Jotai |
| Monorepo | pnpm workspaces + Turborepo |

---

## Estrutura

```
NexoMail/
├── apps/
│   └── web/                    # Next.js 15 — frontend + API routes
│       ├── app/
│       │   ├── (auth)/         # Login
│       │   ├── (app)/          # App protegido: mail, dashboard, chat, settings
│       │   └── api/            # API routes: emails, threads, labels, ai, connections
│       ├── components/
│       │   ├── mail/           # ThreadList, ThreadView, ViewToolbar, SearchBar
│       │   ├── layout/         # AppSidebar
│       │   ├── marketing/      # Landing page components
│       │   └── ui/             # shadcn/ui base components
│       └── lib/                # auth, db, session, driver-factory, utils
│
└── packages/
    ├── db/                     # Drizzle schema: threads, emails, labels, connections, ai
    ├── email/                  # Drivers: GmailDriver, OutlookDriver, ImapDriver
    ├── ai/                     # Ferramentas do agente, providers, tipos
    └── tsconfig/               # TypeScript config compartilhada
```

---

## Desenvolvimento Local

### Pré-requisitos

- Node.js 20+
- pnpm 9+
- Docker Desktop

### Setup

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/nexomail.git
cd nexomail

# 2. Instale as dependências
pnpm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais

# 4. Inicie PostgreSQL + Redis via Docker
docker-compose up -d

# 5. Crie as tabelas no banco
pnpm db:push

# 6. Inicie o servidor de desenvolvimento
pnpm dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## Variáveis de Ambiente

Copie `.env.example` para `.env` e preencha:

| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `NEXT_PUBLIC_APP_URL` | URL pública da aplicação | Sim |
| `BETTER_AUTH_SECRET` | Secret da autenticação — `openssl rand -base64 32` | Sim |
| `BETTER_AUTH_URL` | URL base para callbacks de auth | Sim |
| `ENCRYPTION_KEY` | Chave para criptografia de tokens OAuth — `openssl rand -base64 32` | Sim |
| `DATABASE_URL` | URL do PostgreSQL | Sim |
| `REDIS_URL` | URL do Redis | Sim |
| `GOOGLE_CLIENT_ID` | OAuth Client ID (Google Cloud Console) | Para Gmail |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret | Para Gmail |
| `AZURE_CLIENT_ID` | App ID (Azure Portal) | Para Outlook |
| `AZURE_CLIENT_SECRET` | Client Secret | Para Outlook |
| `AZURE_TENANT_ID` | Tenant ID — use `common` para multi-tenant | Para Outlook |
| `ANTHROPIC_API_KEY` | API Key da Anthropic (Claude) | Para IA |
| `OPENAI_API_KEY` | API Key da OpenAI (GPT-4o fallback) | Opcional |
| `RESEND_API_KEY` | API Key do Resend (emails transacionais) | Opcional |
| `RESEND_FROM_EMAIL` | E-mail remetente do sistema | Opcional |
| `SENTRY_DSN` | DSN do Sentry para monitoramento de erros | Opcional |

### OAuth Google

1. [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Ative: Gmail API, Google People API
3. Crie OAuth 2.0 Client ID com redirect URIs:
   - Desenvolvimento: `http://localhost:3000/api/auth/callback/google`
   - Produção: `https://nexomail.app/api/auth/callback/google`

### OAuth Microsoft

1. [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
2. Permissões: `Mail.Read`, `Mail.ReadWrite`, `Mail.Send`, `User.Read`, `offline_access`
3. Redirect URIs:
   - Desenvolvimento: `http://localhost:3000/api/auth/callback/microsoft`
   - Produção: `https://nexomail.app/api/auth/callback/microsoft`

---

## Comandos

| Comando | Descrição |
|---------|-----------|
| `pnpm dev` | Inicia em modo desenvolvimento (Turbopack) |
| `pnpm build` | Build de produção |
| `pnpm db:push` | Sincroniza o schema com o banco (dev) |
| `pnpm db:generate` | Gera arquivos de migração Drizzle |
| `pnpm db:migrate` | Executa migrações pendentes |
| `pnpm db:studio` | Abre o Drizzle Studio (UI do banco) |

---

## Deploy

O NexoMail é deployado em **Railway** com PostgreSQL e Redis gerenciados.

Variáveis de ambiente adicionais para produção:
```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://nexomail.app
BETTER_AUTH_URL=https://nexomail.app
```

---

## Licença

MIT
"# NexoMail" 
