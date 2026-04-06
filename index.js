// Yeh script ek baar run karo Node.js se ya MongoDB Atlas shell mein

// Option 1: Node.js script — project root mein save karo aur run karo
// node fix_index.js

const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndex() {
    await mongoose.connect(process.env.DATABASE);
    
    const db = mongoose.connection.db;
    const collection = db.collection('pointshistories');
    
    // Step 1: Purana wrong unique index drop karo
    try {
        await collection.dropIndex('transaction_1');
        console.log('✅ Old index dropped: transaction_1');
    } catch (e) {
        console.log('⚠️ Index not found or already dropped:', e.message);
    }
    
    // Step 2: Naya correct compound index banao
    // transaction + type dono milke unique honge
    // ek transaction ke spend aur earn dono allow honge
    await collection.createIndex(
        { transaction: 1, type: 1 },
        { unique: true }
    );
    console.log('✅ New compound index created: transaction + type');
    
    await mongoose.disconnect();
    console.log('Done!');
}

fixIndex().catch(console.error);