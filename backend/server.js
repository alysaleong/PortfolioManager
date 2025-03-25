import express from "express";
import pg from "pg";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import router from "./routes/index.js";

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
export { pool };

app.use(express.json());

// to display requests in console
app.use((req, res, next) => {
  console.log(`HTTP request ${req.method} ${req.path} ${req.body ? JSON.stringify(req.body) : ''}`);
  console.log(`HTTP request query: ${JSON.stringify(req.query)}`);
  //console.log(`HTTP request headers: ${JSON.stringify(req.headers)}`);
  next();
});

// routes
app.use("/api", router, (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
  }
);


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
