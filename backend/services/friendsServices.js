import { pool } from '../server.js';

// are uid and friend friends?
export async function is_friend(uid, friend) {
    const friendship = await pool.query(
        `SELECT * FROM friends WHERE (u1 = $1 AND u2 = $2) OR (u1 = $2 and u2 = $1)`,
        [uid, friend]
    );
    return friendship.rows.length > 0;
}

// was uid invited to the stocklist slid?
export async function can_review(uid, slid) {
    // get visibility of the stocklist
    const stocklist = await pool.query(
        `SELECT public FROM stock_lists WHERE slid = $1`,
        [slid]
    );
    // if the stocklist does not exist, return false
    if (stocklist.rows.length === 0) return false;
    const is_public = stocklist.rows[0].public;

    // if the stocklist is public, return true
    if (is_public) return true;

    // check if the friend is reviewing the stocklist
    const is_reviewing = await pool.query(
        `SELECT * FROM reviews WHERE uid = $1 AND slid = $2`,
        [uid, slid]
    );
    return is_reviewing.rows.length > 0;
}