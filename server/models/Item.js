const mongoose = require("mongoose");

const ItemSchema = new mongoose.Schema({
    name: String,
    price: Number,
    image: String,
    category: String
});

module.exports = mongoose.model("Item", ItemSchema);