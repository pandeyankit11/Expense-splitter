import express from 'express';
import bodyParser from "body-parser";
import { db } from './db.js';
import { calculateSettlement } from './services/settlement.js';

const app = express();
const PORT = 3000;

// Serve static files from /public
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Home route - fetch and render index.ejs
app.get('/', async (req, res) => {
  try {
    const [userResult, expenseResult, splitResult] = await Promise.all([
      db.query('SELECT * FROM users ORDER BY id'),
      db.query('SELECT * FROM expenses ORDER BY date DESC, id DESC'),
      db.query('SELECT * FROM expense_splits')
    ]);

    // Calculate settlement plan
    const settlement = calculateSettlement(splitResult.rows, expenseResult.rows, userResult.rows);

    res.render('index', {
      title: 'Expense Splitter',
      users: userResult.rows,
      expenses: expenseResult.rows,
      settlement: settlement
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Database error occurred');
  }
});

// Add user form - GET route
app.get('/add-user', async (req, res) => {
  res.render('add-user', { title: 'Add User' });
});

// Add user - POST route
app.post('/add-user', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).send('Name is required');
    }

    await db.query(
      'INSERT INTO users (name) VALUES ($1)',
      [name.trim()]
    );

    res.redirect('/');
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).send('Failed to add user');
  }
});

// Add expense form - GET route
app.get('/add-expense', async (req, res) => {
  try {
    const userResult = await db.query('SELECT * FROM users ORDER BY id');
    res.render('add-expense', {
      title: 'Add Expense',
      users: userResult.rows
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).send('Database error occurred');
  }
});

// Add expense - POST route
app.post('/add-expense', async (req, res) => {
  try {
    const { description, total_amount, paid_by_user_id, date } = req.body;

    // Start transaction
    await db.query('BEGIN');

    try {
      // Insert expense and return the new ID
      const expenseResult = await db.query(
        'INSERT INTO expenses (paid_by_user_id, description, total_amount, date) VALUES ($1, $2, $3, $4) RETURNING id',
        [paid_by_user_id, description, total_amount, date]
      );
      const expenseId = expenseResult.rows[0].id;

      // Get total number of users
      const userCountResult = await db.query('SELECT COUNT(*) FROM users');
      const userCount = parseInt(userCountResult.rows[0].count);
      const splitAmount = parseFloat(total_amount) / userCount;

      // Get all user IDs
      const usersResult = await db.query('SELECT id FROM users ORDER BY id');

      // Insert expense splits for all users
      for (const user of usersResult.rows) {
        await db.query(
          'INSERT INTO expense_splits (expense_id, user_id, amount_owed) VALUES ($1, $2, $3)',
          [expenseId, user.id, splitAmount]
        );
      }

      // Commit transaction
      await db.query('COMMIT');

      res.redirect('/');
    } catch (transactionError) {
      // Rollback on any error
      await db.query('ROLLBACK');
      console.log('Transaction error:', transactionError);
      throw transactionError;
    }
  } catch (error) {
    console.error('Error adding expense:', error);
    res.status(500).send('Failed to add expense');
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
