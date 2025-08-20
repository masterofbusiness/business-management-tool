// Business Management Tool - Frontend JavaScript
// Global state
let currentCustomers = [];
let currentTimeEntries = [];
let currentProjects = [];
let timerInterval = null;
let timerStartTime = null;
let timerSeconds = 0;
let isTimerRunning = false;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    loadDashboard();
    initializeDatabase();
    loadCompanySettings();
});

// Tab management
function showTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active-tab');
        tab.classList.add('tab');
    });
    
    // Show selected tab content
    document.getElementById(tabName).classList.remove('hidden');
    
    // Add active class to clicked tab
    event.target.classList.add('active-tab');
    
    // Load data for specific tabs
    switch(tabName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'customers':
            loadCustomers();
            break;
        case 'timetracking':
            loadTimeEntries();
            break;
        case 'projects':
            loadProjects();
            break;
        case 'invoices':
            loadInvoices();
            break;
        case 'quotes':
            loadQuotes();
            break;
        case 'accounting':
            loadAccountingData();
            break;
    }
}

// Utility functions
function updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleString('de-CH', {
        weekday: 'short',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
    document.getElementById('current-time').textContent = timeString;
}

function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}h`;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('de-CH', {
        style: 'currency',
        currency: 'CHF'
    }).format(amount || 0);
}

// Database initialization
async function initializeDatabase() {
    try {
        const response = await axios.get('/api/init-db');
        console.log('Database initialized:', response.data);
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}

// Dashboard functions
async function loadDashboard() {
    try {
        // Load all data needed for dashboard
        await Promise.all([
            loadCustomers(),
            loadTimeEntries(),
            loadProjects()
        ]);
        
        updateDashboardStats();
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function updateDashboardStats() {
    // Update customer count
    document.getElementById('total-customers').textContent = currentCustomers.length;
    
    // Update active projects count
    const activeProjects = currentProjects.filter(p => p.status === 'active');
    document.getElementById('active-projects').textContent = activeProjects.length;
    
    // Calculate weekly hours
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const weeklyMinutes = currentTimeEntries
        .filter(entry => new Date(entry.start_time) >= oneWeekAgo)
        .reduce((total, entry) => total + (entry.duration_minutes || 0), 0);
    
    document.getElementById('weekly-hours').textContent = (weeklyMinutes / 60).toFixed(1);
    
    // Calculate monthly revenue (simplified)
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const monthlyRevenue = currentTimeEntries
        .filter(entry => new Date(entry.start_time) >= oneMonthAgo && entry.is_billable)
        .reduce((total, entry) => {
            const hours = (entry.duration_minutes || 0) / 60;
            return total + (hours * (entry.hourly_rate || 0));
        }, 0);
    
    document.getElementById('monthly-revenue').textContent = formatCurrency(monthlyRevenue);
    
    // Update recent time entries
    const recentEntries = currentTimeEntries.slice(0, 5);
    const recentEntriesHtml = recentEntries.map(entry => `
        <div class="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
            <div>
                <p class="text-sm font-medium text-gray-900">${entry.company_name || 'Unbekannt'}</p>
                <p class="text-xs text-gray-500">${entry.description}</p>
            </div>
            <div class="text-right">
                <p class="text-sm text-gray-900">${formatDuration(entry.duration_minutes || 0)}</p>
                <p class="text-xs text-gray-500">${new Date(entry.start_time).toLocaleDateString('de-CH')}</p>
            </div>
        </div>
    `).join('');
    
    document.getElementById('recent-time-entries').innerHTML = recentEntries.length > 0 
        ? recentEntriesHtml 
        : '<p class="text-gray-500 text-center py-4">Keine Zeiteinträge vorhanden</p>';
}

// Customer management
async function loadCustomers() {
    try {
        const response = await axios.get('/api/customers');
        currentCustomers = response.data.customers || [];
        renderCustomersTable();
    } catch (error) {
        console.error('Error loading customers:', error);
        currentCustomers = [];
    }
}

function renderCustomersTable() {
    const tableBody = document.getElementById('customers-table');
    if (!tableBody) return;
    
    if (currentCustomers.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                    Keine Kunden vorhanden. <a href="#" onclick="showCustomerModal()" class="text-blue-600 hover:text-blue-800">Ersten Kunden anlegen</a>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = currentCustomers.map(customer => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${customer.company_name}</div>
                <div class="text-sm text-gray-500">${customer.city || ''}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${customer.contact_person || '-'}</div>
                <div class="text-sm text-gray-500">${customer.phone || ''}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${customer.email || '-'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${formatCurrency(customer.hourly_rate)}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button onclick="editCustomer(${customer.id})" class="text-blue-600 hover:text-blue-900">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteCustomer(${customer.id})" class="text-red-600 hover:text-red-900">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function showCustomerModal(customerId = null) {
    const customer = customerId ? currentCustomers.find(c => c.id === customerId) : null;
    const isEdit = !!customer;
    
    const modalHtml = `
        <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" id="customer-modal">
            <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div class="mt-3">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">
                        ${isEdit ? 'Kunde bearbeiten' : 'Neuer Kunde'}
                    </h3>
                    <form id="customer-form">
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Firmenname *</label>
                                <input type="text" id="company_name" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value="${customer?.company_name || ''}">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Ansprechpartner</label>
                                <input type="text" id="contact_person" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value="${customer?.contact_person || ''}">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">E-Mail</label>
                                <input type="email" id="email" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value="${customer?.email || ''}">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Telefon</label>
                                <input type="tel" id="phone" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value="${customer?.phone || ''}">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Adresse</label>
                                <input type="text" id="address" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value="${customer?.address || ''}">
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Stadt</label>
                                    <input type="text" id="city" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value="${customer?.city || ''}">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">PLZ</label>
                                    <input type="text" id="postal_code" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value="${customer?.postal_code || ''}">
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Land</label>
                                <input type="text" id="country" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value="${customer?.country || 'Schweiz'}">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Stundensatz (CHF)</label>
                                <input type="number" id="hourly_rate" step="0.01" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value="${customer?.hourly_rate || ''}">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Notizen</label>
                                <textarea id="notes" rows="3" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">${customer?.notes || ''}</textarea>
                            </div>
                        </div>
                        <div class="flex justify-end space-x-3 mt-6">
                            <button type="button" onclick="closeModal('customer-modal')" class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
                                Abbrechen
                            </button>
                            <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                ${isEdit ? 'Aktualisieren' : 'Erstellen'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modal-container').innerHTML = modalHtml;
    
    document.getElementById('customer-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveCustomer(customerId);
    });
}

async function saveCustomer(customerId = null) {
    const formData = {
        company_name: document.getElementById('company_name').value,
        contact_person: document.getElementById('contact_person').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        city: document.getElementById('city').value,
        postal_code: document.getElementById('postal_code').value,
        country: document.getElementById('country').value,
        hourly_rate: parseFloat(document.getElementById('hourly_rate').value) || 0,
        notes: document.getElementById('notes').value
    };
    
    try {
        if (customerId) {
            await axios.put(`/api/customers/${customerId}`, formData);
        } else {
            await axios.post('/api/customers', formData);
        }
        
        closeModal('customer-modal');
        await loadCustomers();
        showNotification('Kunde erfolgreich gespeichert!', 'success');
    } catch (error) {
        console.error('Error saving customer:', error);
        showNotification('Fehler beim Speichern des Kunden', 'error');
    }
}

function editCustomer(customerId) {
    showCustomerModal(customerId);
}

async function deleteCustomer(customerId) {
    if (!confirm('Sind Sie sicher, dass Sie diesen Kunden löschen möchten?')) {
        return;
    }
    
    try {
        await axios.delete(`/api/customers/${customerId}`);
        await loadCustomers();
        showNotification('Kunde erfolgreich gelöscht!', 'success');
    } catch (error) {
        console.error('Error deleting customer:', error);
        showNotification('Fehler beim Löschen des Kunden', 'error');
    }
}

// Time tracking functions
async function loadTimeEntries() {
    try {
        const response = await axios.get('/api/time-entries');
        currentTimeEntries = response.data.timeEntries || [];
        renderTimeEntriesTable();
    } catch (error) {
        console.error('Error loading time entries:', error);
        currentTimeEntries = [];
    }
}

function renderTimeEntriesTable() {
    const tableBody = document.getElementById('timeentries-table');
    if (!tableBody) return;
    
    if (currentTimeEntries.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                    Keine Zeiteinträge vorhanden. <a href="#" onclick="showTimeEntryModal()" class="text-blue-600 hover:text-blue-800">Ersten Eintrag erstellen</a>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = currentTimeEntries.map(entry => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${new Date(entry.start_time).toLocaleDateString('de-CH')}</div>
                <div class="text-sm text-gray-500">${new Date(entry.start_time).toLocaleTimeString('de-CH', {hour: '2-digit', minute: '2-digit'})}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${entry.company_name || 'Unbekannt'}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-gray-900">${entry.description}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${formatDuration(entry.duration_minutes || 0)}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${entry.is_billed ? 'bg-green-100 text-green-800' : (entry.is_billable ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800')}">
                    ${entry.is_billed ? 'Berechnet' : (entry.is_billable ? 'Abrechenbar' : 'Nicht abrechenbar')}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button onclick="editTimeEntry(${entry.id})" class="text-blue-600 hover:text-blue-900">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteTimeEntry(${entry.id})" class="text-red-600 hover:text-red-900">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function showTimeEntryModal(entryId = null) {
    const entry = entryId ? currentTimeEntries.find(e => e.id === entryId) : null;
    const isEdit = !!entry;
    
    // Create customer options
    const customerOptions = currentCustomers.map(customer => 
        `<option value="${customer.id}" ${entry?.customer_id === customer.id ? 'selected' : ''}>${customer.company_name}</option>`
    ).join('');
    
    const modalHtml = `
        <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" id="timeentry-modal">
            <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div class="mt-3">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">
                        ${isEdit ? 'Zeiteintrag bearbeiten' : 'Neuer Zeiteintrag'}
                    </h3>
                    <form id="timeentry-form">
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Kunde *</label>
                                <select id="customer_id" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
                                    <option value="">Kunde auswählen</option>
                                    ${customerOptions}
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Beschreibung *</label>
                                <textarea id="description" required rows="3" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Was wurde gemacht?">${entry?.description || ''}</textarea>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Startzeit</label>
                                    <input type="datetime-local" id="start_time" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value="${entry?.start_time ? new Date(entry.start_time).toISOString().slice(0, 16) : ''}">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Endzeit</label>
                                    <input type="datetime-local" id="end_time" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value="${entry?.end_time ? new Date(entry.end_time).toISOString().slice(0, 16) : ''}">
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Dauer (Minuten)</label>
                                <input type="number" id="duration_minutes" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value="${entry?.duration_minutes || ''}">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Stundensatz (CHF)</label>
                                <input type="number" id="hourly_rate" step="0.01" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value="${entry?.hourly_rate || ''}">
                            </div>
                            <div class="flex items-center">
                                <input type="checkbox" id="is_billable" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" ${entry?.is_billable !== 0 ? 'checked' : ''}>
                                <label for="is_billable" class="ml-2 block text-sm text-gray-900">Abrechenbar</label>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Notizen</label>
                                <textarea id="notes" rows="2" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">${entry?.notes || ''}</textarea>
                            </div>
                        </div>
                        <div class="flex justify-end space-x-3 mt-6">
                            <button type="button" onclick="closeModal('timeentry-modal')" class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
                                Abbrechen
                            </button>
                            <button type="submit" class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                                ${isEdit ? 'Aktualisieren' : 'Erstellen'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modal-container').innerHTML = modalHtml;
    
    document.getElementById('timeentry-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveTimeEntry(entryId);
    });
}

async function saveTimeEntry(entryId = null) {
    const formData = {
        customer_id: parseInt(document.getElementById('customer_id').value),
        description: document.getElementById('description').value,
        start_time: document.getElementById('start_time').value,
        end_time: document.getElementById('end_time').value,
        duration_minutes: parseInt(document.getElementById('duration_minutes').value) || null,
        hourly_rate: parseFloat(document.getElementById('hourly_rate').value) || null,
        is_billable: document.getElementById('is_billable').checked ? 1 : 0,
        notes: document.getElementById('notes').value
    };
    
    try {
        if (entryId) {
            await axios.put(`/api/time-entries/${entryId}`, formData);
        } else {
            await axios.post('/api/time-entries', formData);
        }
        
        closeModal('timeentry-modal');
        await loadTimeEntries();
        showNotification('Zeiteintrag erfolgreich gespeichert!', 'success');
    } catch (error) {
        console.error('Error saving time entry:', error);
        showNotification('Fehler beim Speichern des Zeiteintrags', 'error');
    }
}

// Timer functions
function startTimer() {
    if (isTimerRunning) return;
    
    isTimerRunning = true;
    timerStartTime = Date.now() - (timerSeconds * 1000);
    
    document.getElementById('timer-start').disabled = true;
    document.getElementById('timer-stop').disabled = false;
    
    timerInterval = setInterval(() => {
        timerSeconds = Math.floor((Date.now() - timerStartTime) / 1000);
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    if (!isTimerRunning) return;
    
    isTimerRunning = false;
    clearInterval(timerInterval);
    
    document.getElementById('timer-start').disabled = false;
    document.getElementById('timer-stop').disabled = true;
    
    // Optionally show modal to save time entry
    if (timerSeconds > 60) { // Only if more than 1 minute
        showTimerSaveModal();
    }
}

function resetTimer() {
    stopTimer();
    timerSeconds = 0;
    updateTimerDisplay();
    document.getElementById('timer-description').value = '';
}

function updateTimerDisplay() {
    const hours = Math.floor(timerSeconds / 3600);
    const minutes = Math.floor((timerSeconds % 3600) / 60);
    const seconds = timerSeconds % 60;
    
    const display = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('timer-display').textContent = display;
}

function showTimerSaveModal() {
    const description = document.getElementById('timer-description').value;
    const durationMinutes = Math.floor(timerSeconds / 60);
    
    // Ensure we have customers loaded
    if (currentCustomers.length === 0) {
        showNotification('Bitte erst Kunden anlegen, bevor Timer gespeichert werden können', 'error');
        return;
    }
    
    const customerOptions = currentCustomers.map(customer => 
        `<option value="${customer.id}">${customer.company_name}</option>`
    ).join('');
    
    // Also load projects for selection
    const projectOptions = currentProjects.map(project => 
        `<option value="${project.id}" data-customer="${project.customer_id}">${project.name} (${project.company_name})</option>`
    ).join('');
    
    const modalHtml = `
        <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" id="timer-save-modal">
            <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div class="mt-3">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">
                        <i class="fas fa-clock text-green-600 mr-2"></i>
                        Timer speichern
                    </h3>
                    <form id="timer-save-form">
                        <div class="space-y-4">
                            <div class="bg-green-50 p-3 rounded-md">
                                <div class="flex items-center">
                                    <i class="fas fa-stopwatch text-green-600 mr-2"></i>
                                    <span class="text-sm text-green-800">Erfasste Zeit:</span>
                                    <span class="text-lg font-bold text-green-900 ml-2">${formatDuration(durationMinutes)}</span>
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Kunde *</label>
                                <select id="timer_customer_id" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
                                    <option value="">Kunde auswählen</option>
                                    ${customerOptions}
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Projekt (optional)</label>
                                <select id="timer_project_id" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
                                    <option value="">Kein Projekt</option>
                                    ${projectOptions}
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Beschreibung der Tätigkeit *</label>
                                <textarea id="timer_description" required rows="3" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Was wurde gemacht?">${description}</textarea>
                            </div>
                            <div class="flex items-center">
                                <input type="checkbox" id="timer_is_billable" class="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded" checked>
                                <label for="timer_is_billable" class="ml-2 block text-sm text-gray-900">Abrechenbar</label>
                            </div>
                        </div>
                        <div class="flex justify-end space-x-3 mt-6">
                            <button type="button" onclick="discardTimer()" class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
                                <i class="fas fa-trash mr-1"></i>Verwerfen
                            </button>
                            <button type="submit" class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                                <i class="fas fa-save mr-1"></i>Speichern
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modal-container').innerHTML = modalHtml;
    
    document.getElementById('timer-save-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveTimerEntry(durationMinutes);
    });
    
    // Update projects when customer changes
    document.getElementById('timer_customer_id').addEventListener('change', function() {
        const customerId = this.value;
        const projectSelect = document.getElementById('timer_project_id');
        const options = projectSelect.querySelectorAll('option[data-customer]');
        
        options.forEach(option => {
            if (option.dataset.customer === customerId || !customerId) {
                option.style.display = 'block';
            } else {
                option.style.display = 'none';
            }
        });
        
        if (customerId) {
            projectSelect.value = '';
        }
    });
}

async function saveTimerEntry(durationMinutes) {
    const customerId = document.getElementById('timer_customer_id').value;
    const projectId = document.getElementById('timer_project_id').value;
    const description = document.getElementById('timer_description').value;
    const isBillable = document.getElementById('timer_is_billable').checked;
    
    if (!customerId || !description) {
        showNotification('Bitte Kunde und Beschreibung ausfüllen', 'error');
        return;
    }
    
    const now = new Date();
    const startTime = new Date(now.getTime() - (durationMinutes * 60000));
    
    // Get customer's hourly rate
    const customer = currentCustomers.find(c => c.id == customerId);
    const hourlyRate = customer ? customer.hourly_rate : 0;
    
    const formData = {
        customer_id: parseInt(customerId),
        project_id: projectId ? parseInt(projectId) : null,
        description: description,
        start_time: startTime.toISOString(),
        end_time: now.toISOString(),
        duration_minutes: durationMinutes,
        hourly_rate: hourlyRate,
        is_billable: isBillable ? 1 : 0
    };
    
    try {
        await axios.post('/api/time-entries', formData);
        closeModal('timer-save-modal');
        resetTimer();
        await loadTimeEntries();
        showNotification(`Zeiteintrag erfolgreich gespeichert! (${formatDuration(durationMinutes)})`, 'success');
    } catch (error) {
        console.error('Error saving timer entry:', error);
        showNotification('Fehler beim Speichern des Zeiteintrags', 'error');
    }
}

function discardTimer() {
    if (confirm('Möchten Sie die erfasste Zeit wirklich verwerfen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
        closeModal('timer-save-modal');
        resetTimer();
        showNotification('Timer wurde zurückgesetzt', 'info');
    }
}

// Project management
async function loadProjects() {
    try {
        const response = await axios.get('/api/projects');
        currentProjects = response.data.projects || [];
        renderProjectsGrid();
    } catch (error) {
        console.error('Error loading projects:', error);
        currentProjects = [];
    }
}

function renderProjectsGrid() {
    const grid = document.getElementById('projects-grid');
    if (!grid) return;
    
    if (currentProjects.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <p class="text-gray-500 mb-4">Keine Projekte vorhanden.</p>
                <button onclick="showProjectModal()" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg">
                    <i class="fas fa-plus mr-2"></i>Erstes Projekt erstellen
                </button>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = currentProjects.map(project => `
        <div class="bg-white rounded-lg shadow p-6">
            <div class="flex justify-between items-start mb-4">
                <h3 class="text-lg font-medium text-gray-900">${project.name}</h3>
                <span class="px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(project.status)}">
                    ${getStatusText(project.status)}
                </span>
            </div>
            <p class="text-sm text-gray-600 mb-4">${project.description || 'Keine Beschreibung'}</p>
            <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                    <span class="text-gray-500">Kunde:</span>
                    <span class="font-medium">${project.company_name}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-500">Budget:</span>
                    <span class="font-medium">${formatCurrency(project.budget)}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-500">Stundensatz:</span>
                    <span class="font-medium">${formatCurrency(project.hourly_rate)}</span>
                </div>
            </div>
            <div class="mt-4 flex justify-end space-x-2">
                <button onclick="editProject(${project.id})" class="text-blue-600 hover:text-blue-800">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteProject(${project.id})" class="text-red-600 hover:text-red-800">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function getStatusColor(status) {
    switch(status) {
        case 'active': return 'bg-green-100 text-green-800';
        case 'completed': return 'bg-blue-100 text-blue-800';
        case 'paused': return 'bg-yellow-100 text-yellow-800';
        case 'cancelled': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

function getStatusText(status) {
    switch(status) {
        case 'active': return 'Aktiv';
        case 'completed': return 'Abgeschlossen';
        case 'paused': return 'Pausiert';
        case 'cancelled': return 'Abgebrochen';
        default: return 'Unbekannt';
    }
}

function showProjectModal(projectId = null) {
    const project = projectId ? currentProjects.find(p => p.id === projectId) : null;
    const isEdit = !!project;
    
    const customerOptions = currentCustomers.map(customer => 
        `<option value="${customer.id}" ${project?.customer_id === customer.id ? 'selected' : ''}>${customer.company_name}</option>`
    ).join('');
    
    const modalHtml = `
        <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" id="project-modal">
            <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div class="mt-3">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">
                        ${isEdit ? 'Projekt bearbeiten' : 'Neues Projekt'}
                    </h3>
                    <form id="project-form">
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Kunde *</label>
                                <select id="project_customer_id" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
                                    <option value="">Kunde auswählen</option>
                                    ${customerOptions}
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Projektname *</label>
                                <input type="text" id="project_name" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value="${project?.name || ''}">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Beschreibung</label>
                                <textarea id="project_description" rows="3" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">${project?.description || ''}</textarea>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Budget (CHF)</label>
                                    <input type="number" id="project_budget" step="0.01" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value="${project?.budget || ''}">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Stundensatz (CHF)</label>
                                    <input type="number" id="project_hourly_rate" step="0.01" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value="${project?.hourly_rate || ''}">
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Status</label>
                                <select id="project_status" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
                                    <option value="active" ${project?.status === 'active' ? 'selected' : ''}>Aktiv</option>
                                    <option value="completed" ${project?.status === 'completed' ? 'selected' : ''}>Abgeschlossen</option>
                                    <option value="paused" ${project?.status === 'paused' ? 'selected' : ''}>Pausiert</option>
                                    <option value="cancelled" ${project?.status === 'cancelled' ? 'selected' : ''}>Abgebrochen</option>
                                </select>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Startdatum</label>
                                    <input type="date" id="project_start_date" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value="${project?.start_date || ''}">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Enddatum</label>
                                    <input type="date" id="project_end_date" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value="${project?.end_date || ''}">
                                </div>
                            </div>
                        </div>
                        <div class="flex justify-end space-x-3 mt-6">
                            <button type="button" onclick="closeModal('project-modal')" class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
                                Abbrechen
                            </button>
                            <button type="submit" class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
                                ${isEdit ? 'Aktualisieren' : 'Erstellen'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modal-container').innerHTML = modalHtml;
    
    document.getElementById('project-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveProject(projectId);
    });
}

async function saveProject(projectId = null) {
    const formData = {
        customer_id: parseInt(document.getElementById('project_customer_id').value),
        name: document.getElementById('project_name').value,
        description: document.getElementById('project_description').value,
        budget: parseFloat(document.getElementById('project_budget').value) || null,
        hourly_rate: parseFloat(document.getElementById('project_hourly_rate').value) || null,
        status: document.getElementById('project_status').value,
        start_date: document.getElementById('project_start_date').value || null,
        end_date: document.getElementById('project_end_date').value || null
    };
    
    try {
        if (projectId) {
            await axios.put(`/api/projects/${projectId}`, formData);
        } else {
            await axios.post('/api/projects', formData);
        }
        
        closeModal('project-modal');
        await loadProjects();
        showNotification('Projekt erfolgreich gespeichert!', 'success');
    } catch (error) {
        console.error('Error saving project:', error);
        showNotification('Fehler beim Speichern des Projekts', 'error');
    }
}

// Utility functions
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-md text-white ${
        type === 'success' ? 'bg-green-500' : 
        type === 'error' ? 'bg-red-500' : 
        'bg-blue-500'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Global state for invoices and quotes
let currentInvoices = [];
let currentQuotes = [];

// Invoice management
async function loadInvoices() {
    try {
        const response = await axios.get('/api/invoices');
        currentInvoices = response.data.invoices || [];
        renderInvoicesTable();
    } catch (error) {
        console.error('Error loading invoices:', error);
        currentInvoices = [];
    }
}

function renderInvoicesTable() {
    const tableBody = document.getElementById('invoices-table');
    if (!tableBody) return;
    
    if (currentInvoices.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-4 text-center text-gray-500">
                    Keine Rechnungen vorhanden. <a href="#" onclick="showInvoiceModal()" class="text-orange-600 hover:text-orange-800">Erste Rechnung erstellen</a>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = currentInvoices.map(invoice => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${invoice.invoice_number}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${invoice.company_name || 'Unbekannt'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${new Date(invoice.issue_date).toLocaleDateString('de-CH')}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('de-CH') : '-'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${formatCurrency(invoice.total_amount)}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getInvoiceStatusColor(invoice.status)}">
                    ${getInvoiceStatusText(invoice.status)}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button onclick="viewInvoice(${invoice.id})" class="text-blue-600 hover:text-blue-900" title="Anzeigen">
                    <i class="fas fa-eye"></i>
                </button>
                <button onclick="editInvoice(${invoice.id})" class="text-indigo-600 hover:text-indigo-900" title="Bearbeiten">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="generateInvoicePDF(${invoice.id})" class="text-green-600 hover:text-green-900" title="PDF">
                    <i class="fas fa-file-pdf"></i>
                </button>
                <button onclick="deleteInvoice(${invoice.id})" class="text-red-600 hover:text-red-900" title="Löschen">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function getInvoiceStatusColor(status) {
    switch(status) {
        case 'draft': return 'bg-gray-100 text-gray-800';
        case 'sent': return 'bg-blue-100 text-blue-800';
        case 'paid': return 'bg-green-100 text-green-800';
        case 'overdue': return 'bg-red-100 text-red-800';
        case 'cancelled': return 'bg-yellow-100 text-yellow-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

function getInvoiceStatusText(status) {
    switch(status) {
        case 'draft': return 'Entwurf';
        case 'sent': return 'Versendet';
        case 'paid': return 'Bezahlt';
        case 'overdue': return 'Überfällig';
        case 'cancelled': return 'Storniert';
        default: return 'Unbekannt';
    }
}

async function showInvoiceModal(invoiceId = null) {
    let invoice = null;
    let invoiceItems = [];
    
    // Load invoice details if editing
    if (invoiceId) {
        try {
            const response = await axios.get(`/api/invoices/${invoiceId}`);
            invoice = response.data.invoice;
            invoiceItems = response.data.items || [];
        } catch (error) {
            console.error('Error loading invoice details:', error);
            showNotification('Fehler beim Laden der Rechnungsdetails', 'error');
            return;
        }
    }
    
    const isEdit = !!invoice;
    
    const customerOptions = currentCustomers.map(customer => 
        `<option value="${customer.id}" ${invoice?.customer_id === customer.id ? 'selected' : ''}>${customer.company_name}</option>`
    ).join('');
    
    const modalHtml = `
        <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" id="invoice-modal">
            <div class="relative top-10 mx-auto p-5 border max-w-4xl shadow-lg rounded-md bg-white">
                <div class="mt-3">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">
                        <i class="fas fa-file-invoice text-orange-600 mr-2"></i>
                        ${isEdit ? 'Rechnung bearbeiten' : 'Neue Rechnung'}
                    </h3>
                    <form id="invoice-form">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Kunde *</label>
                                    <select id="invoice_customer_id" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
                                        <option value="">Kunde auswählen</option>
                                        ${customerOptions}
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Rechnungsdatum</label>
                                    <input type="date" id="invoice_issue_date" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" 
                                           value="${invoice?.issue_date || new Date().toISOString().split('T')[0]}">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Fälligkeitsdatum</label>
                                    <input type="date" id="invoice_due_date" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" 
                                           value="${invoice?.due_date || ''}">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Status</label>
                                    <select id="invoice_status" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
                                        <option value="draft" ${invoice?.status === 'draft' ? 'selected' : ''}>Entwurf</option>
                                        <option value="sent" ${invoice?.status === 'sent' ? 'selected' : ''}>Versendet</option>
                                        <option value="paid" ${invoice?.status === 'paid' ? 'selected' : ''}>Bezahlt</option>
                                        <option value="overdue" ${invoice?.status === 'overdue' ? 'selected' : ''}>Überfällig</option>
                                        <option value="cancelled" ${invoice?.status === 'cancelled' ? 'selected' : ''}>Storniert</option>
                                    </select>
                                </div>
                            </div>
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">MwSt.-Satz (%)</label>
                                    <input type="number" id="invoice_tax_rate" step="0.1" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" 
                                           value="${invoice?.tax_rate || 8.1}">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Zahlungsbedingungen</label>
                                    <input type="text" id="invoice_payment_terms" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" 
                                           value="${invoice?.payment_terms || '30 Tage'}" placeholder="z.B. 30 Tage">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Notizen</label>
                                    <textarea id="invoice_notes" rows="4" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" 
                                              placeholder="Zusätzliche Notizen...">${invoice?.notes || ''}</textarea>
                                </div>
                            </div>
                        </div>
                        
                        <div class="mt-6">
                            <div class="flex justify-between items-center mb-4">
                                <h4 class="text-md font-medium text-gray-900">Rechnungsposten</h4>
                                <button type="button" onclick="addInvoiceItem()" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm">
                                    <i class="fas fa-plus mr-1"></i>Position hinzufügen
                                </button>
                            </div>
                            <div id="invoice-items" class="space-y-3">
                                <!-- Invoice items will be added here -->
                            </div>
                        </div>
                        
                        <div class="mt-6 p-4 bg-gray-50 rounded-md">
                            <div class="text-right space-y-2">
                                <div class="flex justify-between">
                                    <span>Zwischensumme:</span>
                                    <span id="invoice-subtotal" class="font-medium">0.00 CHF</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>MwSt.:</span>
                                    <span id="invoice-tax" class="font-medium">0.00 CHF</span>
                                </div>
                                <div class="flex justify-between text-lg font-bold border-t pt-2">
                                    <span>Gesamtbetrag:</span>
                                    <span id="invoice-total">0.00 CHF</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="flex justify-end space-x-3 mt-6">
                            <button type="button" onclick="closeModal('invoice-modal')" class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
                                Abbrechen
                            </button>
                            <button type="submit" class="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700">
                                ${isEdit ? 'Aktualisieren' : 'Erstellen'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modal-container').innerHTML = modalHtml;
    
    // Wait for DOM to be ready, then load items
    setTimeout(() => {
        // Load existing items or add initial item
        if (isEdit && invoiceItems.length > 0) {
            // Clear container first to be safe
            const container = document.getElementById('invoice-items');
            if (container) {
                container.innerHTML = '';
            }
            
            // Load existing items
            invoiceItems.forEach((item) => {
                addInvoiceItem(item);
            });
            calculateInvoiceTotals();
        } else {
            // Add initial empty item for new invoices
            addInvoiceItem();
        }
    }, 100); // Small delay to ensure DOM is ready
    
    document.getElementById('invoice-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveInvoice(invoiceId);
    });
}

function addInvoiceItem(itemData = null) {
    const itemsContainer = document.getElementById('invoice-items');
    const itemId = itemData?.id || Date.now();
    
    // Use existing data or defaults
    const description = itemData?.description || '';
    const quantity = itemData?.quantity || 1;
    const unitPrice = itemData?.unit_price || 0;
    const total = itemData ? (itemData.quantity * itemData.unit_price) : 0;
    
    const itemHtml = `
        <div class="invoice-item grid grid-cols-12 gap-2 items-end" data-item-id="${itemId}">
            <div class="col-span-5">
                <label class="block text-xs text-gray-500">Beschreibung</label>
                <input type="text" class="item-description w-full px-2 py-1 border border-gray-300 rounded text-sm" placeholder="Leistung/Artikel" value="${description}">
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
                <button type="button" onclick="removeInvoiceItem(${itemId})" class="text-red-600 hover:text-red-800 p-1">
                    <i class="fas fa-trash text-xs"></i>
                </button>
            </div>
        </div>
    `;
    
    itemsContainer.insertAdjacentHTML('beforeend', itemHtml);
    
    // Add event listeners for calculation
    const item = itemsContainer.querySelector(`[data-item-id="${itemId}"]`);
    const quantityInput = item.querySelector('.item-quantity');
    const priceInput = item.querySelector('.item-unit-price');
    
    [quantityInput, priceInput].forEach(input => {
        input.addEventListener('input', calculateInvoiceTotals);
    });
    
    calculateInvoiceTotals();
}

function removeInvoiceItem(itemId) {
    document.querySelector(`[data-item-id="${itemId}"]`).remove();
    calculateInvoiceTotals();
}

function calculateInvoiceTotals() {
    const items = document.querySelectorAll('.invoice-item');
    let subtotal = 0;
    
    items.forEach(item => {
        const quantity = parseFloat(item.querySelector('.item-quantity').value) || 0;
        const unitPrice = parseFloat(item.querySelector('.item-unit-price').value) || 0;
        const total = quantity * unitPrice;
        
        item.querySelector('.item-total').value = total.toFixed(2);
        subtotal += total;
    });
    
    const taxRate = parseFloat(document.getElementById('invoice_tax_rate').value) || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount;
    
    document.getElementById('invoice-subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('invoice-tax').textContent = formatCurrency(taxAmount);
    document.getElementById('invoice-total').textContent = formatCurrency(totalAmount);
}

async function saveInvoice(invoiceId = null) {
    const items = [];
    document.querySelectorAll('.invoice-item').forEach(item => {
        const description = item.querySelector('.item-description').value;
        const quantity = parseFloat(item.querySelector('.item-quantity').value) || 0;
        const unitPrice = parseFloat(item.querySelector('.item-unit-price').value) || 0;
        const total = quantity * unitPrice;
        
        if (description && quantity > 0) {
            items.push({ description, quantity, unit_price: unitPrice, total });
        }
    });
    
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxRate = parseFloat(document.getElementById('invoice_tax_rate').value) || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount;
    
    const formData = {
        customer_id: parseInt(document.getElementById('invoice_customer_id').value),
        issue_date: document.getElementById('invoice_issue_date').value,
        due_date: document.getElementById('invoice_due_date').value || null,
        status: document.getElementById('invoice_status').value,
        payment_terms: document.getElementById('invoice_payment_terms').value,
        notes: document.getElementById('invoice_notes').value,
        tax_rate: taxRate,
        subtotal: subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        items: items
    };
    
    try {
        if (invoiceId) {
            await axios.put(`/api/invoices/${invoiceId}`, formData);
        } else {
            await axios.post('/api/invoices', formData);
        }
        
        closeModal('invoice-modal');
        await loadInvoices();
        showNotification('Rechnung erfolgreich gespeichert!', 'success');
    } catch (error) {
        console.error('Error saving invoice:', error);
        showNotification('Fehler beim Speichern der Rechnung', 'error');
    }
}

function editInvoice(id) {
    showInvoiceModal(id);
}

async function viewInvoice(id) {
    try {
        const response = await axios.get(`/api/invoices/${id}`);
        const invoice = response.data.invoice;
        const items = response.data.items || [];
        
        // Load company settings for professional preview
        await loadCompanySettings();
        showInvoicePreviewModal(invoice, items);
    } catch (error) {
        console.error('Error loading invoice for preview:', error);
        showNotification('Fehler beim Laden der Rechnungsvorschau', 'error');
    }
}

function showInvoicePreviewModal(invoice, items) {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = subtotal * (invoice.tax_rate / 100);
    const totalAmount = subtotal + taxAmount;
    
    // Use company settings for professional look
    const companySettings = currentCompanySettings || {};
    
    const modalHtml = `
        <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" id="invoice-preview-modal">
            <div class="relative top-5 mx-auto p-4 border max-w-5xl shadow-2xl rounded-lg bg-white" style="min-height: 90vh;">
                <!-- Modal Header -->
                <div class="flex justify-between items-center mb-6 pb-4 border-b">
                    <h3 class="text-xl font-bold text-gray-900">
                        <i class="fas fa-eye text-blue-600 mr-2"></i>
                        Rechnungsvorschau - ${invoice.invoice_number}
                    </h3>
                    <div class="flex space-x-2">
                        <button onclick="generateInvoicePDF(${invoice.id})" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
                            <i class="fas fa-file-pdf mr-2"></i>PDF Export
                        </button>
                        <button onclick="closeModal('invoice-preview-modal')" class="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg">
                            <i class="fas fa-times mr-2"></i>Schließen
                        </button>
                    </div>
                </div>
                
                <!-- Professional Invoice Preview (matches PDF design) -->
                <div class="bg-white border border-gray-200 rounded-lg overflow-hidden" style="font-family: 'Helvetica', Arial, sans-serif;">
                    <!-- Compact Header with Logo left and Invoice Number right -->
                    <div class="flex justify-between items-start p-6 pb-4 border-b border-gray-200">
                        <div class="flex items-center space-x-4">
                            ${companySettings.logo_url ? `
                                <img src="${companySettings.logo_url}" alt="Firmenlogo" class="h-12 max-w-32 object-contain">
                            ` : ''}
                            <div>
                                <h1 class="text-xl font-semibold text-gray-900">RECHNUNG</h1>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="text-lg font-bold text-gray-900">${invoice.invoice_number}</p>
                        </div>
                    </div>
                    
                    <!-- Customer Address Section with Invoice Metadata -->
                    <div class="p-6 pb-4">
                        <div class="flex justify-between items-start">
                            <!-- Customer Address -->
                            <div class="w-2/3">
                                <h3 class="text-sm font-semibold mb-3 text-gray-800">Rechnungsadresse:</h3>
                                <div class="bg-gray-50 p-4 rounded border-l-3 border-blue-500">
                                    <p class="font-bold text-gray-900 mb-1">${invoice.company_name}</p>
                                    ${invoice.contact_person ? `<p class="text-gray-700 text-sm mb-1">${invoice.contact_person}</p>` : ''}
                                    ${invoice.address ? `<p class="text-gray-700 text-sm mb-1">${invoice.address}</p>` : ''}
                                    ${invoice.postal_code && invoice.city ? `<p class="text-gray-700 text-sm mb-1">${invoice.postal_code} ${invoice.city}</p>` : ''}
                                    ${invoice.country ? `<p class="text-gray-700 text-sm mb-1">${invoice.country}</p>` : ''}
                                    ${invoice.email ? `<p class="text-gray-600 text-xs"><strong>E-Mail:</strong> ${invoice.email}</p>` : ''}
                                </div>
                            </div>
                            
                            <!-- Invoice Metadata (compact) -->
                            <div class="w-1/3 pl-6">
                                <div class="bg-gray-50 p-4 rounded text-sm">
                                    <div class="space-y-2">
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">Rechnungsdatum:</span>
                                            <span class="font-medium">${new Date(invoice.issue_date).toLocaleDateString('de-CH')}</span>
                                        </div>
                                        ${invoice.due_date ? `
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">Fälligkeitsdatum:</span>
                                            <span class="font-medium">${new Date(invoice.due_date).toLocaleDateString('de-CH')}</span>
                                        </div>
                                        ` : ''}
                                        <div class="flex justify-between items-center">
                                            <span class="text-gray-600">Status:</span>
                                            <span class="px-2 py-1 rounded text-xs ${getInvoiceStatusColor(invoice.status)}">${getInvoiceStatusText(invoice.status)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Items Table -->
                    <div class="px-8 pb-6">
                        <h3 class="text-lg font-semibold mb-4 text-gray-800">Rechnungsposten:</h3>
                        <table class="w-full border border-gray-300 rounded-lg overflow-hidden">
                            <thead class="bg-gray-100">
                                <tr>
                                    <th class="border-r border-gray-300 px-6 py-4 text-left font-semibold text-gray-700">Beschreibung</th>
                                    <th class="border-r border-gray-300 px-4 py-4 text-center font-semibold text-gray-700 w-24">Menge</th>
                                    <th class="border-r border-gray-300 px-4 py-4 text-right font-semibold text-gray-700 w-32">Einzelpreis</th>
                                    <th class="px-4 py-4 text-right font-semibold text-gray-700 w-32">Summe</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white">
                                ${items.map((item, index) => `
                                    <tr class="${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
                                        <td class="border-r border-gray-200 px-6 py-4 text-gray-800">${item.description}</td>
                                        <td class="border-r border-gray-200 px-4 py-4 text-center text-gray-800">${item.quantity}</td>
                                        <td class="border-r border-gray-200 px-4 py-4 text-right text-gray-800">${formatCurrency(item.unit_price)}</td>
                                        <td class="px-4 py-4 text-right font-semibold text-gray-900">${formatCurrency(item.total)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Totals Section -->
                    <div class="px-8 pb-6">
                        <div class="flex justify-end">
                            <div class="w-80 bg-gray-50 p-6 rounded-lg border border-gray-200">
                                <div class="space-y-3">
                                    <div class="flex justify-between text-gray-700">
                                        <span>Zwischensumme:</span>
                                        <span class="font-semibold">${formatCurrency(subtotal)}</span>
                                    </div>
                                    <div class="flex justify-between text-gray-700">
                                        <span>MwSt. (${invoice.tax_rate}%):</span>
                                        <span class="font-semibold">${formatCurrency(taxAmount)}</span>
                                    </div>
                                    <hr class="border-gray-300">
                                    <div class="flex justify-between text-xl font-bold text-gray-900">
                                        <span>Gesamtbetrag:</span>
                                        <span>${formatCurrency(totalAmount)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Payment Terms & Notes -->
                    ${(invoice.payment_terms || invoice.notes) ? `
                    <div class="px-8 pb-6 border-t border-gray-200 pt-6">
                        ${invoice.payment_terms ? `<p class="text-sm text-gray-600 mb-3"><strong>Zahlungsbedingungen:</strong> ${invoice.payment_terms}</p>` : ''}
                        ${invoice.notes ? `<p class="text-sm text-gray-600 mb-3"><strong>Notizen:</strong> ${invoice.notes}</p>` : ''}
                    </div>
                    ` : ''}
                    
                    <!-- Professional Footer with Company Info (matches PDF) -->
                    ${companySettings.company_name ? `
                    <div class="bg-gray-50 border-t-2 border-gray-200 px-8 py-6">
                        <div class="grid grid-cols-3 gap-8 text-xs text-gray-600">
                            <!-- Company Info Column -->
                            <div>
                                <h5 class="font-semibold text-gray-800 mb-2 text-sm">Rechnungssteller</h5>
                                <div class="space-y-1">
                                    <p class="font-semibold text-gray-900">${companySettings.company_name}</p>
                                    ${companySettings.address ? `<p>${companySettings.address}</p>` : ''}
                                    ${companySettings.postal_code && companySettings.city ? `<p>${companySettings.postal_code} ${companySettings.city}</p>` : ''}
                                    ${companySettings.country ? `<p>${companySettings.country}</p>` : ''}
                                </div>
                            </div>
                            
                            <!-- Contact Info Column -->
                            <div>
                                <h5 class="font-semibold text-gray-800 mb-2 text-sm">Kontakt</h5>
                                <div class="space-y-1">
                                    ${companySettings.phone ? `<p><strong>Tel:</strong> ${companySettings.phone}</p>` : ''}
                                    ${companySettings.email ? `<p><strong>E-Mail:</strong> ${companySettings.email}</p>` : ''}
                                    ${companySettings.website ? `<p><strong>Web:</strong> ${companySettings.website}</p>` : ''}
                                    ${companySettings.tax_number ? `<p><strong>MwSt-Nr:</strong> ${companySettings.tax_number}</p>` : ''}
                                </div>
                            </div>
                            
                            <!-- Banking Info Column -->
                            <div>
                                <h5 class="font-semibold text-gray-800 mb-2 text-sm">Banking</h5>
                                <div class="space-y-1">
                                    ${companySettings.iban ? `<p><strong>IBAN:</strong> ${companySettings.iban}</p>` : ''}
                                    ${companySettings.bank_account ? `<p><strong>Bank:</strong> ${companySettings.bank_account}</p>` : ''}
                                    ${companySettings.bic_swift ? `<p><strong>BIC:</strong> ${companySettings.bic_swift}</p>` : ''}
                                </div>
                            </div>
                        </div>
                        
                        <div class="text-center mt-6 pt-4 border-t border-gray-300">
                            <p class="text-xs text-gray-500 italic">
                                Diese Rechnung wurde automatisch generiert am ${new Date().toLocaleDateString('de-CH')} um ${new Date().toLocaleTimeString('de-CH')}.
                            </p>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modal-container').innerHTML = modalHtml;
}

async function deleteInvoice(id) {
    if (!confirm('Sind Sie sicher, dass Sie diese Rechnung löschen möchten?')) {
        return;
    }
    
    try {
        await axios.delete(`/api/invoices/${id}`);
        await loadInvoices();
        showNotification('Rechnung erfolgreich gelöscht!', 'success');
    } catch (error) {
        console.error('Error deleting invoice:', error);
        showNotification('Fehler beim Löschen der Rechnung', 'error');
    }
}

async function generateInvoicePDF(id) {
    try {
        showNotification('PDF wird generiert...', 'info');
        
        // Get invoice data and ensure company settings are loaded
        const response = await axios.get(`/api/invoices/${id}`);
        const invoice = response.data.invoice;
        const items = response.data.items || [];
        
        // Make sure company settings are loaded
        if (!currentCompanySettings) {
            await loadCompanySettings();
        }
        const companySettings = currentCompanySettings || {};
        
        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + item.total, 0);
        const taxAmount = subtotal * (invoice.tax_rate / 100);
        const totalAmount = subtotal + taxAmount;
        
        // Create professional PDF content with company settings
        const pdfContent = `
            <div style="font-family: 'Helvetica', Arial, sans-serif; padding: 0; max-width: 210mm; margin: 0 auto;">
                <!-- Header with Logo -->
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 40px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px;">
                    <div style="display: flex; align-items: start; gap: 20px;">
                        ${companySettings.logo_url ? `<img src="${companySettings.logo_url}" alt="Logo" style="max-height: 60px; max-width: 200px; object-fit: contain;">` : ''}
                        <div>
                            <h1 style="font-size: 28px; font-weight: bold; color: #1f2937; margin: 0 0 10px 0;">RECHNUNG</h1>
                            <p style="font-size: 18px; font-weight: 600; color: #374151; margin: 0;">${invoice.invoice_number}</p>
                        </div>
                    </div>
                    <div style="text-align: right; font-size: 12px; color: #6b7280;">
                        <p style="margin: 0 0 5px 0;"><strong>Rechnungsdatum:</strong> ${new Date(invoice.issue_date).toLocaleDateString('de-CH')}</p>
                        ${invoice.due_date ? `<p style="margin: 0 0 5px 0;"><strong>Fälligkeitsdatum:</strong> ${new Date(invoice.due_date).toLocaleDateString('de-CH')}</p>` : ''}
                        <p style="margin: 0;"><strong>Status:</strong> ${getInvoiceStatusText(invoice.status)}</p>
                    </div>
                </div>
                
                <!-- Customer Address -->
                <div style="margin-bottom: 40px;">
                    <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 15px; color: #374151;">Rechnungsadresse:</h3>
                    <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                        <p style="font-weight: 600; margin: 0 0 5px 0; font-size: 16px;">${invoice.company_name}</p>
                        ${invoice.contact_person ? `<p style="margin: 0 0 5px 0;">${invoice.contact_person}</p>` : ''}
                        ${invoice.address ? `<p style="margin: 0 0 5px 0;">${invoice.address}</p>` : ''}
                        ${invoice.postal_code && invoice.city ? `<p style="margin: 0 0 5px 0;">${invoice.postal_code} ${invoice.city}</p>` : ''}
                        ${invoice.country ? `<p style="margin: 0 0 10px 0;">${invoice.country}</p>` : ''}
                        ${invoice.email ? `<p style="margin: 0; color: #6b7280; font-size: 14px;"><strong>E-Mail:</strong> ${invoice.email}</p>` : ''}
                    </div>
                </div>
                
                <!-- Items Table -->
                <div style="margin-bottom: 40px;">
                    <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 15px; color: #374151;">Rechnungsposten:</h3>
                    <table style="width: 100%; border-collapse: collapse; border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden;">
                        <thead>
                            <tr style="background-color: #f3f4f6;">
                                <th style="border-right: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: 600; color: #374151;">Beschreibung</th>
                                <th style="border-right: 1px solid #d1d5db; padding: 12px; text-align: center; font-weight: 600; color: #374151; width: 80px;">Menge</th>
                                <th style="border-right: 1px solid #d1d5db; padding: 12px; text-align: right; font-weight: 600; color: #374151; width: 100px;">Einzelpreis</th>
                                <th style="padding: 12px; text-align: right; font-weight: 600; color: #374151; width: 100px;">Summe</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map((item, index) => `
                                <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                                    <td style="border-right: 1px solid #e5e7eb; ${index < items.length - 1 ? 'border-bottom: 1px solid #e5e7eb;' : ''} padding: 12px; color: #374151;">${item.description}</td>
                                    <td style="border-right: 1px solid #e5e7eb; ${index < items.length - 1 ? 'border-bottom: 1px solid #e5e7eb;' : ''} padding: 12px; text-align: center; color: #374151;">${item.quantity}</td>
                                    <td style="border-right: 1px solid #e5e7eb; ${index < items.length - 1 ? 'border-bottom: 1px solid #e5e7eb;' : ''} padding: 12px; text-align: right; color: #374151;">${formatCurrency(item.unit_price)}</td>
                                    <td style="${index < items.length - 1 ? 'border-bottom: 1px solid #e5e7eb;' : ''} padding: 12px; text-align: right; font-weight: 600; color: #1f2937;">${formatCurrency(item.total)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <!-- Totals -->
                <div style="display: flex; justify-content: flex-end; margin-bottom: 40px;">
                    <div style="width: 300px; background-color: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #374151;">
                            <span>Zwischensumme:</span>
                            <span style="font-weight: 600;">${formatCurrency(subtotal)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 15px; color: #374151;">
                            <span>MwSt. (${invoice.tax_rate}%):</span>
                            <span style="font-weight: 600;">${formatCurrency(taxAmount)}</span>
                        </div>
                        <hr style="margin: 15px 0; border: 1px solid #374151;">
                        <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; color: #1f2937;">
                            <span>Gesamtbetrag:</span>
                            <span>${formatCurrency(totalAmount)}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Payment Terms & Notes -->
                ${(invoice.payment_terms || invoice.notes) ? `
                <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-bottom: 30px; font-size: 12px; color: #6b7280;">
                    ${invoice.payment_terms ? `<p style="margin: 0 0 10px 0;"><strong>Zahlungsbedingungen:</strong> ${invoice.payment_terms}</p>` : ''}
                    ${invoice.notes ? `<p style="margin: 0 0 10px 0;"><strong>Notizen:</strong> ${invoice.notes}</p>` : ''}
                </div>
                ` : ''}
                
                <!-- Professional Footer with Company Info -->
                ${companySettings.company_name ? `
                <div style="border-top: 2px solid #d1d5db; padding-top: 20px; margin-top: 30px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; font-size: 10px; color: #6b7280;">
                        <div>
                            <h5 style="font-weight: 600; color: #374151; margin: 0 0 8px 0; font-size: 11px;">Rechnungssteller</h5>
                            <p style="font-weight: 600; color: #1f2937; margin: 0 0 3px 0;">${companySettings.company_name}</p>
                            ${companySettings.address ? `<p style="margin: 0 0 2px 0;">${companySettings.address}</p>` : ''}
                            ${companySettings.postal_code && companySettings.city ? `<p style="margin: 0 0 2px 0;">${companySettings.postal_code} ${companySettings.city}</p>` : ''}
                            ${companySettings.country ? `<p style="margin: 0;">${companySettings.country}</p>` : ''}
                        </div>
                        <div>
                            <h5 style="font-weight: 600; color: #374151; margin: 0 0 8px 0; font-size: 11px;">Kontakt</h5>
                            ${companySettings.phone ? `<p style="margin: 0 0 2px 0;"><strong>Tel:</strong> ${companySettings.phone}</p>` : ''}
                            ${companySettings.email ? `<p style="margin: 0 0 2px 0;"><strong>E-Mail:</strong> ${companySettings.email}</p>` : ''}
                            ${companySettings.website ? `<p style="margin: 0 0 2px 0;"><strong>Web:</strong> ${companySettings.website}</p>` : ''}
                            ${companySettings.tax_number ? `<p style="margin: 0;"><strong>MwSt-Nr:</strong> ${companySettings.tax_number}</p>` : ''}
                        </div>
                        <div>
                            <h5 style="font-weight: 600; color: #374151; margin: 0 0 8px 0; font-size: 11px;">Banking</h5>
                            ${companySettings.iban ? `<p style="margin: 0 0 2px 0;"><strong>IBAN:</strong> ${companySettings.iban}</p>` : ''}
                            ${companySettings.bank_account ? `<p style="margin: 0 0 2px 0;"><strong>Bank:</strong> ${companySettings.bank_account}</p>` : ''}
                            ${companySettings.bic_swift ? `<p style="margin: 0;"><strong>BIC:</strong> ${companySettings.bic_swift}</p>` : ''}
                        </div>
                    </div>
                    <div style="text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0; font-size: 10px; color: #9ca3af; font-style: italic;">
                            Diese Rechnung wurde automatisch generiert am ${new Date().toLocaleDateString('de-CH')} um ${new Date().toLocaleTimeString('de-CH')}.
                        </p>
                    </div>
                </div>
                ` : ''}
            </div>
        `;
        
        // Use the browser's print functionality to "print to PDF"
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Rechnung ${invoice.invoice_number}</title>
                <style>
                    @page { 
                        margin: 1.5cm; 
                        size: A4;
                    }
                    @media print {
                        body { 
                            margin: 0; 
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                    }
                    body { 
                        font-family: 'Helvetica', Arial, sans-serif; 
                        font-size: 12px;
                        line-height: 1.4;
                        color: #333;
                    }
                </style>
            </head>
            <body>
                ${pdfContent}
            </body>
            </html>
        `);
        printWindow.document.close();
        
        // Auto-focus and print
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 500);
        
        showNotification('PDF-Druckdialog geöffnet. Wählen Sie "Als PDF speichern" im Druckdialog.', 'success');
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        showNotification('Fehler beim Generieren des PDFs', 'error');
    }
}

// Create invoice from time entries
function showCreateInvoiceFromTimeModal() {
    if (currentCustomers.length === 0) {
        showNotification('Bitte erst Kunden anlegen', 'error');
        return;
    }
    
    const customerOptions = currentCustomers.map(customer => 
        `<option value="${customer.id}">${customer.company_name}</option>`
    ).join('');
    
    const modalHtml = `
        <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" id="invoice-from-time-modal">
            <div class="relative top-10 mx-auto p-5 border max-w-3xl shadow-lg rounded-md bg-white">
                <div class="mt-3">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">
                        <i class="fas fa-clock text-green-600 mr-2"></i>
                        Rechnung aus Zeiteinträgen erstellen
                    </h3>
                    <form id="invoice-from-time-form">
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Kunde auswählen *</label>
                                <select id="time_invoice_customer_id" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
                                    <option value="">Kunde auswählen</option>
                                    ${customerOptions}
                                </select>
                            </div>
                            
                            <div id="unbilled-time-entries" class="hidden">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Nicht abgerechnete Zeiteinträge:</label>
                                <div class="max-h-60 overflow-y-auto border border-gray-200 rounded">
                                    <div id="time-entries-list" class="divide-y divide-gray-200">
                                        <!-- Time entries will be loaded here -->
                                    </div>
                                </div>
                                <div class="mt-2 text-right">
                                    <button type="button" onclick="selectAllTimeEntries()" class="text-blue-600 hover:text-blue-800 text-sm mr-4">Alle auswählen</button>
                                    <button type="button" onclick="deselectAllTimeEntries()" class="text-gray-600 hover:text-gray-800 text-sm">Alle abwählen</button>
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Rechnungsdatum</label>
                                    <input type="date" id="time_invoice_issue_date" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" 
                                           value="${new Date().toISOString().split('T')[0]}">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Fälligkeitsdatum</label>
                                    <input type="date" id="time_invoice_due_date" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
                                </div>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Zahlungsbedingungen</label>
                                <input type="text" id="time_invoice_payment_terms" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" 
                                       value="30 Tage" placeholder="z.B. 30 Tage">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Notizen</label>
                                <textarea id="time_invoice_notes" rows="3" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" 
                                          placeholder="Zusätzliche Notizen zur Rechnung..."></textarea>
                            </div>
                            
                            <div id="invoice-preview" class="hidden p-4 bg-blue-50 rounded-md">
                                <h4 class="font-medium text-blue-900 mb-2">Rechnungsvorschau:</h4>
                                <div class="text-sm text-blue-800">
                                    <div class="flex justify-between"><span>Positionen:</span><span id="preview-items">0</span></div>
                                    <div class="flex justify-between"><span>Gesamtstunden:</span><span id="preview-hours">0.0</span></div>
                                    <div class="flex justify-between"><span>Zwischensumme:</span><span id="preview-subtotal">0.00 CHF</span></div>
                                    <div class="flex justify-between"><span>MwSt. (8.1%):</span><span id="preview-tax">0.00 CHF</span></div>
                                    <div class="flex justify-between font-bold border-t pt-2 mt-2"><span>Gesamtbetrag:</span><span id="preview-total">0.00 CHF</span></div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="flex justify-end space-x-3 mt-6">
                            <button type="button" onclick="closeModal('invoice-from-time-modal')" class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
                                Abbrechen
                            </button>
                            <button type="submit" class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                                <i class="fas fa-file-invoice mr-1"></i>Rechnung erstellen
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modal-container').innerHTML = modalHtml;
    
    // Load time entries when customer changes
    document.getElementById('time_invoice_customer_id').addEventListener('change', async function() {
        const customerId = this.value;
        if (customerId) {
            await loadUnbilledTimeEntries(customerId);
        } else {
            document.getElementById('unbilled-time-entries').classList.add('hidden');
        }
    });
    
    document.getElementById('invoice-from-time-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await createInvoiceFromTimeEntries();
    });
}

async function loadUnbilledTimeEntries(customerId) {
    try {
        const response = await axios.get(`/api/customers/${customerId}/unbilled-time-entries`);
        const timeEntries = response.data.timeEntries || [];
        
        const container = document.getElementById('time-entries-list');
        const unbilledSection = document.getElementById('unbilled-time-entries');
        
        if (timeEntries.length === 0) {
            container.innerHTML = `
                <div class="p-4 text-center text-gray-500">
                    Keine nicht abgerechneten Zeiteinträge für diesen Kunden gefunden.
                </div>
            `;
            unbilledSection.classList.remove('hidden');
            return;
        }
        
        container.innerHTML = timeEntries.map(entry => {
            const hours = (entry.duration_minutes / 60).toFixed(2);
            const rate = entry.hourly_rate || 0;
            const total = (entry.duration_minutes / 60) * rate;
            
            return `
                <label class="flex items-center p-3 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" class="time-entry-checkbox mr-3" value="${entry.id}" data-hours="${hours}" data-rate="${rate}" data-total="${total}">
                    <div class="flex-1">
                        <div class="flex justify-between items-start">
                            <div>
                                <div class="font-medium text-gray-900">${entry.description}</div>
                                <div class="text-sm text-gray-500">
                                    ${new Date(entry.start_time).toLocaleDateString('de-CH')} | 
                                    ${entry.project_name || 'Kein Projekt'} | 
                                    ${hours}h à ${formatCurrency(rate)}
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="font-medium text-gray-900">${formatCurrency(total)}</div>
                            </div>
                        </div>
                    </div>
                </label>
            `;
        }).join('');
        
        // Add event listeners for preview calculation
        container.querySelectorAll('.time-entry-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', updateInvoicePreview);
        });
        
        unbilledSection.classList.remove('hidden');
        updateInvoicePreview();
        
    } catch (error) {
        console.error('Error loading unbilled time entries:', error);
        showNotification('Fehler beim Laden der Zeiteinträge', 'error');
    }
}

function selectAllTimeEntries() {
    document.querySelectorAll('.time-entry-checkbox').forEach(checkbox => {
        checkbox.checked = true;
    });
    updateInvoicePreview();
}

function deselectAllTimeEntries() {
    document.querySelectorAll('.time-entry-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    updateInvoicePreview();
}

function updateInvoicePreview() {
    const checkedBoxes = document.querySelectorAll('.time-entry-checkbox:checked');
    let totalHours = 0;
    let subtotal = 0;
    
    checkedBoxes.forEach(checkbox => {
        totalHours += parseFloat(checkbox.dataset.hours);
        subtotal += parseFloat(checkbox.dataset.total);
    });
    
    const taxAmount = subtotal * 0.081; // 8.1% MwSt
    const total = subtotal + taxAmount;
    
    document.getElementById('preview-items').textContent = checkedBoxes.length;
    document.getElementById('preview-hours').textContent = totalHours.toFixed(1) + 'h';
    document.getElementById('preview-subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('preview-tax').textContent = formatCurrency(taxAmount);
    document.getElementById('preview-total').textContent = formatCurrency(total);
    
    const previewDiv = document.getElementById('invoice-preview');
    if (checkedBoxes.length > 0) {
        previewDiv.classList.remove('hidden');
    } else {
        previewDiv.classList.add('hidden');
    }
}

async function createInvoiceFromTimeEntries() {
    const customerId = document.getElementById('time_invoice_customer_id').value;
    const checkedBoxes = document.querySelectorAll('.time-entry-checkbox:checked');
    const timeEntryIds = Array.from(checkedBoxes).map(cb => parseInt(cb.value));
    
    if (!customerId || timeEntryIds.length === 0) {
        showNotification('Bitte Kunde auswählen und mindestens einen Zeiteintrag markieren', 'error');
        return;
    }
    
    const formData = {
        customer_id: parseInt(customerId),
        time_entry_ids: timeEntryIds,
        issue_date: document.getElementById('time_invoice_issue_date').value,
        due_date: document.getElementById('time_invoice_due_date').value || null,
        payment_terms: document.getElementById('time_invoice_payment_terms').value,
        notes: document.getElementById('time_invoice_notes').value
    };
    
    try {
        const response = await axios.post('/api/invoices/from-time-entries', formData);
        
        closeModal('invoice-from-time-modal');
        await loadInvoices();
        await loadTimeEntries(); // Refresh to show updated billed status
        
        showNotification(
            `Rechnung ${response.data.invoice_number} erfolgreich erstellt! (${response.data.items_count} Positionen, ${formatCurrency(response.data.total_amount)})`, 
            'success'
        );
    } catch (error) {
        console.error('Error creating invoice from time entries:', error);
        showNotification('Fehler beim Erstellen der Rechnung', 'error');
    }
}

// Quote management (basic implementation)
async function loadQuotes() {
    try {
        const response = await axios.get('/api/quotes');
        currentQuotes = response.data.quotes || [];
        renderQuotesTable();
    } catch (error) {
        console.error('Error loading quotes:', error);
        currentQuotes = [];
    }
}

function renderQuotesTable() {
    const tableBody = document.getElementById('quotes-table');
    if (!tableBody) return;
    
    if (currentQuotes.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-4 text-center text-gray-500">
                    Keine Angebote vorhanden. <a href="#" onclick="showQuoteModal()" class="text-yellow-600 hover:text-yellow-800">Erstes Angebot erstellen</a>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = currentQuotes.map(quote => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${quote.quote_number}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${quote.company_name || 'Unbekannt'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${new Date(quote.issue_date).toLocaleDateString('de-CH')}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('de-CH') : '-'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${formatCurrency(quote.total_amount)}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getQuoteStatusColor(quote.status)}">
                    ${getQuoteStatusText(quote.status)}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button onclick="viewQuote(${quote.id})" class="text-blue-600 hover:text-blue-900" title="Anzeigen">
                    <i class="fas fa-eye"></i>
                </button>
                <button onclick="editQuote(${quote.id})" class="text-indigo-600 hover:text-indigo-900" title="Bearbeiten">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="generateQuotePDF(${quote.id})" class="text-green-600 hover:text-green-900" title="PDF">
                    <i class="fas fa-file-pdf"></i>
                </button>
                <button onclick="deleteQuote(${quote.id})" class="text-red-600 hover:text-red-900" title="Löschen">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function getQuoteStatusColor(status) {
    switch(status) {
        case 'draft': return 'bg-gray-100 text-gray-800';
        case 'sent': return 'bg-blue-100 text-blue-800';
        case 'accepted': return 'bg-green-100 text-green-800';
        case 'rejected': return 'bg-red-100 text-red-800';
        case 'expired': return 'bg-yellow-100 text-yellow-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

function getQuoteStatusText(status) {
    switch(status) {
        case 'draft': return 'Entwurf';
        case 'sent': return 'Versendet';
        case 'accepted': return 'Angenommen';
        case 'rejected': return 'Abgelehnt';
        case 'expired': return 'Abgelaufen';
        default: return 'Unbekannt';
    }
}

function showQuoteModal(quoteId = null) {
    showNotification('Vollständiges Angebotsmodul wird in der nächsten Version implementiert', 'info');
}

function generateQuotePDF(id) {
    showNotification('PDF-Export wird implementiert - Vollständige Funktionalität kommt bald!', 'info');
}

function viewQuote(id) {
    showNotification('Anzeige-Funktion wird implementiert', 'info');
}

// Company Settings Management
let currentCompanySettings = null;

async function loadCompanySettings() {
    try {
        const response = await axios.get('/api/company-settings');
        currentCompanySettings = response.data.settings;
        populateCompanySettingsForm();
        updateCompanyPreview();
    } catch (error) {
        console.error('Error loading company settings:', error);
        // Initialize with empty settings if none exist
        currentCompanySettings = null;
    }
}

function populateCompanySettingsForm() {
    if (!currentCompanySettings) return;
    
    const fields = {
        'company_name': currentCompanySettings.company_name || '',
        'company_address': currentCompanySettings.address || '',
        'company_postal_code': currentCompanySettings.postal_code || '',
        'company_city': currentCompanySettings.city || '',
        'company_country': currentCompanySettings.country || 'Schweiz',
        'company_phone': currentCompanySettings.phone || '',
        'company_email': currentCompanySettings.email || '',
        'company_website': currentCompanySettings.website || '',
        'company_iban': currentCompanySettings.iban || '',
        'company_bank_account': currentCompanySettings.bank_account || '',
        'company_bic_swift': currentCompanySettings.bic_swift || '',
        'company_tax_number': currentCompanySettings.tax_number || '',
        'company_default_tax_rate': currentCompanySettings.default_tax_rate || 8.1,
        'company_default_payment_terms': currentCompanySettings.default_payment_terms || '30 Tage'
    };
    
    Object.entries(fields).forEach(([fieldId, value]) => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.value = value;
        }
    });
    
    // Handle logo data (could be base64 or URL)
    const logoData = currentCompanySettings.logo_url || '';
    if (logoData) {
        if (logoData.startsWith('data:image/')) {
            // It's base64 data - use uploaded logo field
            document.getElementById('company_logo_base64').value = logoData;
            document.getElementById('company_logo_url').value = '';
            updateLogoPreview(logoData);
        } else {
            // It's a URL - use URL field
            document.getElementById('company_logo_url').value = logoData;
            document.getElementById('company_logo_base64').value = '';
            updateLogoPreview(logoData);
        }
    }
}

async function saveCompanySettings() {
    try {
        // Get logo data (priority: base64 > URL)
        const logoBase64 = document.getElementById('company_logo_base64').value;
        const logoUrl = document.getElementById('company_logo_url').value;
        const logoData = logoBase64 || logoUrl;
        
        const formData = {
            company_name: document.getElementById('company_name').value,
            address: document.getElementById('company_address').value,
            postal_code: document.getElementById('company_postal_code').value,
            city: document.getElementById('company_city').value,
            country: document.getElementById('company_country').value,
            phone: document.getElementById('company_phone').value,
            email: document.getElementById('company_email').value,
            website: document.getElementById('company_website').value,
            logo_url: logoData, // This will be either base64 or URL
            iban: document.getElementById('company_iban').value,
            bank_account: document.getElementById('company_bank_account').value,
            bic_swift: document.getElementById('company_bic_swift').value,
            tax_number: document.getElementById('company_tax_number').value,
            default_tax_rate: parseFloat(document.getElementById('company_default_tax_rate').value) || 8.1,
            default_payment_terms: document.getElementById('company_default_payment_terms').value
        };
        
        const response = await axios.post('/api/company-settings', formData);
        currentCompanySettings = response.data.settings;
        
        updateCompanyPreview();
        showNotification('Firmeneinstellungen erfolgreich gespeichert!', 'success');
    } catch (error) {
        console.error('Error saving company settings:', error);
        showNotification('Fehler beim Speichern der Einstellungen', 'error');
    }
}

function updateCompanyPreview() {
    // Update logo preview
    const logoPreview = document.getElementById('preview-logo');
    const logoData = getCurrentLogoData();
    if (logoData && logoPreview) {
        logoPreview.innerHTML = `<img src="${logoData}" alt="Firmenlogo" class="h-12 max-w-48 object-contain">`;
    } else if (logoPreview) {
        logoPreview.innerHTML = '<span class="text-gray-400 italic">Logo wird hier angezeigt</span>';
    }
    
    // Update company info preview
    const companyPreview = document.getElementById('preview-company-info');
    const companyName = document.getElementById('company_name').value;
    const address = document.getElementById('company_address').value;
    const postalCode = document.getElementById('company_postal_code').value;
    const city = document.getElementById('company_city').value;
    const country = document.getElementById('company_country').value;
    
    if (companyName && companyPreview) {
        let html = `<p class="font-semibold">${companyName}</p>`;
        if (address) html += `<p>${address}</p>`;
        if (postalCode && city) html += `<p>${postalCode} ${city}</p>`;
        if (country) html += `<p>${country}</p>`;
        companyPreview.innerHTML = html;
    } else if (companyPreview) {
        companyPreview.innerHTML = '<p class="text-gray-400 italic">Firmendaten werden hier angezeigt</p>';
    }
    
    // Update contact info preview
    const contactPreview = document.getElementById('preview-contact-info');
    const phone = document.getElementById('company_phone').value;
    const email = document.getElementById('company_email').value;
    const website = document.getElementById('company_website').value;
    
    if ((phone || email || website) && contactPreview) {
        let html = '';
        if (phone) html += `<p><i class="fas fa-phone mr-1"></i> ${phone}</p>`;
        if (email) html += `<p><i class="fas fa-envelope mr-1"></i> ${email}</p>`;
        if (website) html += `<p><i class="fas fa-globe mr-1"></i> ${website}</p>`;
        contactPreview.innerHTML = html;
    } else if (contactPreview) {
        contactPreview.innerHTML = '<p class="text-gray-400 italic">Kontaktdaten werden hier angezeigt</p>';
    }
    
    // Update banking info preview
    const bankingPreview = document.getElementById('preview-banking-info');
    const iban = document.getElementById('company_iban').value;
    const bank = document.getElementById('company_bank_account').value;
    const taxNumber = document.getElementById('company_tax_number').value;
    
    if ((iban || bank || taxNumber) && bankingPreview) {
        let html = '';
        if (iban) html += `<p><strong>IBAN:</strong> ${iban}</p>`;
        if (bank) html += `<p><strong>Bank:</strong> ${bank}</p>`;
        if (taxNumber) html += `<p><strong>MwSt-Nr:</strong> ${taxNumber}</p>`;
        bankingPreview.innerHTML = html;
    } else if (bankingPreview) {
        bankingPreview.innerHTML = '<p class="text-gray-400 italic">Bankdaten werden hier angezeigt</p>';
    }
}

// Logo Upload Functionality
function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showNotification('Bitte wählen Sie eine Bilddatei (PNG, JPG, SVG)', 'error');
        return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        showNotification('Logo darf maximal 2MB groß sein', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Data = e.target.result;
        
        // Store base64 in hidden field
        document.getElementById('company_logo_base64').value = base64Data;
        
        // Clear URL field since we're using uploaded file
        document.getElementById('company_logo_url').value = '';
        
        // Update preview
        updateLogoPreview(base64Data);
        updateCompanyPreview();
        
        showNotification('Logo erfolgreich hochgeladen!', 'success');
    };
    
    reader.readAsDataURL(file);
}

function updateLogoPreview(logoData) {
    const previewContainer = document.getElementById('logo-preview-container');
    const previewImage = document.getElementById('logo-preview-image');
    
    if (logoData && previewContainer && previewImage) {
        previewImage.src = logoData;
        previewContainer.classList.remove('hidden');
    } else if (previewContainer) {
        previewContainer.classList.add('hidden');
    }
}

function removeLogo() {
    document.getElementById('company_logo_base64').value = '';
    document.getElementById('company_logo_url').value = '';
    document.getElementById('logo-preview-container').classList.add('hidden');
    
    // Clear file input
    const fileInput = document.getElementById('company_logo_file');
    if (fileInput) {
        fileInput.value = '';
    }
    
    updateCompanyPreview();
    showNotification('Logo entfernt', 'info');
}

function getCurrentLogoData() {
    // Priority: uploaded base64 > URL
    const base64Data = document.getElementById('company_logo_base64')?.value;
    const urlData = document.getElementById('company_logo_url')?.value;
    
    return base64Data || urlData || null;
}

// Add event listeners for real-time preview updates
document.addEventListener('DOMContentLoaded', function() {
    const previewFields = [
        'company_name', 'company_address', 'company_postal_code', 'company_city', 'company_country',
        'company_phone', 'company_email', 'company_website', 'company_logo_url',
        'company_iban', 'company_bank_account', 'company_tax_number'
    ];
    
    previewFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', updateCompanyPreview);
        }
    });
});

function editQuote(id) {
    showNotification('Angebots-Bearbeitung wird in der nächsten Version implementiert', 'info');
}

async function deleteQuote(id) {
    if (!confirm('Sind Sie sicher, dass Sie dieses Angebot löschen möchten?')) {
        return;
    }
    
    try {
        await axios.delete(`/api/quotes/${id}`);
        await loadQuotes();
        showNotification('Angebot erfolgreich gelöscht!', 'success');
    } catch (error) {
        console.error('Error deleting quote:', error);
        showNotification('Fehler beim Löschen des Angebots', 'error');
    }
}

function editTimeEntry(id) {
    showTimeEntryModal(id);
}

async function deleteTimeEntry(id) {
    if (!confirm('Sind Sie sicher, dass Sie diesen Zeiteintrag löschen möchten?')) {
        return;
    }
    
    try {
        // await axios.delete(`/api/time-entries/${id}`);
        await loadTimeEntries();
        showNotification('Zeiteintrag erfolgreich gelöscht!', 'success');
    } catch (error) {
        console.error('Error deleting time entry:', error);
        showNotification('Fehler beim Löschen des Zeiteintrags', 'error');
    }
}

function editProject(id) {
    showProjectModal(id);
}

async function deleteProject(id) {
    if (!confirm('Sind Sie sicher, dass Sie dieses Projekt löschen möchten?')) {
        return;
    }
    
    try {
        await axios.delete(`/api/projects/${id}`);
        await loadProjects();
        showNotification('Projekt erfolgreich gelöscht!', 'success');
    } catch (error) {
        console.error('Error deleting project:', error);
        showNotification('Fehler beim Löschen des Projekts', 'error');
    }
}

// ==============================================
// ACCOUNTING MODULE FUNCTIONS
// ==============================================

let currentAccountingCategories = [];
let currentAccountingEntries = [];
let currentQRTemplates = [];
let currentVATRates = [];

// Load accounting data when tab is shown
async function loadAccountingData() {
    try {
        await loadAccountingCategories();
        await loadAccountingEntries();
        await loadAccountingSummary();
        await loadQRTemplates();
        await loadVATRates();
    } catch (error) {
        console.error('Error loading accounting data:', error);
        showNotification('Fehler beim Laden der Buchhaltungsdaten', 'error');
    }
}

// Load accounting categories
async function loadAccountingCategories() {
    try {
        const response = await axios.get('/api/accounting/categories');
        currentAccountingCategories = response.data.categories;
        
        // Populate category filter
        const categoryFilter = document.getElementById('accounting-category-filter');
        if (categoryFilter) {
            categoryFilter.innerHTML = '<option value="">Alle Kategorien</option>';
            currentAccountingCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = `${category.name} (${category.type === 'income' ? 'Einnahme' : 'Ausgabe'})`;
                categoryFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading accounting categories:', error);
    }
}

// Load VAT rates
async function loadVATRates() {
    try {
        const response = await axios.get('/api/accounting/vat-rates');
        currentVATRates = response.data.vatRates;
    } catch (error) {
        console.error('Error loading VAT rates:', error);
    }
}

// Load accounting entries
async function loadAccountingEntries() {
    try {
        const response = await axios.get('/api/accounting/entries');
        currentAccountingEntries = response.data.entries;
        
        // Apply filters
        const typeFilter = document.getElementById('accounting-type-filter')?.value;
        const categoryFilter = document.getElementById('accounting-category-filter')?.value;
        const statusFilter = document.getElementById('accounting-status-filter')?.value;
        
        let filteredEntries = currentAccountingEntries;
        
        if (typeFilter) {
            filteredEntries = filteredEntries.filter(entry => entry.entry_type === typeFilter);
        }
        if (categoryFilter) {
            filteredEntries = filteredEntries.filter(entry => entry.category_id == categoryFilter);
        }
        if (statusFilter) {
            filteredEntries = filteredEntries.filter(entry => entry.status === statusFilter);
        }
        
        // Populate table
        const tableBody = document.getElementById('accounting-entries-table');
        if (tableBody) {
            tableBody.innerHTML = '';
            
            filteredEntries.forEach(entry => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${new Date(entry.entry_date).toLocaleDateString('de-CH')}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${entry.entry_type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                            ${entry.entry_type === 'income' ? 'Einnahme' : 'Ausgabe'}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-900">
                        <div class="max-w-xs truncate" title="${entry.description}">
                            ${entry.description}
                        </div>
                        ${entry.receipt_number ? `<div class="text-xs text-gray-500">Beleg: ${entry.receipt_number}</div>` : ''}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${entry.category_name ? `
                            <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium" style="background-color: ${entry.category_color}20; color: ${entry.category_color};">
                                ${entry.category_name}
                            </span>
                        ` : '-'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${entry.entry_type === 'income' ? 'text-green-600' : 'text-red-600'}">
                        ${formatCurrency(entry.total_amount)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${entry.vat_rate > 0 ? `${entry.vat_rate}% (${formatCurrency(entry.vat_amount)})` : '-'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getAccountingStatusColor(entry.status)}">
                            ${getAccountingStatusText(entry.status)}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div class="flex space-x-2">
                            ${entry.receipt_image_url ? `
                                <button onclick="showReceiptImage('${entry.receipt_image_url}')" class="text-blue-600 hover:text-blue-900" title="Beleg anzeigen">
                                    <i class="fas fa-image"></i>
                                </button>
                            ` : ''}
                            <button onclick="showAccountingEntryModal(${entry.id})" class="text-indigo-600 hover:text-indigo-900" title="Bearbeiten">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="deleteAccountingEntry(${entry.id})" class="text-red-600 hover:text-red-900" title="Löschen">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading accounting entries:', error);
    }
}

// Load accounting summary
async function loadAccountingSummary() {
    try {
        const year = document.getElementById('accounting-year-filter')?.value || new Date().getFullYear();
        const response = await axios.get(`/api/accounting/reports/summary?year=${year}`);
        const summary = response.data;
        
        // Update summary cards
        const totalIncomeEl = document.getElementById('total-income');
        if (totalIncomeEl) {
            totalIncomeEl.textContent = formatCurrency(summary.income?.total_amount || 0);
        }
        
        const totalExpensesEl = document.getElementById('total-expenses');
        if (totalExpensesEl) {
            totalExpensesEl.textContent = formatCurrency(summary.expenses?.total_amount || 0);
        }
        
        const netProfitEl = document.getElementById('net-profit');
        if (netProfitEl) {
            const profit = (summary.income?.total_amount || 0) - (summary.expenses?.total_amount || 0);
            netProfitEl.textContent = formatCurrency(profit);
            netProfitEl.className = `text-2xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`;
        }
        
        const vatOwedEl = document.getElementById('vat-owed');
        if (vatOwedEl) {
            const vatOwed = (summary.income?.vat_amount || 0) - (summary.expenses?.vat_amount || 0);
            vatOwedEl.textContent = formatCurrency(Math.max(0, vatOwed));
        }
    } catch (error) {
        console.error('Error loading accounting summary:', error);
    }
}

// Load QR templates
async function loadQRTemplates() {
    try {
        const response = await axios.get('/api/accounting/qr-templates');
        currentQRTemplates = response.data.templates;
    } catch (error) {
        console.error('Error loading QR templates:', error);
    }
}

// Show accounting entry modal
async function showAccountingEntryModal(id = null) {
    let entry = null;
    if (id) {
        try {
            const response = await axios.get(`/api/accounting/entries/${id}`);
            entry = response.data.entry;
        } catch (error) {
            console.error('Error loading entry:', error);
            showNotification('Fehler beim Laden des Eintrags', 'error');
            return;
        }
    }
    
    // Ensure categories are loaded
    if (currentAccountingCategories.length === 0) {
        await loadAccountingCategories();
    }
    
    // Category options
    const categoryOptions = currentAccountingCategories.map(cat => 
        `<option value="${cat.id}" ${entry && entry.category_id == cat.id ? 'selected' : ''}>
            ${cat.name} (${cat.type === 'income' ? 'Einnahme' : 'Ausgabe'})
        </option>`
    ).join('');
    
    // Customer options for income entries
    const customerOptions = currentCustomers.map(customer => 
        `<option value="${customer.id}" ${entry && entry.customer_id == customer.id ? 'selected' : ''}>
            ${customer.company_name}
        </option>`
    ).join('');
    
    // Project options
    const projectOptions = currentProjects.map(project => 
        `<option value="${project.id}" ${entry && entry.project_id == project.id ? 'selected' : ''}>
            ${project.name}
        </option>`
    ).join('');
    
    // VAT rate options
    const vatOptions = currentVATRates.map(vat => 
        `<option value="${vat.rate_percentage}" ${entry && entry.vat_rate == vat.rate_percentage ? 'selected' : ''}>
            ${vat.country_code} - ${vat.rate_percentage}% (${vat.description})
        </option>`
    ).join('');
    
    const modalHtml = `
        <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" id="accounting-entry-modal">
            <div class="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-medium text-gray-900">
                        <i class="fas fa-calculator text-green-600 mr-2"></i>
                        ${entry ? 'Buchung bearbeiten' : 'Neue Buchung'}
                    </h3>
                    <button onclick="closeModal('accounting-entry-modal')" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <form id="accounting-entry-form">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Typ *</label>
                            <select id="entry_type" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" onchange="toggleCustomerField()">
                                <option value="expense" ${!entry || entry.entry_type === 'expense' ? 'selected' : ''}>Ausgabe</option>
                                <option value="income" ${entry && entry.entry_type === 'income' ? 'selected' : ''}>Einnahme</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Datum *</label>
                            <input type="date" id="entry_date" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" 
                                   value="${entry ? entry.entry_date : new Date().toISOString().split('T')[0]}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Betrag (ohne MwSt) *</label>
                            <input type="number" step="0.01" id="amount" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" 
                                   value="${entry ? entry.amount : ''}" onchange="calculateVAT()" placeholder="0.00">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">MwSt-Satz</label>
                            <select id="vat_rate" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" onchange="calculateVAT()">
                                <option value="0">0% (Keine MwSt)</option>
                                ${vatOptions}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">MwSt-Betrag</label>
                            <input type="number" step="0.01" id="vat_amount" readonly class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100" 
                                   value="${entry ? entry.vat_amount : '0.00'}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Gesamtbetrag</label>
                            <input type="number" step="0.01" id="total_amount" readonly class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 font-bold" 
                                   value="${entry ? entry.total_amount : '0.00'}">
                        </div>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700">Beschreibung *</label>
                        <textarea id="description" required rows="3" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" 
                                  placeholder="Beschreibung der Buchung...">${entry ? entry.description : ''}</textarea>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Kategorie</label>
                            <select id="category_id" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
                                <option value="">Kategorie wählen...</option>
                                ${categoryOptions}
                            </select>
                        </div>
                        <div id="customer-field" class="hidden">
                            <label class="block text-sm font-medium text-gray-700">Kunde</label>
                            <select id="customer_id" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
                                <option value="">Kunde wählen...</option>
                                ${customerOptions}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Projekt</label>
                            <select id="project_id" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
                                <option value="">Projekt wählen...</option>
                                ${projectOptions}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Belegnummer</label>
                            <input type="text" id="receipt_number" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" 
                                   value="${entry ? entry.receipt_number || '' : ''}" placeholder="Optional">
                        </div>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700">Notizen</label>
                        <textarea id="notes" rows="2" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" 
                                  placeholder="Zusätzliche Notizen...">${entry ? entry.notes || '' : ''}</textarea>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700">Status</label>
                        <select id="status" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
                            <option value="draft" ${!entry || entry.status === 'draft' ? 'selected' : ''}>Entwurf</option>
                            <option value="confirmed" ${entry && entry.status === 'confirmed' ? 'selected' : ''}>Bestätigt</option>
                            <option value="reconciled" ${entry && entry.status === 'reconciled' ? 'selected' : ''}>Abgestimmt</option>
                        </select>
                    </div>
                    
                    <div class="flex justify-end space-x-3">
                        <button type="button" onclick="closeModal('accounting-entry-modal')" class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
                            Abbrechen
                        </button>
                        <button type="submit" class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                            <i class="fas fa-save mr-1"></i>
                            ${entry ? 'Aktualisieren' : 'Erstellen'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.getElementById('modal-container').innerHTML = modalHtml;
    
    // Toggle customer field based on type
    toggleCustomerField();
    
    // Calculate VAT on load if entry exists
    if (entry) {
        calculateVAT();
    }
    
    document.getElementById('accounting-entry-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveAccountingEntry(entry?.id);
    });
}

// Toggle customer field visibility
function toggleCustomerField() {
    const entryType = document.getElementById('entry_type').value;
    const customerField = document.getElementById('customer-field');
    
    if (entryType === 'income') {
        customerField.classList.remove('hidden');
    } else {
        customerField.classList.add('hidden');
        document.getElementById('customer_id').value = '';
    }
}

// Calculate VAT amount
function calculateVAT() {
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    const vatRate = parseFloat(document.getElementById('vat_rate').value) || 0;
    const vatAmount = amount * (vatRate / 100);
    const totalAmount = amount + vatAmount;
    
    document.getElementById('vat_amount').value = vatAmount.toFixed(2);
    document.getElementById('total_amount').value = totalAmount.toFixed(2);
}

// Save accounting entry
async function saveAccountingEntry(id = null) {
    const formData = {
        entry_type: document.getElementById('entry_type').value,
        amount: parseFloat(document.getElementById('amount').value),
        vat_rate: parseFloat(document.getElementById('vat_rate').value) || 0,
        vat_amount: parseFloat(document.getElementById('vat_amount').value) || 0,
        total_amount: parseFloat(document.getElementById('total_amount').value) || 0,
        entry_date: document.getElementById('entry_date').value,
        description: document.getElementById('description').value,
        category_id: document.getElementById('category_id').value || null,
        customer_id: document.getElementById('customer_id').value || null,
        project_id: document.getElementById('project_id').value || null,
        receipt_number: document.getElementById('receipt_number').value || null,
        notes: document.getElementById('notes').value || null,
        status: document.getElementById('status').value
    };
    
    try {
        if (id) {
            await axios.put(`/api/accounting/entries/${id}`, formData);
            showNotification('Buchung erfolgreich aktualisiert!', 'success');
        } else {
            await axios.post('/api/accounting/entries', formData);
            showNotification('Buchung erfolgreich erstellt!', 'success');
        }
        
        closeModal('accounting-entry-modal');
        await loadAccountingEntries();
        await loadAccountingSummary();
    } catch (error) {
        console.error('Error saving accounting entry:', error);
        showNotification('Fehler beim Speichern der Buchung', 'error');
    }
}

// Delete accounting entry
async function deleteAccountingEntry(id) {
    if (!confirm('Sind Sie sicher, dass Sie diese Buchung löschen möchten?')) {
        return;
    }
    
    try {
        await axios.delete(`/api/accounting/entries/${id}`);
        await loadAccountingEntries();
        await loadAccountingSummary();
        showNotification('Buchung erfolgreich gelöscht!', 'success');
    } catch (error) {
        console.error('Error deleting accounting entry:', error);
        showNotification('Fehler beim Löschen der Buchung', 'error');
    }
}

// Show QR Templates modal
function showQRTemplatesModal() {
    const modalHtml = `
        <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" id="qr-templates-modal">
            <div class="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-medium text-gray-900">
                        <i class="fas fa-qrcode text-purple-600 mr-2"></i>
                        QR-Code Management
                    </h3>
                    <button onclick="closeModal('qr-templates-modal')" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${currentQRTemplates.map(template => `
                        <div class="bg-gray-50 rounded-lg p-4 border">
                            <div class="flex justify-between items-start mb-3">
                                <h4 class="font-semibold text-gray-900">${template.name}</h4>
                                <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">${template.type}</span>
                            </div>
                            ${template.description ? `<p class="text-sm text-gray-600 mb-3">${template.description}</p>` : ''}
                            <div class="space-y-2">
                                <button onclick="generateQRCode(${template.id})" class="w-full bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-sm">
                                    <i class="fas fa-qrcode mr-1"></i>QR-Code generieren
                                </button>
                                <div class="flex space-x-2">
                                    <button onclick="editQRTemplate(${template.id})" class="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs">
                                        <i class="fas fa-edit mr-1"></i>Bearbeiten
                                    </button>
                                    <button onclick="deleteQRTemplate(${template.id})" class="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs">
                                        <i class="fas fa-trash mr-1"></i>Löschen
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                    
                    <!-- Add New Template Card -->
                    <div class="bg-white rounded-lg p-4 border-2 border-dashed border-gray-300 flex items-center justify-center">
                        <button onclick="showNewQRTemplateModal()" class="text-gray-400 hover:text-gray-600 text-center">
                            <i class="fas fa-plus text-2xl mb-2"></i>
                            <div class="text-sm">Neues Template</div>
                        </button>
                    </div>
                </div>
                
                <div class="mt-6 flex justify-end">
                    <button onclick="closeModal('qr-templates-modal')" class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
                        Schließen
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modal-container').innerHTML = modalHtml;
}

// Generate QR Code
async function generateQRCode(templateId) {
    try {
        const response = await axios.get(`/api/accounting/qr-code/${templateId}`);
        const qrData = response.data;
        
        // Show QR code modal with the generated URL
        const qrModalHtml = `
            <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" id="qr-display-modal">
                <div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white text-center">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">
                        <i class="fas fa-qrcode text-purple-600 mr-2"></i>
                        QR-Code für ${qrData.template.name}
                    </h3>
                    
                    <div class="mb-4">
                        <div id="qr-code-container" class="flex justify-center mb-4"></div>
                        <p class="text-sm text-gray-600 mb-2">
                            Scannen Sie diesen QR-Code mit Ihrem Smartphone, um Belege hochzuladen.
                        </p>
                        <p class="text-xs text-gray-500">
                            Gültig bis: ${new Date(qrData.expiresAt).toLocaleString('de-CH')}
                        </p>
                    </div>
                    
                    <div class="space-y-2">
                        <button onclick="printQRCode()" class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                            <i class="fas fa-print mr-2"></i>QR-Code drucken
                        </button>
                        <button onclick="copyQRUrl('${qrData.qrData}')" class="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded">
                            <i class="fas fa-copy mr-2"></i>URL kopieren
                        </button>
                        <button onclick="closeModal('qr-display-modal')" class="w-full bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400">
                            Schließen
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('modal-container').innerHTML = qrModalHtml;
        
        // Generate QR code using a library (we'll use QR Server API for simplicity)
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData.qrData)}`;
        document.getElementById('qr-code-container').innerHTML = 
            `<img src="${qrCodeUrl}" alt="QR Code" class="border rounded">`;
        
    } catch (error) {
        console.error('Error generating QR code:', error);
        showNotification('Fehler beim Generieren des QR-Codes', 'error');
    }
}

// Copy QR URL to clipboard
function copyQRUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
        showNotification('URL in Zwischenablage kopiert!', 'success');
    }).catch(err => {
        console.error('Failed to copy URL: ', err);
        showNotification('Fehler beim Kopieren der URL', 'error');
    });
}

// Print QR Code
function printQRCode() {
    window.print();
}

// Show receipt image
function showReceiptImage(imageUrl) {
    const modalHtml = `
        <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" id="receipt-image-modal" onclick="closeModal('receipt-image-modal')">
            <div class="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-medium text-gray-900">
                        <i class="fas fa-receipt text-blue-600 mr-2"></i>
                        Beleg
                    </h3>
                    <button onclick="closeModal('receipt-image-modal')" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="text-center">
                    <img src="${imageUrl}" alt="Beleg" class="max-w-full max-h-96 mx-auto rounded border">
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modal-container').innerHTML = modalHtml;
}

// Helper functions for accounting status
function getAccountingStatusColor(status) {
    switch(status) {
        case 'draft': return 'bg-gray-100 text-gray-800';
        case 'confirmed': return 'bg-green-100 text-green-800';
        case 'reconciled': return 'bg-blue-100 text-blue-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

function getAccountingStatusText(status) {
    switch(status) {
        case 'draft': return 'Entwurf';
        case 'confirmed': return 'Bestätigt';
        case 'reconciled': return 'Abgestimmt';
        default: return 'Unbekannt';
    }
}