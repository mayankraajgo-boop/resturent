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
    inStock: { type: Boolean, default: true },
    isSpecial: { type: Boolean, default: false },
    reviews: [{
        customerName: String,
        rating: Number,
        comment: String,
        createdAt: { type: Date, default: Date.now }
    }],
    averageRating: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const OrderSchema = new mongoose.Schema({
    customerName: String,
    phone: String,
    address: String,
    street: String,
    items: Array,
    total: Number,
    discount: { type: Number, default: 0 },
    finalAmount: Number,
    payment: String,
    specialInstructions: String,
    loyaltyPointsEarned: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ["Processing", "Cooking", "Out for Delivery", "Delivered"],
        default: "Processing"
    },
    estimatedDelivery: String,
    createdAt: { type: Date, default: Date.now }
});

const ComboSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    items: [String],
    originalPrice: Number,
    comboPrice: Number,
    image: String,
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const CouponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    discount: Number,
    discountType: { type: String, enum: ["percentage", "fixed"], default: "percentage" },
    minOrder: { type: Number, default: 0 },
    maxDiscount: Number,
    expiryDate: Date,
    isActive: { type: Boolean, default: true },
    usageLimit: Number,
    usedCount: { type: Number, default: 0 }
});

const CustomerSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true },
    name: String,
    loyaltyPoints: { type: Number, default: 0 },
    addresses: [{
        address: String,
        street: String,
        label: String
    }],
    favorites: [String],
    orderHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    createdAt: { type: Date, default: Date.now }
});

const Item = mongoose.model("Item", ItemSchema);
const Order = mongoose.model("Order", OrderSchema);
const Combo = mongoose.model("Combo", ComboSchema);
const Coupon = mongoose.model("Coupon", CouponSchema);
const Customer = mongoose.model("Customer", CustomerSchema);


/* =====================================================
   CLOUDINARY CONFIGURATION
===================================================== */

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


/* =====================================================
   FILE UPLOAD (LOCAL STORAGE - FALLBACK)
===================================================== */

let storage;
let upload;

// Check if Cloudinary is configured
if (process.env.CLOUDINARY_CLOUD_NAME && 
    process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name') {
    
    // Use Cloudinary if configured
    storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'mr-restaurant',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
            transformation: [{ width: 500, height: 500, crop: 'limit' }]
        }
    });
    console.log("✅ Using Cloudinary for image storage");
} else {
    // Use local storage as fallback
    storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, path.join(__dirname, '../client/uploads'));
        },
        filename: function (req, file, cb) {
            cb(null, Date.now() + '-' + file.originalname);
        }
    });
    console.log("⚠️ Using local storage (Cloudinary not configured)");
}

upload = multer({ storage });


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

        // Convert string "true"/"false" to boolean
        const inStock = req.body.inStock === 'true' || req.body.inStock === true;
        const isSpecial = req.body.isSpecial === 'true' || req.body.isSpecial === true;

        // Handle both Cloudinary and local storage paths
        let imagePath;
        if (req.file.path && req.file.path.startsWith('http')) {
            // Cloudinary URL
            imagePath = req.file.path;
        } else {
            // Local storage - use web-accessible path
            imagePath = `/uploads/${req.file.filename}`;
        }

        const item = new Item({
            name: req.body.name,
            price: req.body.price,
            category: req.body.category,
            image: imagePath,
            inStock: inStock,
            isSpecial: isSpecial
        });

        await item.save();
        console.log("✅ Item saved:", item.name);
        res.json({ message: "Item Saved Successfully" });

    } catch (err) {
        console.error("❌ Add Item Error:", err.message);
        res.status(500).json({ error: "Item Save Failed: " + err.message });
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
            // Handle both Cloudinary and local storage paths
            if (req.file.path && req.file.path.startsWith('http')) {
                // Cloudinary URL
                updateData.image = req.file.path;
            } else {
                // Local storage - use web-accessible path
                updateData.image = `/uploads/${req.file.filename}`;
            }
        }
        
        if (req.body.inStock !== undefined) {
            updateData.inStock = req.body.inStock === 'true' || req.body.inStock === true;
        }
        
        if (req.body.isSpecial !== undefined) {
            updateData.isSpecial = req.body.isSpecial === 'true' || req.body.isSpecial === true;
        }

        await Item.findByIdAndUpdate(req.params.id, updateData);
        console.log("✅ Item updated:", req.params.id);
        res.json({ message: "Item Updated" });

    } catch (err) {
        console.error("❌ Update Item Error:", err.message);
        res.status(500).json({ error: "Update Failed: " + err.message });
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

        // Calculate estimated delivery time based on current orders
        const pendingOrders = await Order.countDocuments({ 
            status: { $in: ["Processing", "Cooking", "Out for Delivery"] }
        });
        
        let estimatedMinutes = 20;
        if (pendingOrders > 5) estimatedMinutes = 30;
        if (pendingOrders > 10) estimatedMinutes = 40;
        
        const estimatedTime = new Date(Date.now() + estimatedMinutes * 60000);
        const estimatedDelivery = estimatedTime.toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        // Calculate loyalty points (1 point per ₹10 spent)
        const loyaltyPoints = Math.floor(req.body.total / 10);
        
        const order = new Order({
            ...req.body,
            estimatedDelivery,
            loyaltyPointsEarned: loyaltyPoints,
            finalAmount: req.body.total - (req.body.discount || 0)
        });
        
        await order.save();
        
        // Update customer loyalty points and order history
        await Customer.findOneAndUpdate(
            { phone: req.body.phone },
            { 
                $inc: { loyaltyPoints: loyaltyPoints },
                $push: { orderHistory: order._id },
                $set: { name: req.body.customerName }
            },
            { upsert: true }
        );

        // Return full order with estimated delivery
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
            payment: order.payment,
            estimatedDelivery: order.estimatedDelivery
        });

    } catch (err) {
        res.status(500).json({ error: "Invalid Order ID" });
    }
});


/* =====================================================
   COMBO DEALS ROUTES
===================================================== */

app.post("/add-combo", upload.single("image"), async (req, res) => {
    try {
        const combo = new Combo({
            name: req.body.name,
            description: req.body.description,
            items: JSON.parse(req.body.items),
            originalPrice: req.body.originalPrice,
            comboPrice: req.body.comboPrice,
            image: req.file ? req.file.path : ""
        });
        await combo.save();
        res.json({ message: "Combo Created" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/combos", async (req, res) => {
    const combos = await Combo.find({ isActive: true });
    res.json(combos);
});

app.put("/update-combo/:id", upload.single("image"), async (req, res) => {
    try {
        const updateData = {
            name: req.body.name,
            description: req.body.description,
            items: JSON.parse(req.body.items),
            originalPrice: req.body.originalPrice,
            comboPrice: req.body.comboPrice
        };
        if (req.file) updateData.image = req.file.path;
        
        await Combo.findByIdAndUpdate(req.params.id, updateData);
        res.json({ message: "Combo Updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete("/delete-combo/:id", async (req, res) => {
    await Combo.findByIdAndDelete(req.params.id);
    res.json({ message: "Combo Deleted" });
});


/* =====================================================
   COUPON ROUTES
===================================================== */

app.post("/add-coupon", async (req, res) => {
    try {
        const coupon = new Coupon(req.body);
        await coupon.save();
        res.json({ message: "Coupon Created" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/coupons", async (req, res) => {
    const coupons = await Coupon.find({ isActive: true });
    res.json(coupons);
});

app.post("/validate-coupon", async (req, res) => {
    const { code, orderTotal } = req.body;
    
    const coupon = await Coupon.findOne({ 
        code: code.toUpperCase(), 
        isActive: true 
    });
    
    if (!coupon) {
        return res.status(404).json({ error: "Invalid coupon code" });
    }
    
    if (coupon.expiryDate && new Date() > coupon.expiryDate) {
        return res.status(400).json({ error: "Coupon expired" });
    }
    
    if (orderTotal < coupon.minOrder) {
        return res.status(400).json({ 
            error: `Minimum order of ₹${coupon.minOrder} required` 
        });
    }
    
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        return res.status(400).json({ error: "Coupon usage limit reached" });
    }
    
    let discount = 0;
    if (coupon.discountType === "percentage") {
        discount = (orderTotal * coupon.discount) / 100;
        if (coupon.maxDiscount) {
            discount = Math.min(discount, coupon.maxDiscount);
        }
    } else {
        discount = coupon.discount;
    }
    
    res.json({ 
        valid: true, 
        discount: Math.floor(discount),
        couponId: coupon._id
    });
});

app.put("/use-coupon/:id", async (req, res) => {
    await Coupon.findByIdAndUpdate(req.params.id, { 
        $inc: { usedCount: 1 } 
    });
    res.json({ message: "Coupon used" });
});

app.delete("/delete-coupon/:id", async (req, res) => {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ message: "Coupon Deleted" });
});


/* =====================================================
   CUSTOMER & LOYALTY ROUTES
===================================================== */

app.post("/customer/register", async (req, res) => {
    try {
        const { phone, name } = req.body;
        
        let customer = await Customer.findOne({ phone });
        
        if (!customer) {
            customer = new Customer({ phone, name });
            await customer.save();
        }
        
        res.json(customer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/customer/:phone", async (req, res) => {
    const customer = await Customer.findOne({ phone: req.params.phone })
        .populate('orderHistory');
    
    if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
    }
    
    res.json(customer);
});

app.post("/customer/add-favorite", async (req, res) => {
    const { phone, itemName } = req.body;
    
    await Customer.findOneAndUpdate(
        { phone },
        { $addToSet: { favorites: itemName } }
    );
    
    res.json({ message: "Added to favorites" });
});

app.post("/customer/remove-favorite", async (req, res) => {
    const { phone, itemName } = req.body;
    
    await Customer.findOneAndUpdate(
        { phone },
        { $pull: { favorites: itemName } }
    );
    
    res.json({ message: "Removed from favorites" });
});

app.post("/customer/add-address", async (req, res) => {
    const { phone, address, street, label } = req.body;
    
    await Customer.findOneAndUpdate(
        { phone },
        { $push: { addresses: { address, street, label } } }
    );
    
    res.json({ message: "Address saved" });
});


/* =====================================================
   REVIEW ROUTES
===================================================== */

app.post("/add-review/:itemId", async (req, res) => {
    try {
        const { customerName, rating, comment } = req.body;
        
        const item = await Item.findById(req.params.itemId);
        
        item.reviews.push({ customerName, rating, comment });
        
        // Calculate average rating
        const totalRating = item.reviews.reduce((sum, r) => sum + r.rating, 0);
        item.averageRating = totalRating / item.reviews.length;
        
        await item.save();
        
        res.json({ message: "Review added" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/reviews/:itemId", async (req, res) => {
    const item = await Item.findById(req.params.itemId);
    res.json(item.reviews || []);
});


/* =====================================================
   SETTINGS ROUTES
===================================================== */

const SettingsSchema = new mongoose.Schema({
    minOrderAmount: { type: Number, default: 0 },
    peakHoursMessage: String,
    isPeakHours: { type: Boolean, default: false },
    socialMedia: {
        instagram: String,
        facebook: String,
        twitter: String
    }
});

const Settings = mongoose.model("Settings", SettingsSchema);

app.get("/settings", async (req, res) => {
    let settings = await Settings.findOne();
    if (!settings) {
        settings = new Settings();
        await settings.save();
    }
    res.json(settings);
});

app.put("/settings", async (req, res) => {
    let settings = await Settings.findOne();
    if (!settings) {
        settings = new Settings(req.body);
    } else {
        Object.assign(settings, req.body);
    }
    await settings.save();
    res.json({ message: "Settings updated" });
});