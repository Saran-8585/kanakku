# Kanakku — In-App Workflow (ASCII Diagrams)

## 1. App-Level Navigation Map

```
                       FIRST LAUNCH ONLY
                 ┌─────────────────────────────┐
                 │        ONBOARDING           │
                 │  1. Country + base currency │
                 │  2. Add account / import    │
                 │  3. Tax jurisdiction set    │
                 └────────────┬────────────────┘
                              │
                              ▼
    ┌──────────────── TOP BAR (all screens) ─────────────────────────────┐
    │  ‹Sep› Period   [Currency ₹]   ●sync-status      (avatar ▸Settings) │
    └────────────────────────────────────────────────────────────────────┘

      ┌─────────┐      ┌────────┐      ┌────────┐      ┌───────┐      ┌───────┐
      │  HOME   │ ───► │CASHFLOW│ ───► │INVEST  │ ───► │ DEBTS │ ───► │  TAX  │
      │Dashboard│      │        │      │MENTS   │      │       │      │       │
      └────┬────┘      └───┬────┘      └───┬────┘      └───┬───┘      └───┬───┘
           │               │              │               │              │
           │   NetWorth    │  Overview    │  Holdings     │  Loans       │  Workspace
           │   SavingsRate │  Budgets     │  Portfolio    │  Cards       │  Filing
           │   Alerts      │  Categories  │               │  Plans       │  History
           │   Shortcuts   │              │               │              │
           └───────┬───────┘              │               │              │
                   │◄─────────────────────┴───────────────┴──────────────┘
                   │              every screen has:
                   │                [➕ Quick Add]  [⋯ overflow]  [filter bar]
                   ▼
          ┌───────────────────┐
          │  SETTINGS / ACCT  │  Accounts ▸ Data ▸ Preferences ▸ Privacy ▸ Billing
          └───────────────────┘
```

## 2. Global FAB — Quick Add (shared composer)

```
    [➕ Quick Add]  ── tap ─────────────────────────────▶  Add Transaction modal
       │                                                  Amount  Account  Type
       └── long-press ──▶ quick pick                       (Expense|Income|Transfer)
             Expense Income  Transfer                      Category* Note Date
                                                           Recurring? Tags
              *category auto-suggested from merchant
              history / memory
                           Save ──▶ Toast "Saved · Expense ₹250"
                                      (+ Undo) ──▶ screen updates live
```

## 3. Home (Dashboard)

```
    ┌────────────────────────────────────────────────────────┐
    │ NET WORTH  hero card        ₹12,40,000  ▲ 3.2% m/m     │
    │   (assets − liabilities)        [tap ▸ full timeline] │
    ├────────────────────────────────────────────────────────┤
    │ SAVINGS RATE ring             (income−expense)/income  │
    ├────────────────────────────────────────────────────────┤
    │ ALERTS feed                                            │
    │   ⚠ EMI due in 3 days         [Fix it ─▸ Debts]        │
    │   ⚠ Subscription renews Thu   [Fix it ─▸ Quick Add]    │
    │   ⚠ Tax advance reminder      [Fix it ─▸ Tax]          │
    ├────────────────────────────────────────────────────────┤
    │ SHORTCUT grid                                         │
    │  [＋Expense] [＋Income] [💳Payment] [⇄Transfer]        │
    ├────────────────────────────────────────────────────────┤
    │ [View Cashflow →]        [View Report ▸ Export]        │
    └────────────────────────────────────────────────────────┘
```

## 4. Cashflow Screen — Tabs

```
    CASHLOW ▸ [Overview] [Budgets] [Categories]

    Overview:
      ┌──────────────────────────────────────────────┐
      │ Income ₹45,000 │ Expense ₹28,500 │ Net +₹16.5k│
      │  ┌─────────┐   bar chart, tap bar ─▸ day's    │
      │  │▄▄▄▄▄▄▄▄│   transactions                    │
      │  └─────────┘   [Compare] [Export CSV] [➕]     │
      └──────────────────────────────────────────────┘
      rows:  ── swipe left ▸ Edit ──  ── swipe right ▸ Delete ──
      tap row ▸ Detail sheet

    Budgets:
      [＋ New Budget]
      Food      ██████████░░  82%  (near cap → red bar)
      Rent      ████████████ 100%  (overspent → +Alert)
      tap ▸ spent/remaining/rollover toggle/adjust

    Categories:
      expense treemap ── tap slice ──▸ filtered list
```

## 5. Investments Screen — Tabs

```
    INVEST ▸ [Holdings] [Portfolio]

    Holdings (grouped: Stocks/MF/Crypto/Gold/Property):
      row:  value · unrealized ₹ / ±% · day change
      [➕ Buy] [➕ Sell]
                   │
                   ▼
      Trade modal: asset · qty · price · date · fees
        Buy  ─▸ new lot appended ─▸ cost basis & XIRR recompute
        Sell ─▸ lot consumed (FIFO)
                 unrealized → realized
                 capital gain ──PUSH──▶ Tax module

      tap holding ▸ Detail: lots · cost basis · XIRR · price chart

    Portfolio:
      allocation pie vs target · rebalance callout
      [Manage prices] ─▸ manual update | auto-sync toggle
```

## 6. Debts Screen — Tabs

```
    DEBTS ▸ [Loans] [Cards]

    Loans:
      card: outstanding · rate · tenure · next EMI (₹ + date)
      tap ▸ Detail:  amortization graph · interest paid-to-date
            [Make payment] ─▸ pre-opened Quick Add (type=Debt Repay, EMI prefilled)
            [Extra payment] ─▸ projection: "debt-free 14 mo earlier, save ₹XX"
      [＋ New Loan] principal·rate·start·tenure ─▸ auto EMI schedule
      EMIs become recurring auto-entries

    Cards:
      summary · balance vs limit bar
      [Settle card] ─▸ transfer Card→Bank ─▸ marks statement status
```

## 7. Tax Screen — Tabs

```
    TAX ▸ [Workspace] [Filing] [History]

    Workspace (current FY):
      Gross income · Deductible · Taxable · Est. paid · Est. liability
      [Recalculate] ─▸ forces refresh + "what changed" diff
      Deductions checklist  (e.g. 80C invested 1.2L/1.5L)
         [＋ Add deduction] [Top-up to cap]
      Capital gains card  (short/long buckets ─▸ est. tax)

    Filing:
      assessment-year selector · TDS reconciliation · [Generate summary]
      [Export / Print] · pre-fill import (Form-26AS / upload)

    History:
      past years summaries ─▸ archived read-only workspace

    [Settings ▸ Change jurisdiction] ─▸ confirm dialog ─▸ re-derive workspace
```

## 8. Data Update Flow (single write path)

```
    User action (any module)
        │  transaction / trade / payment / deduction
        ▼
    ┌───────────────────────────────┐
    │   TRANSACTION STREAM (write)   │   one write path = no drift
    └───────────────┬───────────────┘
                    ▼  invalidate + recompute projections
        ┌───────────┼───────────┬───────────┬──────────┐
        ▼           ▼           ▼           ▼          ▼
    Cashflow     Invest lots  Debt amort.  Tax est.   NetWorth
    charts       XIRR/basis   schedules    liability  timeline

                       \       +  Alerts: EMI due · overspend · 80C cap
                        toast + Undo     every tab checks dataRevision
                                         stamp on focus → re-render if changed
```

## 9. Onboarding Flow

```
    Welcome ─▸ [Get started]
      ─▸ Country + base currency ─▸ feeds tax engine
      ─▸ Add first account  |  [Skip → use demo data]
      ─▸ Import legacy CSV | start fresh
      ─▸ optional goals (debt-free date · savings target)
      ─▸ LAND on Home ─▸ dismissible Welcome Tour flagging [➕]
```