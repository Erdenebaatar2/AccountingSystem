// server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Database initialization function
async function initializeDatabase() {
  console.log('🟡 Starting database initialization...');
  console.log('🟡 DATABASE_URL exists:', !!process.env.DATABASE_URL);
  
  try {
    console.log('🔍 Checking database tables...');
    
    // Test connection first
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    
    // Check if tables exist
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'categories', 'transactions')
    `);
    
    console.log(`📊 Found ${tableCheck.rows.length} existing tables`);
    
    if (tableCheck.rows.length === 3) {
      console.log('✅ All tables already exist');
      return;
    }
    
    console.log('🔧 Creating database tables...');
    
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        user_type VARCHAR(50) NOT NULL,
        organization_name VARCHAR(255),
        organization_id VARCHAR(255),
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Users table created');
    
    // Create categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        color VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Categories table created');
    
    // Create transactions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        amount DECIMAL(15, 2) NOT NULL,
        type VARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        account VARCHAR(255),
        document_no VARCHAR(255),
        description TEXT,
        category_id INTEGER REFERENCES categories(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Transactions table created');
    
    // Insert sample categories if none exist
    const categoriesCount = await pool.query('SELECT COUNT(*) FROM categories');
    console.log(`📊 Categories count: ${categoriesCount.rows[0].count}`);
    
    if (categoriesCount.rows[0].count === '0') {
      await pool.query(`
        INSERT INTO categories (name, type, color) VALUES
        ('Цалин', 'income', '#10b981'),
        ('Борлуулалт', 'income', '#3b82f6'),
        ('Хоол хүнс', 'expense', '#ef4444'),
        ('Тээвэр', 'expense', '#f59e0b'),
        ('Бусад', 'both', '#6366f1')
      `);
      console.log('✅ Sample categories inserted');
    }
    
    console.log('🎉 Database initialization complete!');
    
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    console.error('❌ Full error:', error);
    throw error;
  }
}

// Test route
app.get("/", (req, res) => {
  res.json({ 
    message: "API server is running",
    endpoints: {
      login: "POST /api/login",
      signup: "POST /api/signup",
      addTransaction: "POST /api/transactions",
      categories: "GET /api/categories",
      transactions: "GET /api/transactions"
    }
  });
});

app.get("/api/health", async (req, res) => {
  try {
    await pool.query('SELECT NOW()');
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      database: "connected"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      database: "disconnected",
      error: error.message
    });
  }
});

// Login endpoint
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        message: "Invalid email or password"
      });
    }

    const user = userResult.rows[0];
    const bcrypt = require('bcrypt');
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({
        message: "Invalid email or password"
      });
    }

    const { password: _, ...userWithoutPassword } = user;
    
    return res.status(200).json({
      message: "Login successful",
      user: userWithoutPassword
    });

  } catch (error) {
    console.error("Error logging in:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Signup endpoint
app.post("/api/signup", async (req, res) => {
  try {
    const { name, email, user_type, organization_name, organization_id, password } = req.body;
    
    if (!email || !user_type || !password) {
      return res.status(400).json({ 
        message: 'Email, user_type and password are required' 
      });
    }
    
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      `INSERT INTO users (name, email, user_type, organization_name, organization_id, password) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING id, name, email, user_type, organization_name, organization_id`,
      [name || null, email, user_type, organization_name || null, organization_id || null, hashedPassword]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add transaction
app.post("/api/transactions", async (req, res) => {
  try {
    const { user_id, amount, type, date, account, document_no, description, category_id } = req.body;

    const categoryIdValue = (category_id === '' || category_id === undefined) ? null : category_id;

    const result = await pool.query(`
      INSERT INTO transactions 
        (user_id, amount, type, date, account, document_no, description, category_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `, [
      user_id, 
      amount, 
      type, 
      date, 
      account || null, 
      document_no || null, 
      description || null, 
      categoryIdValue
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error adding transaction:", error);
    res.status(500).json({ 
      message: "Internal server error", 
      error: error.message 
    });
  }
});

// Get categories
app.get("/api/categories", async (req, res) => {
  try {
    const { type } = req.query;
    let query = "SELECT * FROM categories";
    let params = [];
    
    if (type) {
      query += " WHERE type = $1";
      params.push(type);
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get transactions
app.get("/api/transactions", async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ 
        message: "user_id is required" 
      });
    }

    const result = await pool.query(
      `SELECT 
         t.id,
         t.user_id,
         t.amount::numeric AS amount,    
         t.type,
         t.date,
         t.account,
         t.document_no,
         t.description,
         t.category_id,
         CASE 
           WHEN c.id IS NOT NULL THEN json_build_object('id', c.id, 'name', c.name, 'color', c.color)
           ELSE NULL
         END AS categories
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = $1
       ORDER BY t.date DESC`,
      [user_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete transaction
app.delete('/api/transactions/:id', async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      message: 'Transaction id is required',
    });
  }

  try {
    const result = await pool.query(
      'DELETE FROM transactions WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: 'Transaction not found',
      });
    }

    res.status(200).json({
      message: 'Transaction deleted successfully',
      transaction: result.rows[0],
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
});

// Update transaction
app.put('/api/transactions/:id', async (req, res) => {
  const { id } = req.params;
  const { type, amount, date, account, document_no, description, category_id } = req.body;

  if (!id) return res.status(400).json({ message: 'Transaction ID is required' });

  try {
    const result = await pool.query(
      `UPDATE transactions 
       SET type=$1, amount=$2, date=$3, account=$4, document_no=$5, description=$6, category_id=$7
       WHERE id=$8
       RETURNING *`,
      [type, amount, date, account || null, document_no || null, description || null, category_id || null, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const transaction = result.rows[0];
    
    if (transaction.category_id) {
      const categoryResult = await pool.query(
        'SELECT id, name, color FROM categories WHERE id = $1',
        [transaction.category_id]
      );
      
      transaction.categories = categoryResult.rows.length > 0 
        ? categoryResult.rows[0] 
        : null;
    } else {
      transaction.categories = null;
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ 
    message: `Route ${req.method} ${req.url} not found`,
    availableEndpoints: [
      "GET /",
      "GET /api/health",
      "POST /api/login",
      "POST /api/signup", 
      "POST /api/transactions",
      "GET /api/categories",
      "GET /api/transactions"
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(" Server error:", err.stack);
  res.status(500).json({ 
    message: "Something went wrong!",
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;

console.log(' Server file loaded, about to initialize database...');

// Initialize database then start server
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(` Server running on port ${PORT}`);
      console.log(` Available endpoints:`);
      console.log(`   http://localhost:${PORT}/`);
      console.log(`   http://localhost:${PORT}/api/health`);
    });
  })
  .catch((error) => {
    console.error(' Failed to initialize database:', error);
    process.exit(1);
  });