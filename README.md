# Expense Splitter

A full-stack web application for tracking shared expenses and automatically calculating optimal settlements among multiple users. Built with a relational database backend and an algorithmic settlement engine that minimizes the number of transactions required to balance all debts.

## Tech Stack

- **Backend:** Node.js with Express.js
- **Database:** PostgreSQL with connection pooling
- **Templating:** EJS (Embedded JavaScript)
- **Styling:** CSS3
- **Architecture:** ES Modules, MVC pattern

## Features

### Relational Database Design
A normalized PostgreSQL schema with three properly related tables:
- `users` - Group members
- `expenses` - Individual expense records with payer reference
- `expense_splits` - Many-to-many relationship tracking how each expense is divided among users

Foreign key constraints with `ON DELETE CASCADE` ensure data integrity.

### Algorithmic Settlement Engine
The core feature is a greedy algorithm that calculates the minimum number of transactions needed to settle all debts:

1. **Net Balance Calculation:** For each user, compute `(Total Paid) - (Total Owed)`
2. **Classification:** Separate into debtors (negative balance) and creditors (positive balance)
3. **Greedy Matching:** Match the largest debtor with the largest creditor, transfer the maximum possible amount, and repeat until all balances reach zero

This approach minimizes transaction count and provides a clear, explainable settlement plan.

### Transaction Safety
All expense insertions use PostgreSQL transactions (`BEGIN` / `COMMIT` / `ROLLBACK`) to ensure data consistency.

### RESTful Routes
- `GET /` - Dashboard with members, expense history, and settlement plan
- `GET /add-expense` - Form to add new expense
- `POST /add-expense` - Processes expense and automatically calculates splits

## Installation

```bash
# Install dependencies
npm install

# Create environment configuration
cp .env .env
# Edit .env with your PostgreSQL credentials

# Set up database schema
# Run the SQL in database.sql in your PostgreSQL instance
psql -U your_user -d your_database -f database.sql

# Start the server
node index.js
```

Visit `http://localhost:3000` in your browser.

## Configuration

The `.env` file requires:
- `DB_HOST` - PostgreSQL host
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_NAME` - Database name
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password

## Backend Engineering Highlights

- **Connection Pooling:** Uses `pg.Pool` for efficient database connection management
- **Error Handling:** Comprehensive try-catch blocks with proper HTTP status codes
- **Parallel Queries:** Uses `Promise.all()` for concurrent data fetching
- **Transaction Management:** Atomic expense creation with rollback on failure
- **Modular Architecture:** Separation of concerns with dedicated service layer for settlement logic
- **No Undue Complexity:** Simple, maintainable code without over-engineering
