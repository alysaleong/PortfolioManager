import express from "express";
import { pool } from '../server.js'
import { formatDate, isValidDate } from "../services/stockServices.js";

const router = express.Router();
export default router;

// input current stock information for a new or already existing stock
router.post('/', async (req, res) => {
    const symbol = req.body.symbol;
    const curr_val = req.body.curr_val;

    if (!(1 <= symbol.length && symbol.length <= 5)) {
        res.status(400).json({error: "Symbol must be within one to five characters"});
        return;
    }

    if (curr_val < 0) {
        res.status(400).json({error: "Price must be greater than $0"});
        return;
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const stocks = await client.query(
            `SELECT symbol
            FROM stocks
            WHERE symbol = $1`,
            [symbol]
        );

        let insert = true;
        if (stocks.rows.length === 0) {
            await client.query(
                `INSERT INTO stocks(symbol, curr_val) 
                VALUES ($1, $2)`,
                [symbol, curr_val]
            );
        } else {
            await client.query(
                `UPDATE stocks
                SET curr_val = $1
                WHERE symbol = $2`,
                [curr_val, symbol]
            );
            insert = false;
        };

        await client.query("COMMIT");
        if (insert) {
            res.status(200).json({message: "Stock inserted"});
        } else {
            res.status(200).json({message: "Stock updated"});
        };
        
    } catch (error) {
        await client.query("ROLLBACK");
        res.status(500).json({error: "Insert failed"});
    } finally {
        client.release();
    };
});

// input historical stock information for a new or already existing stock
router.post('/hist', async (req, res) => {
    const symbol = req.body.symbol;
    const timestamp = req.body.timestamp;
    const open = req.body.open;
    const high = req.body.high;
    const low = req.body.low;
    const close = req.body.close;
    const volume = req.body.volume;

    if (!(1 <= symbol.length && symbol.length <= 5)) {
        res.status(400).json({error: "Symbol must be within one to five characters"});
        return;
    };

    if (open < 0 || high < 0 || low < 0 || close < 0) {
        res.status(400).json({error: "Price must be greater than $0"});
        return;
    };
    
    if (volume < 0) {
        res.status(400).json({error: "Volume must be greater than 0"});
        return;
    };

    if (high < low) {
        res.status(400).json({error: "High must be greater than low"});
        return;
    };
    
    if (!(isValidDate(timestamp))) {
        res.status(400).json({error: "Timestamp must be in the form YYYY-MM-DD"});
        return;
    };
    
    const today = formatDate();
    if (timestamp === today) {
        res.status(400).json({error: "Timestamp cannot be today's date"});
        return;
    };

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // check if the given symbol and timestamp is in hist_stock_data
        const stocks = await client.query(
            `SELECT symbol
            FROM hist_stock_data
            WHERE symbol = $1 AND timestamp = $2`,
            [symbol, timestamp]
        );

        if (!(stocks.rows.length === 0)) {
            await client.query('ROLLBACK');
            res.status(400).json({error: "Cannot alter historical data"});
            return;
        } else {
            await client.query(
                `INSERT INTO hist_stock_data 
                VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [symbol, timestamp, open, high, low, close, volume]
            );
        };

        await client.query("COMMIT");
        res.status(200).json({message: "Data inserted"});  
    } catch (error) {
        await client.query("ROLLBACK");
        res.status(500).json({error: "Insert failed"});
    } finally {
        client.release();
    };
});

// display stock information for a given stock (combines historical and current data) from given time interval
router.post('/:symbol', async (req, res) => {
    const symbol = req.params.symbol;
    const interval = req.body.interval;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(
            `CREATE VIEW stock_data AS (
                (SELECT NOW() AS timestamp, curr_val AS price 
                FROM stocks 
                WHERE symbol = ${symbol}) 
                UNION 
                (SELECT timestamp, close AS price 
                FROM hist_stock_data 
                WHERE symbol = ${symbol})
            )`
        );
    
        const output = await client.query(
            `SELECT *
            FROM stock_data
            WHERE timestamp >= $1`,
            [interval]
        );
    
        await client.query(
            `DROP VIEW stock_data`
        );

        await client.query("COMMIT");
        res.status(200).json(output.rows);
    } catch (error) {
        await client.query("ROLLBACK");
        res.status(500).json({error: "Display failed"});
    } finally {
        client.release();
    };
});

// compute COV of the given stock for the given time interval
router.post('/:symbol/cov', async (req, res) => {
    const symbol = req.params.symbol;
    const start_date = req.body.start_date;
    const end_date = req.body.end_date;

    // check if stock is in historical records
    const stocks = await pool.query(
        `SELECT symbol
        FROM hist_stock_data
        WHERE symbol = $1`,
        [symbol]
    );
    if (stocks.rows.length === 0) {
        res.status(400).json({error: "Invalid stock"});
        return;
    };
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // check if requested data is cached
        const request = await client.query(
            `SELECT cov
            FROM cov_cache
            WHERE symbol = $1 AND start_date = $2 AND end_date = $3`,
            [symbol, start_date, end_date]
        );

        let output = {};
        let cached = true;
        if (request.rows.length === 0) {
            cached = false;
            let cov = await client.query(
                `SELECT stddev_samp(close) / avg(close) AS cov
                FROM hist_stock_data
                WHERE symbol = $1 AND timestamp >= $2 AND timestamp <= $3
                GROUP BY symbol`,
                [symbol, start_date, end_date]
            );
            cov = cov.rows.map(row => row.cov)[0];

            if (cov == null) {
                cov = "No data available";
                output = [{"cov": cov}];
            } else {
                output = [{"cov": cov}];

                await client.query(
                    `INSERT INTO cov_cache (symbol, cov, start_date, end_date) VALUES ($1, $2, $3, $4)`,
                    [symbol, cov, start_date, end_date]
                );
            };
        };

        await client.query("COMMIT");
        if (cached) {
            res.status(200).json(request.rows);
        } else {
            res.status(200).json(output);
        }; 
    } catch (error) {
        await client.query("ROLLBACK");
        res.status(500).json({error: "Calculation failed"});
    } finally {
        client.release();
    };
});

// compute the Beta coeffecient of the given stock for the given time interval

// const client = await pool.connect();
// try {
//     await client.query('BEGIN');

//     await client.query("COMMIT");
//     res.status(200).json({message: ``});
// } catch (error) {
//     await client.query("ROLLBACK");
//     res.status(500).json({error: "Insert failed"});
// } finally {
//     client.release();
// };