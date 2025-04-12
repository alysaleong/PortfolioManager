// /api/reviews
import express from "express";
import { pool } from "../server.js";
import { is_stocklist_owned_by, is_stocklist_public } from "../services/stocklistServices.js";
import { is_friend, can_review } from "../services/friendsServices.js";
const router = express.Router();

// get reviews for this stocklist
//  - for public stock list, reviews can be read by anyone
//  - for private, can only be viewed by stocklist owner
router.get('/:slid', async (req, res) => {
    const uid = req.session.uid;
    const slid = req.params.slid;

    // check if they are allowed to view the reviews for this stocklist
    if (!await is_stocklist_public(slid)) {
        // check if the user is the owner of the stock list
        if (!await is_stocklist_owned_by(slid, uid)) {
            return res.status(403).json({ error: "You are not allowed to view this stock list" });
        }
    }

    // get reviews for this stocklist
    const reviews = await pool.query(
        `SELECT uid, review FROM reviews WHERE slid = $1`,
        [slid]
    );
    return res.status(200).json(reviews.rows);

});

// get reviewer's review for this stocklist
//  - for public stock list, reviews can be read by anyone
//  - for private, can only be viewed by stocklist owner or reviewer
router.get('/:slid/users/:reviewer', async (req, res) => {
    const uid = req.session.uid;
    const slid = req.params.slid;
    const reviewer = req.params.reviewer;

    // check if they are allowed to view the reviews for this stocklist
    if (!await is_stocklist_public(slid)) {
        // check if the user is the owner of the stock list or the reviewer
        if (!await is_stocklist_owned_by(slid, uid) && reviewer != uid) {
            return res.status(403).json({ error: "You are not allowed to view this stock list" });
        }
    }

    // get review
    const reviews = await pool.query(
        `SELECT uid, review FROM reviews WHERE slid = $1 AND uid = $2`,
        [slid, reviewer]
    );

    // if there is no review for this stocklist by this reviewer
    if (reviews.rows.length === 0) {
        return res.status(404).json({ error: "There is no review for this stocklist by this reviewer" });
    }
    // otherwise, return the review
    return res.status(200).json(reviews.rows[0]);
});


// invite a friend to review your stocklist
//  - check if this stocklist is owned by this user because only the owner can invite friends to review it
//  - creates a blank review 
//  - if list is private, need to check person you invite is your friend
router.post('/:slid/invite', async (req, res) => {
    const uid = req.session.uid;
    const friend = req.body.friend; 
    const slid = req.params.slid;

    if (uid == friend) {
        return res.status(400).json({ error: "You cannot invite yourself to review your stock list" });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // check if this stocklist is owned by this user
        if (!await is_stocklist_owned_by(slid, uid)) {
            return res.status(400).json({ error: "Invalid stock list id or you are not the owner of this stock list" });
        }
        // check if the stock list is private, the friend is must be a friend of this user
        if (!await is_stocklist_public(slid) && !await is_friend(uid, friend)) {
            return res.status(400).json({ error: "You can only invite friends to review your stock list" });
        }

        // create a blank review for this stocklist and reviewer
        await client.query(
            `INSERT INTO reviews (uid, slid, review) VALUES ($1, $2, '')`,
            [friend, slid]
        );
        await client.query('COMMIT');
        return res.status(200).json({ message: "Invited friend to review stock list" });
    } catch (error) {
        await client.query('ROLLBACK');
        return res.status(500).json({ error: "Error inviting friend to review stock list" });
    } finally {
        client.release();
    }
});

// create a review for a public stocklist
//  - check stocklist is public 
//  - check review is <= 4000 char
router.post('/:slid', async (req, res) => {
    const uid = req.session.uid;
    const slid = req.params.slid;
    const review = req.body.review;

    // check if this stocklist is public
    if (!await can_review(uid, slid)) {
        return res.status(400).json({ error: "Invalid stock list id or this stock list is not public" });
    }
    // check if the review is less than 4000 characters
    if (review.length > 4000) {
        return res.status(400).json({ error: "Review is too long" });
    }

    // create the review
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(
            `INSERT INTO reviews (uid, slid, review) VALUES ($1, $2, $3)`,
            [uid, slid, review]
        );

        await client.query('COMMIT');
        return res.status(200).json({ message: "Review created" });
    } catch (error) {
        await client.query('ROLLBACK');
        return res.status(500).json({ error: "Error creating review" });
    } finally {
        client.release();
    }
});

// create/edit a review for a stocklist you were invited to review
//  - check you were invited to review this
//  - or that this stock list is public
//  - review <= 4000 char
router.patch('/:slid', async (req, res) => {
    const uid = req.session.uid;
    const slid = req.params.slid; 
    const review = req.body.review || "";

    // check if you were invited to review this stocklist (i.e. there exists a review for this stocklist by this user)
    // or check if this stocklist is public
    if (!await can_review(uid, slid)) {
        return res.status(400).json({ error: "Invalid stock list id or you were not invited to review this stock list" });
    }

    // check if the review is less than 4000 characters
    if (review.length > 4000) {
        return res.status(400).json({ error: "Review is too long" });
    }
    
    // create the review
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(
            `UPDATE reviews SET review = $1 WHERE uid = $2 AND slid = $3`,
            [review, uid, slid]
        );

        if (review.length == 0) {
            return res.status(200).json({ error: "You don't have a review for this stock list" });
        }

        await client.query('COMMIT');
        return res.status(200).json({ message: "Review updated" });
    } catch (error) {
        await client.query('ROLLBACK');
        return res.status(500).json({ error: "Error updating review" });
    } finally {
        client.release();
    }

});

// delete review
//  - can be deleted by owner of stocklist or reviewer
router.delete('/:slid', async (req, res) => {
    const uid = req.session.uid; 
    const slid = req.params.slid; 
    const reviewer = req.body.reviewer || null; //  reviewer is optional, if not provided, delete the review for this user

    // if user isnt the owner or reviewer, return error
    if (uid != reviewer) {
        // check if this user is the owner of the stocklist
        if (!await can_review(uid, slid)) {
            return res.status(400).json({ error: "Invalid stock list id or you are not the owner of this stock list" });
        }
    }

    // delete the review
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(
            `DELETE FROM reviews WHERE uid = $1 AND slid = $2`,
            [reviewer || uid, slid]
        );

        await client.query('COMMIT');
        return res.status(200).json({ message: "Review deleted" });
    } catch (error) {
        await client.query('ROLLBACK');
        return res.status(500).json({ error: "Error deleting review" });
    } finally {
        client.release();
    }
})


export default router;