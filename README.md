# Audicon Frontend

Frontend Next.js 15 + TypeScript + Tailwind 4 + shadcn/ui para o sistema Audicon de gestão de infrações em condomínios.

Backend: [Audicon_BackEnd](https://github.com/GuilhermeSaldanha02/Audicon_BackEnd)

## Stack

- **Next.js 15** (App Router) + **React 19**
- **TypeScript**
- **Tailwind CSS 4** + **shadcn/ui** (componentes acessíveis)
- **TanStack Query** + **axios** (fetch e cache)
- **react-hook-form** + **zod** (formulários e validação)
- **sonner** (toasts)

## Setup

```bash
cp .env.example .env.local
# editar NEXT_PUBLIC_API_URL conforme o backend rodando

npm install
npm run dev
```

App em [http://localhost:3001](http://localhost:3001) (ou outra porta se 3000 estiver ocupado pelo backend).

## Estrutura

```
src/
├── app/                 # App Router (rotas)
│   ├── login/           # Página de login
│   ├── condominiums/    # Lista de condomínios do usuário
│   ├── layout.tsx       # Layout raiz com providers e toaster
│   └── page.tsx         # Redireciona para /login
├── components/
│   ├── ui/              # Componentes shadcn (button, input, card, etc.)
│   └── providers.tsx    # QueryClientProvider
└── lib/
    ├── api.ts           # Cliente axios + interceptor JWT
    ├── auth.ts          # Helpers de token (localStorage)
    ├── query-client.ts  # Configuração TanStack Query
    └── types.ts         # Tipos compartilhados com a API
```

## Autenticação

JWT é armazenado em `localStorage` (`audicon_token`) e enviado via interceptor axios em todo request. Resposta 401 limpa o token e redireciona para `/login`.

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL base do backend (ex.: `http://localhost:3000`) |

## Geração de tipos TypeScript (OpenAPI)

Os tipos TypeScript da API são gerados automaticamente a partir do schema OpenAPI do backend.

```bash
npm run generate:types
```

**Pré-requisito:** o backend precisa estar rodando (por padrão em `http://localhost:3000`).

A URL é configurável via variável de ambiente `OPENAPI_URL`:

```bash
OPENAPI_URL=http://localhost:3100/api/docs-json npm run generate:types
```

O arquivo gerado (`src/types/api.generated.ts`) é **versionado** no repositório — não é ignorado pelo `.gitignore`. Para regenerar após mudanças no backend, rode o script novamente com o backend no ar.

> **Nota:** o schema Swagger fica em `/api/docs-json` (fora do prefixo global `/api/v1`).

## Próximos passos

Ver backlog completo no `CLAUDE.md` do backend. Funcionalidades a integrar conforme backend evolui:
- Upload de imagens da infração
- Fluxo de aprovação
- Notificações (e-mail, WhatsApp)
- Multi-tenant (Empresa)
