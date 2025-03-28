import express from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../server.js'
import portfoliosRouter from './portfolio.js';
import friendsRouter from './friends.js';
import stockListsRouter from './stockLists.js';
import { isAuth } from '../middleware/authMiddleware.js'

const router = express.Router();
const SALT_ROUNDS = 5;

// AUTH
// me (logged in user)
router.get('/me', async (req, res) => {
    console.log(req.session);
    if (!req.session.uid || !req.session.email) {
        res.status(404).json({ error: "No user logged in" });
        return;
    }
    res.status(200).json({
        uid: req.session.uid,
        email: req.session.email
    })
});

// register
router.post('/register', async (req, res) => {
    // get the email and password from request
    const { email, password } = req.body;
    const cash = req.body.cash || null;

    // check if email is taken
    const emailTaken = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
    );
    if (emailTaken.rows.length > 0) {
        return res.status(400).json({ error: "Email is already taken"});
        return;
    }
    
    // create an user with this email and hashed password
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // hash the password
        const hashed_password = await bcrypt.hash(password, SALT_ROUNDS);

        const result = await client.query(
            'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *', 
            [email, hashed_password]
        );
        const user = result.rows[0];

        // registering also creates a portfolio since you need at least 1
        pool.query(
            'INSERT INTO portfolios (uid, cash) VALUES ($1, $2)',
            [user.uid, cash]
        );
        
        // create a session so the user is logged in
        req.session.uid = user.uid;
        req.session.email = user.email;

        // send response
        await client.query('COMMIT');
        res.status(201).json({ message: "User registered" });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: "Error registering user, " + error});
    } finally {
        client.release();
    }
});

// log in
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // get the user for this email
    let user = await pool.query(
        `SELECT * FROM users WHERE email = $1`,
        [email]
    );

    // if that email doesn't have an account
    if (user.rows.length == 0) {
        res.status(404).json({ error: "No user associated with that email" });
        return;
    }

    // compare provided password with the actual
    user = user.rows[0];
    const hashed_password = user.password;
    bcrypt.compare(password, hashed_password, (err, correct_password) => {
        if (err) {
            res.status(500).json({ error: "Error checking password" });
            return;
        }

        // incorrect password
        if (!correct_password) {
            res.status(401).json({ error: "Incorrect password" });
            return;
        }

        // if the password is correct, create session to log user in
        req.session.uid = user.uid;
        req.session.email = user.email;

        // send respoinse
        res.status(200).json({ message: "Logged in" });
    })
});

// log out
router.get('/logout', async (req, res) => {
    // destroy the session to log out
    req.session.destroy((err) => {
        if (err) {
            res.status(500).json({ error: "Error signing out" });
            return;
        }
        res.status(200).json({ message: 'Signed out' })
    });
});


// ROUTES
router.use('/portfolios', isAuth, portfoliosRouter);
router.use('/friends', isAuth, friendsRouter);
router.use('/stocklists', isAuth, stockListsRouter);

export default router;