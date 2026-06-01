# Discovery — Autenticação no Frontend (Audicon_Web)

> **Tarefa:** R-08 — JWT em cookie httpOnly (Fase B). Este documento é **só-leitura**:
> mapeia o estado atual da autenticação no frontend antes de qualquer mudança.
> Nenhum código foi modificado.
>
> **Data:** 2026-06-01
> Todos os caminhos de arquivo são relativos à raiz de `Audicon_Web/`.

---

## ⚠️ Aviso de branch (ler antes de planejar o R-08)

O código de autenticação **mais avançado** vive na branch `refactor/frontend-error-routing`
(commit `a4f22ba`), que **ainda NÃO foi mergeada em `master`**. Este Discovery descreve
o estado dessa branch, por ser a base provável do R-08.

Arquivos de auth que **existem na branch de refactor mas NÃO em `master`**:

| Arquivo | Existe em master? | O que faz |
|---|---|---|
| [src/lib/auth-context.tsx](../src/lib/auth-context.tsx) | ❌ não | `AuthProvider` + `useAuth` (estado de claims) |
| [src/components/require-auth.tsx](../src/components/require-auth.tsx) | ❌ não | Guard de rota client-side `<RequireAuth>` |
| [src/hooks/use-api-mutation.ts](../src/hooks/use-api-mutation.ts) | ❌ não | Wrapper de `useMutation` com toast de erro |
| [src/lib/api.ts](../src/lib/api.ts) `getErrorMessage` | ⚠️ parcial | helper de mensagem de erro adicionado no refactor |

Em `master`, a guarda de rota era feita inline em cada página (`getClaims()` + `router.replace`).
**Recomendação:** mergear `refactor/frontend-error-routing` em `master` antes de iniciar o R-08,
para que o R-08 parta de uma base única e consistente.

---

## 1. Como o login funciona hoje

- **Página:** [src/app/login/page.tsx](../src/app/login/page.tsx)
- **Rota chamada:** `POST {NEXT_PUBLIC_API_URL}/auth/login` (via cliente axios `api`)
- **Disparo:** `useMutation` do TanStack Query, submetido por `react-hook-form` + `zod`
  (validação: e-mail válido, senha ≥ 6).
- **Tratamento da resposta:** a resposta vem no envelope `{ statusCode, data }`; o código
  lê `res.data.data.access_token` e o grava no `localStorage` via `authStorage.set(...)`,
  chama `refresh()` do `AuthContext`, e redireciona conforme os claims do JWT decodificado.

Trecho ([src/app/login/page.tsx:37-52](../src/app/login/page.tsx#L37-L52)):

```tsx
const mutation = useMutation({
  mutationFn: async (data: LoginRequest) => {
    const res = await api.post<ApiEnvelope<LoginResponse>>('/auth/login', data);
    return res.data.data;
  },
  onSuccess: (data) => {
    authStorage.set(data.access_token);   // <-- grava token no localStorage
    refresh();                            // <-- relê claims no AuthContext
    toast.success('Login realizado');
    const claims = authStorage.getClaims();
    if (claims?.mustChangePassword) {
      router.push('/change-password');
    } else {
      router.push(claims?.isMaster ? '/master/companies' : '/condominiums');
    }
  },
  ...
});
```

O `LoginResponse` é `{ access_token: string }` ([src/lib/types.ts:6-8](../src/lib/types.ts#L6-L8)).

---

## 2. Onde o token é armazenado

- **Mecanismo:** `localStorage` do browser (acesso via JS, **não** cookie).
- **Chave:** `audicon_token` (constante `TOKEN_KEY`).
- **Arquivo:** [src/lib/auth.ts](../src/lib/auth.ts)

O módulo expõe um objeto `authStorage` com `get / set / clear / getClaims`, e decodifica o
JWT manualmente (`atob` no payload) para extrair os claims — **sem validar assinatura**
(decodificação puramente client-side, só para ler `isMaster`, `companyId`, `mustChangePassword`).

Trecho ([src/lib/auth.ts:24-42](../src/lib/auth.ts#L24-L42)):

```ts
const TOKEN_KEY = 'audicon_token';

export const authStorage = {
  get()   { return typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY); },
  set(t)  { if (typeof window !== 'undefined') localStorage.setItem(TOKEN_KEY, t); },
  clear() { if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY); },
  getClaims() { const t = this.get(); return t ? decodeJwt(t) : null; },
};
```

> Nota: `jwt-decode` está nas dependências (`package.json`), mas a decodificação real é
> feita por uma função própria `decodeJwt` em `auth.ts` — a lib não é usada.

Estado em memória (espelho dos claims) vive no `AuthContext`
([src/lib/auth-context.tsx](../src/lib/auth-context.tsx)): hidrata do `localStorage` no
`useEffect` pós-montagem (SSR não tem `localStorage`), e escuta o evento `storage` para
sincronizar entre abas.

---

## 3. Como o token é enviado em requests autenticados

- **Cliente HTTP:** instância única de axios em [src/lib/api.ts](../src/lib/api.ts).
- **Mecanismo:** **interceptor de request** que lê `authStorage.get()` e anexa
  `Authorization: Bearer <token>` em todo request.
- **`withCredentials`:** **não está configurado** (grep por `withCredentials` em `src/` = 0
  ocorrências). Hoje o front não envia cookies — apenas o header `Authorization`.

Trecho ([src/lib/api.ts:4-28](../src/lib/api.ts#L4-L28)):

```ts
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = authStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      authStorage.clear();
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
```

### ⚠️ Pontos que escapam do axios (3 chamadas com `fetch` cru)

Três fluxos de download de binário usam `fetch` nativo e **montam o header
`Authorization: Bearer` manualmente** com `authStorage.get()` — eles **não** passam pelo
interceptor. São os pontos mais frágeis na migração para cookie:

| Fluxo | Arquivo | Linha |
|---|---|---|
| Thumbnail/preview de imagens (blob) | [src/components/infraction-images.tsx](../src/components/infraction-images.tsx#L36-L43) | ~36-43 |
| Download do PDF da infração (blob) | [.../infractions/[infractionId]/page.tsx](../src/app/condominiums/[id]/units/[unitId]/infractions/[infractionId]/page.tsx#L126-L133) | ~126-133 |
| Export CSV de infrações (blob) | [.../infractions/page.tsx](../src/app/condominiums/[id]/units/[unitId]/infractions/page.tsx#L70-L77) | ~70-77 |

Exemplo ([infractions/page.tsx:70-77](../src/app/condominiums/[id]/units/[unitId]/infractions/page.tsx#L70-L77)):

```tsx
const token = authStorage.get();
const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
const res = await fetch(`${baseUrl}/infractions/export?unitId=${unitId}`, {
  headers: { Authorization: `Bearer ${token}` },
});
```

> Com cookie httpOnly, `authStorage.get()` retornará `null` e esses três downloads quebram.
> Precisarão de `credentials: 'include'` (ou migração para axios `responseType: 'blob'` com
> `withCredentials`). Há também 1 download que **já usa axios** com blob e portanto herda o
> interceptor: regimento PDF em [condominiums/[id]/page.tsx:184](../src/app/condominiums/[id]/page.tsx#L184).

---

## 4. Como o logout funciona

- **AuthContext** ([src/lib/auth-context.tsx:41-44](../src/lib/auth-context.tsx#L41-L44)):
  `logout()` chama `authStorage.clear()` (remove do `localStorage`) e zera o estado de claims.
- **UI** ([src/components/brand-header.tsx:43-46](../src/components/brand-header.tsx#L43-L46)):
  o botão "Sair" chama `handleLogout()` → `logout()` + `router.replace('/login')`.
- **Logout implícito por 401:** o interceptor de resposta do axios (seção 3) também limpa o
  token e força `window.location.href = '/login'` em qualquer 401.

> Não há chamada a um endpoint de logout no backend — é puramente client-side (apaga o
> token local). Com cookie httpOnly, o logout **terá que** chamar um endpoint no back para
> limpar o cookie (o JS não consegue apagar cookie httpOnly).

---

## 5. Proteção de rotas no front

- **Não existe `middleware.ts`** (grep = 0 ocorrências). Toda proteção é client-side.
- **Componente:** `<RequireAuth>` em [src/components/require-auth.tsx](../src/components/require-auth.tsx),
  que centraliza o padrão `useEffect + claims + router.replace` antes repetido em ~9 páginas.
  - sem `role`: exige apenas estar autenticado;
  - `role="master"`: exige `isMaster` (senão → `/condominiums`);
  - `role="company"`: exige admin de empresa não-master com `companyId` (senão redireciona).
  - Enquanto `ready` é `false` (claims ainda não hidratados) ou durante redirect, **não
    renderiza** o conteúdo (evita flash de tela protegida).

Páginas que usam `<RequireAuth>`:

| Rota | Guard |
|---|---|
| [/condominiums](../src/app/condominiums/page.tsx) | `<RequireAuth>` |
| [/condominiums/[id]](../src/app/condominiums/[id]/page.tsx) | `<RequireAuth>` |
| [/condominiums/[id]/units/[unitId]/infractions](../src/app/condominiums/[id]/units/[unitId]/infractions/page.tsx) | `<RequireAuth>` |
| [/condominiums/.../infractions/[infractionId]](../src/app/condominiums/[id]/units/[unitId]/infractions/[infractionId]/page.tsx) | `<RequireAuth>` |
| [/dashboard](../src/app/dashboard/page.tsx) | `<RequireAuth>` |
| [/audit-log](../src/app/audit-log/page.tsx) | `<RequireAuth>` |
| [/profile](../src/app/profile/page.tsx) | `<RequireAuth>` |
| [/master/companies](../src/app/master/companies/page.tsx) | `<RequireAuth role="master">` |
| [/master/companies/[id]](../src/app/master/companies/[id]/page.tsx) | `<RequireAuth role="master">` |

> A guarda depende de ler o JWT do `localStorage` no client. Com cookie httpOnly, o JS não
> lê mais o token → `<RequireAuth>` precisa de outra fonte de verdade para os claims
> (ex.: endpoint `/auth/profile` ou claims não-sensíveis em cookie legível). Isso é central
> ao R-08.

---

## 6. Refresh / renovação de token

- **Não há renovação de token.** Não existe refresh token, nem retry de 401, nem
  re-autenticação silenciosa.
- O único tratamento de expiração é o interceptor de resposta: **qualquer 401 → logout
  forçado** (limpa token + redireciona para `/login`). Ver [src/lib/api.ts:17-28](../src/lib/api.ts#L17-L28).
- O `refresh()` do `AuthContext` **não renova token** — apenas relê os claims do
  `localStorage` (nome enganoso; é "re-hidratar estado", chamado após login).

---

## 7. Lista de chamadas autenticadas hoje (superfície afetada pelo R-08)

Todas via cliente `api` (axios), exceto os 3 `fetch` crus da seção 3. Endpoints do backend
já consumidos:

**Auth / perfil**
- `POST /auth/login` — login ([login/page.tsx](../src/app/login/page.tsx#L39))
- `GET /auth/profile` — dados do usuário ([profile/page.tsx](../src/app/profile/page.tsx#L35))
- `POST /auth/change-password` (área) — troca de senha ([change-password/page.tsx](../src/app/change-password/page.tsx#L45))

**Empresas (master)**
- `GET /companies`, `POST /companies` ([master/companies/page.tsx](../src/app/master/companies/page.tsx))
- `GET /companies/:id`, `PATCH /companies/:id`, `DELETE /companies/:id`
- `GET /companies/:id/users`, `GET /companies/:id/condominiums`, `POST` de funcionário/reset
  ([master/companies/[id]/page.tsx](../src/app/master/companies/[id]/page.tsx))

**Condomínios / unidades**
- `GET /condominiums` (paginado) ([condominiums/page.tsx](../src/app/condominiums/page.tsx#L29))
- `GET/PATCH/DELETE /condominiums/:id`, `GET/POST /condominiums/:id/units`, `PATCH unit`
- `POST/DELETE /condominiums/:id/regimento`, `GET /condominiums/:id/regimento` (blob via axios)
- `POST /condominiums/:id/members` ([condominiums/[id]/page.tsx](../src/app/condominiums/[id]/page.tsx))

**Infrações**
- `GET /infractions/:id`, `POST /infractions`, `GET` lista paginada
- `POST /infractions/:id/analyze`, `PATCH /infractions/:id`, `POST /infractions/:id/send`,
  `POST` de envio WhatsApp ([infractions/[infractionId]/page.tsx](../src/app/condominiums/[id]/units/[unitId]/infractions/[infractionId]/page.tsx))
- `GET/POST/DELETE /infractions/:id/images` ([infraction-images.tsx](../src/components/infraction-images.tsx))
- `GET /infractions/:id/notifications` ([notification-history.tsx](../src/components/notification-history.tsx))
- `GET /infractions/export` (CSV, **fetch cru**), download PDF (**fetch cru**)

**Dashboard / auditoria**
- `GET /dashboard` ([dashboard/page.tsx](../src/app/dashboard/page.tsx#L67))
- `GET /audit-log` (paginado) + `GET /companies` (filtro) ([audit-log/page.tsx](../src/app/audit-log/page.tsx))

> **Impacto do R-08:** como todas essas chamadas dependem do header `Authorization` injetado
> pelo interceptor (ou montado manualmente nos 3 `fetch`), trocar para cookie httpOnly afeta
> **um único ponto central** (o interceptor do axios passa a usar `withCredentials: true` e
> deixa de anexar o header) **+ os 3 `fetch` crus** que precisam de `credentials: 'include'`.

---

## 8. Detalhes de ambiente

- **URL do backend:** vem de `process.env.NEXT_PUBLIC_API_URL`
  ([src/lib/api.ts:5](../src/lib/api.ts#L5)). Definida em `.env.local`:
  `NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1`.
- **Porta do front em dev:** `next dev` padrão → **`http://localhost:3000`** — **colide com a
  porta padrão do backend** (`3000`). Em dev, ou o back roda em outra porta, ou o Next sobe em
  `3001` por fallback. ⚠️ **Verificar antes do R-08**, pois cookie httpOnly + `SameSite` +
  CORS com credenciais são sensíveis a origem/porta. Mesma-origem simplifica muito o cookie.
- **CORS / credenciais no axios:** **não há** `withCredentials` em nenhum lugar do front hoje.
  O backend tem `CORS_ORIGINS` configurável (ver CLAUDE.md do back), mas o front ainda não
  envia cookies. Habilitar `withCredentials` + `Access-Control-Allow-Credentials: true` no
  back é parte do R-08.

---

## 9. Estado geral do frontend (bônus — dimensão antes da Fase C)

**Stack:** Next.js 15.5 (App Router) + React 19 + axios + TanStack Query v5 + react-hook-form
+ zod + shadcn/base-ui + Tailwind v4 + sonner. Sem testes automatizados no repo
(`package.json` só tem `dev/build/start/lint`).

**Rotas (App Router) — 12 no total:**

| # | Rota | Estado |
|---|---|---|
| 1 | `/` | redirect → `/login` (funcional, trivial) |
| 2 | `/login` | ✅ funcional, UI redesenhada (2 painéis) |
| 3 | `/change-password` | ✅ funcional (troca forçada de senha) |
| 4 | `/condominiums` | ✅ funcional (lista paginada + busca) |
| 5 | `/condominiums/[id]` | ✅ funcional (detalhe + unidades + regimento + CRUD) |
| 6 | `/condominiums/[id]/units/[unitId]/infractions` | ✅ funcional (lista + criar + export CSV) |
| 7 | `/condominiums/.../infractions/[infractionId]` | ✅ funcional (análise IA + aprovação + envio + PDF) |
| 8 | `/dashboard` | ✅ funcional (métricas) |
| 9 | `/audit-log` | ✅ funcional (filtro por empresa p/ master) |
| 10 | `/master/companies` | ✅ funcional (gestão de empresas) |
| 11 | `/master/companies/[id]` | ✅ funcional (detalhe + usuários + reset senha) |
| 12 | `/profile` | ✅ funcional (perfil redesenhado) |

**Componentes:** `brand-header` (nav + logout), `infraction-images` (galeria + lightbox + upload),
`notification-history` (auto-refresh 30s), `providers` (Query + Auth), `require-auth` (guard),
+ `ui/*` shadcn (button, card, dialog, input, label, sonner, textarea).

**Observações / inconsistências notadas (sem aprofundar):**
- Guarda de rota é 100% client-side (sem `middleware.ts`) → há flash mínimo evitado pelo
  `ready`, mas SEO/SSR não protege nada (aceitável para app interno autenticado).
- Decodificação de JWT no client é **sem validação de assinatura** — ok porque é só para
  decidir navegação, mas reforça que a autorização real é no backend.
- `jwt-decode` está instalado mas não usado (há `decodeJwt` artesanal).
- 3 downloads de binário com `fetch` cru duplicam a lógica de auth do interceptor — dívida
  técnica que o R-08 deve unificar.
- Divergência master ↔ `refactor/frontend-error-routing` (ver aviso no topo): `auth-context`,
  `require-auth` e `use-api-mutation` só existem na branch de refactor.

---

## Resumo executivo para o R-08

| Aspecto | Hoje | Implicação para "cookie httpOnly" |
|---|---|---|
| Armazenamento | `localStorage['audicon_token']` | Deixa de existir no front; cookie setado pelo back |
| Envio | interceptor axios → `Authorization: Bearer` | Vira `withCredentials: true`; remover header manual |
| Downloads binários | 3× `fetch` cru com header manual | Adicionar `credentials: 'include'` ou migrar p/ axios |
| Claims no front | decodificados do token no `localStorage` | JS não lê cookie httpOnly → precisa `/auth/profile` ou cookie de claims legível |
| Logout | client-side (`clear()`) | Precisa endpoint de logout no back p/ limpar cookie |
| 401 | interceptor força `/login` | Mantém, mas a fonte do "estou logado?" muda |
| Refresh | inexistente | Decidir se R-08 introduz refresh ou mantém só-401 |
| Guard | `<RequireAuth>` client-side | Reescrever fonte de claims; avaliar `middleware.ts` |
| Ambiente | `NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1`; sem `withCredentials`; possível colisão de porta 3000 | CORS com credenciais + `SameSite` + alinhar portas/origem |
