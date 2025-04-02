import { pool } from '../server.js'

export { usersPortfolio }

// check if the given portfolio belongs to user
async function usersPortfolio(uid, pid) {
    let u_ports = await pool.query(
        `SELECT pid
        FROM portfolios
        WHERE uid = $1`,
        [uid]
    );
    u_ports = u_ports.rows.map(row => row.pid);
    return u_ports.includes(Number(pid));
}
