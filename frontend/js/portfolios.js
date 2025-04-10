import { sendRequest } from './helpers.js';

let selectedPortfolioId = null;

// Load all portfolios
export async function loadPortfolios() {
    const portfoliosContainer = document.getElementById('portfolios-container');
    portfoliosContainer.innerHTML = '<h3>Your Portfolios</h3>'; // Clear the list before populating
    const portfolios = await sendRequest('/portfolios');
    portfolios.forEach(portfolio => {
        const portfolioEl = document.createElement('div');
        portfolioEl.classList.add('portfolio-item');
        portfolioEl.setAttribute('data-pid', portfolio.pid);
        portfolioEl.innerHTML = `
            <button class="portfolio-name">${portfolio.pid}: ${portfolio.pname}</button>
            <div class="portfolio-cash">Cash: $${portfolio.cash}</div>
        `;
        portfoliosContainer.appendChild(portfolioEl);
    });

    // Add event listeners to portfolio items
    const portfolioItems = document.querySelectorAll('.portfolio-item');
    portfolioItems.forEach(item => {
        item.addEventListener('click', async () => {
            const pid = item.getAttribute('data-pid');
            await selectPortfolio(pid); // Load the selected portfolio's details
        });
    });

    // Automatically select the first portfolio if none is selected
    if (!selectedPortfolioId && portfolios.length > 0) {
        await selectPortfolio(portfolios[0].pid);
    }
}

// Select a portfolio and load its details
async function selectPortfolio(pid) {
    selectedPortfolioId = pid;
    const portfolioDetails = await sendRequest(`/portfolios/${pid}`);
    const portfolioDetailsContainer = document.getElementById('portfolio-details');
    const portfolioStocksContainer = document.getElementById('portfolio-stocks-container');
    const addStockForm = document.getElementById('add-stock-to-portfolio-form');

    // Display portfolio details
    portfolioDetailsContainer.style.display = 'block';
    portfolioDetailsContainer.innerHTML = `
        <h3>${portfolioDetails.pname}</h3>
        <div>Cash: $${portfolioDetails.cash}</div>
    `;

    // Display stocks in the portfolio
    portfolioStocksContainer.style.display = 'block';
    portfolioStocksContainer.innerHTML = `<h3>Stocks in ${portfolioDetails.pname}</h3>`;
    portfolioDetails.stocks.forEach(stock => {
        const stockEl = document.createElement('div');
        stockEl.classList.add('stock-item');
        stockEl.innerHTML = `
            <div class="stock-symbol">${stock.symbol}</div>
            <div class="stock-quantity">Quantity: ${stock.quantity}</div>
            <div class="stock-value">Value: $${stock.total_value}</div>
            <button class="remove-stock-button" data-symbol="${stock.symbol}">Remove</button>
        `;
        portfolioStocksContainer.appendChild(stockEl);
    });

    // Add event listeners to remove stock buttons
    const removeButtons = document.querySelectorAll('.remove-stock-button');
    removeButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            const symbol = e.target.dataset.symbol;
            const result = await sendRequest(`/portfolios/${pid}/stocks`, 'DELETE', { symbol });
            alert(JSON.stringify(result.message || result.error));
            await selectPortfolio(pid); // Reload selected portfolio
        });
    });

    // Show the add stock form with both "Buy Stock" and "Sell Stock" buttons
    addStockForm.style.display = 'block';
    addStockForm.innerHTML = `
        <h4>Manage Stocks in ${portfolioDetails.pname}</h4>
        <input type="text" name="symbol" placeholder="Stock Symbol" required>
        <input type="number" name="quantity" placeholder="Quantity" required>
        <button type="submit" id="buy-stock-button">Buy Stock</button>
        <button type="button" id="sell-stock-button">Sell Stock</button>
    `;

    // Add event listener for the "Sell Stock" button
    document.getElementById('sell-stock-button').addEventListener('click', async () => {
        const formData = new FormData(addStockForm);
        const body = Object.fromEntries(formData.entries());
        body.pid = selectedPortfolioId; // Add portfolio ID to the request body
        const result = await sendRequest(`/portfolios/sell`, 'POST', body);
        alert(JSON.stringify(result.message || result.error));
        await selectPortfolio(selectedPortfolioId); // Reload selected portfolio
    });
}

// Add a stock to the selected portfolio
document.getElementById('add-stock-to-portfolio-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedPortfolioId) {
        alert('Please select a portfolio first.');
        return;
    }
    const formData = new FormData(e.target);
    const body = Object.fromEntries(formData.entries());
    body.pid = selectedPortfolioId; // Add portfolio ID to the request body
    const result = await sendRequest(`/portfolios/buy`, 'POST', body);
    alert(JSON.stringify(result.message || result.error));
    await selectPortfolio(selectedPortfolioId); // Reload selected portfolio
});

// Add a new portfolio
document.getElementById('add-portfolio-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const body = Object.fromEntries(formData.entries());

    if (body.pname == '') {
        delete body.pname;
    }
    if (body.cash == '') {
        body.cash = 0;
    }

    const result = await sendRequest('/portfolios', 'POST', body);
    alert(JSON.stringify(result.message || result.error));
    await loadPortfolios(); // Reload portfolios
    if (result.pid) {
        await selectPortfolio(result.pid); // Automatically select the newly created portfolio
    }
});

// Load portfolios on page load
document.getElementById('portfolio-tab').addEventListener('click', async () => {
    await loadPortfolios();
});
