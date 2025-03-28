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
    const u_ports = await pool.query(
        `SELECT pid
        FROM portfolios
        WHERE uid = $1`,
        [uid]
    );
    let uports = [];
    for (const uport of u_ports.rows) {
        uports.push(uport.pid);
    };
    if (!(uports.includes(Number(pid)))) {
        res.status(400).json({error: "Not your portfolio"});
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
    const u_ports = await pool.query(
        `SELECT pid
        FROM portfolios
        WHERE uid = $1`,
        [uid]
    );
    let uports = [];
    for (const uport of u_ports.rows) {
        uports.push(uport.pid);
    };
    if (!(uports.includes(Number(pid)))) {
        res.status(400).json({error: "Not your portfolio"});
        return;
    };

    // check if the given stock is in the database
    const symbols = await pool.query(
        `SELECT symbol
        FROM stocks`
    );
    let symbols_extracted = [];
    for (const sym of symbols.rows) {
        symbols_extracted.push(sym.symbol);
    };
    if (!(symbols_extracted.includes(symbol))) {
        res.status(400).json({error: "Invalid symbol"});
        return;
    };

    // check if user has enough cash to purchase the stock at the given quantity
    const cash = await pool.query(
        `SELECT cash
        FROM portfolios
        WHERE pid = $1`,
        [pid]
    );
    const stock_price = await pool.query(
        `SELECT curr_val
        FROM stocks
        WHERE symbol = $1`,
        [symbol]
    );
    let cash_extracted = [];
    for (const c of cash.rows) {
        cash_extracted.push(c.cash);
    };
    let price_extracted = [];
    for (const p of stock_price.rows) {
        price_extracted.push(p.curr_val);
    };
    cash_extracted = cash_extracted[0];
    price_extracted = price_extracted[0];
    const total_price = price_extracted * quantity;
    if (total_price > cash_extracted) {
        res.status(400).json({error: "Not enough cash in portfolio"});
        return;
    };
   
    const p_stocks = await pool.query(
        `SELECT symbol
        FROM in_port
        WHERE pid = $1`,
        [pid]
    );
    let pstocks = [];
    for (const sym of p_stocks.rows) {
        pstocks.push(sym.symbol);
    };
    if (pstocks.includes(symbol)) {
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