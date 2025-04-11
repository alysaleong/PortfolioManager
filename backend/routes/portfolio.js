import express from "express";
import { pool } from '../server.js';
import { usersPortfolio } from '../services/portfolioServices.js';
import { computeCov } from "../services/stockServices.js";

const router = express.Router();
export default router;

// create a portfolio
router.post('/', async (req, res) => {
    const uid = req.session.uid;
    const cash = req.body.cash || 0;
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
        `SELECT pid, pname, cash
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

    // get present value of portfolio
    const output = await pool.query(
        `WITH present_value AS (
            SELECT s.symbol, quantity, (p.quantity * s.curr_val) AS total_value
            FROM stocks s JOIN in_port p ON s.symbol = p.symbol
            WHERE p.pid = $1
        )
        (SELECT * FROM present_value)
        UNION
        (SELECT 'Portfolio Total' AS symbol, SUM(quantity) AS quantity, SUM(total_value) AS total_value
        FROM present_value)`,
        [pid]
    );

    // get name of portfolio
    const portfolio = await pool.query(
        `SELECT pname, cash
        FROM portfolios
        WHERE pid = $1`,
        [pid]
    );
    const pname = portfolio.rows[0].pname;
    const cash = portfolio.rows[0].cash;
    
    const result = {
        uid: uid,
        pid: pid,
        cash: cash,
        pname: pname,
        stocks: output.rows

    }

    res.status(200).json(result);
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

// get cash balance of portfolio
router.get('/:pid/cash', async (req, res) => {
    const uid = req.session.uid;
    const pid = req.params.pid;

    // check if the given portfolio belongs to user
    if (!(await usersPortfolio(uid, pid))) {
        res.status(400).json({error: "Invalid portfolio"});
        return;
    };

    const output = await pool.query(
        `SELECT cash
        FROM portfolios
        WHERE pid = $1`,
        [pid]
    );
    const cash = output.rows[0].cash;
    res.status(200).json({cash: cash});
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

// transfer cash between portfolios
router.post('/transfer', async (req, res) => {
    const uid = req.session.uid;
    const to = req.body.to;
    const from = req.body.from;
    const amount = req.body.amount;

    // check if the given portfolios belong to the user
    if (!(await usersPortfolio(uid, to)) || !(await usersPortfolio(uid, from))) {
        res.status(400).json({error: "Invalid portfolio"});
        return;
    };

    // check if amount can be deducted from "from" portfolio
    let from_cash = await pool.query(
        `SELECT cash
        FROM portfolios
        WHERE pid = $1`,
        [from]
    );
    from_cash = from_cash.rows.map(row => row.cash)[0];
    if (from_cash - amount < 0) {
        res.status(400).json({error: "Invalid amount"});
        return;
    };

    // transfer cash
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(
            `UPDATE portfolios
            SET cash = (cash - $2)
            WHERE pid = $1`,
            [from, amount]
        );

        await client.query(
            `UPDATE portfolios
            SET cash = (cash + $2)
            WHERE pid = $1`,
            [to, amount]
        );

        await client.query("COMMIT");
        res.status(200).json({message: "Cash successfully transferred"});
    } catch (error) {
        await client.query("ROLLBACK");
        res.status(500).json({error: "Transfer failed"});
    } finally {
        client.release();
    };
});

// display bought stocks
router.get('/bought/:pid', async (req, res) => {
    const uid = req.session.uid;
    const pid = req.params.pid;

    // check if the given portfolio belongs to user
    if (!(await usersPortfolio(uid, pid))) {
        res.status(400).json({error: "Invalid portfolio"});
        return;
    };

    const output = await pool.query(
        `SELECT symbol, timestamp, (quantity * unit_price) AS total_value
        FROM bought
        WHERE pid = $1`,
        [pid]
    );

    res.status(500).json(output.rows);
});

// display sold stocks
router.get('/sold/:pid', async (req, res) => {
    const uid = req.session.uid;
    const pid = req.params.pid;

    // check if the given portfolio belongs to user
    if (!(await usersPortfolio(uid, pid))) {
        res.status(400).json({error: "Invalid portfolio"});
        return;
    };

    const output = await pool.query(
        `SELECT symbol, timestamp, (quantity * unit_price) AS total_value
        FROM sold
        WHERE pid = $1`,
        [pid]
    );

    res.status(500).json(output.rows);
});

// buy stock
router.post('/buy', async (req, res) => {
    const uid = req.session.uid;
    const pid = req.body.pid;
    const symbol = req.body.symbol;
    const quantity = req.body.quantity;
    
    // check if the given portfolio belongs to user
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

// compute covariance matrix of given portfolio for the given timestamp
router.post('/cov', async (req, res) => {
    const uid = req.session.uid;
    const pid = req.body.pid;
    const start_date = req.body.start_date;
    const end_date = req.body.end_date;

    // check if the given portfolio belongs to user
    if (!(await usersPortfolio(uid, pid))) {
        res.status(400).json({error: "Invalid portfolio"});
        return;
    };

    // get list of stocks in portfolio
    let stocks = await pool.query(
        `SELECT symbol
        FROM in_port
        WHERE pid = $1`,
        [pid]
    );
    
    // check if there are any stocks in the portfolio
    if (stocks.rows.length === 0) {
        res.status(400).json({error: "Must have at least one stock in portfolio"});
        return;
    }
    stocks = stocks.rows.map(row => row.symbol);

    let cov_mat = new Array(stocks.length);
    for (let k = 0; k < cov_mat.length; k++) {
        cov_mat[k] = new Array(stocks.length);
    };

    for (let i = 0; i < stocks.length; i++) {
        for (let j = 0; j < stocks.length; j++) {
            cov_mat[i][j] = [await computeCov(stocks[i], stocks[j], start_date, end_date), stocks[i], stocks[j]];
        };
    };

    res.status(500).json(cov_mat);
});