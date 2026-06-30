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
