import { pool } from '../server.js'

export { formatDate, isValidDate, computeCov }

// reformat today's date
function formatDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Ensure 2-digit month
    const day = String(today.getDate()).padStart(2, '0'); // Ensure 2-digit day

    return `${year}-${month}-${day}`; // Format: YYYY-MM-DD
};

// check if timestamp is valid date
function isValidDate(dateStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false; // Format check
    
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
  
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
};

// compute the covariance of the given stocks for the given time interval
async function computeCov(symbol1, symbol2, start_date, end_date) {
  // check if stocks are in historical records
    if (symbol1 == symbol2) {
        const stocks = await pool.query(
          `SELECT symbol
          FROM hist_stock_data
          WHERE symbol = $1`,
          [symbol1]
        );
        if (stocks.rows.length === 2) {
          return null;
        };
    } else {
        const stocks = await pool.query(
          `SELECT symbol
          FROM hist_stock_data
          WHERE symbol IN ($1, $2)
          GROUP BY symbol`,
          [symbol1, symbol2]
        );
        if (stocks.rows.length < 2) {
            return null;
        };
    };
    

    let cov = null;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // check if requested data is cached
        const request = await client.query(
            `SELECT cov
            FROM cov_mat_cache
            WHERE ((symbol1 = $1 AND symbol2 = $4) OR (symbol1 = $4 AND symbol2 = $1)) AND start_date = $2 AND end_date = $3`,
            [symbol1, start_date, end_date, symbol2]
        );

        if (request.rows.length === 0) {
            if (symbol1 == symbol2) {
                cov = await client.query(
                  `SELECT var_samp(close) AS cov
                  FROM hist_stock_data
                  WHERE symbol = $1 AND timestamp >= $2 AND timestamp <= $3`,
                  [symbol1, start_date, end_date]
                );
            } else {
                cov = await client.query(
                  `SELECT covar_samp(sym1.close, sym2.close) AS cov
                  FROM hist_stock_data sym1, hist_stock_data sym2
                  WHERE sym1.symbol = $1 AND sym1.timestamp >= $2 AND sym1.timestamp <= $3
                  AND sym2.symbol = $4 AND sym2.timestamp >= $2 AND sym2.timestamp <= $3`,
                  [symbol1, start_date, end_date, symbol2]
                );
            }
            
            cov = cov.rows.map(row => row.cov)[0];

            await client.query(
              `INSERT INTO cov_mat_cache (symbol1, symbol2, cov, start_date, end_date) VALUES ($1, $5, $2, $3, $4)`,
              [symbol1, cov, start_date, end_date, symbol2]
            );
        } else {
            cov = request.rows.map(row => row.cov)[0];
        };

        await client.query("COMMIT");
        } catch (error) {
            await client.query("ROLLBACK");
            client.release();
            return null;
        } 

        client.release();
        return Number(cov);
};
