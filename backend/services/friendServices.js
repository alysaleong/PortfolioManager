import { pool } from '../server.js';

// are uid and friend friends?
export async function is_friend(uid, friend) {
    const friendship = await pool.query(
        `SELECT * FROM friends WHERE (u1 = $1 AND u2 = $2) OR (u1 = $2 and u2 = $1)`,
        [uid, friend]
    );
    return friendship.rows.length > 0;
}