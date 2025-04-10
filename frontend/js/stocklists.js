import { sendRequest } from './helpers.js';

let selectedStockListId = null;

// load all stock lists
export async function loadStockLists() {
    const stockListsContainer = document.getElementById('stocklists-container');
    stockListsContainer.innerHTML = '<h3>Your Stock Lists</h3>'; // clear the list before populating
    const stockLists = await sendRequest('/stocklists');
    stockLists.forEach(stockList => {
        const stockListEl = document.createElement('div');
        stockListEl.classList.add('stocklist-item');
        stockListEl.setAttribute('data-slid', stockList.slid);
        stockListEl.innerHTML = `
            <button class="stocklist-name">${stockList.slid}: ${stockList.slname}</button>
            <div class="stocklist-public">${stockList.public ? 'Public' : 'Private'}</div>
        `;
        stockListEl.addEventListener('click', () => selectStockList(stockList.slid));
        stockListsContainer.appendChild(stockListEl);
    });
}

// select a stock list and load its details
async function selectStockList(slid) {
    selectedStockListId = slid;
    const stockListDetails = await sendRequest(`/stocklists/${slid}`);
    const stockListDetailsContainer = document.getElementById('stocklist-details');
    const stocksContainer = document.getElementById('stocks-in-list-container');
    const addStockForm = document.getElementById('add-stock-form');

    // display stock list details
    stockListDetailsContainer.style.display = 'block';
    stockListDetailsContainer.innerHTML = `
        <h3>Edit ${stockListDetails.slname}</h3>
        <button id="toggle-public-button">${stockListDetails.public ? 'Make Private' : 'Make Public'}</button>
    `;

    // add event listener to toggle public status
    document.getElementById('toggle-public-button').addEventListener('click', async () => {
        const newPublicStatus = !stockListDetails.public;
        const result = await sendRequest(`/stocklists/${slid}`, 'PATCH', { is_public: newPublicStatus });
        alert(JSON.stringify(result.message || result.error));
        await loadStockLists(); // reload stock lists to reflect changes
        await selectStockList(slid); // reload selected stock list to reflect changes
    });

    // display stocks in the stock list
    stocksContainer.style.display = 'block';
    stocksContainer.innerHTML = `<h3>Stocks in ${stockListDetails.slname}</h3>`;
    stockListDetails.stocks.forEach(stock => {
        const stockEl = document.createElement('div');
        stockEl.classList.add('stock-item');
        stockEl.innerHTML = `
            <div class="stock-symbol">${stock.symbol}</div>
            <div class="stock-quantity">Quantity: ${stock.quantity}</div>
            <div class="stock-value">Value: $${stock.total_value}</div>
            <button class="remove-stock-button" data-symbol="${stock.symbol}">Remove</button>
        `;
        stocksContainer.appendChild(stockEl);
    });

    // add event listeners to remove stock buttons
    const removeButtons = document.querySelectorAll('.remove-stock-button');
    removeButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            const symbol = e.target.dataset.symbol;
            const result = await sendRequest(`/stocklists/${slid}/stocks`, 'DELETE', { symbol });
            alert(JSON.stringify(result.message || result.error));
            await selectStockList(slid); // reload selected stock list
        });
    });

    // show the add stock form
    addStockForm.style.display = 'block';
    addStockForm.innerHTML = `
        <h4>Add Stock to ${stockListDetails.slname}</h4>
        <input type="text" name="symbol" placeholder="Stock Symbol" required>
        <input type="number" name="quantity" placeholder="Quantity" required>
        <button type="submit">Add Stock</button>
    `;
}

// add a stock to the selected stock list
document.getElementById('add-stock-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedStockListId) {
        alert('Please select a stock list first.');
        return;
    }
    const formData = new FormData(e.target);
    const body = Object.fromEntries(formData.entries());
    const result = await sendRequest(`/stocklists/${selectedStockListId}/stocks`, 'POST', body);
    alert(JSON.stringify(result.message || result.error));
    await selectStockList(selectedStockListId); // Reload selected stock list
});

// add a new stock list
document.getElementById('create-stocklist-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const body = Object.fromEntries(formData.entries());
    const result = await sendRequest('/stocklists', 'POST', body);
    alert(JSON.stringify(result.message || result.error));
    await loadStockLists(); // reload stock lists
});

// load stock lists on page load
document.getElementById('stocklists-tab').addEventListener('click', async () => {
    await loadStockLists();
});