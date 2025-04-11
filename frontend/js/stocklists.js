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
            <button class="delete-stocklist-button" data-slid="${stockList.slid}">Delete</button>
        `;
        stockListEl.addEventListener('click', () => selectStockList(stockList.slid));
        stockListsContainer.appendChild(stockListEl);
    });

    // Add event listeners to delete stock list buttons
    const deleteButtons = document.querySelectorAll('.delete-stocklist-button');
    deleteButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation(); // Prevent triggering the stock list selection
            const slid = e.target.dataset.slid;
            const confirmDelete = confirm(`Are you sure you want to delete stock list ${slid}?`);
            if (confirmDelete) {
                const result = await sendRequest(`/stocklists/${slid}`, 'DELETE');
                alert(result.message || result.error);
                await loadStockLists(); // Reload stock lists after deletion
            }
        });
    });
}

// select a stock list and load its details
async function selectStockList(slid) {
    selectedStockListId = slid;
    const stockListDetails = await sendRequest(`/stocklists/${slid}`);
    const stockListDetailsContainer = document.getElementById('stocklist-details');
    const stocksContainer = document.getElementById('stocks-in-list-container');
    const addStockForm = document.getElementById('stocklist-add-stock-form');
    const stockListStatsContainer = document.getElementById('stocklist-stats-container');
    const stockListReviewsContainer = document.getElementById('stocklist-reviews-container');

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
        alert(result.message || result.error);
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
            alert(result.message || result.error);
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

    // display stock list stats
    stockListStatsContainer.style.display = 'block';
    stockListStatsContainer.innerHTML = `
        <h3>Stock List Statistics</h3>
        <form id="stocklist-stats-form">
            <label for="start-date">Start Date:</label>
            <input type="date" id="start-date1" required>
            <label for="end-date">End Date:</label>
            <input type="date" id="end-date1" required>
            <button type="submit">Get Statistics</button>
        </form>
        <div id="stocklist-stats-results"></div>
    `;

    // add event listener for the stock list stats form
    document.getElementById('stocklist-stats-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const startDate = document.getElementById('start-date1').value;
        const endDate = document.getElementById('end-date1').value;

        if (!selectedStockListId) {
            alert('Please select a stock list first.');
            return;
        }

        const stockListDetails = await sendRequest(`/stocklists/${selectedStockListId}`);
        const stocks = stockListDetails.stocks;
        const stockListStatsContainer = document.getElementById('stocklist-stats-container');
        await displayStockListStats(stocks, stockListStatsContainer, startDate, endDate);
    });

    // Load and display reviews for the stock list
    await loadStockListReviews(slid);
    stockListReviewsContainer.style.display = 'block'; // Ensure the reviews container is visible
}

// display stock list statistics
async function displayStockListStats(stocks, container, startDate, endDate) {
    try {
        const covPromises = stocks.map(stock => sendRequest(`/stocks/symbol/${stock.symbol}/cov`, 'POST', {
            start_date: startDate,
            end_date: endDate
        }));
        const betaPromises = stocks.map(stock => sendRequest(`/stocks/symbol/${stock.symbol}/beta`, 'POST', {
            start_date: startDate,
            end_date: endDate
        }));
        const covMatrixPromise = sendRequest('/stocklists/cov', 'POST', {
            slid: selectedStockListId,
            start_date: startDate,
            end_date: endDate
        });

        const covResults = await Promise.all(covPromises);
        const betaResults = await Promise.all(betaPromises);
        const covMatrix = await covMatrixPromise;

        const resultsContainer = document.getElementById('stocklist-stats-results');
        resultsContainer.innerHTML = `<h4>Coefficient of Variation (COV)</h4>`;
        stocks.forEach((stock, index) => {
            resultsContainer.innerHTML += `<div>${stock.symbol}: ${covResults[index][0]?.cov || 'N/A'}</div>`;
        });

        resultsContainer.innerHTML += `<h4>Beta Coefficient</h4>`;
        stocks.forEach((stock, index) => {
            resultsContainer.innerHTML += `<div>${stock.symbol}: ${betaResults[index][0]?.beta || 'N/A'}</div>`;
        });

        resultsContainer.innerHTML += `<h4>Covariance Matrix</h4>`;
        if (covMatrix.length > 0) {
            const symbols = stocks.map(stock => stock.symbol);
            let matrixHTML = '<table border="1" style="border-collapse: collapse; text-align: center;">';
            matrixHTML += '<tr><th></th>' + symbols.map(symbol => `<th>${symbol}</th>`).join('') + '</tr>';
            covMatrix.forEach((row, rowIndex) => {
                matrixHTML += `<tr><th>${symbols[rowIndex]}</th>` + row.map(cell => `<td>${cell[0]}</td>`).join('') + '</tr>';
            });
            matrixHTML += '</table>';
            resultsContainer.innerHTML += matrixHTML;
        } else {
            resultsContainer.innerHTML += `<div>No covariance matrix available</div>`;
        }
    } catch (error) {
        console.error('Error fetching stock list stats:', error);
        container.innerHTML += `<div>Error fetching stock list stats</div>`;
    }
}

// Load reviews for the selected stock list
async function loadStockListReviews(slid) {
    const reviewsContainer = document.getElementById('stocklist-reviews');
    reviewsContainer.innerHTML = '<h4>Loading reviews...</h4>';

    try {
        const reviews = await sendRequest(`/reviews/${slid}`);
        if (reviews.length === 0) {
            reviewsContainer.innerHTML = '<div>No reviews available for this stock list.</div>';
            return;
        }

        let reviewsHTML = '';
        for (const review of reviews) {
            const userEmail = await sendRequest(`/users/uid/${review.uid}/email`);
            reviewsHTML += `
                <div class="review-item">
                    <div><strong>User:</strong> ${userEmail.email}</div>
                    <div><strong>Review:</strong> ${review.review || 'No review text provided'}</div>
                    <button class="delete-review-button" data-uid="${review.uid}">Delete</button>
                </div>
            `;
        }

        reviewsContainer.innerHTML = reviewsHTML;

        // Add event listeners for delete buttons
        const deleteButtons = document.querySelectorAll('.delete-review-button');
        deleteButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const uid = e.target.dataset.uid;
                const confirmDelete = confirm(`Are you sure you want to delete the review by user ${uid}?`);
                if (confirmDelete) {
                    const result = await sendRequest(`/reviews/${slid}`, 'DELETE', { reviewer: uid });
                    alert(result.message || result.error);
                    await loadStockListReviews(slid); // Reload reviews after deletion
                }
            });
        });
    } catch (error) {
        console.error('Error loading reviews:', error);
        reviewsContainer.innerHTML = '<div>Error loading reviews.</div>';
    }
}

// add a stock to the selected stock list
document.getElementById('stocklist-add-stock-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedStockListId) {
        alert('Please select a stock list first.');
        return;
    }
    const formData = new FormData(e.target);
    const body = Object.fromEntries(formData.entries());
    const result = await sendRequest(`/stocklists/${selectedStockListId}/stocks`, 'POST', body);
    alert(result.message || result.error);
    await selectStockList(selectedStockListId); // Reload selected stock list
});

// add a new stock list
document.getElementById('create-stocklist-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const body = Object.fromEntries(formData.entries());
    const result = await sendRequest('/stocklists', 'POST', body);
    alert(result.message || result.error);
    await loadStockLists(); // reload stock lists
});

// load stock lists on page load
document.getElementById('stocklists-tab').addEventListener('click', async () => {
    await loadStockLists();
});