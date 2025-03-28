import { pool } from '../server.js';

export async function stocklist_owned_by(slid, uid) {
    const stock_list = await pool.query(
        `SELECT * FROM stock_lists WHERE slid = $1`,
        [slid]
    );

    return stock_list.rows.length > 0 && stock_list.rows[0].uid == uid;
}