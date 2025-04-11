import { sendRequest } from './helpers.js';

let selectedStockSymbol = null;
let stockChart = null; // Store the Chart.js instance

// Add or update a stock
document.getElementById('add-stock-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const body = Object.fromEntries(formData.entries());
    const result = await sendRequest('/stocks', 'POST', body);
    alert(result.message || result.error);
});

// Add historical stock data
document.getElementById('add-historical-stock-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const body = Object.fromEntries(formData.entries());
    const result = await sendRequest('/stocks/hist', 'POST', body);
    alert(result.message || result.error);
});

// View stock performance
document.getElementById('view-stock-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const symbol = formData.get('symbol');
    const startDate = new Date(formData.get('start-date')).toISOString(); // Convert to UTC
    const endDate = new Date(formData.get('end-date'));
    endDate.setDate(endDate.getDate() + 1); // Add one day to include the end date
    const endDateUTC = endDate.toISOString(); // Convert to UTC

    try {
        selectedStockSymbol = symbol;
        const stockDetails = await sendRequest(`/stocks/symbol/${symbol}`, 'POST', { timestamp: startDate });

        // Filter details within the specified date range
        const filteredDetails = stockDetails.filter(data => {
            const date = new Date(data.timestamp).toISOString();
            return date >= startDate && date < endDateUTC;
        });

        // Sort details by date
        const sortedDetails = filteredDetails.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        if (sortedDetails.length === 0) {
            alert('No data available for the specified time interval.');
            return;
        }

        displayStockDetails(sortedDetails);
        plotStockPerformance(sortedDetails);
    } catch (error) {
        console.error('Error fetching stock performance:', error);
        alert('Failed to fetch stock performance. Please check the stock symbol and try again.');
    }
});

// Predict stock price
document.getElementById('predict-stock-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const body = Object.fromEntries(formData.entries());
    const symbol = body.symbol;
    const timestamp = body.timestamp;

    try {
        const result = await sendRequest(`/stocks/symbol/${symbol}/future`, 'POST', { timestamp });
        alert(JSON.stringify(result));
        const sortedDetails = result.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        if (sortedDetails.length === 0) {
            alert('No prediction data available.');
            return;
        }

        displayPredictionDetails(sortedDetails);
        plotPredictionPerformance(sortedDetails, symbol);
    } catch (error) {
        console.error('Error generating prediction:', error);
        alert('Failed to generate prediction. Please check the stock symbol and try again.');
    }
});

// Display stock details in a table
function displayStockDetails(details) {
    const stockDetailsContainer = document.getElementById('stock-details-container');
    const stockDetailsDiv = document.getElementById('stock-details');

    stockDetailsDiv.innerHTML = `
        <table border="1" style="width: 100%; border-collapse: collapse; text-align: center;">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Price</th>
                </tr>
            </thead>
            <tbody>
                ${details.map(data => `
                    <tr>
                        <td>${data.timestamp.split('T')[0]}</td>
                        <td>$${parseFloat(data.price).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    stockDetailsContainer.style.display = 'block';
}

// Display predicted stock details in a table
function displayPredictionDetails(details) {
    const stockDetailsContainer = document.getElementById('stock-details-container');
    const stockDetailsDiv = document.getElementById('stock-details');

    stockDetailsDiv.innerHTML = `
        <table border="1" style="width: 100%; border-collapse: collapse; text-align: center;">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Predicted Price</th>
                </tr>
            </thead>
            <tbody>
                ${details.map(data => `
                    <tr>
                        <td>${data.timestamp.split('T')[0]}</td>
                        <td>$${parseFloat(data.price).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    stockDetailsContainer.style.display = 'block';
}

// Plot stock performance using Chart.js
function plotStockPerformance(details) {
    const canvas = document.getElementById('stock-performance-chart');
    const ctx = canvas.getContext('2d');
    const labels = details.map(data => data.timestamp.split('T')[0]);
    const prices = details.map(data => parseFloat(data.price));

    // Destroy the existing chart instance if it exists
    if (stockChart) {
        stockChart.destroy();
    }

    // Create a new Chart.js instance
    stockChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: `Stock Performance (${selectedStockSymbol})`,
                data: prices,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                x: { title: { display: true, text: 'Date' } },
                y: { title: { display: true, text: 'Price ($)' } }
            }
        }
    });
}

// Plot predicted stock performance using Chart.js
function plotPredictionPerformance(details, symbol) {
    const canvas = document.getElementById('stock-performance-chart');
    const ctx = canvas.getContext('2d');
    const labels = details.map(data => data.timestamp.split('T')[0]);
    const prices = details.map(data => parseFloat(data.price));

    // Destroy the existing chart instance if it exists
    if (stockChart) {
        stockChart.destroy();
    }

    // Create a new Chart.js instance
    stockChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: `Predicted Stock Performance (${symbol})`,
                data: prices,
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                x: { title: { display: true, text: 'Date' } },
                y: { title: { display: true, text: 'Predicted Price ($)' } }
            }
        }
    });
}
