# SplitEasy 💸 - Shared Expenses and Debts Manager (PWA)

**SplitEasy** is a complete, feature-rich, and premium-unlocked **Splitwise clone** designed to help roommates, travelers, and friends split expenses, track balances, and settle up easily. Built using **Next.js (App Router)**, **Prisma ORM**, and **SQLite/Postgres**, it is optimized for high-performance mobile devices and desktop.

## ✨ Key Features (All Premium Features Free)

*   **Smart Debt Simplification**: Automatically matches debtors and creditors within groups, minimizing payment transactions (e.g. reducing circular debts).
*   **Flexible Split Formulas**: Support for Equal Splitting, Unequal Splitting (by exact amounts), Percentage splitting, and custom Share counts.
*   **Mobile-First PWA (Progressive Web App)**: 
    *   Fully installable on Android, iOS, and Desktop.
    *   Responsive layouts that collapse sidebars and grids cleanly on mobile viewports.
    *   "Get App" download button at the top-right corner, displaying a custom step-by-step help modal for Safari iOS and triggering native installation on Android/Chrome.
*   **Integrated Browser Password Managers**: Authentication forms are fully standard-compliant, triggering automatic credential-saving prompts in Google Chrome, Samsung Internet, and Apple Keychain.
*   **Visual Spending Charts**: High-fidelity custom SVG donut spending analytics charts showing category expenditure.
*   **CSV Ledger Data Export**: Download full group expense sheets in one click.
*   **Audit Activity Log**: Global timeline records of creations, settlements, and expense entries.

---

## 🚀 Quick Start (Local Run)

Follow these steps to run SplitEasy locally on your machine:

1.  **Clone the Repository** and open the folder.
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Setup Database**:
    Prisma uses local SQLite by default for zero-friction local development. Sync the database:
    ```bash
    npx prisma migrate dev --name init
    ```
4.  **Launch the Development Server**:
    ```bash
    npm run dev
    ```
5.  **Open the App**:
    Navigate to [http://localhost:3000](http://localhost:3000). Create an account, search and add other test users to a group, and start tracking splits!

---

## 🌐 Deploying to Vercel (Free Hosting & DB)

SplitEasy is designed to run seamlessly on Vercel's serverless environment with an online relational PostgreSQL database.

### Step 1: Spin Up a Free PostgreSQL Database
Get a free online PostgreSQL instance from one of the following:
*   [Neon Database](https://neon.tech)
*   [Supabase](https://supabase.com)
*   [Vercel Postgres Storage](https://vercel.com/docs/storage/vercel-postgres)

Copy the database connection string URL (e.g. `postgres://user:password@host/db?sslmode=require`).

### Step 2: Swap Prisma Provider to PostgreSQL
Open `prisma/schema.prisma` and change the database provider to `postgresql`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Step 3: Deploy to Vercel
1.  Push your code to a GitHub repository.
2.  Import the repository into your [Vercel Dashboard](https://vercel.com).
3.  Add the following **Environment Variables**:
    *   `DATABASE_URL`: Your copied PostgreSQL connection string.
    *   `JWT_SECRET`: A custom secure string used to sign sessions (e.g. `my-super-secret-random-key-change-this`).
4.  Click **Deploy**! Vercel will build the application, configure your routing middleware proxies, and assign a free domain name (e.g. `spliteasy.vercel.app`).
