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

// remove friend 
router.delete('/', async (req, res) => {
    const uid = 2 //req.session.uid;
    const friend = req.body.friend;

    // delete the friendship
    const friendship = await pool.query(
        `DELETE FROM friends 
        WHERE (u1 = $1 AND u2 = $2) OR (u1 = $2 and u1 = $1) RETURNING *`,
        [uid, friend]
    );
    // if they weren't your friend 
    if (friendship.rows.length === 0) {
        return res.status(400).json({ error: "You are not friends with this user" });
    }

    // create a rejected request entry from friend to you 
    // so they can't send you another request for another 5 min
    await pool.query(
        `INSERT INTO requested (requester, requestee, rejected_at)
        VALUES ($1, $2, timezone('utc', now()))`,
        [friend, uid]
    )
    res.status(200).json({ message: "Friend successfully removed"});
});


// INCOMING REQUESTS
// get my incoming requests 
router.get('/requests/incoming', async (req, res) => {
    const uid = req.session.uid;
    let incoming = [];
    
    // get all the requesters for which I am the requestee
    const requesters = await pool.query(
        `SELECT requester, email
        FROM requested JOIN users ON requested.requester = users.uid
        WHERE requestee = $1 AND rejected_at IS NULL`,
        [uid]
    );
    
    incoming = requesters.rows;

    res.status(200).json(incoming);
});

// accept request
router.post('/requests/accept', async (req, res) => {
    const requester = req.body.requester;
    const uid = req.session.uid;

    // if the friend request exist, create a friendship and delete the request
    const result = await pool.query(
        `DELETE FROM requested WHERE requester = $1 AND requestee = $2 RETURNING *`,
        [requester, uid]
    );
    
    // if the friend request was not found
    if (result.rows.length === 0) {
        return res.status(400).json({ error: "No such friend request" });
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
    const requester = req.body.requester;
    const uid = req.session.uid;
    console.log(requester, uid);

    // if the friend request exists, set the rejected_at timestamp to now
    const result = await pool.query(
        `UPDATE requested SET rejected_at = timezone('utc', now())
        WHERE requester = $1 AND requestee = $2 RETURNING *`,
        [requester, uid]
    );
    console.log(result);

    // if the friend request was not found
    if (result.rows.length === 0) {
        return res.status(400).json({ error: "No such friend request" });
    }
    
    // send the response
    res.status(200).json({ message: "Friend request rejected" });
});


// OUTGOING REQUESTS 
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
    const uid = 4// req.session.uid;
    const requestee = 2//req.body.requestee;

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
    // check if you requested them
    const you_requested = await pool.query(
        `SELECT * FROM requested 
        WHERE (requester = $1 AND requestee = $2)`,
        [uid, requestee]
    );
    if (you_requested.rows.length > 0) {
        const request = you_requested.rows[0];
        const rejected_at = request.rejected_at;
        const now = new Date();
        const five_minutes = 5 * 60 * 1000; // 5 minutes in milliseconds

        // if the request was rejected, check when it was rejected        
        if (rejected_at) {
            // if it was rejected less than 5 minutes ago, don't allow to send another request
            if (now.getTime() - rejected_at.getTime() < five_minutes) {
                return res.status(400).json({error: "You can't send another request yet (wait 5 minutes)" });
            }
            // if it was rejected more than 5 minutes ago, update rejected_at to null
            await pool.query(
                `UPDATE requested SET rejected_at = null 
                WHERE requester = $1 AND requestee = $2`,
                [uid, requestee]
            );
            return res.status(200).json({ message: "Friend request sent" });
        } 
        else {
            return res.status(400).json({error: "You already sent a request" });
        }
    }
    // check if they requested you
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
