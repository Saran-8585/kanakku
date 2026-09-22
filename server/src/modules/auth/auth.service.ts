import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/http.js';
import { signToken } from '../../lib/jwt.js';
import { BUILTIN_CATEGORIES } from '../categories/builtin.js';

export function toPublicUser(u: {
  id: string;
  email: string;
  name: string | null;
  baseCurrency: string;
  taxJurisdiction: string;
  fyStart: number;
}) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    baseCurrency: u.baseCurrency,
    taxJurisdiction: u.taxJurisdiction,
    fyStart: u.fyStart,
  };
}

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function register(data: z.infer<typeof registerSchema>) {
  const email = data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(409, 'Email already registered');

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(data.password, 10),
      name: data.name,
    },
  });

  await prisma.category.createMany({
    data: BUILTIN_CATEGORIES.map((c) => ({ userId: user.id, name: c.name, type: c.type })),
  });

  return { token: signToken({ uid: user.id }), user: toPublicUser(user) };
}

export async function login(data: z.infer<typeof loginSchema>) {
  const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  return { token: signToken({ uid: user.id }), user: toPublicUser(user) };
}