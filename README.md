# Expense Splitter

A full-stack web application for tracking shared expenses and automatically calculating optimal settlements among multiple users. Built with a relational PostgreSQL database and an algorithmic settlement engine that minimizes the number of transactions required to balance all debts.

## Tech Stack

- **Backend:** Node.js with Express.js
- **Database:** PostgreSQL (Hosted on Neon)
- **ORM:** Prisma (v5)
- **Templating:** EJS (Embedded JavaScript)
- **Styling:** CSS3
- **Architecture:** ES Modules, MVC pattern

## Features

### Relational Database Design
A normalized PostgreSQL schema managed via Prisma with three properly related models:
- `User` - Group members
- `Expense` - Individual expense records with payer reference
- `ExpenseSplit` - Many-to-many relationship tracking how each expense is divided among users

### Algorithmic Settlement Engine
The core feature is a greedy algorithm that calculates the minimum number of transactions needed to settle all debts:
1. **Net Balance Calculation:** For each user, compute `(Total Paid) - (Total Owed)`
2. **Classification:** Separate into debtors (negative balance) and creditors (positive balance)
3. **Greedy Matching:** Match the largest debtor with the largest creditor, transfer the maximum possible amount, and repeat until all balances reach zero.

### Data Integrity & Cascading Deletes
Utilizes Prisma's referential integrity (`onDelete: Cascade`). When a parent expense is deleted from the dashboard, the database automatically wipes the associated child splits in a single atomic transaction, guaranteeing the settlement math is never corrupted by orphaned data.

### Defense-in-Depth Validation
Implements a dual-layer validation architecture:
- **Frontend:** HTML5 validation attributes immediately block invalid inputs (like negative amounts or zero values) for a fast user experience.
- **Backend:** Express routes utilize strict defensive programming to validate all payloads before they touch the database, protecting against manual API manipulation and handling edge cases like division-by-zero.

### RESTful Routes
- `GET /` - Dashboard with members, expense history, and settlement plan
- `GET /add-user` - Form to add a new group member
- `POST /add-user` - Creates a new user
- `GET /add-expense` - Form to add a new expense
- `POST /add-expense` - Validates payload, calculates splits, and executes a nested database write
- `POST /delete-expense/:id` - Triggers a cascading delete of an expense and its associated splits

## Installation & Local Development

Clone the repository:
git clone [https://github.com/yourusername/Expense-splitter.git](https://github.com/yourusername/Expense-splitter.git)
cd Expense-splitter

Install dependencies:
npm install

Create environment configuration:
touch .env

Add your PostgreSQL connection string to the .env file:
DATABASE_URL="postgresql://user:password@host/database_name?sslmode=require"

Sync the Prisma schema with your database:
npx prisma db push

Start the server:
node index.js

Visit http://localhost:3000 in your browser.

## Backend Engineering Highlights

- **Nested Writes:** Uses Prisma's nested write queries to insert an Expense and its related ExpenseSplits concurrently in a single, atomic database transaction.
- **Parallel Queries:** Uses Promise.all() for concurrent data fetching on the dashboard.
- **Error Handling:** Comprehensive try-catch blocks with proper HTTP status codes.
- **Modular Architecture:** Separation of concerns with a dedicated service layer for the greedy settlement logic.
- **No Undue Complexity:** Clean, maintainable code without over-engineering, optimized for explainability and scalability.