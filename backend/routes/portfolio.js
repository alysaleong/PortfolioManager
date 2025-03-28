import express from "express";
import { pool } from '../server.js'

const router = express.Router();
export default router;

// create a portfolio
router.post('/', async (req, res) => {
    const uid = req.session.uid;
    const cash = req.body.cash;
    const pname = req.body.pname || 'My Portfolio';
    await pool.query(
        `INSERT INTO portfolios (uid, cash, pname) VALUES ($1, $2, $3)`,
        [uid, cash, pname]
    );
    res.status(200).json({"message": "Portfolio created"});
})

// display user's portfolios
router.get('/', async (req, res) => {
    const uid = req.session.uid;
    const output = await pool.query(
        `SELECT pid, pname
        FROM portfolios
        WHERE uid = $1`,
        [uid]
    );
    res.status(200).json(output.rows);
});

// display stock holdings of a particular portfolio
router.get('/:pid', async (req, res) => {
    const uid = req.session.uid;
    const pid = req.params.pid;
    
    // check if the given portfolio belongs to user
    let u_ports = await pool.query(
        `SELECT pid
        FROM portfolios
        WHERE uid = $1`,
        [uid]
    );
    u_ports = u_ports.rows.map(row => row.pid);
    if (!(u_ports.includes(Number(pid)))) {
        res.status(400).json({error: "Invalid portfolio"});
        return;
    };
    
    const output = await pool.query(
        `SELECT symbol, quantity
        FROM in_port
        WHERE pid = $1`,
        [pid]
    );
    res.status(200).json(output.rows);
});

// buy stock
router.post('/buy', async (req, res) => {
    const uid = req.session.uid;
    const pid = req.body.pid;
    const symbol = req.body.symbol;
    const quantity = req.body.quantity;
    
    // check if the given portfolio belongs to user
    let u_ports = await pool.query(
        `SELECT pid
        FROM portfolios
        WHERE uid = $1`,
        [uid]
    );
    u_ports = u_ports.rows.map(row => row.pid);
    if (!(u_ports.includes(pid))) {
        res.status(400).json({error: "Invalid portfolio"});
        return;
    };

    // check if the given stock is in the database
    let symbols = await pool.query(
        `SELECT symbol
        FROM stocks`
    );
    symbols = symbols.rows.map(row => row.symbol);
    if (!(symbols.includes(symbol))) {
        res.status(400).json({error: "Invalid symbol"});
        return;
    };

    // check if user has enough cash to purchase the stock at the given quantity
    let cash = await pool.query(
        `SELECT cash
        FROM portfolios
        WHERE pid = $1`,
        [pid]
    );
    let stock_price = await pool.query(
        `SELECT curr_val
        FROM stocks
        WHERE symbol = $1`,
        [symbol]
    );
    cash = cash.rows.map(row => row.cash);
    stock_price = stock_price.rows.map(row => row.curr_val);
    const total_price = stock_price * quantity;
    if (total_price > cash) {
        res.status(400).json({error: "Not enough cash in portfolio"});
        return;
    };
   
    let p_stocks = await pool.query(
        `SELECT symbol
        FROM in_port
        WHERE pid = $1`,
        [pid]
    );
    p_stocks = p_stocks.rows.map(row => row.symbol);
    if (p_stocks.includes(symbol)) {
         // buy more of stock (if user already owns that stock)
        await pool.query(
            `UPDATE in_port
            SET quantity = quantity + $1
            WHERE symbol = $2`,
            [quantity, symbol]
        );
    } else {
        // buy stock
        await pool.query(
            `INSERT INTO in_port (symbol, pid, quantity) VALUES ($1, $2, $3)`,
            [symbol, pid, quantity]
        );
    };

    await pool.query(
        `UPDATE portfolios
        SET cash = cash - $1
        WHERE pid = $2`,
        [total_price, pid]
    );
    
    res.status(200).json({"message": "Stock purchased"});
});