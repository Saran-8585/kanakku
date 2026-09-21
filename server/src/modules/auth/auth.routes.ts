import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, validate } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import {
  login,
  loginSchema,
  register,
  registerSchema,
  toPublicUser,
} from './auth.service.js';

export const authRouter = Router();

authRouter.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await register(req.body));
  }),
);

authRouter.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    res.json(await login(req.body));
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } });
    res.json({ user: toPublicUser(user) });
  }),
);