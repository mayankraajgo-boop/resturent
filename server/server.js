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
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const app = express();

/* =====================================================
   MIDDLEWARES
===================================================== */

app.use(cors());
app.use(express.json());


/* =====================================================
   MONGODB CONNECTION (ATLAS)
===================================================== */

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => {
        console.error("❌ Mongo Error:", err);
        process.exit(1); // Stop server if DB fails
    });


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

        if (!req.body.amount || req.body.amount <= 0) {
            return res.status(400).json({ error: "Valid amount required" });
        }

        const options = {
            amount: Number(req.body.amount) * 100, // ₹ → paise
            currency: "INR",
            receipt: "order_" + Date.now()
        };

        const order = await razorpay.orders.create(options);

        res.json(order);

    } catch (err) {
        console.error("❌ Razorpay Error:", err.message);
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
    street: String,
    items: Array,
    total: Number,
    payment: String,
    status: {
        type: String,
        enum: ["Processing", "Cooking", "Out for Delivery", "Delivered"],
        default: "Processing"
    },
    createdAt: { type: Date, default: Date.now }
});

const Item = mongoose.model("Item", ItemSchema);
const Order = mongoose.model("Order", OrderSchema);


/* =====================================================
   CLOUDINARY CONFIGURATION
===================================================== */

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


/* =====================================================
   FILE UPLOAD (CLOUDINARY)
===================================================== */

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'mr-restaurant',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }]
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

app.post("/add-item", upload.single("image"), async (req, res) => {

    try {

        if (!req.file) {
            return res.status(400).json({ error: "Image required" });
        }

        const item = new Item({
            name: req.body.name,
            price: req.body.price,
            category: req.body.category,
            image: req.file.path // Cloudinary URL
        });

        await item.save();
        res.json({ message: "Item Saved Successfully" });

    } catch (err) {
        console.error("Add Item Error:", err.message);
        res.status(500).json({ error: "Item Save Failed" });
    }
});


app.get("/items", async (req, res) => {
    const items = await Item.find().sort({ createdAt: -1 });
    res.json(items);
});


app.put("/update-item/:id", upload.single("image"), async (req, res) => {

    try {

        const updateData = {
            name: req.body.name,
            price: req.body.price,
            category: req.body.category
        };

        if (req.file) {
            updateData.image = req.file.path; // Cloudinary URL
        }

        await Item.findByIdAndUpdate(req.params.id, updateData);
        res.json({ message: "Item Updated" });

    } catch (err) {
        console.error("Update Item Error:", err.message);
        res.status(500).json({ error: "Update Failed" });
    }
});


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

        // 🔥 IMPORTANT — return full order
        res.status(201).json(order);

    } catch (err) {
        console.error("Order Save Error:", err.message);
        res.status(500).json({ error: "Order Save Failed" });
    }
});


app.get("/orders", async (req, res) => {

    if (req.query.phone) {
        const orders = await Order.find({ phone: req.query.phone })
            .sort({ createdAt: -1 });

        return res.json(orders);
    }

    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
});


app.put("/order-status/:id", async (req, res) => {

    const { status } = req.body;

    await Order.findByIdAndUpdate(req.params.id, { status });

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

    const pendingOrders = await Order.countDocuments({ status: "Processing" }); // ✅ FIXED

    res.json({
        totalOrders,
        totalRevenue,
        pendingOrders
    });
});


/* =====================================================
   SERVE FRONTEND
===================================================== */

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

/* =====================================================
   TRACK ORDER BY ID + PHONE
===================================================== */

app.post("/track-order", async (req, res) => {

    const { orderId, phone } = req.body;

    try {

        const order = await Order.findOne({
            _id: orderId,
            phone: phone
        });

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        res.json({
            status: order.status,
            total: order.total,
            payment: order.payment
        });

    } catch (err) {
        res.status(500).json({ error: "Invalid Order ID" });
    }
});