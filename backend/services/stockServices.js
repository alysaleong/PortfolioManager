import { pool } from '../server.js'

export { formatDate, isValidDate }

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
