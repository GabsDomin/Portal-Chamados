# Portal de Chamados

Portal web com back-end intermediario para integracao com o TOPdesk.

## Como rodar

1. Instale as dependencias:

```bash
npm install
```

2. Copie `.env.example` para `.env` e preencha:

```env
PORT=4173
TOPDESK_BASE_URL=https://keep-sottelli.topdesk.net
TOPDESK_USERNAME=usuario_api
TOPDESK_APP_PASSWORD=app_password_ou_token
TOPDESK_OPERATOR_GROUP_ID=
TOPDESK_CALL_TYPE_ID=
TOPDESK_ENTRY_TYPE_ID=
SUPABASE_URL=
SUPABASE_ANON_KEY=
DATABASE_URL=
DIRECT_URL=
```

Na Railway, o app tambem aceita estes aliases caso as variaveis ja tenham sido criadas com nomes em portugues:

| Nome padrao | Alias aceito |
|-------------|--------------|
| `DATABASE_URL` | `URL_DO_BANCO_DE_DADOS` |
| `DIRECT_URL` | `URL_DIRETA` |
| `SUPABASE_URL` | `URL_SUPABASE` |
| `TOPDESK_BASE_URL` | `URL_BASE_TOPDESK` |
| `TOPDESK_APP_PASSWORD` | `SENHA_TOPDESK_APP` |

3. Inicie:

```bash
npm start
```

4. Abra:

```text
http://localhost:4173
```

## Login

O projeto suporta dois modos de login:

- Com Supabase configurado no `.env`: usa Supabase Auth.
- Sem Supabase configurado: usa a base local `data/users.json` para desenvolvimento.

## Login local de teste

O prototipo pode usar uma base local simples em `data/users.json` apenas para desenvolvimento. Esse arquivo fica fora do Git por seguranca.

Para criar usuarios de teste no banco, defina `SEED_USER_PASSWORD` no ambiente e rode:

```bash
npm run db:seed
```

O atendimento continua integrado pelo back-end usando as credenciais do servidor no `.env`.

## Supabase + Prisma (ORM)

O banco usa **Prisma** conectado ao Postgres do Supabase. No `.env`, preencha:

```env
# Pooler transaction mode — runtime do app (porta 6543)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[SENHA]@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Pooler session mode — migrations do Prisma CLI (porta 5432)
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[SENHA]@aws-1-us-east-2.pooler.supabase.com:5432/postgres"

# Opcional: login via Supabase Auth
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_anon_key
```

Comandos uteis:

```bash
npm run db:migrate   # criar/aplicar migrations
npm run db:push      # sincronizar schema sem migration
npm run db:studio    # interface visual do banco
npm run db:generate  # regenerar o client
```

No codigo, use o client em `lib/db.js`:

```js
const { getPrisma } = require("./lib/db");
const prisma = getPrisma();
const profiles = await prisma.portalProfile.findMany();
```

O schema fica em `prisma/schema.prisma`. O agente de IA pode criar tabelas editando esse arquivo e rodando `npm run db:migrate`.

Tabelas principais:

| Tabela | Uso |
|--------|-----|
| `portal_users` | Login e perfil do cliente |
| `service_catalog` | Catalogo de servicos da home |
| `knowledge_articles` | Base de conhecimento |
| `announcements` | Avisos do portal |
| `service_statuses` | Status operacional dos servicos |

Usuarios de teste criados pelo seed:

| Nome | E-mail |
|------|--------|
| Cliente Demo | cliente.demo@example.com |
| Cliente Financeiro | cliente.financeiro@example.com |
| Cliente Operacao | cliente.operacao@example.com |

Para recriar os dados de teste: `npm run db:seed`

Skills do Supabase para o agente foram instaladas em `.agents/skills/`.

## Supabase Auth (opcional)

Com `SUPABASE_URL` e `SUPABASE_ANON_KEY` configurados, o login usa Supabase Auth. Sem isso, usa `data/users.json` para desenvolvimento.

Crie usuarios em **Authentication > Users**. Para cada usuario, insira um perfil em `portal_profiles` (via Prisma ou SQL):

- `id`: mesmo UUID do usuario em `auth.users`;
- `name`: nome do cliente;
- `company`: empresa;
- `caller_id`: opcional;
- `role`: `Cliente`.

## Arquitetura

O navegador chama apenas o back-end local:

```text
Portal web -> /api/chamados -> Back-end intermediario -> API TOPdesk
```

As credenciais do TOPdesk ficam no servidor, nunca no front-end.

## O que ainda precisa do TOPdesk

- Usuario tecnico do TOPdesk.
- App password/token desse usuario.
- IDs reais de categoria, subcategoria, tipo de chamado, origem e grupo operador.
- Mapeamento do usuario logado para o `caller.id` real do TOPdesk.
- Confirmar endpoint de anexos habilitado no ambiente.
