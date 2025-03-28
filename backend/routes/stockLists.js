import express from "express";
import { pool } from "../server.js";

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

// get stock list by slid
router.get('/:slid', async (req, res) => {
    const uid = req.session.uid;
    const slid = req.params.slid;

    const stock_list = await pool.query(
        `SELECT slid, slname, public FROM stock_lists WHERE slid = $2`,
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

    res.status(200).json(stock_list.rows[0])
});

// get stock list stats 

// create stock list
router.post('/', async (req, res) => {
    const uid = req.session.uid;

});

// add stock to a particular stock list
router.post('/:slid', async (req, res) => {
    const uid = req.session.uid;
    const slid = req.params.slid;

    // get stock details from req body 
});

// mark stock list public or private 
router.patch('/:slid', async (req, res) => {
    const uid = req.session.uid;
    const slid = req.params.slid;
    const is_public = req.body.is_public; 
});

// delete stock list
router.delete('/:slid', async (req, res) => {
    const uid = req.session.uid;
    const slid = req.params.slid;
});


export default router;