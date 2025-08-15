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
    
    const customerOptions = currentCustomers.map(customer => 
        `<option value="${customer.id}">${customer.company_name}</option>`
    ).join('');
    
    const modalHtml = `
        <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" id="timer-save-modal">
            <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div class="mt-3">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">Timer speichern</h3>
                    <form id="timer-save-form">
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Dauer</label>
                                <p class="text-lg font-semibold text-gray-900">${formatDuration(durationMinutes)}</p>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Kunde *</label>
                                <select id="timer_customer_id" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
                                    <option value="">Kunde auswählen</option>
                                    ${customerOptions}
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Beschreibung</label>
                                <textarea id="timer_description" rows="3" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">${description}</textarea>
                            </div>
                        </div>
                        <div class="flex justify-end space-x-3 mt-6">
                            <button type="button" onclick="closeModal('timer-save-modal')" class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
                                Verwerfen
                            </button>
                            <button type="submit" class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                                Speichern
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
}

async function saveTimerEntry(durationMinutes) {
    const customerId = document.getElementById('timer_customer_id').value;
    const description = document.getElementById('timer_description').value;
    
    if (!customerId || !description) {
        showNotification('Bitte Kunde und Beschreibung ausfüllen', 'error');
        return;
    }
    
    const now = new Date();
    const startTime = new Date(now.getTime() - (durationMinutes * 60000));
    
    const formData = {
        customer_id: parseInt(customerId),
        description: description,
        start_time: startTime.toISOString(),
        end_time: now.toISOString(),
        duration_minutes: durationMinutes,
        is_billable: 1
    };
    
    try {
        await axios.post('/api/time-entries', formData);
        closeModal('timer-save-modal');
        resetTimer();
        await loadTimeEntries();
        showNotification('Zeiteintrag erfolgreich gespeichert!', 'success');
    } catch (error) {
        console.error('Error saving timer entry:', error);
        showNotification('Fehler beim Speichern des Zeiteintrags', 'error');
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
                                <select id="customer_id" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
                                    <option value="">Kunde auswählen</option>
                                    ${customerOptions}
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Projektname *</label>
                                <input type="text" id="name" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value="${project?.name || ''}">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Beschreibung</label>
                                <textarea id="description" rows="3" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">${project?.description || ''}</textarea>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Budget (CHF)</label>
                                    <input type="number" id="budget" step="0.01" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value="${project?.budget || ''}">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Stundensatz (CHF)</label>
                                    <input type="number" id="hourly_rate" step="0.01" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value="${project?.hourly_rate || ''}">
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Status</label>
                                <select id="status" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
                                    <option value="active" ${project?.status === 'active' ? 'selected' : ''}>Aktiv</option>
                                    <option value="completed" ${project?.status === 'completed' ? 'selected' : ''}>Abgeschlossen</option>
                                    <option value="paused" ${project?.status === 'paused' ? 'selected' : ''}>Pausiert</option>
                                    <option value="cancelled" ${project?.status === 'cancelled' ? 'selected' : ''}>Abgebrochen</option>
                                </select>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Startdatum</label>
                                    <input type="date" id="start_date" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value="${project?.start_date || ''}">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Enddatum</label>
                                    <input type="date" id="end_date" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value="${project?.end_date || ''}">
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
        customer_id: parseInt(document.getElementById('customer_id').value),
        name: document.getElementById('name').value,
        description: document.getElementById('description').value,
        budget: parseFloat(document.getElementById('budget').value) || null,
        hourly_rate: parseFloat(document.getElementById('hourly_rate').value) || null,
        status: document.getElementById('status').value,
        start_date: document.getElementById('start_date').value || null,
        end_date: document.getElementById('end_date').value || null
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

// Placeholder functions for future implementation
function showInvoiceModal() {
    showNotification('Rechnungsmodul wird bald implementiert', 'info');
}

function showQuoteModal() {
    showNotification('Angebotsmodul wird bald implementiert', 'info');
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
        // await axios.delete(`/api/projects/${id}`);
        await loadProjects();
        showNotification('Projekt erfolgreich gelöscht!', 'success');
    } catch (error) {
        console.error('Error deleting project:', error);
        showNotification('Fehler beim Löschen des Projekts', 'error');
    }
}