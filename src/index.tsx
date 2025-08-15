import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for API routes
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// API Routes - Customers (CRM)
app.get('/api/customers', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM customers ORDER BY created_at DESC'
    ).all()
    return c.json({ customers: results })
  } catch (error) {
    console.error('Error fetching customers:', error)
    return c.json({ error: 'Failed to fetch customers' }, 500)
  }
})

app.post('/api/customers', async (c) => {
  try {
    const data = await c.req.json()
    const { success, meta } = await c.env.DB.prepare(`
      INSERT INTO customers (company_name, contact_person, email, phone, address, city, postal_code, country, tax_number, hourly_rate, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.company_name || '',
      data.contact_person || null,
      data.email || null,
      data.phone || null,
      data.address || null,
      data.city || null,
      data.postal_code || null,
      data.country || 'Schweiz',
      data.tax_number || null,
      data.hourly_rate || 0,
      data.notes || null
    ).run()

    if (success) {
      return c.json({ id: meta.last_row_id, ...data })
    }
    throw new Error('Failed to create customer')
  } catch (error) {
    console.error('Error creating customer:', error)
    return c.json({ error: 'Failed to create customer' }, 500)
  }
})

app.put('/api/customers/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    const { success } = await c.env.DB.prepare(`
      UPDATE customers SET 
        company_name = ?, contact_person = ?, email = ?, phone = ?,
        address = ?, city = ?, postal_code = ?, country = ?,
        tax_number = ?, hourly_rate = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      data.company_name || '',
      data.contact_person || null,
      data.email || null,
      data.phone || null,
      data.address || null,
      data.city || null,
      data.postal_code || null,
      data.country || 'Schweiz',
      data.tax_number || null,
      data.hourly_rate || 0,
      data.notes || null,
      id
    ).run()

    if (success) {
      return c.json({ id, ...data })
    }
    throw new Error('Failed to update customer')
  } catch (error) {
    console.error('Error updating customer:', error)
    return c.json({ error: 'Failed to update customer' }, 500)
  }
})

app.delete('/api/customers/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { success } = await c.env.DB.prepare('DELETE FROM customers WHERE id = ?').bind(id).run()
    
    if (success) {
      return c.json({ success: true })
    }
    throw new Error('Failed to delete customer')
  } catch (error) {
    console.error('Error deleting customer:', error)
    return c.json({ error: 'Failed to delete customer' }, 500)
  }
})

// API Routes - Time Entries
app.get('/api/time-entries', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT te.*, c.company_name, p.name as project_name 
      FROM time_entries te
      LEFT JOIN customers c ON te.customer_id = c.id
      LEFT JOIN projects p ON te.project_id = p.id
      ORDER BY te.start_time DESC
    `).all()
    return c.json({ timeEntries: results })
  } catch (error) {
    console.error('Error fetching time entries:', error)
    return c.json({ error: 'Failed to fetch time entries' }, 500)
  }
})

app.post('/api/time-entries', async (c) => {
  try {
    const data = await c.req.json()
    
    // Calculate duration if end_time is provided
    let duration_minutes = data.duration_minutes
    if (data.start_time && data.end_time) {
      const start = new Date(data.start_time)
      const end = new Date(data.end_time)
      duration_minutes = Math.round((end.getTime() - start.getTime()) / 60000)
    }
    
    const { success, meta } = await c.env.DB.prepare(`
      INSERT INTO time_entries (customer_id, project_id, description, start_time, end_time, duration_minutes, hourly_rate, is_billable, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.customer_id || null,
      data.project_id || null,
      data.description || '',
      data.start_time || null,
      data.end_time || null,
      duration_minutes || null,
      data.hourly_rate || null,
      data.is_billable ?? 1,
      data.notes || null
    ).run()

    if (success) {
      return c.json({ id: meta.last_row_id, ...data, duration_minutes })
    }
    throw new Error('Failed to create time entry')
  } catch (error) {
    console.error('Error creating time entry:', error)
    return c.json({ error: 'Failed to create time entry' }, 500)
  }
})

app.put('/api/time-entries/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    // Calculate duration if end_time is provided
    let duration_minutes = data.duration_minutes
    if (data.start_time && data.end_time) {
      const start = new Date(data.start_time)
      const end = new Date(data.end_time)
      duration_minutes = Math.round((end.getTime() - start.getTime()) / 60000)
    }
    
    const { success } = await c.env.DB.prepare(`
      UPDATE time_entries SET 
        customer_id = ?, project_id = ?, description = ?, start_time = ?, end_time = ?, 
        duration_minutes = ?, hourly_rate = ?, is_billable = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      data.customer_id || null,
      data.project_id || null,
      data.description || '',
      data.start_time || null,
      data.end_time || null,
      duration_minutes || null,
      data.hourly_rate || null,
      data.is_billable ?? 1,
      data.notes || null,
      id
    ).run()

    if (success) {
      return c.json({ id, ...data, duration_minutes })
    }
    throw new Error('Failed to update time entry')
  } catch (error) {
    console.error('Error updating time entry:', error)
    return c.json({ error: 'Failed to update time entry' }, 500)
  }
})

app.delete('/api/time-entries/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { success } = await c.env.DB.prepare('DELETE FROM time_entries WHERE id = ?').bind(id).run()
    
    if (success) {
      return c.json({ success: true })
    }
    throw new Error('Failed to delete time entry')
  } catch (error) {
    console.error('Error deleting time entry:', error)
    return c.json({ error: 'Failed to delete time entry' }, 500)
  }
})

// API Routes - Projects
app.get('/api/projects', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT p.*, c.company_name
      FROM projects p
      LEFT JOIN customers c ON p.customer_id = c.id
      ORDER BY p.created_at DESC
    `).all()
    return c.json({ projects: results })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return c.json({ error: 'Failed to fetch projects' }, 500)
  }
})

app.post('/api/projects', async (c) => {
  try {
    const data = await c.req.json()
    const { success, meta } = await c.env.DB.prepare(`
      INSERT INTO projects (customer_id, name, description, hourly_rate, budget, status, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.customer_id || null,
      data.name || '',
      data.description || null,
      data.hourly_rate || null,
      data.budget || null,
      data.status || 'active',
      data.start_date || null,
      data.end_date || null
    ).run()

    if (success) {
      return c.json({ id: meta.last_row_id, ...data })
    }
    throw new Error('Failed to create project')
  } catch (error) {
    console.error('Error creating project:', error)
    return c.json({ error: 'Failed to create project' }, 500)
  }
})

app.put('/api/projects/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    const { success } = await c.env.DB.prepare(`
      UPDATE projects SET 
        customer_id = ?, name = ?, description = ?, hourly_rate = ?, 
        budget = ?, status = ?, start_date = ?, end_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      data.customer_id || null,
      data.name || '',
      data.description || null,
      data.hourly_rate || null,
      data.budget || null,
      data.status || 'active',
      data.start_date || null,
      data.end_date || null,
      id
    ).run()

    if (success) {
      return c.json({ id, ...data })
    }
    throw new Error('Failed to update project')
  } catch (error) {
    console.error('Error updating project:', error)
    return c.json({ error: 'Failed to update project' }, 500)
  }
})

app.delete('/api/projects/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { success } = await c.env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(id).run()
    
    if (success) {
      return c.json({ success: true })
    }
    throw new Error('Failed to delete project')
  } catch (error) {
    console.error('Error deleting project:', error)
    return c.json({ error: 'Failed to delete project' }, 500)
  }
})

// Initialize database tables
app.get('/api/init-db', async (c) => {
  try {
    // This will be handled by migrations, but we can use it for testing
    await c.env.DB.exec(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_name TEXT NOT NULL,
        contact_person TEXT,
        email TEXT UNIQUE,
        phone TEXT,
        address TEXT,
        city TEXT,
        postal_code TEXT,
        country TEXT DEFAULT 'Switzerland',
        tax_number TEXT,
        notes TEXT,
        hourly_rate DECIMAL(10,2) DEFAULT 0.00,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    return c.json({ success: true, message: 'Database initialized' })
  } catch (error) {
    console.error('Error initializing database:', error)
    return c.json({ error: 'Failed to initialize database' }, 500)
  }
})

// Main frontend
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Business Management Tool</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          .active-tab { @apply bg-blue-600 text-white; }
          .tab { @apply px-4 py-2 bg-gray-200 text-gray-700 rounded-t-lg cursor-pointer hover:bg-gray-300 transition-colors; }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- Header -->
        <header class="bg-white shadow-sm border-b">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <i class="fas fa-chart-line text-blue-600 text-2xl mr-3"></i>
                        <h1 class="text-xl font-bold text-gray-900">Business Management</h1>
                    </div>
                    <div class="text-sm text-gray-500">
                        <i class="fas fa-clock mr-1"></i>
                        <span id="current-time"></span>
                    </div>
                </div>
            </div>
        </header>

        <!-- Navigation Tabs -->
        <nav class="bg-white border-b">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex space-x-1 py-2">
                    <button class="tab active-tab" onclick="showTab('dashboard')">
                        <i class="fas fa-tachometer-alt mr-2"></i>Dashboard
                    </button>
                    <button class="tab" onclick="showTab('customers')">
                        <i class="fas fa-users mr-2"></i>Kundenstamm
                    </button>
                    <button class="tab" onclick="showTab('timetracking')">
                        <i class="fas fa-clock mr-2"></i>Zeiterfassung
                    </button>
                    <button class="tab" onclick="showTab('projects')">
                        <i class="fas fa-project-diagram mr-2"></i>Projekte
                    </button>
                    <button class="tab" onclick="showTab('invoices')">
                        <i class="fas fa-file-invoice mr-2"></i>Rechnungen
                    </button>
                    <button class="tab" onclick="showTab('quotes')">
                        <i class="fas fa-file-contract mr-2"></i>Angebote
                    </button>
                </div>
            </div>
        </nav>

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <!-- Dashboard Tab -->
            <div id="dashboard" class="tab-content">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div class="bg-white rounded-lg shadow p-6">
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <i class="fas fa-users text-blue-600 text-2xl"></i>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-600">Aktive Kunden</p>
                                <p id="total-customers" class="text-2xl font-bold text-gray-900">0</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white rounded-lg shadow p-6">
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <i class="fas fa-clock text-green-600 text-2xl"></i>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-600">Stunden diese Woche</p>
                                <p id="weekly-hours" class="text-2xl font-bold text-gray-900">0.0</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white rounded-lg shadow p-6">
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <i class="fas fa-project-diagram text-purple-600 text-2xl"></i>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-600">Aktive Projekte</p>
                                <p id="active-projects" class="text-2xl font-bold text-gray-900">0</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white rounded-lg shadow p-6">
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <i class="fas fa-euro-sign text-yellow-600 text-2xl"></i>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-600">Umsatz Monat</p>
                                <p id="monthly-revenue" class="text-2xl font-bold text-gray-900">0.00 CHF</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="bg-white rounded-lg shadow">
                        <div class="px-6 py-4 border-b border-gray-200">
                            <h3 class="text-lg font-medium text-gray-900">Letzte Zeiteinträge</h3>
                        </div>
                        <div class="p-6">
                            <div id="recent-time-entries" class="space-y-4">
                                <!-- Will be populated by JavaScript -->
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white rounded-lg shadow">
                        <div class="px-6 py-4 border-b border-gray-200">
                            <h3 class="text-lg font-medium text-gray-900">Offene Rechnungen</h3>
                        </div>
                        <div class="p-6">
                            <div id="pending-invoices" class="space-y-4">
                                <!-- Will be populated by JavaScript -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Customers Tab -->
            <div id="customers" class="tab-content hidden">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-900">Kundenstamm</h2>
                    <button onclick="showCustomerModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                        <i class="fas fa-plus mr-2"></i>Neuer Kunde
                    </button>
                </div>
                
                <div class="bg-white shadow rounded-lg">
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Firma</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kontakt</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stundensatz</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aktionen</th>
                                </tr>
                            </thead>
                            <tbody id="customers-table" class="bg-white divide-y divide-gray-200">
                                <!-- Will be populated by JavaScript -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Time Tracking Tab -->
            <div id="timetracking" class="tab-content hidden">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-900">Zeiterfassung</h2>
                    <button onclick="showTimeEntryModal()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
                        <i class="fas fa-plus mr-2"></i>Zeit erfassen
                    </button>
                </div>
                
                <!-- Timer Widget -->
                <div class="bg-white rounded-lg shadow p-6 mb-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="text-lg font-medium text-gray-900 mb-2">Timer</h3>
                            <div class="text-3xl font-mono text-gray-900" id="timer-display">00:00:00</div>
                        </div>
                        <div class="space-x-2">
                            <button id="timer-start" onclick="startTimer()" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
                                <i class="fas fa-play"></i> Start
                            </button>
                            <button id="timer-stop" onclick="stopTimer()" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded" disabled>
                                <i class="fas fa-stop"></i> Stop
                            </button>
                            <button id="timer-reset" onclick="resetTimer()" class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">
                                <i class="fas fa-refresh"></i> Reset
                            </button>
                        </div>
                    </div>
                    <div class="mt-4">
                        <input type="text" id="timer-description" placeholder="Beschreibung der Tätigkeit..." class="w-full px-3 py-2 border border-gray-300 rounded-md">
                    </div>
                </div>
                
                <div class="bg-white shadow rounded-lg">
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kunde</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beschreibung</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dauer</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aktionen</th>
                                </tr>
                            </thead>
                            <tbody id="timeentries-table" class="bg-white divide-y divide-gray-200">
                                <!-- Will be populated by JavaScript -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Projects Tab -->
            <div id="projects" class="tab-content hidden">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-900">Projekte</h2>
                    <button onclick="showProjectModal()" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg">
                        <i class="fas fa-plus mr-2"></i>Neues Projekt
                    </button>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="projects-grid">
                    <!-- Will be populated by JavaScript -->
                </div>
            </div>

            <!-- Invoices Tab -->
            <div id="invoices" class="tab-content hidden">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-900">Rechnungen</h2>
                    <button onclick="showInvoiceModal()" class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg">
                        <i class="fas fa-plus mr-2"></i>Neue Rechnung
                    </button>
                </div>
                
                <div class="bg-white rounded-lg shadow p-6">
                    <p class="text-gray-500 text-center py-8">Rechnungsmodul wird implementiert...</p>
                </div>
            </div>

            <!-- Quotes Tab -->
            <div id="quotes" class="tab-content hidden">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-900">Angebote</h2>
                    <button onclick="showQuoteModal()" class="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg">
                        <i class="fas fa-plus mr-2"></i>Neues Angebot
                    </button>
                </div>
                
                <div class="bg-white rounded-lg shadow p-6">
                    <p class="text-gray-500 text-center py-8">Angebotsmodul wird implementiert...</p>
                </div>
            </div>
        </main>

        <!-- Modals will be inserted here by JavaScript -->
        <div id="modal-container"></div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app
