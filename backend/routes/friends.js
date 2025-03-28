import express from 'express';
import { pool } from '../server.js';

const router = express.Router();

// FRIENDS 
// get my friends
router.get('/', async (req, res) => {
    const uid = req.session.uid;
    let friends = [];

    // get all u2 where u1=uid
    const u2 = await pool.query(
        `SELECT u2, email 
        FROM friends JOIN users ON friends.u2 = users.uid
        WHERE u1 = $1`,
        [uid]
    );

    // get all u1 where u2=uid
    const u1 = await pool.query(
        `SELECT u1, email 
        FROM friends JOIN users ON friends.u1 = users.uid
        WHERE u2 = $1`,
        [uid]
    );

    // combine them to get the friends list 
    friends = friends.concat(u1.rows);
    friends = friends.concat(u2.rows);

    res.status(200).json(friends);
});

// INCOMING REQUEST
// get my incoming requests 
router.get('/requests/incoming', async (req, res) => {
    const uid = req.session.uid;
    let incoming = [];
    
    // get all the requesters for which I am the requestee
    const requesters = await pool.query(
        `SELECT requester, email
        FROM requested JOIN users ON requested.requester = users.uid
        WHERE requestee = $1`,
        uid
    );
    
    incoming = requesters.rows;

    res.status(200).json(incoming);
});

// accept request
router.post('/requests/accept', async (req, res) => {
    const requester = req.body.requestor;
    const uid = req.session.uid;

    // if the friend request exist, create a friendship and delete the request
    const result = await pool.query(
        `DELETE FROM requested WHERE requester = $1 AND requestee = $2 RETURNING *`,
        [requester, uid]
    );
    
    // if the friend request was not found
    if (result.rows.length === 0) {
        res.status(400).json({ error: "No such friend request" });
        return;
    }

    // create a friendship
    await pool.query(
        `INSERT INTO friends (u1, u2) VALUES ($1, $2)`,
        [requester, uid]
    );

    // send the response
    res.status(200).json({ message: "Friend request accepted" });
});

// reject request
router.post('/requests/reject', async (req, res) => {
    const requester = req.body.requestor;
    const uid = req.session.uid;

    // if the friend request exists, set the rejected_at timestamp to now
    const result = await pool.query(
        `UPDATE requested SET rejected_at = NOW()
        WHERE requester = $1 AND requestee = $2 RETURNING *`,
        [requester, uid]
    );

    // if the friend request was not found
    if (result.rows.length === 0) {
        res.status(400).json({ error: "No such friend request" });
        return;
    }
    
    // send the response
    res.status(200).json({ message: "Friend request rejected" });
});


// OUTGOING REQUEST 
// get my outgoing requests 
router.get('/requests/outgoing', async (req, res) => {
    const uid = req.session.uid; 
    let outgoing = [];

    // get all requestee for which I am the requester
    const requestees = await pool.query(
        `SELECT requestee, email 
        FROM requested JOIN users ON requested.requestee = users.uid
        WHERE requester = $1`,
        [uid]
    );

    outgoing = requestees.rows;

    res.status(200).json(outgoing);
})

// send a request
router.post('/requests', async (req, res) => {
    const uid = req.session.uid;
    const requestee = req.body.requestee;

    // make sure the requestee is not the same as the requester
    if (uid === requestee) {
        return res.status(400).json({error: "You can't send a request to yourself" });
    }

    // make sure they aren't already friends
    const are_friends = await pool.query(
        `SELECT * FROM friends 
        WHERE (u1 = $1 AND u2 = $2) OR (u1 = $2 AND u2 = $1)`,
        [uid, requestee]
    );
    if (are_friends.rows.length > 0) {
        return res.status(400).json({error: "You are already friends" });
    }

    // make sure there isn't already a request between these two
    const you_requested = await pool.query(
        `SELECT * FROM requested 
        WHERE (requester = $1 AND requestee = $2)`,
        [uid, requestee]
    );
    if (you_requested.rows.length > 0) {
        return res.status(400).json({error: "You already sent a request" });
    }

    const they_requested = await pool.query(
        `SELECT * FROM requested 
        WHERE (requester = $1 AND requestee = $2)`,
        [requestee, uid]
    );
    if (they_requested.rows.length > 0) {
        return res.status(400).json({error: "They already sent you a request" });
    }

    // create the request
    await pool.query(
        `INSERT INTO requested (requester, requestee) VALUES ($1, $2)`,
        [uid, requestee]
    );

    res.status(200).json({ message: "Friend request sent" });
}); 


export default router;
