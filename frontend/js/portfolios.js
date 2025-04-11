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
            <div id="portfolio-list-cash">Cash: $${portfolio.cash}</div>
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
    const portfolioActionsContainer = document.getElementById('portfolio-actions-container');

    // Extract "Portfolio Total" data and filter it out from the stocks list
    const portfolioTotal = portfolioDetails.stocks.find(stock => stock.symbol === "Portfolio Total");
    const stocks = portfolioDetails.stocks.filter(stock => stock.symbol !== "Portfolio Total");

    // Display portfolio details
    portfolioDetailsContainer.style.display = 'block';
    portfolioDetailsContainer.innerHTML = `
        <h3>${portfolioDetails.pname}</h3>
        <div id="portfolio-cash">Cash: $${portfolioDetails.cash}</div>
        <div>Total Quantity: ${portfolioTotal.quantity || 0}</div>
        <div>Total Value: $${portfolioTotal.total_value || 0}</div>
    `;

    // Display stocks in the portfolio
    portfolioStocksContainer.style.display = 'block';
    portfolioStocksContainer.innerHTML = `<h3>Stocks in ${portfolioDetails.pname}</h3>`;
    stocks.forEach(stock => {
        const stockEl = document.createElement('div');
        stockEl.classList.add('stock-item');
        stockEl.style.display = 'flex';
        stockEl.style.justifyContent = 'space-between';
        stockEl.innerHTML = `
            <div class="stock-symbol">${stock.symbol}</div>
            <div class="stock-quantity">Quantity: ${stock.quantity}</div>
            <div class="stock-value">Value: $${stock.total_value}</div>
        `;
        portfolioStocksContainer.appendChild(stockEl);
    });

    // Show the add stock form
    addStockForm.style.display = 'block'; // Ensure the form is visible
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

    // Show deposit, withdraw, and transfer forms
    portfolioActionsContainer.style.display = 'block';
    portfolioActionsContainer.innerHTML = `
        <form id="deposit-form">
            <h4>Deposit Money</h4>
            <input type="number" name="deposit" placeholder="Amount" required>
            <button type="submit">Deposit</button>
        </form>
        <form id="withdraw-form">
            <h4>Withdraw Money</h4>
            <input type="number" name="withdrawal" placeholder="Amount" required>
            <button type="submit">Withdraw</button>
        </form>
        <form id="transfer-form">
            <h4>Transfer Money</h4>
            <input type="number" name="amount" placeholder="Amount" required>
            <select name="to" id="transfer-to-portfolio">
                <option value="" disabled selected>Select Portfolio</option>
            </select>
            <button type="submit">Transfer</button>
        </form>
    `;

    // Populate transfer portfolio dropdown
    const transferDropdown = document.getElementById('transfer-to-portfolio');
    const portfolios = await sendRequest('/portfolios');
    portfolios.forEach(portfolio => {
        if (portfolio.pid !== selectedPortfolioId) {
            const option = document.createElement('option');
            option.value = portfolio.pid;
            option.textContent = `${portfolio.pid}: ${portfolio.pname}`;
            transferDropdown.appendChild(option);
        }
    });

    // Add event listeners for deposit, withdraw, and transfer forms
    document.getElementById('deposit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const body = Object.fromEntries(formData.entries());
        body.pid = selectedPortfolioId;
        const result = await sendRequest('/portfolios/deposit', 'POST', body);
        alert(JSON.stringify(result.message || result.error));
        await updateCashDisplay(); // Update cash display
    });

    document.getElementById('withdraw-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const body = Object.fromEntries(formData.entries());
        body.pid = selectedPortfolioId;
        const result = await sendRequest('/portfolios/withdraw', 'POST', body);
        alert(JSON.stringify(result.message || result.error));
        await updateCashDisplay(); // Update cash display
    });

    document.getElementById('transfer-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const body = Object.fromEntries(formData.entries());
        body.from = selectedPortfolioId;
        const result = await sendRequest('/portfolios/transfer', 'POST', body);
        alert(JSON.stringify(result.message || result.error));
        await updateCashDisplay(); // Update cash display
    });
}

// Update the displayed cash value
async function updateCashDisplay() {
    try {
        const response = await sendRequest(`/portfolios/${selectedPortfolioId}/cash`);
        const cashElement = document.getElementById('portfolio-list-cash');
        if (cashElement && response.cash !== undefined) {
            cashElement.textContent = `Cash: $${response.cash}`;
        }
        const otherCashElement = document.getElementById('portfolio-cash');
        if (otherCashElement && response.cash !== undefined) {
            otherCashElement.textContent = `Cash: $${response.cash}`;
        }
    } catch (error) {
        console.error("Error updating cash display:", error);
    }
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
