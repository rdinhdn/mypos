document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL STATE MANAGEMENT ---
    let appState = {
        isLoggedIn: false,
        userRole: null, // 'admin' or 'sales'
        currentPage: 'pos', // Default to POS after login
        statusMessage: '',
        statusIsError: false,
        stock: [
            { id: 'FRT001', name: 'Apple', costPrice: 100.00, price: 150.00, quantity: 100, unit: 'kg', date: '2025-10-23' },
            { id: 'VEG001', name: 'Carrot', costPrice: 40.00, price: 60.00, quantity: 50, unit: 'kg', date: '2025-10-22' },
            { id: 'DRK001', name: 'Milk', costPrice: 20.00, price: 25.00, quantity: 200, unit: 'pcs', date: '2025-10-24' },
            { id: 'BAK001', name: 'Bread', costPrice: 30.00, price: 45.00, quantity: 70, unit: 'pcs', date: '2025-10-25' },
            { id: 'OFF001', name: 'Notebook', costPrice: 15.00, price: 25.00, quantity: 150, unit: 'pcs', date: '2025-10-20' },
        ],
        cart: [],
        sales: [], // Stores completed sales/invoices
        currentInvoice: null,
        charts: {} // Store Chart.js instances
    };

    const USERS = {
        admin: { username: 'admin', password: 'password', role: 'admin' },
        sales: { username: 'sales', password: 'password', role: 'sales' }
    };

    const NAVIGATION_PAGES = [
        { id: 'pos', name: 'POS Terminal', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/><path d="M12 20v-8"/></svg>`, roles: ['admin', 'sales'] },
        { id: 'stock', name: 'Stock Management', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4"/><path d="M7 15h12v-6H7z"/><path d="M11 15v-6M15 15v-6"/></svg>`, roles: ['admin', 'sales'] },
        { id: 'history', name: 'Sales History', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17l-6-6-4 4-3-3"/></svg>`, roles: ['admin', 'sales'] },
        { id: 'statistics', name: 'Statistics', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M3 4.5l6 6l4-4l6 6"/></svg>`, roles: ['admin'] } // Admin only
    ];

    // --- DOM SELECTORS ---
    const mainAppContainer = document.getElementById('main-app');
    const loginContainer = document.getElementById('login-container');
    const appPages = document.querySelectorAll('.app-page');
    const sidebarNavLinks = document.getElementById('sidebar-nav-links');
    const userRoleDisplay = document.getElementById('user-role-display');
    const logoutBtn = document.getElementById('logout-btn');
    const loginForm = document.getElementById('login-form');
    const appStatusMessage = document.getElementById('app-status-message');

    // POS specific
    const posProductList = document.getElementById('pos-product-list');
    const cartItemsList = document.getElementById('cart-items');
    const cartSubtotalEl = document.getElementById('cart-subtotal');
    const cartTaxInput = document.getElementById('cart-tax-input');
    const cartTaxEl = document.getElementById('cart-tax');
    const cartTotalEl = document.getElementById('cart-total');
    const paymentBtn = document.getElementById('payment-btn');
    
    // Stock specific
    const stockEntryForm = document.getElementById('stock-entry-form');
    const liveStockTableBody = document.querySelector('#live-stock-table-body');
    const stockSearchInput = document.getElementById('stock-search');
    
    // History specific
    const invoiceHistoryTableBody = document.querySelector('#invoice-history-table-body');
    const invoiceSearchInput = document.getElementById('invoice-search');

    // Statistics specific
    const statsTotalRevenue = document.getElementById('stats-total-revenue');
    const statsTotalCost = document.getElementById('stats-total-cost');
    const statsTotalProfit = document.getElementById('stats-total-profit');
    const statsProfitCard = document.querySelector('.stat-card.profit');
    const itemPlTableBody = document.getElementById('item-pl-table-body');

    // Modals
    const paymentModal = document.getElementById('payment-modal');
    const modalTotalAmount = document.getElementById('modal-total-amount');
    const paymentMethodSelect = document.getElementById('payment-method');
    const discountPercentageInput = document.getElementById('discount-percentage');
    const discountAmountInput = document.getElementById('discount-amount');
    const confirmPaymentBtn = document.getElementById('confirm-payment-btn');
    const invoiceModal = document.getElementById('invoice-modal');
    const invoiceDetails = document.getElementById('invoice-details');
    const downloadInvoiceBtn = document.getElementById('download-invoice-btn');
    const printInvoiceBtn = document.getElementById('print-invoice-btn');
    const closeModalBtns = document.querySelectorAll('.close-btn');

    // --- UI RENDERING & CORE LOGIC ---

    function renderAppUI() {
        if (appState.isLoggedIn) {
            loginContainer.classList.add('hidden');
            mainAppContainer.classList.remove('hidden');
            renderSidebar();
            renderAllPages(); // Render content for all accessible pages
            navigateTo(appState.currentPage); // Navigate to the stored page or default
            userRoleDisplay.textContent = appState.userRole;
        } else {
            mainAppContainer.classList.add('hidden');
            loginContainer.classList.remove('hidden');
        }
        renderStatusMessage();
    }

    function renderStatusMessage() {
        if (appState.statusMessage) {
            appStatusMessage.textContent = appState.statusMessage;
            appStatusMessage.className = `fixed top-4 right-4 z-50 p-3 rounded-lg shadow-md text-white 
                                        ${appState.statusIsError ? 'bg-red-500' : 'bg-green-500'} 
                                        block animate-pulse`; // Show and animate
            setTimeout(() => {
                appStatusMessage.classList.add('hidden');
                appState.statusMessage = '';
                appState.statusIsError = false;
            }, 3000); // Hide after 3 seconds
        } else {
            appStatusMessage.classList.add('hidden');
        }
    }

    function setStatus(message, isError = false) {
        appState.statusMessage = message;
        appState.statusIsError = isError;
        renderStatusMessage();
    }

    // --- AUTHENTICATION ---
    function handleLogin(e) {
        e.preventDefault();
        const username = e.target.username.value;
        const password = e.target.password.value;
        
        const user = Object.values(USERS).find(u => u.username === username && u.password === password);

        if (user) {
            appState.isLoggedIn = true;
            appState.userRole = user.role;
            appState.currentPage = 'pos'; // Set default page after login
            setStatus(`Welcome, ${user.role}!`);
            renderAppUI(); // Rerender the entire app
        } else {
            setStatus('Invalid username or password.', true);
        }
    }

    function handleLogout() {
        appState.isLoggedIn = false;
        appState.userRole = null;
        appState.currentPage = 'pos'; // Reset to default on logout
        appState.cart = []; // Clear cart on logout
        setStatus('You have been logged out.');
        renderAppUI(); // Rerender to show login screen
    }

    // --- NAVIGATION ---
    function renderSidebar() {
        sidebarNavLinks.innerHTML = '';
        NAVIGATION_PAGES.forEach(page => {
            if (page.roles.includes(appState.userRole)) {
                const link = document.createElement('a');
                link.href = '#';
                link.className = `nav-item p-3 rounded-xl flex items-center space-x-3 text-sm transition duration-150 hover:bg-gray-700 
                                    ${appState.currentPage === page.id ? 'active' : ''}`;
                link.dataset.page = page.id;
                link.innerHTML = `${page.icon} <span>${page.name}</span>`;
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    navigateTo(page.id);
                });
                sidebarNavLinks.appendChild(link);
            }
        });
    }

    function navigateTo(pageId) {
        // Check if user has permission to view this page
        const targetPageConfig = NAVIGATION_PAGES.find(p => p.id === pageId);
        if (!targetPageConfig || !targetPageConfig.roles.includes(appState.userRole)) {
            setStatus('Access Denied: You do not have permission to view this page.', true);
            return;
        }

        appPages.forEach(page => page.classList.remove('active'));
        const targetPage = document.getElementById(`${pageId}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
            appState.currentPage = pageId; // Update current page in state

            // Highlight active nav item
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            const activeNavItem = document.querySelector(`.nav-item[data-page="${pageId}"]`);
            if (activeNavItem) {
                activeNavItem.classList.add('active');
            }
        }

        // Special rendering for statistics page
        if (pageId === 'statistics' && appState.userRole === 'admin') {
            renderStatisticsPage();
        }
    }

    // --- MAIN RENDER FUNCTIONS ---
    function renderAllPages() {
        renderLiveStock();
        renderPosProducts();
        updateCartView();
        renderInvoiceHistory();
        // Statistics will be rendered only when explicitly navigated to by Admin
    }

    // --- INVOICE HISTORY ---
    function renderInvoiceHistory() {
        invoiceHistoryTableBody.innerHTML = '';
        const searchTerm = invoiceSearchInput.value.toLowerCase();
        const filteredSales = appState.sales.filter(sale => sale.id.toString().includes(searchTerm));
        
        filteredSales.forEach(sale => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-100 transition duration-100';
            row.innerHTML = `
                <td class="px-4 py-2">${sale.id}</td>
                <td class="px-4 py-2 text-sm">${sale.date.toLocaleString()}</td>
                <td class="px-4 py-2 text-right font-medium">₹${sale.grandTotal.toFixed(2)}</td>
                <td class="px-4 py-2 text-right"><button class="text-indigo-600 hover:text-indigo-800 font-medium view-invoice-btn" data-invoice-id="${sale.id}">View</button></td>
            `;
            row.querySelector('.view-invoice-btn').addEventListener('click', () => showInvoice(sale.id));
            invoiceHistoryTableBody.appendChild(row);
        });
    }

    // --- LIVE STOCK & POS PRODUCTS ---
    function renderLiveStock() {
        liveStockTableBody.innerHTML = '';
        const searchTerm = stockSearchInput.value.toLowerCase();
        const filteredStock = appState.stock.filter(item => 
            item.name.toLowerCase().includes(searchTerm) || 
            item.id.toLowerCase().includes(searchTerm)
        );
        filteredStock.forEach(item => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-100 transition duration-100';
            const isAdmin = appState.userRole === 'admin';
            row.innerHTML = `
                <td class="px-3 py-2 text-sm">${item.id}</td>
                <td class="px-3 py-2 font-medium">${item.name}</td>
                <td class="px-3 py-2 text-right text-gray-500">₹${item.costPrice.toFixed(2)}</td>
                <td class="px-3 py-2 text-right font-medium">₹${item.price.toFixed(2)}</td>
                <td class="px-3 py-2 text-right">${item.quantity}</td>
                <td class="px-3 py-2">${item.unit}</td>
                <td class="px-3 py-2 text-sm text-gray-500">${item.date}</td>
                <td class="px-3 py-2">
                    <button class="delete-stock-btn font-medium ${isAdmin ? 'text-red-500 hover:text-red-700' : 'text-gray-400 cursor-not-allowed'}" 
                        ${isAdmin ? '' : 'disabled'} data-stock-id="${item.id}">
                        Delete
                    </button>
                </td>
            `;
            // Only attach event listener if admin
            if (isAdmin) {
                row.querySelector('.delete-stock-btn').addEventListener('click', handleDeleteStock);
            }
            liveStockTableBody.appendChild(row);
        });
    }

    function renderPosProducts() {
        posProductList.innerHTML = '';
        appState.stock.forEach(item => {
            if (item.quantity > 0) {
                const card = document.createElement('div');
                card.className = 'product-card bg-white p-4 rounded-lg shadow-md border border-gray-200 hover:border-indigo-400';
                card.innerHTML = `
                    <div class="product-id text-xs text-gray-500">${item.id}</div>
                    <h4 class="font-bold text-gray-800 truncate">${item.name}</h4>
                    <p class="text-lg text-indigo-600 font-semibold">₹${item.price.toFixed(2)}</p>
                    <p class="text-xs text-gray-400">Qty: ${item.quantity}</p>
                `;
                card.addEventListener('click', () => addToCart(item.id));
                posProductList.appendChild(card);
            }
        });
    }
    
    // --- STOCK MANAGEMENT ---
    function handleStockEntry(e) {
        e.preventDefault();
        const stockId = document.getElementById('stock-id').value.toUpperCase();
        const existingItem = appState.stock.find(item => item.id === stockId);

        if (existingItem) {
            setStatus(`Stock ID ${stockId} already exists. Please use a unique ID or update existing stock.`, true);
            return;
        }

        appState.stock.push({
            id: stockId,
            name: document.getElementById('stock-name').value,
            costPrice: parseFloat(document.getElementById('stock-cost-price').value),
            price: parseFloat(document.getElementById('stock-price').value),
            quantity: parseInt(document.getElementById('stock-quantity').value),
            unit: document.getElementById('stock-unit').value,
            date: document.getElementById('stock-date').value
        });
        stockEntryForm.reset();
        setStatus('Stock added successfully!');
        renderAllPages();
    }

    function handleDeleteStock(e) {
        if (appState.userRole !== 'admin') {
            setStatus('Access Denied: Only Admin can delete stock entries.', true);
            return;
        }
        const stockId = e.target.dataset.stockId;
        
        appState.stock = appState.stock.filter(item => item.id !== stockId);
        setStatus(`Stock item ${stockId} deleted.`, false);
        renderAllPages();
    }
    
    // --- POS & CART LOGIC ---
    function addToCart(productId) {
        const product = appState.stock.find(p => p.id === productId);
        const cartItem = appState.cart.find(item => item.id === productId);

        if (cartItem) {
            if (cartItem.quantity < product.quantity) {
                cartItem.quantity++;
            } else {
                setStatus(`Cannot add more than ${product.quantity} units of ${product.name}.`, true);
                return;
            }
        } else if (product && product.quantity > 0) {
            appState.cart.push({ ...product, quantity: 1 });
        }
        updateCartView();
    }

    function removeFromCart(productId, decreaseOnly = true) {
        const cartItemIndex = appState.cart.findIndex(item => item.id === productId);

        if (cartItemIndex !== -1) {
            if (decreaseOnly && appState.cart[cartItemIndex].quantity > 1) {
                appState.cart[cartItemIndex].quantity--;
            } else {
                appState.cart.splice(cartItemIndex, 1);
            }
            updateCartView();
            renderPosProducts(); 
        }
    }
    
    function updateCartView() {
        cartItemsList.innerHTML = '';
        let subtotal = 0;
        
        if (appState.cart.length === 0) {
            cartItemsList.innerHTML = '<li class="text-gray-500 italic">Cart is empty.</li>';
        }

        appState.cart.forEach(item => {
            const lineTotal = item.price * item.quantity;
            const li = document.createElement('li');
            li.className = 'flex justify-between items-center text-gray-800 text-sm border-b border-gray-200 py-1';
            li.innerHTML = `
                <span class="flex-1">${item.name} (x${item.quantity})</span>
                <span class="font-medium mr-2">₹${lineTotal.toFixed(2)}</span>
                <button data-product-id="${item.id}" 
                        class="remove-from-cart-btn text-red-500 hover:text-red-700 font-bold text-lg leading-none p-1 rounded-full bg-red-100 h-6 w-6 flex items-center justify-center transition duration-150" 
                        title="Click to decrease quantity. Shift+Click to remove all.">
                    &times;
                </button>
            `;

            li.querySelector('.remove-from-cart-btn').addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.productId;
                const decreaseOnly = !e.shiftKey; 
                removeFromCart(id, decreaseOnly);
            });

            cartItemsList.appendChild(li);
            subtotal += lineTotal;
        });

        const taxRate = parseFloat(cartTaxInput.value) / 100;
        const tax = subtotal * (isNaN(taxRate) || taxRate < 0 ? 0 : taxRate);
        const totalPreDiscount = subtotal + tax;

        cartSubtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
        cartTaxEl.textContent = `₹${tax.toFixed(2)}`;
        
        const discountPct = parseFloat(discountPercentageInput.value) || 0;
        const discountAmt = parseFloat(discountAmountInput.value) || 0;
        let finalDiscount = 0;

        if (discountPct > 0) {
            finalDiscount = subtotal * (discountPct / 100);
        } else if (discountAmt > 0) {
            finalDiscount = discountAmt;
        }
        
        finalDiscount = Math.min(finalDiscount, totalPreDiscount);
        
        const grandTotal = totalPreDiscount - finalDiscount;

        cartTotalEl.textContent = `₹${grandTotal.toFixed(2)}`;
        paymentBtn.disabled = appState.cart.length === 0;
    }
    
    // --- PAYMENT & INVOICE ---
    function showPaymentModal() {
        const total = parseFloat(cartTotalEl.textContent.replace('₹', ''));
        modalTotalAmount.textContent = `₹${total.toFixed(2)}`;
        
        discountPercentageInput.value = '';
        discountAmountInput.value = '';

        paymentModal.style.display = 'flex';
    }

    function processSale() {
        const subtotal = appState.cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        
        const taxRate = parseFloat(cartTaxInput.value) / 100;
        const tax = subtotal * (isNaN(taxRate) || taxRate < 0 ? 0 : taxRate);
        const totalPreDiscount = subtotal + tax; 

        const discountPct = parseFloat(discountPercentageInput.value) || 0;
        const discountAmt = parseFloat(discountAmountInput.value) || 0;
        let finalDiscount = 0;

        if (discountPct > 0) {
            finalDiscount = subtotal * (discountPct / 100);
        } else if (discountAmt > 0) {
            finalDiscount = discountAmt;
        }

        finalDiscount = Math.min(finalDiscount, totalPreDiscount);
        
        const grandTotal = totalPreDiscount - finalDiscount;

        if (grandTotal < 0) {
             setStatus("Grand total cannot be negative after discount.", true);
             return;
        }

        const totalCost = appState.cart.reduce((acc, item) => {
            return acc + (item.costPrice * item.quantity);
        }, 0);

        const newSale = {
            id: Date.now(), 
            items: [...appState.cart],
            subtotal: subtotal,
            tax: tax, 
            total: totalPreDiscount, 
            discount: finalDiscount,
            grandTotal: grandTotal,
            totalCost: totalCost, 
            paymentMethod: paymentMethodSelect.value,
            date: new Date()
        };
        appState.sales.push(newSale);
        
        appState.cart.forEach(cartItem => {
            const stockItem = appState.stock.find(s => s.id === cartItem.id);
            if (stockItem) stockItem.quantity -= cartItem.quantity;
        });
        
        appState.cart = [];
        closeModal();
        showInvoice(newSale.id);
        renderAllPages();
        setStatus(`Sale #${newSale.id} completed successfully!`, false);
    }
    
    function showInvoice(saleId) {
        const sale = appState.sales.find(s => s.id === saleId);
        if (!sale) return;
        appState.currentInvoice = sale;
        
        let itemsHtml = sale.items.map(item => `<tr class="border-b"><td class="py-1">${item.name}</td><td class="text-center">${item.quantity}</td><td class="text-right">₹${item.price.toFixed(2)}</td><td class="text-right font-medium">₹${(item.quantity * item.price).toFixed(2)}</td></tr>`).join('');
        invoiceDetails.innerHTML = `
            <div class="text-lg font-semibold mb-3">Invoice ID: <span class="text-indigo-600">${sale.id}</span></div>
            <p class="text-sm text-gray-500">Date: ${sale.date.toLocaleString()}</p>
            <hr class="my-3">
            <table style="width:100%; text-align:left; border-spacing:0; font-size: 0.9em;">
                <thead><tr class="font-bold text-sm bg-gray-50"><th class="py-2 pl-1">Item</th><th class="text-center">Qty</th><th class="text-right">Unit Price</th><th class="text-right pr-1">Total</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
            </table>
            <hr class="my-3">
            <div style="text-align:right;" class="space-y-1">
                <p class="flex justify-between"><span>Subtotal:</span><span>₹${sale.subtotal.toFixed(2)}</span></p>
                <p class="flex justify-between border-b pb-1"><span>Tax:</span><span>+₹${sale.tax.toFixed(2)}</span></p>
                <p class="flex justify-between font-medium"><span>Total (Pre-Discount):</span><span>₹${sale.total.toFixed(2)}</span></p>
                <p class="flex justify-between text-red-500 font-medium border-b pb-1"><span>Discount:</span><span>-₹${sale.discount.toFixed(2)}</span></p>
                <h3 class="flex justify-between text-xl font-extrabold pt-2 text-indigo-700"><span>Grand Total:</span><span>₹${sale.grandTotal.toFixed(2)}</span></h3>
            </div>
            <p class="text-sm text-right mt-4">Payment Method: ${sale.paymentMethod}</p>
            <p class="text-xs text-center mt-4 text-gray-400">Barcode: Scannable Code 39 is included in the PDF.</p>
        `;
        invoiceModal.style.display = 'flex';
    }

    function getPrintableInvoiceHTML(sale) {
        let itemsHtml = sale.items.map(item => `
            <tr>
                <td>${item.name}</td>
                <td style="text-align:center;">${item.quantity}</td>
                <td style="text-align:right;">₹${item.price.toFixed(2)}</td>
                <td style="text-align:right; font-weight: bold;">₹${(item.quantity * item.price).toFixed(2)}</td>
            </tr>
        `).join('');

        return `
            <div style="font-family: 'Inter', sans-serif; padding: 10px; max-width: 80mm; margin: 0 auto;">
                <h2 style="text-align: center; font-size: 1.5em;">DINZ POS SYSTEM</h2>
                <h3 style="text-align: center; font-size: 1.1em; margin-bottom: 10px;">SALES RECEIPT</h3>
                <p style="font-size: 0.8em; margin: 2px 0;"><strong>Invoice ID:</strong> ${sale.id}</p>
                <p style="font-size: 0.8em; margin: 2px 0;"><strong>Date/Time:</strong> ${sale.date.toLocaleString()}</p>
                <hr style="border-top: 1px dashed #000; margin: 10px 0;">

                <table style="font-size: 0.8em; width:100%;">
                    <thead>
                        <tr style="border-bottom: 2px solid #000;">
                            <th>Item</th>
                            <th style="text-align:center;">Qty</th>
                            <th style="text-align:right;">Price</th>
                            <th style="text-align:right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                </table>
                
                <hr style="border-top: 1px dashed #000; margin: 10px 0;">

                <div style="text-align:right; font-size: 0.9em;" class="summary">
                    <p><span>Subtotal:</span><span>₹${sale.subtotal.toFixed(2)}</span></p>
                    <p><span>Tax:</span><span>+₹${sale.tax.toFixed(2)}</span></p>
                    <p style="border-bottom: 1px solid #ddd; padding-bottom: 5px;"><span>Total (Pre-Discount):</span><span>₹${sale.total.toFixed(2)}</span></p>
                    <p style="color: red; font-weight: bold;"><span>Discount:</span><span>-₹${sale.discount.toFixed(2)}</span></p>
                    <p class="grand-total"><span>GRAND TOTAL:</span><span>₹${sale.grandTotal.toFixed(2)}</span></p>
                </div>

                <p style="font-size: 0.8em; text-align: right; margin-top: 10px;">Payment: ${sale.paymentMethod}</p>
                <hr style="border-top: 1px dashed #000; margin: 10px 0;">
                <p style="text-align: center; font-size: 0.9em; font-weight: bold;">THANK YOU!</p>
            </div>
        `;
    }

    function printInvoice() {
        if (!appState.currentInvoice) return;
        
        const printWindow = window.open('', '_blank');
        const invoiceContent = getPrintableInvoiceHTML(appState.currentInvoice); 
        
        printWindow.document.write(invoiceContent);
        printWindow.document.close();
        printWindow.focus();
        
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 50);
    }
    
    function downloadInvoiceAsPDF() {
        if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
            setStatus("Error: PDF library (jsPDF) not fully loaded. Cannot download invoice.", true);
            return;
        }
        const { jsPDF } = window.jspdf;

        if (!appState.currentInvoice) return;
        const sale = appState.currentInvoice;
        
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [105, 148] });
        
        const margin = 8;
        const pageWidth = 105; 
        const rightAlign = pageWidth - margin;
        
        const col1 = margin;        
        const col2 = 60;            
        const col3 = 78;            
        const col4 = rightAlign;    
        
        let currentY = 10;
        const lineHeight = 5;

        doc.setFont("helvetica", 'bold');
        doc.setFontSize(16);
        doc.text("DINZ POS SYSTEM", pageWidth / 2, currentY, { align: 'center' }); currentY += 6;
        doc.setFontSize(10);
        doc.setFont("helvetica", 'normal');
        doc.text("SALES INVOICE", pageWidth / 2, currentY, { align: 'center' }); currentY += 8;

        doc.setFontSize(8); doc.setFont(undefined, 'normal');
        doc.text(`Invoice ID: ${sale.id}`, col1, currentY);
        doc.text(`Date: ${sale.date.toLocaleDateString()}`, rightAlign, currentY, { align: 'right' }); currentY += lineHeight;
        doc.text(`Time: ${sale.date.toLocaleTimeString()}`, rightAlign, currentY, { align: 'right' }); currentY += lineHeight;

        currentY += 3; doc.line(col1, currentY, rightAlign, currentY); currentY += 4;

        doc.setFontSize(9); doc.setFont(undefined, 'bold');
        doc.text("Item Name", col1, currentY);
        doc.text("Qty", col2, currentY, { align: 'right' });
        doc.text("Price", col3, currentY, { align: 'right' });
        doc.text("Total (Rs)", col4, currentY, { align: 'right' });
        currentY += lineHeight;
        doc.line(col1, currentY, rightAlign, currentY); currentY += 4;

        doc.setFontSize(8); doc.setFont(undefined, 'normal');
        sale.items.forEach(item => {
            if (currentY > 135) {
                doc.addPage();
                currentY = 10;
                doc.setFontSize(9); doc.setFont(undefined, 'bold');
                doc.text("Item Name", col1, currentY);
                doc.text("Qty", col2, currentY, { align: 'right' });
                doc.text("Price", col3, currentY, { align: 'right' });
                doc.text("Total (Rs)", col4, currentY, { align: 'right' });
                currentY += lineHeight;
                doc.line(col1, currentY, rightAlign, currentY); currentY += 4;
                doc.setFontSize(8); doc.setFont(undefined, 'normal');
            }
            
            doc.text(item.name, col1, currentY);
            doc.text(item.quantity.toString(), col2, currentY, { align: 'right' });
            doc.text(`Rs ${item.price.toFixed(2)}`, col3, currentY, { align: 'right' });
            doc.text(`Rs ${(item.quantity * item.price).toFixed(2)}`, col4, currentY, { align: 'right' });
            currentY += lineHeight;
        });

        currentY += 3; doc.line(col2 - 5, currentY, rightAlign, currentY); currentY += 4; 

        doc.setFontSize(9); doc.setFont(undefined, 'normal');
        doc.text("SUBTOTAL (Rs):", col3, currentY, { align: 'right' });
        doc.text(`Rs ${sale.subtotal.toFixed(2)}`, col4, currentY, { align: 'right' }); currentY += lineHeight;

        doc.text("TAX (Rs):", col3, currentY, { align: 'right' });
        doc.text(`+Rs ${sale.tax.toFixed(2)}`, col4, currentY, { align: 'right' }); currentY += lineHeight;

        doc.text("TOTAL (PRE-DISCOUNT) (Rs):", col3, currentY, { align: 'right' });
        doc.text(`Rs ${sale.total.toFixed(2)}`, col4, currentY, { align: 'right' }); currentY += lineHeight;

        doc.setFont(undefined, 'bold');
        doc.text("DISCOUNT (Rs):", col3, currentY, { align: 'right' });
        doc.text(`-Rs ${sale.discount.toFixed(2)}`, col4, currentY, { align: 'right' }); currentY += lineHeight;
        doc.setFont(undefined, 'normal');

        currentY += 3; doc.line(col3 - 5, currentY, rightAlign, currentY); currentY += 4;

        doc.setFontSize(11); doc.setFont(undefined, 'bold');
        doc.text("GRAND TOTAL (Rs):", col3, currentY, { align: 'right' });
        doc.text(`Rs ${sale.grandTotal.toFixed(2)}`, col4, currentY, { align: 'right' }); currentY += lineHeight;
        doc.setFontSize(8); doc.setFont(undefined, 'normal');

        currentY += 5;
        
        doc.text(`Payment Method: ${sale.paymentMethod}`, col1, currentY);
        currentY += 5;

        const barcodeText = `*${sale.id}*`; 
        const barcodeX = pageWidth / 2;
        
        doc.setFont("courier", 'normal'); 
        doc.setFontSize(10);
        doc.text(barcodeText, barcodeX, currentY, { align: 'center' });
        
        doc.setFontSize(7);
        doc.text("Code 39 Barcode", barcodeX, currentY + 3, { align: 'center' });
        
        doc.setFontSize(8);
        doc.text(sale.id.toString(), barcodeX, currentY + 7, { align: 'center' }); 
        
        doc.setFont("helvetica", 'normal'); 
        
        currentY += 15;

        doc.setFontSize(10);
        doc.text("THANK YOU FOR YOUR BUSINESS!", pageWidth / 2, currentY, { align: 'center' });

        doc.save(`invoice-${sale.id}.pdf`);
    }

    function closeModal() {
        paymentModal.style.display = 'none';
        invoiceModal.style.display = 'none';
        appState.currentInvoice = null;
    }

    // --- STATISTICS & CHARTS (Admin) ---
    function calculateItemProfitLoss() {
        const itemStats = {};
        appState.sales.forEach(sale => {
            sale.items.forEach(item => {
                if (!itemStats[item.id]) {
                    itemStats[item.id] = { 
                        id: item.id,
                        name: item.name, 
                        unit: item.unit,
                        sold: 0, 
                        revenue: 0, 
                        cost: 0 
                    };
                }
                itemStats[item.id].sold += item.quantity;
                itemStats[item.id].revenue += item.quantity * item.price;
                itemStats[item.id].cost += item.quantity * item.costPrice;
            });
        });
        return Object.values(itemStats).map(stat => ({
            ...stat,
            profit: stat.revenue - stat.cost
        }));
    }

    function renderItemProfitLossTable(data) {
        if (!itemPlTableBody) return;
        itemPlTableBody.innerHTML = '';

        data.sort((a, b) => b.profit - a.profit); 

        data.forEach(item => {
            const row = document.createElement('tr');
            const profitClass = item.profit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold';
            row.className = 'hover:bg-gray-100 transition duration-100';
            row.innerHTML = `
                <td class="px-4 py-3 text-sm">${item.name} <span class="text-gray-500 text-xs">(${item.sold} ${item.unit || 'units'})</span></td>
                <td class="px-4 py-3 text-right">₹${item.revenue.toFixed(2)}</td>
                <td class="px-4 py-3 text-right text-gray-500">₹${item.cost.toFixed(2)}</td>
                <td class="px-4 py-3 text-right ${profitClass}">₹${item.profit.toFixed(2)}</td>
            `;
            itemPlTableBody.appendChild(row);
        });
    }

    function renderStatisticsPage() {
        if (typeof Chart === 'undefined') {
            setStatus("Chart.js not loaded. Skipping statistics rendering.", true);
            return; 
        }

        let totalRevenue = 0;
        let totalCost = 0;
        const dailyData = {};
        const monthlyData = {};

        appState.sales.forEach(sale => {
            totalRevenue += sale.grandTotal;
            totalCost += sale.totalCost;
            
            const saleDate = sale.date;
            const dayKey = saleDate.toISOString().split('T')[0];
            const monthKey = `${saleDate.getFullYear()}-${(saleDate.getMonth() + 1).toString().padStart(2, '0')}`;
            
            const profit = sale.grandTotal - sale.totalCost;

            if (!dailyData[dayKey]) dailyData[dayKey] = { sales: 0, profit: 0 };
            dailyData[dayKey].sales += sale.grandTotal;
            dailyData[dayKey].profit += profit;

            if (!monthlyData[monthKey]) monthlyData[monthKey] = { sales: 0, profit: 0 };
            monthlyData[monthKey].sales += sale.grandTotal;
            monthlyData[monthKey].profit += profit;
        });

        const totalProfit = totalRevenue - totalCost;

        statsTotalRevenue.textContent = `₹${totalRevenue.toFixed(2)}`;
        statsTotalCost.textContent = `₹${totalCost.toFixed(2)}`;
        statsTotalProfit.textContent = `₹${totalProfit.toFixed(2)}`;
        statsProfitCard.classList.toggle('loss', totalProfit < 0);
        statsProfitCard.classList.toggle('profit', totalProfit >= 0);

        const itemProfitLossData = calculateItemProfitLoss();
        renderItemProfitLossTable(itemProfitLossData);

        const dailyLabels = Object.keys(dailyData).sort();
        const dailySales = dailyLabels.map(day => dailyData[day].sales);
        const dailyProfit = dailyLabels.map(day => dailyData[day].profit);
        createChart('daily-sales-chart', 'line', dailyLabels, dailySales, dailyProfit);

        const monthlyLabels = Object.keys(monthlyData).sort();
        const monthlySales = monthlyLabels.map(month => monthlyData[month].sales);
        const monthlyProfit = monthlyLabels.map(month => monthlyData[month].profit);
        createChart('monthly-sales-chart', 'bar', monthlyLabels, monthlySales, monthlyProfit);
    }

    function createChart(canvasId, type, labels, salesData, profitData) {
        if (appState.charts[canvasId]) {
            appState.charts[canvasId].destroy();
        }
        const ctx = document.getElementById(canvasId).getContext('2d');
        appState.charts[canvasId] = new Chart(ctx, {
            type: type,
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Sales (₹)',
                    data: salesData,
                    backgroundColor: 'rgba(79, 70, 229, 0.7)',
                    borderColor: 'rgba(79, 70, 229, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Profit (₹)',
                    data: profitData,
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    // --- INITIALIZATION ---
    function init() {
        // Event Listeners
        loginForm.addEventListener('submit', handleLogin);
        logoutBtn.addEventListener('click', handleLogout);
        stockEntryForm.addEventListener('submit', handleStockEntry);
        stockSearchInput.addEventListener('input', renderLiveStock);
        invoiceSearchInput.addEventListener('input', renderInvoiceHistory);
        cartTaxInput.addEventListener('input', updateCartView);
        paymentBtn.addEventListener('click', showPaymentModal);
        
        discountPercentageInput.addEventListener('input', () => {
            if (discountPercentageInput.value) { discountAmountInput.value = ''; }
            updateCartView();
        });
        discountAmountInput.addEventListener('input', () => {
            if (discountAmountInput.value) { discountPercentageInput.value = ''; }
            updateCartView();
        });

        confirmPaymentBtn.addEventListener('click', processSale);
        downloadInvoiceBtn.addEventListener('click', downloadInvoiceAsPDF);
        printInvoiceBtn.addEventListener('click', printInvoice);
        closeModalBtns.forEach(btn => btn.addEventListener('click', closeModal));
        
        renderAppUI(); // Initial render to show login page
    }
    
    init();
});