import express from 'express';
import cors from 'cors';
import { errorHandler } from './lib/http.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { accountsRouter } from './modules/accounts/accounts.routes.js';
import { categoriesRouter } from './modules/categories/categories.routes.js';
import { transactionsRouter } from './modules/transactions/transactions.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { assetsRouter } from './modules/invest/assets.routes.js';
import { loansRouter } from './modules/debt/loans.routes.js';
import { taxRouter } from './modules/tax/tax.routes.js';

export const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'kanakku-server' });
});

app.use('/api/auth', authRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/assets', assetsRouter);
app.use('/api/loans', loansRouter);
app.use('/api/tax', taxRouter);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);