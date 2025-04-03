import express from "express";
import { pool } from "../server.js";

const router = express.Router();

// get all users emails 
router.get('/', async (req, res) => {
    const users = await pool.query(
        'SELECT uid, email FROM users'
    );
    return res.status(200).json(users.rows);
});

export default router;