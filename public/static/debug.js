// Debug script to test invoice modal functionality
console.log('Debug script loaded');

// Function to test modal functionality directly
window.debugInvoiceModal = async function() {
    console.log('=== DEBUG INVOICE MODAL ===');
    
    try {
        // Load invoice data
        console.log('1. Loading invoice data...');
        const response = await axios.get('/api/invoices/1');
        console.log('Invoice data:', response.data);
        
        const invoice = response.data.invoice;
        const items = response.data.items || [];
        console.log('Items to load:', items);
        
        // Test if we can create modal container
        console.log('2. Testing modal container...');
        let container = document.getElementById('modal-container');
        if (!container) {
            console.log('Creating modal container...');
            container = document.createElement('div');
            container.id = 'modal-container';
            document.body.appendChild(container);
        }
        
        // Test HTML creation
        console.log('3. Creating test modal HTML...');
        const testHtml = `
            <div id="test-invoice-items" class="space-y-3">
                <!-- Test items will be added here -->
            </div>
        `;
        container.innerHTML = testHtml;
        
        // Test adding items manually
        console.log('4. Testing addInvoiceItem function...');
        const itemsContainer = document.getElementById('test-invoice-items');
        
        // Add items one by one
        items.forEach((item, index) => {
            console.log(`Adding item ${index + 1}:`, item);
            
            const itemId = item.id || Date.now() + index;
            const description = item.description || '';
            const quantity = item.quantity || 1;
            const unitPrice = item.unit_price || 0;
            const total = item.total || (quantity * unitPrice);
            
            console.log('Item values:', { description, quantity, unitPrice, total });
            
            const itemHtml = `
                <div class="invoice-item test-item grid grid-cols-12 gap-2 items-end" data-item-id="${itemId}">
                    <div class="col-span-5">
                        <label class="block text-xs text-gray-500">Beschreibung</label>
                        <input type="text" class="item-description w-full px-2 py-1 border border-gray-300 rounded text-sm" value="${description}">
                    </div>
                    <div class="col-span-2">
                        <label class="block text-xs text-gray-500">Menge</label>
                        <input type="number" class="item-quantity w-full px-2 py-1 border border-gray-300 rounded text-sm" value="${quantity}" step="0.01">
                    </div>
                    <div class="col-span-2">
                        <label class="block text-xs text-gray-500">Einzelpreis</label>
                        <input type="number" class="item-unit-price w-full px-2 py-1 border border-gray-300 rounded text-sm" value="${unitPrice}" step="0.01">
                    </div>
                    <div class="col-span-2">
                        <label class="block text-xs text-gray-500">Summe</label>
                        <input type="number" class="item-total w-full px-2 py-1 border border-gray-300 rounded text-sm bg-gray-100" readonly value="${total.toFixed(2)}">
                    </div>
                    <div class="col-span-1">
                        <button type="button" class="text-red-600 hover:text-red-800 p-1">
                            <i class="fas fa-trash text-xs"></i>
                        </button>
                    </div>
                </div>
            `;
            
            itemsContainer.insertAdjacentHTML('beforeend', itemHtml);
        });
        
        console.log('5. Final check...');
        const addedItems = document.querySelectorAll('.test-item');
        console.log(`Added ${addedItems.length} items to container`);
        
        addedItems.forEach((item, index) => {
            const desc = item.querySelector('.item-description').value;
            const qty = item.querySelector('.item-quantity').value;
            const price = item.querySelector('.item-unit-price').value;
            console.log(`Item ${index + 1}: "${desc}", Qty: ${qty}, Price: ${price}`);
        });
        
    } catch (error) {
        console.error('Debug error:', error);
    }
};

console.log('Debug function available as: debugInvoiceModal()');