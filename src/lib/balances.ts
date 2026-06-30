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
  const defaultCurrency = group.defaultCurrency || "USD";
  const currencies = [defaultCurrency];

  const balancesByCurrency: Record<string, Record<string, MemberBalanceDetail>> = {};
  const debtsByCurrency: Record<string, SimplifiedDebt[]> = {};

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

  // Process expenses (converting values to group's default currency)
  for (const expense of group.expenses) {
    // Add converted amount to payer
    if (netBalances[expense.payerId] !== undefined) {
      netBalances[expense.payerId] += expense.convertedAmount;
      memberDetails[expense.payerId].paid += expense.convertedAmount;
    }
    
    // Subtract splits from members (splits are stored in default currency)
    for (const split of expense.splits) {
      if (netBalances[split.userId] !== undefined) {
        netBalances[split.userId] -= split.amount;
        memberDetails[split.userId].owed += split.amount;
      }
    }
  }

  // Process payments (Settle Up) in group's default currency
  const groupPayments = group.payments.filter((p) => p.currency === defaultCurrency);
  for (const payment of groupPayments) {
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
    memberDetails[member.id].paid = parseFloat(memberDetails[member.id].paid.toFixed(2));
    memberDetails[member.id].owed = parseFloat(memberDetails[member.id].owed.toFixed(2));
  }

  balancesByCurrency[defaultCurrency] = memberDetails;
  
  // Simplify debts in the default currency
  debtsByCurrency[defaultCurrency] = simplifyDebts(members, netBalances, defaultCurrency);

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
