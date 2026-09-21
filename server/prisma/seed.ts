import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'demo1234';

async function main() {
  const email = 'demo@kanakku.app';
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
        name: 'Demo User',
      },
    });
  }

  const bank = await prisma.account.upsert({
    where: { id: `acct-bank-${user.id}` },
    update: {},
    create: {
      id: `acct-bank-${user.id}`,
      userId: user.id,
      type: 'bank',
      name: 'HDFC Savings',
      openingBalance: 250000,
    },
  });

  const wallet = await prisma.account.upsert({
    where: { id: `acct-wallet-${user.id}` },
    update: {},
    create: {
      id: `acct-wallet-${user.id}`,
      userId: user.id,
      type: 'wallet',
      name: 'UPI Wallet',
    },
  });

  const card = await prisma.account.upsert({
    where: { id: `acct-card-${user.id}` },
    update: {},
    create: {
      id: `acct-card-${user.id}`,
      userId: user.id,
      type: 'card',
      name: 'Amazon Pay Card',
    },
  });

  const categories: Array<{ name: string; type: 'income' | 'expense' }> = [
    { name: 'Salary', type: 'income' },
    { name: 'Freelance', type: 'income' },
    { name: 'Dividends', type: 'income' },
    { name: 'Food', type: 'expense' },
    { name: 'Rent', type: 'expense' },
    { name: 'Utilities', type: 'expense' },
    { name: 'Groceries', type: 'expense' },
    { name: 'Transport', type: 'expense' },
    { name: 'Subscriptions', type: 'expense' },
    { name: 'Shopping', type: 'expense' },
  ];

  for (const c of categories) {
    const existing = await prisma.category.findUnique({
      where: { userId_name: { userId: user.id, name: c.name } },
    });
    if (!existing) {
      await prisma.category.create({
        data: { userId: user.id, name: c.name, type: c.type },
      });
    }
  }

  const txnCount = await prisma.transaction.count({ where: { userId: user.id } });
  if (txnCount === 0) {
    const now = new Date();
    const iso = (offsetMonths: number, day: number) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - offsetMonths);
      d.setDate(day);
      return d;
    };

    for (let m = 5; m >= 0; m--) {
      // salary income
      await prisma.transaction.create({
        data: {
          userId: user.id,
          accountId: bank.id,
          type: 'income',
          amount: 85000,
          date: iso(m, 1),
          note: 'Monthly salary',
          tags: JSON.stringify(['salary']),
        },
      });

      if (m === 0) {
        // top up UPI wallet, pay part of card, TDS/advance tax
        await prisma.transaction.create({
          data: {
            userId: user.id,
            accountId: bank.id,
            toAccountId: wallet.id,
            type: 'transfer',
            amount: 10000,
            date: iso(0, 2),
            note: 'Wallet top-up',
          },
        });
        await prisma.transaction.create({
          data: {
            userId: user.id,
            accountId: card.id,
            type: 'expense',
            amount: 4500,
            date: iso(0, 8),
            note: 'Amazon purchase',
          },
        });
        await prisma.transaction.create({
          data: {
            userId: user.id,
            accountId: bank.id,
            type: 'tax_event',
            amount: 8000,
            date: iso(0, 15),
            note: 'TDS on interest',
          },
        });
      }

      const expenses: Array<[string, number]> = [
        ['Rent', 22000],
        ['Groceries', 6000],
        ['Food', 4000],
        ['Transport', 1800],
        ['Utilities', 2500],
        ['Subscriptions', 1200],
      ];
      for (const [cat, amt] of expenses) {
        const category = await prisma.category.findUnique({
          where: { userId_name: { userId: user.id, name: cat } },
        });
        await prisma.transaction.create({
          data: {
            userId: user.id,
            accountId: bank.id,
            type: 'expense',
            categoryId: category?.id,
            amount: amt,
            date: iso(m, 5 + expenses.indexOf([cat, amt]) * 3),
            note: cat,
          },
        });
      }
    }

    // EMI loan
    await prisma.loan.create({
      data: {
        userId: user.id,
        name: 'Home Loan',
        principal: 2400000,
        interestRate: 8.5,
        startDate: iso(24, 1),
        tenureMonths: 240,
      },
    });

    // A couple of investments
    const asset = await prisma.asset.upsert({
      where: { id: `asset-infy-${user.id}` },
      update: {},
      create: {
        id: `asset-infy-${user.id}`,
        userId: user.id,
        symbol: 'INFY',
        name: 'Infosys Ltd',
        class: 'stock',
        price: 1750,
        priceUpdatedAt: new Date(),
      },
    });
    await prisma.lot.create({
      data: {
        assetId: asset.id,
        qty: 20,
        unitPrice: 1420,
        date: iso(8, 10),
        remainingQty: 20,
      },
    });
    await prisma.lot.create({
      data: {
        assetId: asset.id,
        qty: 10,
        unitPrice: 1600,
        date: iso(3, 12),
        remainingQty: 10,
      },
    });

    // Deductions
    await prisma.deduction.createMany({
      data: [
        { userId: user.id, fyKey: '2026-27', section: '80C', amount: 120000, note: 'ELSS + PF' },
        { userId: user.id, fyKey: '2026-27', section: '80D', amount: 15000, note: 'Health insurance' },
      ],
    });
  }

  console.log('Seed complete ✓');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());