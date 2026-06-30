import { db } from "./db";
import { simplifyDebts, SimplifiedDebt } from "./debts";

export interface MemberBalanceDetail {
  userId: string;
  name: string;
  username: string;
  netBalance: number; // positive = owed money, negative = owes money
  paid: number;
  owed: number;
}

export interface GroupCalculatedBalances {
  groupId: string;
  groupName: string;
  currencies: string[];
  // Balances mapped by currency, then by userId
  balancesByCurrency: Record<string, Record<string, MemberBalanceDetail>>;
  // Simplified debts mapped by currency
  debtsByCurrency: Record<string, SimplifiedDebt[]>;
}

export async function getGroupCalculatedBalances(
  groupId: string
): Promise<GroupCalculatedBalances | null> {
  const group = await db.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, username: true },
          },
        },
      },
      expenses: {
        include: {
          splits: true,
        },
      },
      payments: true,
    },
  });

  if (!group) return null;

  const members = group.members.map((m) => m.user);
  
  // Find all unique currencies in expenses & payments
  const currencySet = new Set<string>();
  group.expenses.forEach((e) => currencySet.add(e.currency));
  group.payments.forEach((p) => currencySet.add(p.currency));
  // Default to USD if no transactions exist
  if (currencySet.size === 0) {
    currencySet.add("USD");
  }
  const currencies = Array.from(currencySet);

  const balancesByCurrency: Record<string, Record<string, MemberBalanceDetail>> = {};
  const debtsByCurrency: Record<string, SimplifiedDebt[]> = {};

  for (const currency of currencies) {
    const netBalances: Record<string, number> = {};
    const memberDetails: Record<string, MemberBalanceDetail> = {};

    // Initialize all members with 0
    for (const member of members) {
      netBalances[member.id] = 0;
      memberDetails[member.id] = {
        userId: member.id,
        name: member.name,
        username: member.username,
        netBalance: 0,
        paid: 0,
        owed: 0,
      };
    }

    // Process expenses
    const currencyExpenses = group.expenses.filter((e) => e.currency === currency);
    for (const expense of currencyExpenses) {
      // Add paid amount to payer
      if (netBalances[expense.payerId] !== undefined) {
        netBalances[expense.payerId] += expense.amount;
        memberDetails[expense.payerId].paid += expense.amount;
      }
      
      // Subtract splits from members
      for (const split of expense.splits) {
        if (netBalances[split.userId] !== undefined) {
          netBalances[split.userId] -= split.amount;
          memberDetails[split.userId].owed += split.amount;
        }
      }
    }

    // Process payments (Settle Up)
    const currencyPayments = group.payments.filter((p) => p.currency === currency);
    for (const payment of currencyPayments) {
      // Sender (payer) balance goes up (acts as paid/settled)
      if (netBalances[payment.payerId] !== undefined) {
        netBalances[payment.payerId] += payment.amount;
        memberDetails[payment.payerId].paid += payment.amount;
      }
      // Receiver (payee) balance goes down (acts as owed/received)
      if (netBalances[payment.payeeId] !== undefined) {
        netBalances[payment.payeeId] -= payment.amount;
        memberDetails[payment.payeeId].owed += payment.amount;
      }
    }

    // Update net balances in details
    for (const member of members) {
      memberDetails[member.id].netBalance = parseFloat(netBalances[member.id].toFixed(2));
    }

    balancesByCurrency[currency] = memberDetails;
    
    // Simplify debts for this currency
    debtsByCurrency[currency] = simplifyDebts(members, netBalances, currency);
  }

  return {
    groupId,
    groupName: group.name,
    currencies,
    balancesByCurrency,
    debtsByCurrency,
  };
}

export interface UserOverallBalances {
  netBalances: Record<string, number>; // currency -> total net balance
  totalOwed: Record<string, number>; // currency -> total others owe user
  totalOwes: Record<string, number>; // currency -> total user owes others
  groups: {
    id: string;
    name: string;
    description: string | null;
    balances: Record<string, number>; // currency -> user's net balance in group
  }[];
}

export async function getUserOverallBalances(
  userId: string
): Promise<UserOverallBalances> {
  // Find all groups user belongs to
  const userGroups = await db.groupMember.findMany({
    where: { userId },
    select: {
      groupId: true,
      group: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
  });

  const netBalances: Record<string, number> = {};
  const totalOwed: Record<string, number> = {};
  const totalOwes: Record<string, number> = {};
  const groupsList: UserOverallBalances["groups"] = [];

  for (const ug of userGroups) {
    const groupBalances = await getGroupCalculatedBalances(ug.groupId);
    if (!groupBalances) continue;

    const groupBalancesMap: Record<string, number> = {};

    for (const currency of groupBalances.currencies) {
      const memberDetail = groupBalances.balancesByCurrency[currency]?.[userId];
      if (!memberDetail) continue;

      const balance = memberDetail.netBalance;
      groupBalancesMap[currency] = balance;

      // Accumulate global totals
      if (!netBalances[currency]) netBalances[currency] = 0;
      netBalances[currency] += balance;

      if (balance > 0) {
        if (!totalOwed[currency]) totalOwed[currency] = 0;
        totalOwed[currency] += balance;
      } else if (balance < 0) {
        if (!totalOwes[currency]) totalOwes[currency] = 0;
        totalOwes[currency] += Math.abs(balance);
      }
    }

    groupsList.push({
      id: ug.group.id,
      name: ug.group.name,
      description: ug.group.description,
      balances: groupBalancesMap,
    });
  }

  // Round values
  const roundRecord = (rec: Record<string, number>) => {
    const rounded: Record<string, number> = {};
    for (const [k, v] of Object.entries(rec)) {
      rounded[k] = parseFloat(v.toFixed(2));
    }
    return rounded;
  };

  return {
    netBalances: roundRecord(netBalances),
    totalOwed: roundRecord(totalOwed),
    totalOwes: roundRecord(totalOwes),
    groups: groupsList,
  };
}
