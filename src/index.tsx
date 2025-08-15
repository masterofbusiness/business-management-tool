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
