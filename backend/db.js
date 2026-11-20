import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// Create a connection pool for better performance
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "nodeuser",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "broshare",
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test connection on startup
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(" MySQL connected successfully");
    connection.release();
  } catch (err) {
    console.error("❌ MySQL connection failed:", err.message);
    console.log(
      "Make sure MySQL is running and credentials are correct in .env file",
    );
  }
}

testConnection();

export default pool;
