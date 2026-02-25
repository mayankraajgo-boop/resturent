/* =====================================================
   BASIC SETUP
===================================================== */

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const Razorpay = require("razorpay");

const app = express();

/* =====================================================
   MIDDLEWARES
===================================================== */

app.use(cors());
app.use(express.json());

/* =====================================================
   MONGODB CONNECTION (ATLAS ONLY)
===================================================== */

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.log("❌ Mongo Error:", err));

/* =====================================================
   RAZORPAY CONFIG
===================================================== */

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

/* =====================================================
   CREATE RAZORPAY ORDER
===================================================== */

app.post("/create-razorpay-order", async (req, res) => {

    try {

        if (!req.body.amount) {
            return res.status(400).json({ error: "Amount required" });
        }

        const options = {
            amount: Number(req.body.amount) * 100,
            currency: "INR",
            receipt: "order_" + Date.now()
        };

        const order = await razorpay.orders.create(options);

        res.json(order);

    } catch (err) {
        console.error("❌ Razorpay Error:", err);
        res.status(500).json({ error: "Razorpay Order Creation Failed" });
    }
});

/* =====================================================
   MODELS
===================================================== */

const ItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    category: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const OrderSchema = new mongoose.Schema({
    customerName: String,
    phone: String,
    address: String,
    items: Array,
    total: Number,
    payment: String,
    status: { type: String, default: "Pending" },
    createdAt: { type: Date, default: Date.now }
});

const Item = mongoose.model("Item", ItemSchema);
const Order = mongoose.model("Order", OrderSchema);

/* =====================================================
   FILE UPLOAD (MULTER)
===================================================== */

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, "../client/uploads"));
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });

/* =====================================================
   ADMIN LOGIN
===================================================== */

const ADMIN_USERNAME = "mayank";
const ADMIN_PASSWORD = "mayankraj@";

app.post("/admin/login", (req, res) => {

    const { username, password } = req.body;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        return res.json({ success: true, token: "secure-admin-token" });
    }

    res.json({ success: false });
});

/* =====================================================
   ITEM ROUTES
===================================================== */

// Add Item
app.post("/add-item", upload.single("image"), async (req, res) => {

    try {

        const item = new Item({
            name: req.body.name,
            price: req.body.price,
            category: req.body.category,
            image: "/uploads/" + req.file.filename
        });

        await item.save();
        res.json({ message: "Item Saved Successfully" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get Items
app.get("/items", async (req, res) => {
    const items = await Item.find().sort({ createdAt: -1 });
    res.json(items);
});

// Update Item
app.put("/update-item/:id", upload.single("image"), async (req, res) => {

    const updateData = {
        name: req.body.name,
        price: req.body.price,
        category: req.body.category
    };

    if (req.file) {
        updateData.image = "/uploads/" + req.file.filename;
    }

    await Item.findByIdAndUpdate(req.params.id, updateData);
    res.json({ message: "Item Updated" });
});

// Delete Item
app.delete("/delete-item/:id", async (req, res) => {
    await Item.findByIdAndDelete(req.params.id);
    res.json({ message: "Item Deleted" });
});

/* =====================================================
   ORDER ROUTES
===================================================== */

app.post("/order", async (req, res) => {

    try {
        const order = new Order(req.body);
        await order.save();
        res.json({ message: "Order Saved Successfully" });
    } catch (err) {
        console.error("ORDER ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

app.get("/orders", async (req, res) => {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
});

app.put("/order-status/:id", async (req, res) => {
    await Order.findByIdAndUpdate(req.params.id, { status: "Delivered" });
    res.json({ message: "Status Updated" });
});

/* =====================================================
   ADMIN STATS
===================================================== */

app.get("/admin/stats", async (req, res) => {

    const totalOrders = await Order.countDocuments();

    const revenueData = await Order.aggregate([
        { $group: { _id: null, total: { $sum: "$total" } } }
    ]);

    const totalRevenue = revenueData[0]?.total || 0;

    const pendingOrders = await Order.countDocuments({ status: "Pending" });

    res.json({
        totalOrders,
        totalRevenue,
        pendingOrders
    });
});

/* =====================================================
   SERVE FRONTEND (LAST)
===================================================== */


// const path = require("path");

const clientPath = path.join(__dirname, "../client");

app.use(express.static(clientPath));

app.get("/", (req, res) => {
    res.sendFile(path.join(clientPath, "index.html"));
});
/* =====================================================
   START SERVER
===================================================== */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});