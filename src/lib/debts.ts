export interface MemberBalance {
  userId: string;
  name: string;
  username: string;
  balance: number; // Positive means they are owed, negative means they owe
}

export interface SimplifiedDebt {
  fromUserId: string;
  fromName: string;
  fromUsername: string;
  toUserId: string;
  toName: string;
  toUsername: string;
  amount: number;
  currency: string;
}

/**
 * Greedily simplifies debts among group members for a specific currency.
 * 
 * Algorithm:
 * 1. Filter out users with 0 balance (within a rounding threshold of 0.01).
 * 2. Separate into debtors (balance < 0) and creditors (balance > 0).
 * 3. Sort debtors ascending (largest debt first) and creditors descending (largest credit first).
 * 4. Match the largest debtor with the largest creditor:
 *    - Transaction amount is min(abs(debtor_balance), creditor_balance).
 *    - Update balances and repeat until all debts are resolved.
 */
export function simplifyDebts(
  members: { id: string; name: string; username: string }[],
  netBalances: Record<string, number>, // userId -> balance
  currency: string = "USD"
): SimplifiedDebt[] {
  const debts: SimplifiedDebt[] = [];

  // Create mutable copies of balances mapped to member info
  const memberMap = new Map(members.map(m => [m.id, m]));
  
  const debtors: { userId: string; balance: number }[] = [];
  const creditors: { userId: string; balance: number }[] = [];

  for (const [userId, balance] of Object.entries(netBalances)) {
    const member = memberMap.get(userId);
    if (!member) continue;

    // Ignore tiny rounding errors
    if (Math.abs(balance) < 0.01) continue;

    if (balance < 0) {
      debtors.push({ userId, balance });
    } else {
      creditors.push({ userId, balance });
    }
  }

  // Sort debtors so that the one who owes the most (most negative) is at the beginning
  debtors.sort((a, b) => a.balance - b.balance);
  // Sort creditors so that the one who is owed the most (most positive) is at the beginning
  creditors.sort((a, b) => b.balance - a.balance);

  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];

    const amountOwed = Math.abs(debtor.balance);
    const amountCredited = creditor.balance;

    const transactionAmount = Math.min(amountOwed, amountCredited);

    // Keep track of the transaction
    const fromMember = memberMap.get(debtor.userId)!;
    const toMember = memberMap.get(creditor.userId)!;

    debts.push({
      fromUserId: debtor.userId,
      fromName: fromMember.name,
      fromUsername: fromMember.username,
      toUserId: creditor.userId,
      toName: toMember.name,
      toUsername: toMember.username,
      amount: parseFloat(transactionAmount.toFixed(2)),
      currency,
    });

    // Update balances
    debtor.balance += transactionAmount;
    creditor.balance -= transactionAmount;

    // Move pointers if balance is settled (near zero)
    if (Math.abs(debtor.balance) < 0.01) {
      debtorIndex++;
    }
    if (Math.abs(creditor.balance) < 0.01) {
      creditorIndex++;
    }
  }

  return debts;
}

export interface DirectExpenseInput {
  payerId: string;
  splits: { userId: string; amount: number }[];
}

export interface DirectPaymentInput {
  payerId: string;
  payeeId: string;
  amount: number;
}

/**
 * Calculates direct, pairwise person-to-person debts without transitive simplification.
 * Everyone pays back the exact individual who covered their expense splits.
 */
export function calculateDirectDebts(
  members: { id: string; name: string; username: string }[],
  expenses: DirectExpenseInput[],
  payments: DirectPaymentInput[],
  currency: string = "USD"
): SimplifiedDebt[] {
  // pairwise.get(A)!.get(B) represents net amount B owes A
  const pairwise = new Map<string, Map<string, number>>();

  for (const m1 of members) {
    pairwise.set(m1.id, new Map<string, number>());
    for (const m2 of members) {
      pairwise.get(m1.id)!.set(m2.id, 0);
    }
  }

  // 1. Accumulate expenses: debtor owes payer split.amount
  for (const exp of expenses) {
    const payerId = exp.payerId;
    for (const split of exp.splits) {
      const debtorId = split.userId;
      if (debtorId !== payerId && pairwise.has(payerId) && pairwise.get(payerId)!.has(debtorId)) {
        const current = pairwise.get(payerId)!.get(debtorId) || 0;
        pairwise.get(payerId)!.set(debtorId, current + split.amount);
        const reverse = pairwise.get(debtorId)!.get(payerId) || 0;
        pairwise.get(debtorId)!.set(payerId, reverse - split.amount);
      }
    }
  }

  // 2. Accumulate payments (settlements): payer paid payee, reducing what payer owes payee
  for (const p of payments) {
    const payerId = p.payerId;
    const payeeId = p.payeeId;
    if (pairwise.has(payeeId) && pairwise.get(payeeId)!.has(payerId)) {
      const current = pairwise.get(payeeId)!.get(payerId) || 0;
      pairwise.get(payeeId)!.set(payerId, current - p.amount);
      const reverse = pairwise.get(payerId)!.get(payeeId) || 0;
      pairwise.get(payerId)!.set(payeeId, reverse + p.amount);
    }
  }

  const debts: SimplifiedDebt[] = [];

  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const m1 = members[i];
      const m2 = members[j];
      const net = pairwise.get(m1.id)?.get(m2.id) || 0;

      if (net > 0.01) {
        // m2 owes m1
        debts.push({
          fromUserId: m2.id,
          fromName: m2.name,
          fromUsername: m2.username,
          toUserId: m1.id,
          toName: m1.name,
          toUsername: m1.username,
          amount: parseFloat(net.toFixed(2)),
          currency,
        });
      } else if (net < -0.01) {
        // m1 owes m2
        debts.push({
          fromUserId: m1.id,
          fromName: m1.name,
          fromUsername: m1.username,
          toUserId: m2.id,
          toName: m2.name,
          toUsername: m2.username,
          amount: parseFloat(Math.abs(net).toFixed(2)),
          currency,
        });
      }
    }
  }

  return debts;
}
