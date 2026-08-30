import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import fs from 'fs';
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']); // Fix local ISP blocking MongoDB SRV records

import { User, Product, Profile, getModel } from './models';

dotenv.config();

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
  } else {
    next();
  }
});
app.use(express.json());

// Setup uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

// Multer storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://admin:admin123@cluster0.73cthwc.mongodb.net/?appName=Cluster0";
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key_12345";

console.log('URI IS EXACTLY:', JSON.stringify(MONGODB_URI));

mongoose.connect(MONGODB_URI, { family: 4, serverSelectionTimeoutMS: 5000 })
  .then(async () => {
    console.log('Connected to MongoDB!');
    // Seed master admin account
    try {
      const adminEmail = 'admin@smartstock.com';
      const existingAdmin = await User.findOne({ email: adminEmail });
      if (!existingAdmin) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);
        const newAdmin = await User.create({ email: adminEmail, password: hashedPassword });
        
        await Profile.create({
          user_id: newAdmin._id,
          role: 'admin',
          owner_name: 'System Admin',
          shop_name: 'SmartStock Admin',
          is_active: true
        });
        console.log('Seeded master admin account:', adminEmail);
      }
    } catch (err) {
      console.error('Error seeding admin:', err);
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware to verify JWT
const verifyToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send('Unauthorized: No token provided');
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return res.status(401).send('Unauthorized: Invalid token');
  }
};

// =======================
// AUTH ROUTES
// =======================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({ email, password: hashedPassword });
    
    const token = jwt.sign({ uid: newUser._id.toString(), email: newUser.email }, JWT_SECRET, { expiresIn: '1h' });
    
    res.status(201).json({ token, user: { uid: newUser._id.toString(), email: newUser.email } });
  } catch (error: any) {
    console.error("Register Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ uid: user._id.toString(), email: user.email }, JWT_SECRET, { expiresIn: '1h' });
    
    res.json({ token, user: { uid: user._id.toString(), email: user.email } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// =======================
// UPLOAD ROUTE
// =======================

app.post('/api/upload', verifyToken, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Return the URL to access this image using the actual request host
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers.host;
    const url = `${protocol}://${host}/uploads/${req.file.filename}`;
    
    res.json({ url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// =======================
// SPECIFIC DB ROUTES
// =======================

app.get('/api/products', verifyToken, async (req, res) => {
  try {
    const userId = (req as any).user.uid;
    const products = await Product.find({ user_id: userId }).sort({ created_at: -1 });
    res.json(products);
  } catch (error) { 
    console.error("GET /api/products error:", error);
    res.status(500).json({ error: 'Failed to fetch products' }); 
  }
});

app.get('/api/all-products', verifyToken, async (req, res) => {
  try {
    const products = await Product.find().sort({ created_at: -1 });
    res.json(products);
  } catch (error) { 
    console.error("GET /api/all-products error:", error);
    res.status(500).json({ error: 'Failed to fetch all products' }); 
  }
});

app.post('/api/products', verifyToken, async (req, res) => {
  try {
    const userId = (req as any).user.uid;
    const newProduct = await Product.create({ ...req.body, user_id: userId });
    res.status(201).json(newProduct);
  } catch (error) { res.status(500).json({ error: 'Failed to add product' }); }
});

app.put('/api/products/:id', verifyToken, async (req, res) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, { ...req.body, updated_at: new Date() });
    res.json({ message: 'Product updated successfully' });
  } catch (error) { res.status(500).json({ error: 'Failed to update product' }); }
});

app.delete('/api/products/:id', verifyToken, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) { res.status(500).json({ error: 'Failed to delete product' }); }
});

app.get('/api/profile', verifyToken, async (req, res) => {
  try {
    const userId = (req as any).user.uid;
    const profile = await Profile.findOne({ user_id: userId });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (error) { 
    console.error("GET /api/profile error:", error);
    res.status(500).json({ error: 'Failed to fetch profile' }); 
  }
});

app.get('/api/all-profiles', verifyToken, async (req, res) => {
  try {
    const profiles = await Profile.find();
    res.json(profiles);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch all profiles' }); }
});

app.post('/api/profile', verifyToken, async (req, res) => {
  try {
    const userId = (req as any).user.uid;
    const existing = await Profile.findOne({ user_id: userId });
    
    if (existing) {
      const updatedProfile = await Profile.findByIdAndUpdate(
        existing._id,
        { ...req.body, updated_at: new Date() },
        { new: true }
      );
      return res.status(200).json(updatedProfile);
    } else {
      const newProfile = await Profile.create({ ...req.body, user_id: userId });
      return res.status(201).json(newProfile);
    }
  } catch (error) { 
    console.error("POST /api/profile error:", error);
    res.status(500).json({ error: 'Failed to create/update profile' }); 
  }
});

app.put('/api/profile', verifyToken, async (req, res) => {
  try {
    const userId = (req as any).user.uid;
    const profile = await Profile.findOne({ user_id: userId });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    
    await Profile.findByIdAndUpdate(profile._id, { ...req.body, updated_at: new Date() });
    res.json({ message: 'Profile updated successfully' });
  } catch (error) { res.status(500).json({ error: 'Failed to update profile' }); }
});

// =======================
// ADMIN ROUTES
// =======================

app.put('/api/admin/profiles/:id/role', verifyToken, async (req, res) => {
  try {
     const userId = (req as any).user.uid;
     const requesterProfile = await Profile.findOne({ user_id: userId });
     if (requesterProfile?.role !== 'admin' && (req as any).user.email !== 'admin@smartstock.com' && (req as any).user.email !== 'admin@gmail.com') {
       return res.status(403).json({ error: 'Forbidden: Admin access required' });
     }
     await Profile.findByIdAndUpdate(req.params.id, { role: req.body.role, updated_at: new Date() });
     res.json({ success: true });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/admin/profiles/:id', verifyToken, async (req, res) => {
  try {
     const userId = (req as any).user.uid;
     const requesterProfile = await Profile.findOne({ user_id: userId });
     if (requesterProfile?.role !== 'admin' && (req as any).user.email !== 'admin@smartstock.com' && (req as any).user.email !== 'admin@gmail.com') {
       return res.status(403).json({ error: 'Forbidden: Admin access required' });
     }
     await Profile.findByIdAndDelete(req.params.id);
     res.json({ success: true });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// =======================
// GENERIC REST ADAPTER (For all other collections like sales, ledger, etc)
// =======================

app.get('/api/db/:collection', verifyToken, async (req, res) => {
  try {
    const colName = req.params.collection as string;
    const Model = getModel(colName) as any;
    
    let query: any = {};
    if (req.query.filters) {
      try {
        const filters = JSON.parse(req.query.filters as string);
        for (const f of filters) {
          if (f.type === 'where') {
            // Very basic translation from Firestore 'where' to MongoDB
            if (f.op === '==') query[f.field] = f.value;
            else if (f.op === '>') query[f.field] = { $gt: f.value };
            else if (f.op === '<') query[f.field] = { $lt: f.value };
            else if (f.op === '>=') query[f.field] = { $gte: f.value };
            else if (f.op === '<=') query[f.field] = { $lte: f.value };
          }
        }
      } catch(e) { console.warn("Invalid filters json", e); }
    }
    
    const results = await Model.find(query);
    res.json(results);
  } catch (error: any) {
    console.error("GET DB Error:", error);
    res.status(500).json({ error: error.message || 'Database query failed' });
  }
});

app.post('/api/db/:collection', verifyToken, async (req, res) => {
  try {
    const colName = req.params.collection as string;
    const Model = getModel(colName) as any;
    const doc = await Model.create(req.body);
    res.status(201).json({ id: doc._id.toString() });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/db/:collection/:id', verifyToken, async (req, res) => {
  try {
    const colName = req.params.collection as string;
    const Model = getModel(colName) as any;
    await Model.findByIdAndUpdate(req.params.id, req.body);
    res.json({ success: true });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/db/:collection/:id', verifyToken, async (req, res) => {
  try {
    const colName = req.params.collection as string;
    const Model = getModel(colName) as any;
    await Model.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/db/batch', verifyToken, async (req, res) => {
  try {
    const operations = req.body.operations || [];
    // We run sequentially since real MongoDB bulk operations are per-collection
    for (const op of operations) {
      const Model = getModel(op.collection) as any;
      if (op.type === 'set') {
        await Model.findByIdAndUpdate(op.id, op.data, { upsert: true });
      } else if (op.type === 'update') {
        await Model.findByIdAndUpdate(op.id, op.data);
      } else if (op.type === 'delete') {
        await Model.findByIdAndDelete(op.id);
      }
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("Batch error:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT as number, "0.0.0.0", () => {
  console.log(`Backend server running perfectly on port ${PORT} (0.0.0.0)`);
});
