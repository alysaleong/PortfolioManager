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
        FROM request JOIN users ON request.requester = users.uid
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

})

// send a request
router.post('/requests', async (req, res) => {

}); 


export default router;
