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
    const startDate = formData.get('start-date');
    const endDate = formData.get('end-date');

    try {
        selectedStockSymbol = symbol;
        const stockDetails = await sendRequest(`/stocks/symbol/${symbol}`, 'POST', { timestamp: startDate });

        // Filter details within the specified date range
        const filteredDetails = stockDetails.filter(data => {
            const date = new Date(data.timestamp);
            return date >= new Date(startDate) && date <= new Date(endDate);
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
        alert(result.message || 'Prediction failed');
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

    console.log(labels[-1], prices[-1]);

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
