import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../lib/http.js';
import { verifyToken } from '../lib/jwt.js';

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new ApiError(401, 'Missing auth token'));
    return;
  }
  try {
    const { uid } = verifyToken(header.slice(7));
    req.userId = uid;
    next();
  } catch {
    next(new ApiError(401, 'Invalid or expired token'));
  }
}