// server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config();

const app = express();

// Middleware зөв дараалал
app.use(cors());
app.use(express.json()); // JSON parse хийх middleware

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test route нэмэх
app.get("/", (req, res) => {
  res.json({ 
    message: "API server is running",
    endpoints: {
      login: "POST /api/login",
      signup: "POST /api/signup",
      addTransaction: "POST /api/transactions",  // Энэ URL-ийг ашиглах
      categories: "GET /api/categories",
      transactions: "GET /api/transactions"
    }
  });
});

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    database: "connected"  // Database холболт шалгах
  });
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

// Нэг endpoint нэртэй байх - add-transactions биш transactions
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

// Categories endpoint
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

app.get("/api/transactions", async (req, res) => {
  try {
    const { user_id } = req.query;
    console.log("Received user_id:", user_id);
    if (!user_id) {
      return res.status(400).json({ 
        message: "user_id is required" 
      });
    }
    const result = await pool.query(
      `SELECT t.*, c.name as category_name, c.color as category_color
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
  console.error("🔥 Server error:", err.stack);
  res.status(500).json({ 
    message: "Something went wrong!",
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Available endpoints:`);
  console.log(`   http://localhost:${PORT}/`);
  console.log(`   http://localhost:${PORT}/api/health`);
  console.log(`   http://localhost:${PORT}/api/login`);
  console.log(`   http://localhost:${PORT}/api/signup`);
  console.log(`   http://localhost:${PORT}/api/transactions`);
  console.log(`   http://localhost:${PORT}/api/categories`);
});