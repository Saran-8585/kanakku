import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { ApiError } from './http.js';

export async function assertNoTransactions(userId: string, where: Prisma.TransactionWhereInput) {
  const count = await prisma.transaction.count({ where: { userId, ...where } });
  if (count > 0) throw new ApiError(409, `Delete ${count} transaction(s) referencing this record first`);
}