/**
 * Reproduction for prisma/orm#30190 (related: #29519, #29449)
 *
 * Every query below contains an INVALID field. All of them were taken 1:1
 * from patterns in a real codebase where a schema migration renamed
 * `User.auth0Id` -> `User.authId` and removed `File.owner`.
 *
 * Expected: 5 compile errors.
 *   - TypeScript 5.9.2  -> 5 errors (correct)
 *   - TypeScript 6.0.3  -> 0 errors (BUG) – every one fails at runtime with PrismaClientValidationError
 *   - TypeScript 7.0.x  -> 0 errors (BUG)
 */
import { PrismaClient } from "../prisma/generated/client";

// Type-check only – no runtime instance needed (Prisma 7 requires a driver adapter)
declare const prisma: PrismaClient;

// 1) select with an invalid scalar NEXT TO a relation that has a nested select.
//    As soon as the relation select is present, the whole `select` object loses
//    excess property checking. (Remove `posts: {...}` and the error comes back.)
export async function selectWithNestedRelation() {
  return prisma.user.findMany({
    select: {
      id: true,
      auth0Id: true, // ❌ renamed to authId
      posts: { select: { title: true } },
    },
  });
}

// 2) Same shape, but the *result* is consumed – the invalid field is typed as
//    `never`/absent and the access below is not flagged either.
export async function selectWithNestedRelationAndAccess() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      auth0Id: true, // ❌
      posts: { select: { id: true } },
    },
  });
  return users.map((u) => u.auth0Id); // ❌ should not exist on result type
}

// 3) Relation filter inside `where` (`where: { user: { auth0Id } }`).
export async function nestedRelationWhere() {
  return prisma.post.findMany({
    where: { author: { auth0Id: "abc" } }, // ❌
  });
}

// 4) Relation that does not exist at all (`owner` was removed) next to a scalar.
export async function nonExistingRelationInSelect() {
  return prisma.post.findUniqueOrThrow({
    where: { id: 1 },
    select: {
      id: true,
      owner: { select: { id: true } }, // ❌ relation is called `author`
    },
  });
}

// ✅ CONTROL A – nested `create` through a relation is STILL checked on TS 6/7
// (so the loss is specific to select/include/where shapes). Uncomment to verify:
// export async function nestedCreateControl() {
//   return prisma.post.create({
//     data: { title: "t", author: { create: { auth0Id: "abc", email: "a@b.c" } } }, // ❌ errors on all versions
//   });
// }

// ✅ CONTROL B – flat select without any relation. This DOES error on every TS
// version, proving only the *nested/relational* case is affected.
// Uncomment to verify:
// export async function flatControl() {
//   return prisma.user.findMany({ select: { id: true, auth0Id: true } });
// }
