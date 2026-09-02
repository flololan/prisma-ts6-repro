# Prisma × TypeScript ≥ 6.0 — nested query type safety silently lost

Minimal reproduction for **[prisma/orm#30190](https://github.com/prisma/orm/issues/30190)**
(related: [#29519](https://github.com/prisma/orm/issues/29519), [#29449](https://github.com/prisma/orm/issues/29449),
upstream: [microsoft/TypeScript#62722](https://github.com/microsoft/TypeScript/issues/62722), [microsoft/TypeScript#63515](https://github.com/microsoft/TypeScript/issues/63515)).

`src/repro.ts` contains **5 invalid Prisma queries** (non-existent / renamed fields inside `select` with a relation,
relation filters in `where`, non-existent relations). Same code, same generated client — only the TypeScript version changes:

| TypeScript | Errors reported | Status |
|---|---|---|
| 5.9.2 | **5** | ✅ correct |
| 6.0.3 | **0** | ❌ all 5 become runtime `PrismaClientValidationError`s |
| 7.0.x | **0** | ❌ |

## Run

```bash
npm install
npm run repro        # = bash verify.sh → runs tsc with TS 5.9.2, 6.0.3 and 7 and prints error counts
```

Or manually:

```bash
npx prisma generate
npx tsc --noEmit                                    # TS 6.0.3 (installed) → 0 errors
npx -y -p typescript@5.9.2 tsc --noEmit             # → 5 errors
```

## What exactly breaks

- A `select` that contains a relation with its own nested `select`/`include` loses excess-property checking for **the entire `select` object**, including its top-level scalars (`{ id: true, auth0Id: true, posts: { select: {...} } }` → `auth0Id` is not flagged). Remove the relation and the error comes back.
- The resulting payload type silently drops the invalid field, so `users.map(u => u.auth0Id)` is not flagged either.
- Relation filters in `where` (`where: { author: { auth0Id } }`) are not checked.
- Non-existent relations in `select` (`owner: { select: {...} }`) are not checked.
- Nested `create` **is** still checked (control case in the file), and flat `select`s without relations are still checked.

## Environment

- `prisma` / `@prisma/client` 7.9.1, generator `prisma-client` (`moduleFormat = "cjs"`)
- Node 22, `strict: true`
- No database connection required — type checking only.

## Why this matters

Nothing warns about this combination: `@prisma/client` has no `peerDependencies` range on `typescript`, and `prisma generate`
prints no diagnostic. A routine TypeScript bump (e.g. by Renovate/Dependabot) silently removes compile-time validation for
the most error-prone part of the API. In the real codebase this repro was extracted from, these errors were hidden after a
schema migration and only found by re-checking with TS 5.9.2.
