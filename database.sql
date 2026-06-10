-- Create Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  paid_by_user_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paid_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create Expense_Splits table
CREATE TABLE IF NOT EXISTS expense_splits (
  id SERIAL PRIMARY KEY,
  expense_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  amount_owed DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(expense_id, user_id)
);
