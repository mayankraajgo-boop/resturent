const express = require("express");
const router = express.Router();
const Item = require("../models/Item");

// Add Item
router.post("/add-item", async (req, res) => {
    try {
        const item = new Item(req.body);
        await item.save();
        res.json({ message: "Item Saved" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get All Items
router.get("/items", async (req, res) => {
    const items = await Item.find();
    res.json(items);
});

module.exports = router;