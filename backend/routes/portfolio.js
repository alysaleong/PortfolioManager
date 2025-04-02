import express from "express";
import { pool } from '../server.js'
import { usersPortfolio } from '../services/portfolioServices.js'

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
    res.status(200).json({message: "Portfolio created"});
});

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
    if (!(await usersPortfolio(uid, pid))) {
        res.status(400).json({error: "Invalid portfolio"});
        return;
    };
    
    const output = await pool.query(
        `SELECT stocks.symbol, quantity, quantity * curr_val AS total_value
        FROM in_port JOIN stocks ON in_port.symbol = stocks.symbol
        WHERE pid = $1`,
        [pid]
    );
    res.status(200).json(output.rows);
});

// deposit money into cash account
router.post('/deposit', async (req, res) => {
    const uid = req.session.uid;
    const pid = req.body.pid;
    const deposit = req.body.deposit;

    // check if the given portfolio belongs to user
    if (!(await usersPortfolio(uid, pid))) {
        res.status(400).json({error: "Invalid portfolio"});
        return;
    };

    if (deposit < 0) {
        res.status(400).json({error: "Deposit must be greater than $0"});
    };

    // deposit money
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(
            `UPDATE portfolios
            SET cash = cash + $1
            WHERE uid = $2 AND pid = $3`,
            [deposit, uid, pid]
        );
        
        await client.query("COMMIT");
        res.status(200).json({message: `\$${deposit} deposited`});
    } catch (error) {
        await client.query("ROLLBACK");
        res.status(500).json({error: "Deposit failed"});
    } finally {
        client.release();
    };
});

// withdraw money out of cash account
router.post('/withdraw', async (req, res) => {
    const uid = req.session.uid;
    const pid = req.body.pid;
    const withdrawal = req.body.withdrawal;

    // check if the given portfolio belongs to user
    if (!(await usersPortfolio(uid, pid))) {
        res.status(400).json({error: "Invalid portfolio"});
        return;
    };

    // check if withdrawal amount is a valid input
    let cash = await pool.query(
        `SELECT cash
        FROM portfolios
        WHERE pid = $1`,
        [pid]
    );
    cash = cash.rows.map(row => row.cash)[0];
    
    if (withdrawal < 0 || withdrawal > cash) {
        res.status(400).json({error: "Invalid input"});
    };

    // withdraw money
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(
            `UPDATE portfolios
            SET cash = cash - $1
            WHERE uid = $2 AND pid = $3`,
            [withdrawal, uid, pid]
        );
        
        await client.query("COMMIT");
        res.status(200).json({message: `\$${withdrawal} withdrew`});
    } catch (error) {
        await client.query("ROLLBACK");
        res.status(500).json({error: "Withdrawal failed"});
    } finally {
        client.release();
    };
});

// buy stock
router.post('/buy', async (req, res) => {
    const uid = req.session.uid;
    const pid = req.body.pid;
    const symbol = req.body.symbol;
    const quantity = req.body.quantity;
    console.log(pid);
    
    // check if the given portfolio belongs to user
    const poo = await usersPortfolio(uid, pid);
    console.log(poo);
    if (!(await usersPortfolio(uid, pid))) {
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
    cash = cash.rows.map(row => row.cash)[0];
    stock_price = stock_price.rows.map(row => row.curr_val)[0];
    
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
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        if (p_stocks.includes(symbol)) {
            // buy more of stock (if user already owns that stock)
            await client.query(
               `UPDATE in_port
               SET quantity = quantity + $1
               WHERE symbol = $2`,
               [quantity, symbol]
            );
        } else {
            // buy stock
            await client.query(
                `INSERT INTO in_port (symbol, pid, quantity)
                VALUES ($1, $2, $3)`,
                [symbol, pid, quantity]
            );
        };

        // update cash
        await client.query(
            `UPDATE portfolios
            SET cash = cash - $1
            WHERE pid = $2`,
            [total_price, pid]
        );

        // update bought table
        await client.query(
            `INSERT INTO bought (pid, symbol, quantity, unit_price)
            VALUES ($1, $2, $3, $4)`,
            [pid, symbol, quantity, stock_price]
        );

        await client.query("COMMIT");
        res.status(200).json({message: `${symbol} purchased for \$${total_price}`});
    } catch (error) {
        await client.query("ROLLBACK");
        res.status(500).json({error: "Purchase failed"});
    } finally {
        client.release();
    };
});

// sell stock
router.post('/sell', async (req, res) => {
    const uid = req.session.uid;
    const pid = req.body.pid;
    const symbol = req.body.symbol;
    const quantity = req.body.quantity;

    // check if the given portfolio belongs to user
    if (!(await usersPortfolio(uid, pid))) {
        res.status(400).json({error: "Invalid portfolio"});
        return;
    };

    // check if the given stock is in the portfolio
    let symbols = await pool.query(
        `SELECT symbol
        FROM in_port
        WHERE pid = $1`,
        [pid]
    );
    symbols = symbols.rows.map(row => row.symbol);
    if (!(symbols.includes(symbol))) {
        res.status(400).json({error: "Stock not in portfolio"});
        return;
    };

    // check if user has enough stock to sell
    let quant = await pool.query(
        `SELECT quantity
        FROM in_port
        WHERE pid = $1 AND symbol = $2`,
        [pid, symbol]
    );
    quant = quant.rows.map(row => row.quantity)[0];
    if (quant < quantity) {
        res.status(400).json({error: "Selling more stocks than owned"});
        return;
    };

    const client  = await pool.connect();
    try {
        await client.query('BEGIN');

        // update quantity
        await client.query(
            `UPDATE in_port
            SET quantity = quantity - $1
            WHERE pid = $2 AND symbol = $3`,
            [quantity, pid, symbol]
        );

        // update cash
        let stock_price = await client.query(
            `SELECT curr_val
            FROM stocks
            WHERE symbol = $1`,
            [symbol]
        );
        stock_price = stock_price.rows.map(row => row.curr_val)[0];
        const total = stock_price * quantity;
        await client.query(
            `UPDATE portfolios
            SET cash = cash + $1
            WHERE pid = $2`,
            [total, pid]
        );

        // update sold table
        await client.query(
            `INSERT INTO sold (pid, symbol, quantity, unit_price)
            VALUES ($1, $2, $3, $4)`,
            [pid, symbol, quantity, stock_price]
        );

        await client.query("COMMIT");
        res.status(200).json({message: `${symbol} sold for \$${total}`});
    } catch (error) {
        await client.query("ROLLBACK");
        res.status(500).json({error: "Sell failed"});
    } finally {
        client.release();
    }
});

// const client = await pool.connect();
//     try {
//         await client.query('BEGIN');

//         await client.query("COMMIT");
//         res.status(200).json({message: ``});
//     } catch (error) {
//         await client.query("ROLLBACK");
//         res.status(500).json({error: "Insert failed"});
//     } finally {
//         client.release();
//     };