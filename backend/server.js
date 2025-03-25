import express from "express";
import pg from "pg";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import profolioRouter from "./routes/portfolio.js";

const { Pool } = pg;
const app = express()
const PORT = 4000;

let pool;

async function connectToPG() {
    try {
        pool = new Pool({
            user: process.env.PG_USER,
            host: process.env.PG_HOST,
            database: process.env.PG_DATABASE,
            password: process.env.PG_PWD,
            port: process.env.PG_PORT,
        });
    } catch (error) {
        console.error("error connecting to psotgresql :(", error);
    }
}

connectToPG();

app.use(express.json());

app.use((req, res, next) => {
    console.log(`HTTP req: ${req.method} ${req.path} ${req.body ? JSON.stringify(req.body) : ''}`);
    next();
})

app.use("/portfolio", profolioRouter);

// Open Port
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Register a new user
app.post("/registerUser", express.json(), async (req, res) => {
    try {
      const { username, password } = req.body;

      // Basic body request check
      if (!username || !password) {
        return res
          .status(400)
          .json({ error: "Username and password both needed to register." });
      }

      // Creating hashed password (search up bcrypt online for more info)
      // and storing user info in database
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await pool.query(
        "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id",
        [username, hashedPassword]
      );

      // Returning JSON Web Token (search JWT for more explanation)
      const token = jwt.sign({ userId: result.rows[0].id }, "secret-key", { expiresIn: "1h" });
      res.status(201).json({ response: "User registered successfully.", token });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });