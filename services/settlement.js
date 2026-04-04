/**
 * Calculates who owes whom based on all expenses.
 * Simple algorithm:
 * 1. Calculate net balance for each person: (amount they paid) - (amount they owe)
 * 2. People with positive balance should receive money
 * 3. People with negative balance should pay money
 * 4. Match payers with receivers until everyone is at zero
 */

export function calculateSettlement(expenseSplits, expenses, users) {
  // Create user ID to name lookup
  const userMap = new Map(users.map(u => [u.id, u.name]));

  // Step 1: Calculate net balance for each user
  // Positive = they paid more than they owe (should receive money)
  // Negative = they owe more than they paid (should pay money)
  const balances = new Map(); // user_id -> net balance

  // Start everyone at 0
  users.forEach(u => balances.set(u.id, 0));

  // Add money each user paid (from expenses table)
  expenses.forEach(expense => {
    const payerId = expense.paid_by_user_id;
    const amount = parseFloat(expense.total_amount);
    balances.set(payerId, (balances.get(payerId) || 0) + amount);
  });

  // Subtract money each user owes (from expense_splits table)
  expenseSplits.forEach(split => {
    const userId = split.user_id;
    const amount = parseFloat(split.amount_owed);
    balances.set(userId, (balances.get(userId) || 0) - amount);
  });

  // Step 2: Separate into payers (owe money) and receivers (owed money)
  const payers = [];   // { userId, amount } - need to pay
  const receivers = []; // { userId, amount } - need to receive

  balances.forEach((balance, userId) => {
    const rounded = Math.round(balance * 100) / 100;
    if (rounded < 0) {
      payers.push({ userId, amount: -rounded }); // store as positive amount to pay
    } else if (rounded > 0) {
      receivers.push({ userId, amount: rounded });
    }
    // Rounding errors near zero are ignored
  });

  // Step 3: Match payers to receivers
  const transactions = [];

  // Sort by largest amount first (optional but helps minimize transactions)
  payers.sort((a, b) => b.amount - a.amount);
  receivers.sort((a, b) => b.amount - a.amount);

  let payerIndex = 0;
  let receiverIndex = 0;

  while (payerIndex < payers.length && receiverIndex < receivers.length) {
    const payer = payers[payerIndex];
    const receiver = receivers[receiverIndex];

    // The amount to transfer is the smaller of what payer owes and receiver is owed
    const transferAmount = Math.min(payer.amount, receiver.amount);

    if (transferAmount > 0.01) {
      transactions.push({
        from: userMap.get(payer.userId),
        to: userMap.get(receiver.userId),
        amount: Math.round(transferAmount * 100) / 100
      });
    }

    // Reduce the amounts
    payer.amount -= transferAmount;
    receiver.amount -= transferAmount;

    // Move to next person if their balance is settled (near zero)
    if (payer.amount < 0.01) payerIndex++;
    if (receiver.amount < 0.01) receiverIndex++;
  }

  return transactions;
}
