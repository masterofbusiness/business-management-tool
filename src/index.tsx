import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Bindings }>()

// Utility functions for PDF generation
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF'
  }).format(amount)
}

function getInvoiceStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    'draft': 'Entwurf',
    'sent': 'Versendet',
    'paid': 'Bezahlt',
    'overdue': 'Überfällig',
    'cancelled': 'Storniert'
  }
  return statusMap[status] || status
}

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
    // Debug: Check if database is available
    if (!c.env.DB) {
      console.error('Database not bound!')
      return c.json({ error: 'Database not available - check D1 binding' }, 500)
    }

    const data = await c.req.json()
    console.log('Creating customer with data:', data)
    
    // Test database connection first
    try {
      await c.env.DB.prepare('SELECT 1 as test').first()
    } catch (dbError) {
      console.error('Database connection failed:', dbError)
      return c.json({ error: 'Database connection failed', details: dbError.message }, 500)
    }

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
      console.log('Customer created successfully:', meta.last_row_id)
      return c.json({ id: meta.last_row_id, ...data })
    }
    throw new Error('Failed to create customer')
  } catch (error) {
    console.error('Error creating customer:', error)
    return c.json({ 
      error: 'Failed to create customer', 
      details: error.message,
      hasDB: !!c.env.DB 
    }, 500)
  }
})

app.put('/api/customers/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    // Debug logging
    console.log('DEBUG - Customer PUT request received:')
    console.log('ID:', id)
    console.log('Data received:', JSON.stringify(data, null, 2))
    console.log('Company name from data:', data.company_name)
    
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

    console.log('DEBUG - Update success:', success)

    if (success) {
      // Get the updated record to see what was actually saved
      const updated = await c.env.DB.prepare('SELECT * FROM customers WHERE id = ?').bind(id).first()
      console.log('DEBUG - Updated record in database:', JSON.stringify(updated, null, 2))
      
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

// API Routes - Invoices (Rechnungen)
app.get('/api/invoices', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT i.*, c.company_name, c.contact_person, c.email
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      ORDER BY i.created_at DESC
    `).all()
    return c.json({ invoices: results })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return c.json({ error: 'Failed to fetch invoices' }, 500)
  }
})

app.get('/api/invoices/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { results: invoices } = await c.env.DB.prepare(`
      SELECT i.*, c.company_name, c.contact_person, c.email, c.address, c.city, c.postal_code, c.country
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = ?
    `).bind(id).all()
    
    if (invoices.length === 0) {
      return c.json({ error: 'Invoice not found' }, 404)
    }
    
    const { results: items } = await c.env.DB.prepare(`
      SELECT ii.*, te.description as time_description, te.start_time, te.duration_minutes
      FROM invoice_items ii
      LEFT JOIN time_entries te ON ii.time_entry_id = te.id
      WHERE ii.invoice_id = ?
      ORDER BY ii.id
    `).bind(id).all()
    
    return c.json({ invoice: invoices[0], items: items })
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return c.json({ error: 'Failed to fetch invoice' }, 500)
  }
})

app.post('/api/invoices', async (c) => {
  try {
    const data = await c.req.json()
    
    // Generate invoice number if not provided
    let invoiceNumber = data.invoice_number
    if (!invoiceNumber) {
      const year = new Date().getFullYear()
      const { results } = await c.env.DB.prepare(`
        SELECT COUNT(*) as count FROM invoices WHERE invoice_number LIKE ?
      `).bind(`RE-${year}-%`).all()
      const count = results[0]?.count || 0
      invoiceNumber = `RE-${year}-${String(count + 1).padStart(3, '0')}`
    }
    
    const { success, meta } = await c.env.DB.prepare(`
      INSERT INTO invoices (invoice_number, customer_id, issue_date, due_date, status, subtotal, tax_rate, tax_amount, total_amount, payment_terms, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      invoiceNumber,
      data.customer_id || null,
      data.issue_date || new Date().toISOString().split('T')[0],
      data.due_date || null,
      data.status || 'draft',
      data.subtotal || 0,
      data.tax_rate || 8.1,
      data.tax_amount || 0,
      data.total_amount || 0,
      data.payment_terms || '30 Tage',
      data.notes || null
    ).run()

    if (success) {
      // Add invoice items if provided
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          await c.env.DB.prepare(`
            INSERT INTO invoice_items (invoice_id, time_entry_id, description, quantity, unit_price, total)
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(
            meta.last_row_id,
            item.time_entry_id || null,
            item.description || '',
            item.quantity || 1,
            item.unit_price || 0,
            item.total || 0
          ).run()
        }
      }
      
      return c.json({ id: meta.last_row_id, invoice_number: invoiceNumber, ...data })
    }
    throw new Error('Failed to create invoice')
  } catch (error) {
    console.error('Error creating invoice:', error)
    return c.json({ error: 'Failed to create invoice' }, 500)
  }
})

app.put('/api/invoices/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    const { success } = await c.env.DB.prepare(`
      UPDATE invoices SET 
        customer_id = ?, issue_date = ?, due_date = ?, status = ?,
        subtotal = ?, tax_rate = ?, tax_amount = ?, total_amount = ?,
        payment_terms = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      data.customer_id || null,
      data.issue_date || null,
      data.due_date || null,
      data.status || 'draft',
      data.subtotal || 0,
      data.tax_rate || 8.1,
      data.tax_amount || 0,
      data.total_amount || 0,
      data.payment_terms || '30 Tage',
      data.notes || null,
      id
    ).run()

    if (success) {
      // Update invoice items if provided
      if (data.items) {
        // Delete existing items
        await c.env.DB.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').bind(id).run()
        
        // Add new items
        for (const item of data.items) {
          await c.env.DB.prepare(`
            INSERT INTO invoice_items (invoice_id, time_entry_id, description, quantity, unit_price, total)
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(
            id,
            item.time_entry_id || null,
            item.description || '',
            item.quantity || 1,
            item.unit_price || 0,
            item.total || 0
          ).run()
        }
      }
      
      return c.json({ id, ...data })
    }
    throw new Error('Failed to update invoice')
  } catch (error) {
    console.error('Error updating invoice:', error)
    return c.json({ error: 'Failed to update invoice' }, 500)
  }
})

app.delete('/api/invoices/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    // Delete invoice items first (foreign key constraint)
    await c.env.DB.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').bind(id).run()
    
    // Delete invoice
    const { success } = await c.env.DB.prepare('DELETE FROM invoices WHERE id = ?').bind(id).run()
    
    if (success) {
      return c.json({ success: true })
    }
    throw new Error('Failed to delete invoice')
  } catch (error) {
    console.error('Error deleting invoice:', error)
    return c.json({ error: 'Failed to delete invoice' }, 500)
  }
})

// Special route to create invoice from time entries
app.post('/api/invoices/from-time-entries', async (c) => {
  try {
    const data = await c.req.json()
    const { customer_id, time_entry_ids, issue_date, due_date, payment_terms, notes } = data
    
    if (!customer_id || !time_entry_ids || time_entry_ids.length === 0) {
      return c.json({ error: 'Customer ID and time entry IDs are required' }, 400)
    }
    
    // Get time entries
    const placeholders = time_entry_ids.map(() => '?').join(',')
    const { results: timeEntries } = await c.env.DB.prepare(`
      SELECT te.*, c.hourly_rate as customer_hourly_rate
      FROM time_entries te
      LEFT JOIN customers c ON te.customer_id = c.id
      WHERE te.id IN (${placeholders}) AND te.customer_id = ? AND te.is_billable = 1 AND te.is_billed = 0
    `).bind(...time_entry_ids, customer_id).all()
    
    if (timeEntries.length === 0) {
      return c.json({ error: 'No billable time entries found' }, 400)
    }
    
    // Calculate totals
    let subtotal = 0
    const items = timeEntries.map(entry => {
      const hours = (entry.duration_minutes || 0) / 60
      const rate = entry.hourly_rate || entry.customer_hourly_rate || 0
      const total = hours * rate
      subtotal += total
      
      return {
        time_entry_id: entry.id,
        description: entry.description,
        quantity: hours,
        unit_price: rate,
        total: total
      }
    })
    
    const taxRate = 8.1
    const taxAmount = subtotal * (taxRate / 100)
    const totalAmount = subtotal + taxAmount
    
    // Generate invoice number  
    const year = new Date().getFullYear()
    const { results } = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM invoices WHERE invoice_number LIKE ?
    `).bind(`RE-${year}-%`).all()
    const count = results[0]?.count || 0
    const invoiceNumber = `RE-${year}-${String(count + 1).padStart(3, '0')}`
    
    // Create invoice
    const { success, meta } = await c.env.DB.prepare(`
      INSERT INTO invoices (invoice_number, customer_id, issue_date, due_date, status, subtotal, tax_rate, tax_amount, total_amount, payment_terms, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      invoiceNumber,
      customer_id,
      issue_date || new Date().toISOString().split('T')[0],
      due_date || null,
      'draft',
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
      payment_terms || '30 Tage',
      notes || null
    ).run()

    if (success) {
      const invoiceId = meta.last_row_id
      
      // Add invoice items
      for (const item of items) {
        await c.env.DB.prepare(`
          INSERT INTO invoice_items (invoice_id, time_entry_id, description, quantity, unit_price, total)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          invoiceId,
          item.time_entry_id,
          item.description,
          item.quantity,
          item.unit_price,
          item.total
        ).run()
      }
      
      // Mark time entries as billed
      for (const entryId of time_entry_ids) {
        await c.env.DB.prepare(`
          UPDATE time_entries SET is_billed = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).bind(entryId).run()
      }
      
      return c.json({ 
        id: invoiceId, 
        invoice_number: invoiceNumber,
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        items_count: items.length
      })
    }
    throw new Error('Failed to create invoice from time entries')
  } catch (error) {
    console.error('Error creating invoice from time entries:', error)
    return c.json({ error: 'Failed to create invoice from time entries' }, 500)
  }
})

// API Routes - Quotes (Angebote/Offerte)
app.get('/api/quotes', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT q.*, c.company_name, c.contact_person, c.email
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      ORDER BY q.created_at DESC
    `).all()
    return c.json({ quotes: results })
  } catch (error) {
    console.error('Error fetching quotes:', error)
    return c.json({ error: 'Failed to fetch quotes' }, 500)
  }
})

app.get('/api/quotes/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { results: quotes } = await c.env.DB.prepare(`
      SELECT q.*, c.company_name, c.contact_person, c.email, c.address, c.city, c.postal_code, c.country
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.id = ?
    `).bind(id).all()
    
    if (quotes.length === 0) {
      return c.json({ error: 'Quote not found' }, 404)
    }
    
    const { results: items } = await c.env.DB.prepare(`
      SELECT * FROM quote_items WHERE quote_id = ? ORDER BY id
    `).bind(id).all()
    
    return c.json({ quote: quotes[0], items: items })
  } catch (error) {
    console.error('Error fetching quote:', error)
    return c.json({ error: 'Failed to fetch quote' }, 500)
  }
})

app.post('/api/quotes', async (c) => {
  try {
    const data = await c.req.json()
    
    // Generate quote number if not provided
    let quoteNumber = data.quote_number
    if (!quoteNumber) {
      const year = new Date().getFullYear()
      const { results } = await c.env.DB.prepare(`
        SELECT COUNT(*) as count FROM quotes WHERE quote_number LIKE ?
      `).bind(`OFF-${year}-%`).all()
      const count = results[0]?.count || 0
      quoteNumber = `OFF-${year}-${String(count + 1).padStart(3, '0')}`
    }
    
    const { success, meta } = await c.env.DB.prepare(`
      INSERT INTO quotes (quote_number, customer_id, issue_date, valid_until, status, subtotal, tax_rate, tax_amount, total_amount, notes, terms_conditions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      quoteNumber,
      data.customer_id || null,
      data.issue_date || new Date().toISOString().split('T')[0],
      data.valid_until || null,
      data.status || 'draft',
      data.subtotal || 0,
      data.tax_rate || 8.1,
      data.tax_amount || 0,
      data.total_amount || 0,
      data.notes || null,
      data.terms_conditions || null
    ).run()

    if (success) {
      // Add quote items if provided
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          await c.env.DB.prepare(`
            INSERT INTO quote_items (quote_id, description, quantity, unit_price, total)
            VALUES (?, ?, ?, ?, ?)
          `).bind(
            meta.last_row_id,
            item.description || '',
            item.quantity || 1,
            item.unit_price || 0,
            item.total || 0
          ).run()
        }
      }
      
      return c.json({ id: meta.last_row_id, quote_number: quoteNumber, ...data })
    }
    throw new Error('Failed to create quote')
  } catch (error) {
    console.error('Error creating quote:', error)
    return c.json({ error: 'Failed to create quote' }, 500)
  }
})

app.put('/api/quotes/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    const { success } = await c.env.DB.prepare(`
      UPDATE quotes SET 
        customer_id = ?, issue_date = ?, valid_until = ?, status = ?,
        subtotal = ?, tax_rate = ?, tax_amount = ?, total_amount = ?,
        notes = ?, terms_conditions = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      data.customer_id || null,
      data.issue_date || null,
      data.valid_until || null,
      data.status || 'draft',
      data.subtotal || 0,
      data.tax_rate || 8.1,
      data.tax_amount || 0,
      data.total_amount || 0,
      data.notes || null,
      data.terms_conditions || null,
      id
    ).run()

    if (success) {
      // Update quote items if provided
      if (data.items) {
        // Delete existing items
        await c.env.DB.prepare('DELETE FROM quote_items WHERE quote_id = ?').bind(id).run()
        
        // Add new items
        for (const item of data.items) {
          await c.env.DB.prepare(`
            INSERT INTO quote_items (quote_id, description, quantity, unit_price, total)
            VALUES (?, ?, ?, ?, ?)
          `).bind(
            id,
            item.description || '',
            item.quantity || 1,
            item.unit_price || 0,
            item.total || 0
          ).run()
        }
      }
      
      return c.json({ id, ...data })
    }
    throw new Error('Failed to update quote')
  } catch (error) {
    console.error('Error updating quote:', error)
    return c.json({ error: 'Failed to update quote' }, 500)
  }
})

app.delete('/api/quotes/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    // Delete quote items first (foreign key constraint)
    await c.env.DB.prepare('DELETE FROM quote_items WHERE quote_id = ?').bind(id).run()
    
    // Delete quote
    const { success } = await c.env.DB.prepare('DELETE FROM quotes WHERE id = ?').bind(id).run()
    
    if (success) {
      return c.json({ success: true })
    }
    throw new Error('Failed to delete quote')
  } catch (error) {
    console.error('Error deleting quote:', error)
    return c.json({ error: 'Failed to delete quote' }, 500)
  }
})

// Get unbilled time entries for customer (for invoice creation)
app.get('/api/customers/:id/unbilled-time-entries', async (c) => {
  try {
    const customerId = c.req.param('id')
    const { results } = await c.env.DB.prepare(`
      SELECT te.*, p.name as project_name
      FROM time_entries te
      LEFT JOIN projects p ON te.project_id = p.id
      WHERE te.customer_id = ? AND te.is_billable = 1 AND te.is_billed = 0
      ORDER BY te.start_time DESC
    `).bind(customerId).all()
    
    return c.json({ timeEntries: results })
  } catch (error) {
    console.error('Error fetching unbilled time entries:', error)
    return c.json({ error: 'Failed to fetch unbilled time entries' }, 500)
  }
})

// PDF Export for invoices
app.get('/api/invoices/:id/pdf', async (c) => {
  try {
    const invoiceId = parseInt(c.req.param('id'))
    
    // Get invoice details
    const invoice = await c.env.DB.prepare(`
      SELECT i.*, c.company_name, c.contact_person, c.email, c.address, c.city, c.postal_code, c.country
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = ?
    `).bind(invoiceId).first()
    
    if (!invoice) {
      return c.json({ error: 'Invoice not found' }, 404)
    }
    
    // Get company settings for PDF header/footer
    const companySettings = await c.env.DB.prepare('SELECT * FROM company_settings LIMIT 1').first()
    
    // Get invoice items
    const { results: items } = await c.env.DB.prepare(`
      SELECT ii.*, te.description as time_description, te.start_time, te.duration_minutes
      FROM invoice_items ii
      LEFT JOIN time_entries te ON ii.time_entry_id = te.id
      WHERE ii.invoice_id = ?
      ORDER BY ii.id
    `).bind(invoiceId).all()
    
    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.total, 0)
    const taxAmount = subtotal * (invoice.tax_rate / 100)
    const totalAmount = subtotal + taxAmount
    
    // Helper function for status text
    const getInvoiceStatusText = (status) => {
      switch(status) {
        case 'draft': return 'Entwurf'
        case 'sent': return 'Gesendet'
        case 'paid': return 'Bezahlt'
        case 'cancelled': return 'Storniert'
        default: return 'Unbekannt'
      }
    }
    
    // Helper function for currency formatting
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('de-CH', {
        style: 'currency',
        currency: 'CHF'
      }).format(amount || 0)
    }
    
    // Generate PDF-ready HTML
    const html = `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rechnung ${invoice.invoice_number}</title>
    <style>
        @page {
            margin: 2cm;
            size: A4;
        }
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            margin: 0;
            padding: 0;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 15px;
        }
        .company-logo-title {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .invoice-title {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
        }
        .invoice-number {
            font-size: 16px;
            font-weight: bold;
            color: #1f2937;
            text-align: right;
        }
        .customer-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }
        .customer-info-wrapper {
            width: 65%;
        }
        .invoice-meta {
            width: 30%;
            background-color: #f9fafb;
            padding: 15px;
            border-radius: 4px;
            font-size: 11px;
        }
        .invoice-meta-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        .customer-title {
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 8px;
            color: #374151;
        }
        .customer-info {
            background-color: #f9fafb;
            padding: 12px;
            border-radius: 4px;
            border-left: 3px solid #3b82f6;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .items-table th {
            background-color: #f3f4f6;
            border: 1px solid #d1d5db;
            padding: 10px;
            text-align: left;
            font-weight: 600;
            color: #374151;
        }
        .items-table td {
            border: 1px solid #d1d5db;
            padding: 10px;
            vertical-align: top;
        }
        .items-table .text-center {
            text-align: center;
        }
        .items-table .text-right {
            text-align: right;
        }
        .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 30px;
        }
        .totals-box {
            width: 300px;
            background-color: #f9fafb;
            padding: 20px;
            border-radius: 4px;
            border: 1px solid #e5e7eb;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        .total-row.final {
            border-top: 2px solid #374151;
            padding-top: 10px;
            margin-top: 10px;
            font-size: 16px;
            font-weight: bold;
        }
        .footer {
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
            font-size: 11px;
            color: #6b7280;
        }
        .footer-section {
            margin-bottom: 10px;
        }
        .print-only {
            display: none;
        }
        @media print {
            .print-only {
                display: block;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-logo-title">
            ${companySettings?.logo_url ? `<img src="${companySettings.logo_url}" alt="Logo" style="max-height: 45px; max-width: 120px; object-fit: contain;">` : ''}
            <div class="invoice-title">RECHNUNG</div>
        </div>
        <div class="invoice-number">${invoice.invoice_number}</div>
    </div>
    
    <div class="customer-section">
        <div class="customer-info-wrapper">
            <div class="customer-title">Rechnungsadresse:</div>
            <div class="customer-info">
                <div style="font-weight: 600;">${invoice.company_name}</div>
                ${invoice.contact_person ? `<div>${invoice.contact_person}</div>` : ''}
                ${invoice.address ? `<div>${invoice.address}</div>` : ''}
                ${invoice.postal_code && invoice.city ? `<div>${invoice.postal_code} ${invoice.city}</div>` : ''}
                ${invoice.country ? `<div>${invoice.country}</div>` : ''}
                ${invoice.email ? `<div style="margin-top: 8px;"><strong>E-Mail:</strong> ${invoice.email}</div>` : ''}
            </div>
        </div>
        <div class="invoice-meta">
            <div class="invoice-meta-row">
                <span>Rechnungsdatum:</span>
                <span style="font-weight: 600;">${new Date(invoice.issue_date).toLocaleDateString('de-CH')}</span>
            </div>
            ${invoice.due_date ? `
            <div class="invoice-meta-row">
                <span>Fälligkeitsdatum:</span>
                <span style="font-weight: 600;">${new Date(invoice.due_date).toLocaleDateString('de-CH')}</span>
            </div>
            ` : ''}
            <div class="invoice-meta-row">
                <span>Status:</span>
                <span style="font-weight: 600;">${getInvoiceStatusText(invoice.status)}</span>
            </div>
        </div>
    </div>
    
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 50%;">Beschreibung</th>
                <th style="width: 15%;" class="text-center">Menge</th>
                <th style="width: 17.5%;" class="text-right">Einzelpreis</th>
                <th style="width: 17.5%;" class="text-right">Summe</th>
            </tr>
        </thead>
        <tbody>
            ${items.map(item => `
                <tr>
                    <td>${item.description}</td>
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-right">${formatCurrency(item.unit_price)}</td>
                    <td class="text-right" style="font-weight: 600;">${formatCurrency(item.total)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <div class="totals-section">
        <div class="totals-box">
            <div class="total-row">
                <span>Zwischensumme:</span>
                <span style="font-weight: 600;">${formatCurrency(subtotal)}</span>
            </div>
            <div class="total-row">
                <span>MwSt. (${invoice.tax_rate}%):</span>
                <span style="font-weight: 600;">${formatCurrency(taxAmount)}</span>
            </div>
            <div class="total-row final">
                <span>Gesamtbetrag:</span>
                <span>${formatCurrency(totalAmount)}</span>
            </div>
        </div>
    </div>
    
    <div class="footer">
        ${invoice.payment_terms ? `<div class="footer-section"><strong>Zahlungsbedingungen:</strong> ${invoice.payment_terms}</div>` : ''}
        ${invoice.notes ? `<div class="footer-section"><strong>Notizen:</strong> ${invoice.notes}</div>` : ''}
        
        ${companySettings ? `
        <div style="border-top: 1px solid #d1d5db; margin-top: 20px; padding-top: 20px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; font-size: 10px;">
                <div>
                    <strong>${companySettings.company_name || ''}</strong><br>
                    ${companySettings.address || ''}<br>
                    ${companySettings.postal_code || ''} ${companySettings.city || ''}<br>
                    ${companySettings.country || ''}
                </div>
                <div>
                    ${companySettings.phone ? `<strong>Tel:</strong> ${companySettings.phone}<br>` : ''}
                    ${companySettings.email ? `<strong>E-Mail:</strong> ${companySettings.email}<br>` : ''}
                    ${companySettings.website ? `<strong>Web:</strong> ${companySettings.website}<br>` : ''}
                    ${companySettings.tax_number ? `<strong>MwSt-Nr:</strong> ${companySettings.tax_number}` : ''}
                </div>
                <div>
                    ${companySettings.iban ? `<strong>IBAN:</strong> ${companySettings.iban}<br>` : ''}
                    ${companySettings.bank_account ? `<strong>Bank:</strong> ${companySettings.bank_account}<br>` : ''}
                    ${companySettings.bic_swift ? `<strong>BIC:</strong> ${companySettings.bic_swift}` : ''}
                </div>
            </div>
        </div>
        ` : ''}
        
        <div class="footer-section" style="text-align: center; margin-top: 20px;">
            <em>Diese Rechnung wurde automatisch generiert am ${new Date().toLocaleDateString('de-CH')} um ${new Date().toLocaleTimeString('de-CH')}.</em>
        </div>
    </div>
</body>
</html>
    `
    
    // Return HTML with correct headers for PDF viewing/printing
    return c.html(html, 200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="Rechnung_${invoice.invoice_number}.html"`
    })
    
  } catch (error) {
    console.error('Error generating invoice PDF:', error)
    return c.json({ error: 'Failed to generate PDF' }, 500)
  }
})

// Company Settings API
app.get('/api/company-settings', async (c) => {
  try {
    const settings = await c.env.DB.prepare('SELECT * FROM company_settings LIMIT 1').first()
    return c.json({ settings: settings || null })
  } catch (error) {
    console.error('Error fetching company settings:', error)
    return c.json({ error: 'Failed to fetch company settings' }, 500)
  }
})

app.post('/api/company-settings', async (c) => {
  try {
    const data = await c.req.json()
    
    // Check if settings exist
    const existing = await c.env.DB.prepare('SELECT id FROM company_settings LIMIT 1').first()
    
    if (existing) {
      // Update existing settings
      await c.env.DB.prepare(`
        UPDATE company_settings SET
          company_name = ?, address = ?, city = ?, postal_code = ?, country = ?,
          phone = ?, email = ?, website = ?, tax_number = ?, bank_account = ?,
          iban = ?, bic_swift = ?, logo_url = ?, default_tax_rate = ?, 
          default_payment_terms = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(
        data.company_name, data.address, data.city, data.postal_code, data.country,
        data.phone, data.email, data.website, data.tax_number, data.bank_account,
        data.iban, data.bic_swift, data.logo_url, data.default_tax_rate,
        data.default_payment_terms, existing.id
      ).run()
    } else {
      // Create new settings
      await c.env.DB.prepare(`
        INSERT INTO company_settings (
          company_name, address, city, postal_code, country, phone, email, website,
          tax_number, bank_account, iban, bic_swift, logo_url, default_tax_rate, default_payment_terms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        data.company_name, data.address, data.city, data.postal_code, data.country,
        data.phone, data.email, data.website, data.tax_number, data.bank_account,
        data.iban, data.bic_swift, data.logo_url, data.default_tax_rate, data.default_payment_terms
      ).run()
    }
    
    // Fetch updated settings
    const updated = await c.env.DB.prepare('SELECT * FROM company_settings LIMIT 1').first()
    return c.json({ settings: updated })
  } catch (error) {
    console.error('Error saving company settings:', error)
    return c.json({ error: 'Failed to save company settings' }, 500)
  }
})

// Database status check (migrations handle actual table creation)
app.get('/api/init-db', async (c) => {
  try {
    // Simple database connection test
    const result = await c.env.DB.prepare('SELECT 1 as test').first()
    return c.json({ success: true, message: 'Database connection successful', data: result })
  } catch (error) {
    console.error('Error checking database:', error)
    return c.json({ error: 'Database connection failed' }, 500)
  }
})

// ==============================================
// ACCOUNTING MODULE APIs
// ==============================================

// Accounting Categories API
app.get('/api/accounting/categories', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM accounting_categories 
      WHERE is_active = 1 
      ORDER BY type, name
    `).all()
    return c.json({ categories: results })
  } catch (error) {
    console.error('Error fetching accounting categories:', error)
    return c.json({ error: 'Failed to fetch categories' }, 500)
  }
})

app.post('/api/accounting/categories', async (c) => {
  try {
    const data = await c.req.json()
    
    const { success, meta } = await c.env.DB.prepare(`
      INSERT INTO accounting_categories (name, type, color, description, tax_deductible)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      data.name || '',
      data.type || 'expense',
      data.color || '#6b7280',
      data.description || null,
      data.tax_deductible ? 1 : 0
    ).run()
    
    if (success) {
      return c.json({ id: meta.last_row_id, ...data })
    }
    throw new Error('Failed to create category')
  } catch (error) {
    console.error('Error creating accounting category:', error)
    return c.json({ error: 'Failed to create category' }, 500)
  }
})

// VAT Rates API
app.get('/api/accounting/vat-rates', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM vat_rates 
      WHERE is_active = 1 
      ORDER BY country_code, rate_percentage
    `).all()
    return c.json({ vatRates: results })
  } catch (error) {
    console.error('Error fetching VAT rates:', error)
    return c.json({ error: 'Failed to fetch VAT rates' }, 500)
  }
})

// Accounting Entries API
app.get('/api/accounting/entries', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT ae.*, ac.name as category_name, ac.color as category_color,
             c.company_name as customer_name, p.name as project_name
      FROM accounting_entries ae
      LEFT JOIN accounting_categories ac ON ae.category_id = ac.id
      LEFT JOIN customers c ON ae.customer_id = c.id
      LEFT JOIN projects p ON ae.project_id = p.id
      ORDER BY ae.entry_date DESC, ae.created_at DESC
      LIMIT 100
    `).all()
    
    return c.json({ entries: results })
  } catch (error) {
    console.error('Error fetching accounting entries:', error)
    return c.json({ error: 'Failed to fetch entries' }, 500)
  }
})

app.post('/api/accounting/entries', async (c) => {
  try {
    const data = await c.req.json()
    
    // Calculate VAT amount if not provided
    const amount = parseFloat(data.amount) || 0
    const vatRate = parseFloat(data.vat_rate) || 0
    const vatAmount = data.vat_amount !== undefined ? parseFloat(data.vat_amount) : (amount * vatRate / 100)
    const totalAmount = data.total_amount !== undefined ? parseFloat(data.total_amount) : (amount + vatAmount)
    
    const { success, meta } = await c.env.DB.prepare(`
      INSERT INTO accounting_entries (
        entry_type, amount, vat_rate, vat_amount, total_amount, entry_date,
        description, receipt_number, category_id, customer_id, project_id,
        receipt_image_url, receipt_ocr_data, qr_template_id, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.entry_type || 'expense',
      amount,
      vatRate,
      vatAmount,
      totalAmount,
      data.entry_date || new Date().toISOString().split('T')[0],
      data.description || '',
      data.receipt_number || null,
      data.category_id || null,
      data.customer_id || null,
      data.project_id || null,
      data.receipt_image_url || null,
      data.receipt_ocr_data ? JSON.stringify(data.receipt_ocr_data) : null,
      data.qr_template_id || null,
      data.notes || null,
      data.status || 'draft'
    ).run()
    
    if (success) {
      // Fetch the created entry with joined data
      const entry = await c.env.DB.prepare(`
        SELECT ae.*, ac.name as category_name, ac.color as category_color,
               c.company_name as customer_name, p.name as project_name
        FROM accounting_entries ae
        LEFT JOIN accounting_categories ac ON ae.category_id = ac.id
        LEFT JOIN customers c ON ae.customer_id = c.id
        LEFT JOIN projects p ON ae.project_id = p.id
        WHERE ae.id = ?
      `).bind(meta.last_row_id).first()
      
      return c.json({ entry })
    }
    throw new Error('Failed to create entry')
  } catch (error) {
    console.error('Error creating accounting entry:', error)
    return c.json({ error: 'Failed to create entry' }, 500)
  }
})

app.get('/api/accounting/entries/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    const entry = await c.env.DB.prepare(`
      SELECT ae.*, ac.name as category_name, ac.color as category_color,
             c.company_name as customer_name, p.name as project_name
      FROM accounting_entries ae
      LEFT JOIN accounting_categories ac ON ae.category_id = ac.id
      LEFT JOIN customers c ON ae.customer_id = c.id
      LEFT JOIN projects p ON ae.project_id = p.id
      WHERE ae.id = ?
    `).bind(id).first()
    
    if (!entry) {
      return c.json({ error: 'Entry not found' }, 404)
    }
    
    return c.json({ entry })
  } catch (error) {
    console.error('Error fetching accounting entry:', error)
    return c.json({ error: 'Failed to fetch entry' }, 500)
  }
})

app.put('/api/accounting/entries/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    // Calculate VAT amount if not provided
    const amount = parseFloat(data.amount) || 0
    const vatRate = parseFloat(data.vat_rate) || 0
    const vatAmount = data.vat_amount !== undefined ? parseFloat(data.vat_amount) : (amount * vatRate / 100)
    const totalAmount = data.total_amount !== undefined ? parseFloat(data.total_amount) : (amount + vatAmount)
    
    const { success } = await c.env.DB.prepare(`
      UPDATE accounting_entries SET
        entry_type = ?, amount = ?, vat_rate = ?, vat_amount = ?, total_amount = ?,
        entry_date = ?, description = ?, receipt_number = ?, category_id = ?,
        customer_id = ?, project_id = ?, receipt_image_url = ?, receipt_ocr_data = ?,
        qr_template_id = ?, notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      data.entry_type || 'expense',
      amount,
      vatRate,
      vatAmount,
      totalAmount,
      data.entry_date || new Date().toISOString().split('T')[0],
      data.description || '',
      data.receipt_number || null,
      data.category_id || null,
      data.customer_id || null,
      data.project_id || null,
      data.receipt_image_url || null,
      data.receipt_ocr_data ? JSON.stringify(data.receipt_ocr_data) : null,
      data.qr_template_id || null,
      data.notes || null,
      data.status || 'draft',
      id
    ).run()
    
    if (success) {
      // Fetch updated entry
      const entry = await c.env.DB.prepare(`
        SELECT ae.*, ac.name as category_name, ac.color as category_color,
               c.company_name as customer_name, p.name as project_name
        FROM accounting_entries ae
        LEFT JOIN accounting_categories ac ON ae.category_id = ac.id
        LEFT JOIN customers c ON ae.customer_id = c.id
        LEFT JOIN projects p ON ae.project_id = p.id
        WHERE ae.id = ?
      `).bind(id).first()
      
      return c.json({ entry })
    }
    throw new Error('Failed to update entry')
  } catch (error) {
    console.error('Error updating accounting entry:', error)
    return c.json({ error: 'Failed to update entry' }, 500)
  }
})

app.delete('/api/accounting/entries/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    const { success } = await c.env.DB.prepare('DELETE FROM accounting_entries WHERE id = ?').bind(id).run()
    
    if (success) {
      return c.json({ success: true })
    }
    throw new Error('Failed to delete entry')
  } catch (error) {
    console.error('Error deleting accounting entry:', error)
    return c.json({ error: 'Failed to delete entry' }, 500)
  }
})

// QR Templates API
app.get('/api/accounting/qr-templates', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT qt.*, ac.name as default_category_name, p.name as default_project_name
      FROM qr_templates qt
      LEFT JOIN accounting_categories ac ON qt.default_category_id = ac.id
      LEFT JOIN projects p ON qt.default_project_id = p.id
      WHERE qt.is_active = 1
      ORDER BY qt.name
    `).all()
    return c.json({ templates: results })
  } catch (error) {
    console.error('Error fetching QR templates:', error)
    return c.json({ error: 'Failed to fetch QR templates' }, 500)
  }
})

app.post('/api/accounting/qr-templates', async (c) => {
  try {
    const data = await c.req.json()
    
    const { success, meta } = await c.env.DB.prepare(`
      INSERT INTO qr_templates (name, type, description, default_category_id, default_project_id, qr_data)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      data.name || '',
      data.type || 'standard',
      data.description || null,
      data.default_category_id || null,
      data.default_project_id || null,
      JSON.stringify(data.qr_data || {})
    ).run()
    
    if (success) {
      return c.json({ id: meta.last_row_id, ...data })
    }
    throw new Error('Failed to create QR template')
  } catch (error) {
    console.error('Error creating QR template:', error)
    return c.json({ error: 'Failed to create QR template' }, 500)
  }
})

// Accounting Reports API
app.get('/api/accounting/reports/summary', async (c) => {
  try {
    const year = c.req.query('year') || new Date().getFullYear()
    
    // Income summary
    const incomeResult = await c.env.DB.prepare(`
      SELECT 
        SUM(amount) as gross_amount,
        SUM(vat_amount) as vat_amount,
        SUM(total_amount) as total_amount,
        COUNT(*) as count
      FROM accounting_entries 
      WHERE entry_type = 'income' 
        AND status = 'confirmed' 
        AND strftime('%Y', entry_date) = ?
    `).bind(year.toString()).first()
    
    // Expense summary
    const expenseResult = await c.env.DB.prepare(`
      SELECT 
        SUM(amount) as gross_amount,
        SUM(vat_amount) as vat_amount,
        SUM(total_amount) as total_amount,
        COUNT(*) as count
      FROM accounting_entries 
      WHERE entry_type = 'expense' 
        AND status = 'confirmed' 
        AND strftime('%Y', entry_date) = ?
    `).bind(year.toString()).first()
    
    // Monthly breakdown
    const { results: monthlyBreakdown } = await c.env.DB.prepare(`
      SELECT 
        strftime('%m', entry_date) as month,
        entry_type,
        SUM(amount) as gross_amount,
        SUM(vat_amount) as vat_amount,
        SUM(total_amount) as total_amount,
        COUNT(*) as count
      FROM accounting_entries 
      WHERE status = 'confirmed' 
        AND strftime('%Y', entry_date) = ?
      GROUP BY strftime('%m', entry_date), entry_type
      ORDER BY month
    `).bind(year.toString()).all()
    
    return c.json({ 
      year: parseInt(year),
      income: incomeResult || { gross_amount: 0, vat_amount: 0, total_amount: 0, count: 0 },
      expenses: expenseResult || { gross_amount: 0, vat_amount: 0, total_amount: 0, count: 0 },
      monthlyBreakdown
    })
  } catch (error) {
    console.error('Error generating accounting summary:', error)
    return c.json({ error: 'Failed to generate summary' }, 500)
  }
})

// Mobile Upload Session API
app.post('/api/accounting/upload-session', async (c) => {
  try {
    const data = await c.req.json()
    const sessionToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    
    const { success } = await c.env.DB.prepare(`
      INSERT INTO upload_sessions (session_token, qr_template_id, expires_at)
      VALUES (?, ?, ?)
    `).bind(
      sessionToken,
      data.qr_template_id || null,
      expiresAt.toISOString()
    ).run()
    
    if (success) {
      return c.json({ 
        sessionToken,
        uploadUrl: `/mobile/upload/${sessionToken}`,
        expiresAt: expiresAt.toISOString()
      })
    }
    throw new Error('Failed to create upload session')
  } catch (error) {
    console.error('Error creating upload session:', error)
    return c.json({ error: 'Failed to create upload session' }, 500)
  }
})

// Generate QR Code for Template
app.get('/api/accounting/qr-code/:templateId', async (c) => {
  try {
    const templateId = c.req.param('templateId')
    
    // Get template details
    const template = await c.env.DB.prepare(`
      SELECT * FROM qr_templates WHERE id = ? AND is_active = 1
    `).bind(templateId).first()
    
    if (!template) {
      return c.json({ error: 'Template not found' }, 404)
    }
    
    // Create upload session
    const sessionToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    
    await c.env.DB.prepare(`
      INSERT INTO upload_sessions (session_token, qr_template_id, expires_at)
      VALUES (?, ?, ?)
    `).bind(sessionToken, templateId, expiresAt.toISOString()).run()
    
    // Generate QR code data (URL to mobile upload)
    const host = c.req.header('host') || 'localhost:3000'
    const protocol = c.req.header('x-forwarded-proto') || 'http'
    const mobileUrl = `${protocol}://${host}/mobile/upload/${sessionToken}`
    
    return c.json({
      qrData: mobileUrl,
      template: template,
      sessionToken: sessionToken,
      expiresAt: expiresAt.toISOString()
    })
  } catch (error) {
    console.error('Error generating QR code:', error)
    return c.json({ error: 'Failed to generate QR code' }, 500)
  }
})

// Mobile Upload Interface
app.get('/mobile/upload/:sessionToken', async (c) => {
  try {
    const sessionToken = c.req.param('sessionToken')
    
    // Validate session
    const session = await c.env.DB.prepare(`
      SELECT us.*, qt.name as template_name, qt.type as template_type, qt.qr_data
      FROM upload_sessions us
      LEFT JOIN qr_templates qt ON us.qr_template_id = qt.id
      WHERE us.session_token = ? AND us.expires_at > datetime('now')
    `).bind(sessionToken).first()
    
    if (!session) {
      return c.html(`
        <!DOCTYPE html>
        <html lang="de">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Session abgelaufen</title>
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-red-50 flex items-center justify-center min-h-screen">
            <div class="text-center">
                <i class="fas fa-exclamation-triangle text-red-500 text-6xl mb-4"></i>
                <h1 class="text-2xl font-bold text-red-800 mb-2">Session abgelaufen</h1>
                <p class="text-red-600">Diese Upload-Session ist ungültig oder abgelaufen.</p>
            </div>
        </body>
        </html>
      `)
    }
    
    // Return mobile upload interface
    return c.html(`
      <!DOCTYPE html>
      <html lang="de">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Beleg Upload - ${session.template_name || 'Standard'}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
      </head>
      <body class="bg-gray-50">
          <div class="min-h-screen p-4">
              <div class="max-w-md mx-auto">
                  <!-- Header -->
                  <div class="bg-white rounded-lg shadow-sm p-6 mb-6 text-center">
                      <i class="fas fa-receipt text-green-600 text-3xl mb-3"></i>
                      <h1 class="text-xl font-bold text-gray-900 mb-2">Beleg Upload</h1>
                      ${session.template_name ? `<p class="text-sm text-gray-600">Template: ${session.template_name}</p>` : ''}
                  </div>
                  
                  <!-- Upload Form -->
                  <form id="upload-form" class="space-y-6">
                      <!-- Camera Capture -->
                      <div class="bg-white rounded-lg shadow-sm p-6">
                          <h3 class="text-lg font-semibold mb-4">
                              <i class="fas fa-camera mr-2 text-blue-600"></i>
                              Beleg fotografieren
                          </h3>
                          
                          <div class="space-y-4">
                              <input type="file" id="receipt-image" accept="image/*" capture="environment" 
                                     class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                                     onchange="previewImage(this)" required>
                              
                              <div id="image-preview" class="hidden">
                                  <img id="preview-img" class="w-full rounded-lg border" alt="Beleg Vorschau">
                                  <button type="button" onclick="clearImage()" class="mt-2 text-sm text-red-600 hover:text-red-800">
                                      <i class="fas fa-times mr-1"></i>Bild entfernen
                                  </button>
                              </div>
                          </div>
                      </div>
                      
                      <!-- Entry Details -->
                      <div class="bg-white rounded-lg shadow-sm p-6">
                          <h3 class="text-lg font-semibold mb-4">
                              <i class="fas fa-edit mr-2 text-green-600"></i>
                              Buchungsdetails
                          </h3>
                          
                          <div class="space-y-4">
                              <div>
                                  <label class="block text-sm font-medium text-gray-700 mb-1">Betrag *</label>
                                  <input type="number" id="amount" step="0.01" required 
                                         class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                         placeholder="0.00">
                              </div>
                              
                              <div>
                                  <label class="block text-sm font-medium text-gray-700 mb-1">Beschreibung *</label>
                                  <textarea id="description" required rows="3"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                            placeholder="Beschreibung der Ausgabe..."></textarea>
                              </div>
                              
                              <div>
                                  <label class="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                                  <input type="date" id="entry-date" 
                                         class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                         value="${new Date().toISOString().split('T')[0]}">
                              </div>
                              
                              <div>
                                  <label class="block text-sm font-medium text-gray-700 mb-1">Belegnummer</label>
                                  <input type="text" id="receipt-number"
                                         class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                         placeholder="Optional">
                              </div>
                              
                              <div>
                                  <label class="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
                                  <textarea id="notes" rows="2"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                            placeholder="Zusätzliche Notizen..."></textarea>
                              </div>
                          </div>
                      </div>
                      
                      <!-- Submit Button -->
                      <button type="submit" class="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg">
                          <i class="fas fa-cloud-upload-alt mr-2"></i>
                          Beleg hochladen
                      </button>
                  </form>
                  
                  <!-- Success Message -->
                  <div id="success-message" class="hidden bg-white rounded-lg shadow-sm p-6 text-center">
                      <i class="fas fa-check-circle text-green-600 text-4xl mb-3"></i>
                      <h3 class="text-lg font-semibold text-gray-900 mb-2">Upload erfolgreich!</h3>
                      <p class="text-gray-600 mb-4">Ihr Beleg wurde erfolgreich hochgeladen und wird in der Buchhaltung angezeigt.</p>
                      <button onclick="location.reload()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
                          Weiteren Beleg hochladen
                      </button>
                  </div>
              </div>
          </div>
          
          <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
          <script>
              function previewImage(input) {
                  if (input.files && input.files[0]) {
                      const reader = new FileReader();
                      reader.onload = function(e) {
                          document.getElementById('preview-img').src = e.target.result;
                          document.getElementById('image-preview').classList.remove('hidden');
                      };
                      reader.readAsDataURL(input.files[0]);
                  }
              }
              
              function clearImage() {
                  document.getElementById('receipt-image').value = '';
                  document.getElementById('image-preview').classList.add('hidden');
              }
              
              document.getElementById('upload-form').addEventListener('submit', async function(e) {
                  e.preventDefault();
                  
                  const formData = new FormData();
                  const imageFile = document.getElementById('receipt-image').files[0];
                  
                  if (!imageFile) {
                      alert('Bitte wählen Sie ein Bild aus.');
                      return;
                  }
                  
                  // Convert image to base64 for storage
                  const reader = new FileReader();
                  reader.onload = async function(e) {
                      const imageData = e.target.result;
                      
                      const entryData = {
                          entry_type: 'expense',
                          amount: parseFloat(document.getElementById('amount').value),
                          entry_date: document.getElementById('entry-date').value,
                          description: document.getElementById('description').value,
                          receipt_number: document.getElementById('receipt-number').value || null,
                          notes: document.getElementById('notes').value || null,
                          receipt_image_url: imageData,
                          qr_template_id: ${session.qr_template_id || 'null'},
                          status: 'draft'
                      };
                      
                      try {
                          await axios.post('/api/accounting/entries', entryData);
                          
                          // Show success message
                          document.getElementById('upload-form').classList.add('hidden');
                          document.getElementById('success-message').classList.remove('hidden');
                          
                      } catch (error) {
                          console.error('Upload error:', error);
                          alert('Fehler beim Upload. Bitte versuchen Sie es erneut.');
                      }
                  };
                  
                  reader.readAsDataURL(imageFile);
              });
          </script>
      </body>
      </html>
    `)
  } catch (error) {
    console.error('Error loading mobile upload:', error)
    return c.html(`
      <!DOCTYPE html>
      <html><body><h1>Error loading upload interface</h1></body></html>
    `)
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
                    <button class="tab" onclick="showTab('accounting')">
                        <i class="fas fa-calculator mr-2"></i>Buchhaltung
                    </button>
                    <button class="tab" onclick="showTab('settings')">
                        <i class="fas fa-cog mr-2"></i>Einstellungen
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
                    <div class="space-x-2">
                        <button onclick="showCreateInvoiceFromTimeModal()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
                            <i class="fas fa-clock mr-2"></i>Aus Zeiteinträgen
                        </button>
                        <button onclick="showInvoiceModal()" class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg">
                            <i class="fas fa-plus mr-2"></i>Neue Rechnung
                        </button>
                    </div>
                </div>
                
                <div class="bg-white shadow rounded-lg">
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nummer</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kunde</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fällig</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Betrag</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aktionen</th>
                                </tr>
                            </thead>
                            <tbody id="invoices-table" class="bg-white divide-y divide-gray-200">
                                <!-- Will be populated by JavaScript -->
                            </tbody>
                        </table>
                    </div>
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
                
                <div class="bg-white shadow rounded-lg">
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nummer</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kunde</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gültig bis</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Betrag</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aktionen</th>
                                </tr>
                            </thead>
                            <tbody id="quotes-table" class="bg-white divide-y divide-gray-200">
                                <!-- Will be populated by JavaScript --></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Accounting Tab -->
            <div id="accounting" class="tab-content hidden">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-900">
                        <i class="fas fa-calculator mr-3 text-green-600"></i>
                        Buchhaltung
                    </h2>
                    <div class="space-x-2">
                        <button onclick="showQRTemplatesModal()" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg">
                            <i class="fas fa-qrcode mr-2"></i>QR-Codes
                        </button>
                        <button onclick="showAccountingEntryModal()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
                            <i class="fas fa-plus mr-2"></i>Neue Buchung
                        </button>
                    </div>
                </div>
                
                <!-- Accounting Summary Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div class="bg-white rounded-lg shadow p-6">
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <i class="fas fa-arrow-up text-green-600 text-2xl"></i>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-600">Einnahmen (Jahr)</p>
                                <p id="total-income" class="text-2xl font-bold text-gray-900">0.00 CHF</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white rounded-lg shadow p-6">
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <i class="fas fa-arrow-down text-red-600 text-2xl"></i>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-600">Ausgaben (Jahr)</p>
                                <p id="total-expenses" class="text-2xl font-bold text-gray-900">0.00 CHF</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white rounded-lg shadow p-6">
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <i class="fas fa-balance-scale text-blue-600 text-2xl"></i>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-600">Gewinn/Verlust</p>
                                <p id="net-profit" class="text-2xl font-bold text-gray-900">0.00 CHF</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white rounded-lg shadow p-6">
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <i class="fas fa-percentage text-orange-600 text-2xl"></i>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-600">MwSt. geschuldet</p>
                                <p id="vat-owed" class="text-2xl font-bold text-gray-900">0.00 CHF</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Filters and Controls -->
                <div class="bg-white rounded-lg shadow p-4 mb-6">
                    <div class="flex flex-wrap items-center gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Jahr</label>
                            <select id="accounting-year-filter" class="px-3 py-2 border border-gray-300 rounded-md text-sm" onchange="loadAccountingData()">
                                <option value="2025">2025</option>
                                <option value="2024">2024</option>
                                <option value="2023">2023</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Typ</label>
                            <select id="accounting-type-filter" class="px-3 py-2 border border-gray-300 rounded-md text-sm" onchange="loadAccountingEntries()">
                                <option value="">Alle</option>
                                <option value="income">Einnahmen</option>
                                <option value="expense">Ausgaben</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                            <select id="accounting-category-filter" class="px-3 py-2 border border-gray-300 rounded-md text-sm" onchange="loadAccountingEntries()">
                                <option value="">Alle Kategorien</option>
                                <!-- Will be populated by JavaScript -->
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select id="accounting-status-filter" class="px-3 py-2 border border-gray-300 rounded-md text-sm" onchange="loadAccountingEntries()">
                                <option value="">Alle</option>
                                <option value="draft">Entwurf</option>
                                <option value="confirmed">Bestätigt</option>
                                <option value="reconciled">Abgestimmt</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <!-- Accounting Entries Table -->
                <div class="bg-white shadow rounded-lg">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <h3 class="text-lg font-medium text-gray-900">Buchungen</h3>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Typ</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beschreibung</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategorie</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Betrag</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MwSt</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aktionen</th>
                                </tr>
                            </thead>
                            <tbody id="accounting-entries-table" class="bg-white divide-y divide-gray-200">
                                <!-- Will be populated by JavaScript -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Settings Tab -->
            <div id="settings" class="tab-content hidden">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-900">
                        <i class="fas fa-cog mr-3 text-gray-600"></i>
                        Firmeneinstellungen
                    </h2>
                    <button onclick="saveCompanySettings()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                        <i class="fas fa-save mr-2"></i>Einstellungen speichern
                    </button>
                </div>
                
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <!-- Company Information -->
                    <div class="bg-white shadow rounded-lg p-6">
                        <h3 class="text-lg font-medium text-gray-900 mb-4">
                            <i class="fas fa-building mr-2 text-blue-600"></i>
                            Firmendaten
                        </h3>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Firmenname *</label>
                                <input type="text" id="company_name" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Ihre Firma AG">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Adresse</label>
                                <input type="text" id="company_address" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Musterstrasse 123">
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">PLZ</label>
                                    <input type="text" id="company_postal_code" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="8001">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Stadt</label>
                                    <input type="text" id="company_city" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Zürich">
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Land</label>
                                <input type="text" id="company_country" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value="Schweiz">
                            </div>
                        </div>
                    </div>

                    <!-- Contact Information -->
                    <div class="bg-white shadow rounded-lg p-6">
                        <h3 class="text-lg font-medium text-gray-900 mb-4">
                            <i class="fas fa-phone mr-2 text-green-600"></i>
                            Kontaktdaten
                        </h3>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Telefon</label>
                                <input type="text" id="company_phone" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="+41 44 123 45 67">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">E-Mail</label>
                                <input type="email" id="company_email" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="info@ihrefirma.ch">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Website</label>
                                <input type="url" id="company_website" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="https://www.ihrefirma.ch">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Firmenlogo</label>
                                <div class="mt-1 space-y-3">
                                    <!-- Logo Upload -->
                                    <div class="flex items-center space-x-4">
                                        <input type="file" id="company_logo_file" accept="image/*" class="hidden" onchange="handleLogoUpload(event)">
                                        <button type="button" onclick="document.getElementById('company_logo_file').click()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm">
                                            <i class="fas fa-upload mr-2"></i>Logo hochladen
                                        </button>
                                        <span class="text-xs text-gray-500">PNG, JPG, SVG (max. 2MB)</span>
                                    </div>
                                    
                                    <!-- Current Logo Preview -->
                                    <div id="logo-preview-container" class="hidden">
                                        <div class="flex items-center space-x-4 p-3 bg-gray-50 rounded-md border">
                                            <img id="logo-preview-image" src="" alt="Logo Vorschau" class="h-12 max-w-32 object-contain">
                                            <div class="flex-1">
                                                <p class="text-sm font-medium text-gray-900">Aktuelles Logo</p>
                                                <p class="text-xs text-gray-500">Wird in Rechnungen verwendet</p>
                                            </div>
                                            <button type="button" onclick="removeLogo()" class="text-red-600 hover:text-red-800 p-1" title="Logo entfernen">
                                                <i class="fas fa-trash text-sm"></i>
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <!-- Alternative URL Input -->
                                    <details class="mt-2">
                                        <summary class="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                                            <i class="fas fa-link mr-1"></i>Alternativ: Logo-URL eingeben
                                        </summary>
                                        <div class="mt-2">
                                            <input type="url" id="company_logo_url" class="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="https://www.ihrefirma.ch/logo.png">
                                            <p class="mt-1 text-xs text-gray-500">Falls Sie eine externe URL verwenden möchten</p>
                                        </div>
                                    </details>
                                </div>
                                
                                <!-- Hidden field for base64 data -->
                                <input type="hidden" id="company_logo_base64" value="">
                            </div>
                        </div>
                    </div>

                    <!-- Financial Information -->
                    <div class="bg-white shadow rounded-lg p-6">
                        <h3 class="text-lg font-medium text-gray-900 mb-4">
                            <i class="fas fa-university mr-2 text-yellow-600"></i>
                            Finanz- & Steuerdaten
                        </h3>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">IBAN</label>
                                <input type="text" id="company_iban" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="CH93 0076 2011 6238 5295 7">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Bank/Kontoinhaber</label>
                                <input type="text" id="company_bank_account" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="UBS Schweiz AG">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">BIC/SWIFT</label>
                                <input type="text" id="company_bic_swift" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="UBSWCHZH80A">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Steuernummer</label>
                                <input type="text" id="company_tax_number" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="CHE-123.456.789 MWST">
                            </div>
                        </div>
                    </div>

                    <!-- Default Settings -->
                    <div class="bg-white shadow rounded-lg p-6">
                        <h3 class="text-lg font-medium text-gray-900 mb-4">
                            <i class="fas fa-cogs mr-2 text-purple-600"></i>
                            Standard-Einstellungen
                        </h3>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Standard MwSt.-Satz (%)</label>
                                <input type="number" id="company_default_tax_rate" step="0.1" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value="8.1">
                                <p class="mt-1 text-xs text-gray-500">Wird für neue Rechnungen verwendet</p>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Standard Zahlungsbedingungen</label>
                                <input type="text" id="company_default_payment_terms" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value="30 Tage">
                                <p class="mt-1 text-xs text-gray-500">z.B. "30 Tage", "Sofort", "14 Tage netto"</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Preview Section -->
                <div class="mt-8 bg-white shadow rounded-lg p-6">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">
                        <i class="fas fa-eye mr-2 text-indigo-600"></i>
                        Vorschau: So erscheinen Ihre Daten auf Rechnungen
                    </h3>
                    <div class="border border-gray-200 rounded-lg p-6 bg-gray-50">
                        <div class="flex justify-between items-start mb-6">
                            <div id="preview-logo" class="flex items-center">
                                <!-- Logo will be inserted here -->
                                <span class="text-gray-400 italic">Logo wird hier angezeigt</span>
                            </div>
                            <div class="text-right">
                                <h4 class="text-xl font-bold">RECHNUNG</h4>
                                <p class="text-sm text-gray-600">RE-2025-XXX</p>
                            </div>
                        </div>
                        
                        <div class="border-t pt-6 mt-6">
                            <div class="grid grid-cols-3 gap-6 text-sm">
                                <div>
                                    <h5 class="font-semibold mb-2">Rechnungssteller:</h5>
                                    <div id="preview-company-info">
                                        <p class="text-gray-400 italic">Firmendaten werden hier angezeigt</p>
                                    </div>
                                </div>
                                <div>
                                    <h5 class="font-semibold mb-2">Kontakt:</h5>
                                    <div id="preview-contact-info">
                                        <p class="text-gray-400 italic">Kontaktdaten werden hier angezeigt</p>
                                    </div>
                                </div>
                                <div>
                                    <h5 class="font-semibold mb-2">Banking:</h5>
                                    <div id="preview-banking-info">
                                        <p class="text-gray-400 italic">Bankdaten werden hier angezeigt</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
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
