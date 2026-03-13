import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Unified DB reference
import { pool } from './config/db';
import { initializeDatabase } from './db/schema';

// Routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
// TODO: Import newly created modular routes here (Extracted from narendhar and adithyan)

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ],
  credentials: true
}));
app.use(express.json());

// Serving static files if needed
app.use('/public', express.static(path.join(__dirname, '../public')));

/* ROUTES */
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

// Add unified routes for features from all developers...
// (These will be populated as I modularize the massive index.ts)

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const start = async () => {
    try {
        // Run any DB initializations
        await initializeDatabase();
        
        app.listen(port, () => {
            console.log(`🚀 Unified EMS Server running at http://localhost:${port}`);
        });

        // Test DB connection
        const res = await pool.query("SELECT NOW()");
        console.log("PostgreSQL connected:", res.rows[0]);

    } catch (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
};

start();
