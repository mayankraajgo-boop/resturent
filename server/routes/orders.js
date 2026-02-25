const express = require("express");
const router = express.Router();
const Order = require("../models/Order");

// Save Order
router.post("/order", async (req, res) => {
    try {
        console.log("Order Received:", req.body);

        const order = new Order(req.body);
        await order.save();

        res.json({ message: "Order Saved Successfully" });
    } catch (err) {
        console.log("Order Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Get All Orders (Admin ke liye)
router.get("/orders", async (req, res) => {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
});

module.exports = router;