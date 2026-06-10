import express from 'express';
import bodyParser from "body-parser";
import { PrismaClient } from '@prisma/client';
import { calculateSettlement } from './services/settlement.js';

// Initialize Prisma Client

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from /public
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Home route - fetch and render index.ejs
app.get('/', async (req, res) => {
  try {
    // Prisma fetches all data concurrently, just like your old Promise.all
    const [users, expenses, splits] = await Promise.all([
      prisma.user.findMany({ orderBy: { id: 'asc' } }),
      prisma.expense.findMany({ orderBy: [{ date: 'desc' }, { id: 'desc' }] }),
      prisma.expenseSplit.findMany()
    ]);

    // Note: Prisma returns Decimal fields as Decimal objects. 
    // We convert them to numbers here to ensure your EJS and settlement logic don't break.
    const formattedExpenses = expenses.map(e => ({ ...e, totalAmount: Number(e.totalAmount) }));
    const formattedSplits = splits.map(s => ({ ...s, amountOwed: Number(s.amountOwed) }));

    // Calculate settlement plan
    const settlement = calculateSettlement(formattedSplits, formattedExpenses, users);

    res.render('index', {
      title: 'Expense Splitter',
      users: users,
      expenses: formattedExpenses,
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

    // Clean Prisma create method
    await prisma.user.create({
      data: { name: name.trim() }
    });

    res.redirect('/');
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).send('Failed to add user');
  }
});

// Add expense form - GET route
app.get('/add-expense', async (req, res) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { id: 'asc' } });
    res.render('add-expense', {
      title: 'Add Expense',
      users: users
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

    // 🛑 NEW: BACKEND VALIDATION CHECKS
    if (!description || description.trim() === '') {
      return res.status(400).send('Expense description cannot be empty.');
    }

    if (!total_amount || parseFloat(total_amount) <= 0) {
      return res.status(400).send('Expense amount must be a positive number greater than 0.');
    }

    if (!paid_by_user_id) {
      return res.status(400).send('Please select a user who paid.');
    }

    if (!date) {
      return res.status(400).send('Please select a valid date.');
    }
    // ------------------------------------

    // 1. Fetch users to calculate the split
    const users = await prisma.user.findMany({ orderBy: { id: 'asc' } });
    
    // 🛑 NEW: Prevent division by zero if there are no users in the group yet
    if (users.length === 0) {
      return res.status(400).send('Cannot add an expense because there are no users in the group yet.');
    }

    const splitAmount = parseFloat(total_amount) / users.length;

    // 2. The Prisma Magic: Nested Writes
    await prisma.expense.create({
      data: {
        paidByUserId: parseInt(paid_by_user_id),
        description: description,
        totalAmount: parseFloat(total_amount),
        date: new Date(date),
        
        splits: {
          create: users.map((user) => ({
            userId: user.id,
            amountOwed: splitAmount
          }))
        }
      }
    });

    res.redirect('/');
  } catch (error) {
    console.error('Error adding expense:', error);
    res.status(500).send('Failed to add expense');
  }
});

// Delete expense - POST route
app.post('/delete-expense/:id', async (req, res) => {
  try {
    const expenseId = parseInt(req.params.id);

    // The Magic of Prisma: This one line deletes the expense AND automatically 
    // cleans up all the related expense_splits because we set onDelete: Cascade in the schema!
    await prisma.expense.delete({
      where: { id: expenseId }
    });

    res.redirect('/');
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).send('Failed to delete expense');
  }
});

// POST: Reset all expenses (Start a new trip)
app.post('/reset', async (req, res) => {
  try {
    // This single command wipes the expenses, and your cascading setup wipes the splits automatically!
    await prisma.expense.deleteMany({});
    
    // Redirect back to the now-empty dashboard
    res.redirect('/');
  } catch (error) {
    console.error('Error resetting database:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Start the server (0.0.0.0 allows external cloud connections)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});