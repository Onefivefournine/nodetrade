const mongoose = require('mongoose');

const CoinDataSchema = new mongoose.Schema({
    createdAt: { type: Date, default: new Date() },
    coinList: { type: Object, required: true },
});

const CoinData = mongoose.model('CoinData', CoinDataSchema);
module.exports = { CoinData, CoinDataSchema };