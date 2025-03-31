// api/stocklists
import express from "express";
import { pool } from "../server.js";
import { stocklist_owned_by } from "../services/stocklistServices.js";

const router = express.Router();

// get all stock lists
router.get('/', async (req, res) => {
    const uid = req.session.uid;

    const stock_lists = await pool.query(
        `SELECT slid, slname, public FROM stock_lists WHERE uid = $1`,
        [uid]
    );
    
    res.status(200).json(stock_lists.rows);
});

// get stock list by slid and include stocks in it
router.get('/:slid', async (req, res) => {
    const uid = req.session.uid;
    const slid = req.params.slid;

    const stock_list = await pool.query(
        `SELECT slid, slname, public, uid FROM stock_lists WHERE slid = $1`,
        [slid]
    );
    
    // if there is stock list with that id
    if (stock_list.rows.length === 0) {
        return res.status(400).json({ error: "There is no stock list with this id" });
    }

    // if this stock list doesn't belong to the user 
    if (stock_list.rows[0].uid != uid) {
        return res.status(400).json({ error: "This stock list doesn't belong to you" });
    }

    // get stocks with their current price in this stock list
    const stocks = await pool.query(
        `SELECT in_list.symbol, quantity, curr_val, curr_val * quantity AS total_value
        FROM in_list JOIN stocks ON in_list.symbol = stocks.symbol
        WHERE slid = $1`,
        [slid]
    );

    // if there are no stocks in this stock list
    if (stocks.rows.length === 0) {
        return res.status(200).json({ ...stock_list.rows[0], stocks: [] });
    }
    // if there are stocks in this stock list
    const stock_list_with_stocks = {
        ...stock_list.rows[0],
        stocks: stocks.rows
    };

    res.status(200).json(stock_list_with_stocks);
});

// TODO: get stock list stats

// create stock list
router.post('/', async (req, res) => {
    const uid = req.session.uid;
    const slname = req.body.slname || "My Stock List"; // default name if not provided
    const is_public = req.body.is_public || false; // default to private if not provided

    console.log("Creating stock list", slname, is_public);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // create stock list
        await client.query(
            `INSERT INTO stock_lists (uid, slname, public) VALUES ($1, $2, $3)`,
            [uid, slname, is_public]
        );
        
        client.query('COMMIT');
        res.status(200).json({ message: "Stock list created" });
    } catch (error) {
        client.query('ROLLBACK');
        res.status(500).json({ error: "Failed to create stock list, " + error });
    } finally {
        client.release();
    }
});

// add stock to a particular stock list
router.post('/:slid/stocks', async (req, res) => {
    const uid = req.session.uid;
    const slid = req.params.slid;
    const symbol = req.body.symbol;
    const quantity = req.body.quantity || 0; // default to 0 if not provided

    if (quantity <= 0) {
        return res.status(400).json({ error: "Quantity must be greater than 0" });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // check if this portfolio belongs to this user
        if (!await stocklist_owned_by(slid, uid)) {
            return res.status(400).json({ error: "Invalid stock list id or you are not the owner of this stock list"});
        }

        // check if this stock exists in stocks table
        const stock = await client.query(
            `SELECT * FROM stocks WHERE symbol = $1`,
            [symbol]
        );
        if (stock.rows.length === 0) {
            return res.status(400).json({ error: "This stock does not exist" });
        }

        // if this stock is already in_list, update quantity
        const stock_in_list = await client.query(
            `SELECT * FROM in_list WHERE symbol = $1 AND slid = $2`,
            [symbol, slid]
        );
        if (stock_in_list.rows.length > 0) {
            await client.query(
                `UPDATE in_list SET quantity = quantity + $1 WHERE symbol = $2 AND slid = $3`,
                [quantity, symbol, slid]
            );
            await client.query('COMMIT');
            return res.status(200).json({ message: "Updated stock quantity" });   
        }
        // otherwise add it to in_list
        await client.query(
            `INSERT INTO in_list (symbol, slid, quantity) VALUES ($1, $2, $3)`,
            [symbol, slid, quantity]
        );

        await client.query('COMMIT');
        res.status(200).json({ message: "Added stock to stock list" });
    } catch (error) {   
        await client.query('ROLLBACK');
    } finally {
        client.release();
    } 
});

// remove (some quantity of) stock from a particular stock list
router.delete('/:slid/stocks', async (req, res) => {
    const uid = req.session.uid;
    const slid = req.params.slid;
    const symbol = req.body.symbol;
    const quantity_to_remove = req.body.quantity || null;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // check if this portfolio belongs to this user
        if (!await stocklist_owned_by(slid, uid)) {
            return res.status(400).json({ error: "Invalid stock list id or you are not the owner of this stock list" });
        }

        // get how many of this stock they have in this stock list
        const stock_in_list = await client.query(
            `SELECT * FROM in_list WHERE symbol = $1 AND slid = $2`,
            [symbol, slid]
        );
        console.log("Stock in list", stock_in_list.rows);
        console.log(slid, symbol)
        // if this stock is not in the list, return error
        if (stock_in_list.rows.length === 0) {
            return res.status(400).json({ error: "This stock is not in your stock list" });
        }
        const stock_quantity = stock_in_list.rows[0].quantity;    

        // if we are removing all of this stock, remove it from in_list
        if (quantity_to_remove === null || quantity_to_remove >= stock_quantity) {
            await client.query(
                `DELETE FROM in_list WHERE symbol = $1 AND slid = $2`,
                [symbol, slid]
            );
            await client.query('COMMIT');
            return res.status(200).json({ message: "Removed stock from stock list" });
        }
        // otherwise, update quantity
        await client.query(
            `UPDATE in_list SET quantity = quantity - $1 WHERE symbol = $2 AND slid = $3`,
            [quantity_to_remove, symbol, slid]
        );
        // if quantity is 0 or less, remove stock from in_list
        await client.query('COMMIT');
        return res.status(200).json({ message: "Updated stock quantity" });   
    } catch (error) {   
        await client.query('ROLLBACK');
        res.status(500).json({ error: "Failed to remove stock from stock list" });
    } finally {
        client.release();
    } 
});

// mark stock list public or private 
router.patch('/:slid', async (req, res) => {
    const uid = req.session.uid;
    const slid = req.params.slid;
    const is_public = req.body.is_public; 

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // update entry with new public status
        const result = await client.query(
            `UPDATE stock_lists SET public = $1 WHERE slid = $2 AND uid = $3 RETURNING *`,
            [is_public, slid, uid]
        );

        // if nothing updated, slid wrong or user doesn't own that stock list
        if (result.rows.length === 0) {
            return res.status(400).json({ error: "Invalid stock list id or you are not the owner of this stock list"});
        }

        await client.query('COMMIT')
        res.status(200).json({ message: `Stock list set to ${is_public ? "public" : "private"}` });
    } catch {
        client.query('ROLLBACK');
        res.status(500).json({ error: "Failed to update stock list" });
    } finally {
        client.release();
    }
});

// delete stock list
router.delete('/:slid', async (req, res) => {
    const uid = req.session.uid;
    const slid = req.params.slid;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // delete stock list
        const result = await client.query(
            `DELETE FROM stock_lists WHERE slid = $1 AND uid = $2 RETURNING *`,
            [slid, uid]
        );

        // if nothing deleted, slid wrong or user doesn't own that stock list
        if (result.rows.length === 0) {
            return res.status(400).json({ error: "Invalid stock list id or you are not the owner of this stock list"});
        }

        await client.query('COMMIT')
        res.status(200).json({ message: "Stock list deleted" });
    } catch (error) {
        client.query('ROLLBACK');
        res.status(500).json({ error: "Failed to delete stock list" });
    } finally {
        client.release();
    }
});


export default router;