const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    createdAt: { type: Date, default: Date.now() },
    type: { type: String },
    profit: { type: Number },
    currency: { type: String },
    price: { type: Number },
    backtest: { type: Boolean, default: false }
});


const Transaction = mongoose.model('Transaction', TransactionSchema);
module.exports = { Transaction, TransactionSchema };