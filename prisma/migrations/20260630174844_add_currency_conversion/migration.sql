-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "groupId" TEXT,
    "payerId" TEXT NOT NULL,
    "splitType" TEXT NOT NULL DEFAULT 'EQUAL',
    "createdById" TEXT NOT NULL,
    "conversionRate" REAL NOT NULL DEFAULT 1.0,
    "convertedAmount" REAL NOT NULL DEFAULT 0.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Expense_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Expense_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Expense" ("amount", "category", "createdAt", "createdById", "currency", "date", "description", "groupId", "id", "payerId", "splitType", "updatedAt") SELECT "amount", "category", "createdAt", "createdById", "currency", "date", "description", "groupId", "id", "payerId", "splitType", "updatedAt" FROM "Expense";
DROP TABLE "Expense";
ALTER TABLE "new_Expense" RENAME TO "Expense";
CREATE TABLE "new_Group" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "Group_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Group" ("createdAt", "createdById", "description", "id", "name", "updatedAt") SELECT "createdAt", "createdById", "description", "id", "name", "updatedAt" FROM "Group";
DROP TABLE "Group";
ALTER TABLE "new_Group" RENAME TO "Group";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
