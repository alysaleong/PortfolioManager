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

// Convert UID to email
router.get('/uid/:uid/email', async (req, res) => {
    const uid = req.params.uid;

    try {
        const result = await pool.query(
            `SELECT email FROM users WHERE uid = $1`,
            [uid]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No user found with this UID" });
        }

        res.status(200).json({ email: result.rows[0].email });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch email" });
    }
});

export default router;