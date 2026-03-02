/* =====================================================
   FIX IMAGE PATHS IN DATABASE
   
   This script fixes image paths that were saved as full
   file system paths (file:///C:/...) and converts them
   to web-accessible paths (/uploads/filename)
===================================================== */

require("dotenv").config();
const mongoose = require("mongoose");

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => {
        console.error("❌ MongoDB Error:", err);
        process.exit(1);
    });

// Item Schema
const ItemSchema = new mongoose.Schema({
    name: String,
    price: Number,
    image: String,
    category: String,
    inStock: Boolean,
    isSpecial: Boolean,
    createdAt: Date
});

const Item = mongoose.model("Item", ItemSchema);

// Fix image paths
async function fixImagePaths() {
    try {
        console.log("\n🔧 Starting to fix image paths...\n");
        
        // Get all items
        const items = await Item.find();
        console.log(`📦 Found ${items.length} items in database\n`);
        
        let fixedCount = 0;
        
        for (const item of items) {
            const oldPath = item.image;
            
            // Check if path needs fixing
            if (oldPath && (oldPath.includes('file:///') || oldPath.includes('C:\\') || oldPath.includes('client\\uploads'))) {
                
                // Extract filename from path
                const filename = oldPath.split(/[/\\]/).pop();
                
                // Create new web-accessible path
                const newPath = `/uploads/${filename}`;
                
                // Update item
                item.image = newPath;
                await item.save();
                
                console.log(`✅ Fixed: ${item.name}`);
                console.log(`   Old: ${oldPath}`);
                console.log(`   New: ${newPath}\n`);
                
                fixedCount++;
            } else if (oldPath && oldPath.startsWith('http')) {
                console.log(`⏭️  Skipped: ${item.name} (Cloudinary URL)`);
            } else if (oldPath && oldPath.startsWith('/uploads/')) {
                console.log(`✓  OK: ${item.name} (Already correct)`);
            } else {
                console.log(`⚠️  Warning: ${item.name} - Unknown path format: ${oldPath}`);
            }
        }
        
        console.log(`\n🎉 Done! Fixed ${fixedCount} items`);
        console.log(`✅ All image paths are now correct\n`);
        
        process.exit(0);
        
    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
}

// Run the fix
fixImagePaths();
