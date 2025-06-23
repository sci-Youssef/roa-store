import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import sql from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // Add body parser for all routes
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// API: All products (with main image and all images)
app.get('/api/products', async (req, res) => {
  try {
    const products = await sql`
      SELECT p.*, array_agg(pi.image_url) AS images
      FROM products p
      LEFT JOIN product_images pi ON pi.product_id = p.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;
    res.json(products.map(p => ({
      ...p,
      images: p.images && p.images[0] ? p.images.filter(Boolean) : (p.image_url ? [p.image_url] : [])
    })));
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ message: err.message });
  }
});

// API: Featured products (is_featured true, with images)
app.get('/api/products/featured', async (req, res) => {
  try {
    const featured = await sql`
      SELECT p.*, array_agg(pi.image_url) AS images
      FROM products p
      LEFT JOIN product_images pi ON pi.product_id = p.id
      WHERE p.is_featured = true
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT 5
    `;
    res.json(featured.map(p => ({
      ...p,
      images: p.images && p.images[0] ? p.images.filter(Boolean) : (p.image_url ? [p.image_url] : [])
    })));
  } catch (err) {
    console.error('Error fetching featured products:', err);
    res.status(500).json({ message: err.message });
  }
});

// API: Single product by ID (with all images)
app.get('/api/products/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const result = await sql`
      SELECT p.*, array_agg(pi.image_url) AS images
      FROM products p
      LEFT JOIN product_images pi ON pi.product_id = p.id
      WHERE p.id = ${id}
      GROUP BY p.id
    `;
    if (result.length === 0) return res.status(404).json({ message: 'Product not found' });
    
    const p = result[0];
    // Combine the main image_url with the other images from the join
    const otherImages = (p.images || []).filter(Boolean);
    const allImages = [p.image_url, ...otherImages].filter(Boolean);
    const uniqueImages = [...new Set(allImages)];

    res.json({
      ...p,
      images: uniqueImages
    });
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ message: err.message });
  }
});

// Serve product details page
app.get('/product/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'product.html'));
});

// Serve admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// Serve contact page
app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'contact.html'));
});

// API: Handle contact form submission
app.post('/api/contact', express.json(), async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Name, email, and message are required.' });
    }
    const [contact] = await sql`
      INSERT INTO contacts (name, email, phone, message)
      VALUES (${name}, ${email}, ${phone || null}, ${message})
      RETURNING *
    `;
    res.status(201).json({ message: 'Message received!', contact });
  } catch (err) {
    console.error('Error saving contact message:', err);
    res.status(500).json({ message: 'Failed to send message.' });
  }
});

// Admin password middleware
function requireAdminAuth(req, res, next) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const provided = req.headers['x-admin-auth'];
  if (!provided || provided !== adminPassword) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}

// API: Create product (with images)
app.post('/api/products', express.json(), requireAdminAuth, async (req, res) => {
  try {
    const { name, description, price, category, is_featured, is_new, is_luxury, image_url, images } = req.body;
    const [product] = await sql`
      INSERT INTO products (name, description, price, category, is_featured, is_new, is_luxury, image_url)
      VALUES (${name}, ${description}, ${price}, ${category}, ${is_featured}, ${is_new}, ${is_luxury}, ${image_url})
      RETURNING *
    `;
    // Always insert the main image_url as a row in product_images with the product's name
    await sql`INSERT INTO product_images (product_id, image_url, name) VALUES (${product.id}, ${image_url}, ${name})`;
    // Insert additional images (if any), each with the product's name
    if (images && Array.isArray(images)) {
      for (const url of images) {
        if (url) {
          await sql`INSERT INTO product_images (product_id, image_url, name) VALUES (${product.id}, ${url}, ${name})`;
        }
      }
    }
    res.status(201).json(product);
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ message: err.message });
  }
});

// API: Update product (with images)
app.put('/api/products/:id', express.json(), requireAdminAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const { name, description, price, category, is_featured, is_new, is_luxury, image_url, images } = req.body;
    const [product] = await sql`
      UPDATE products SET
        name = ${name},
        description = ${description},
        price = ${price},
        category = ${category},
        is_featured = ${is_featured},
        is_new = ${is_new},
        is_luxury = ${is_luxury},
        image_url = ${image_url}
      WHERE id = ${id}
      RETURNING *
    `;
    // Remove all old images and re-insert
    await sql`DELETE FROM product_images WHERE product_id = ${id}`;
    // Insert all images from the images array, including those equal to image_url
    if (images && Array.isArray(images)) {
      for (const url of images) {
        if (url) {
          await sql`INSERT INTO product_images (product_id, image_url, name) VALUES (${id}, ${url}, ${name})`;
        }
      }
    }
    // Also insert the main image_url (in case it's not in images)
    if (image_url) {
      await sql`INSERT INTO product_images (product_id, image_url, name) VALUES (${id}, ${image_url}, ${name})`;
    }
    res.json(product);
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ message: err.message });
  }
});

// API: Delete product
app.delete('/api/products/:id', requireAdminAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const result = await sql`DELETE FROM products WHERE id = ${id} RETURNING *`;
    if (result.length === 0) return res.status(404).json({ message: 'Product not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ message: err.message });
  }
});

// API: Get all contact messages (admin only)
app.get('/api/contacts', requireAdminAuth, async (req, res) => {
  try {
    const messages = await sql`SELECT * FROM contacts ORDER BY created_at DESC`;
    res.json(messages.map(({ phone, ...rest }) => rest));
  } catch (err) {
    console.error('Error fetching contact messages:', err);
    res.status(500).json({ message: err.message });
  }
});

// DEV ONLY: Get all contact messages (no auth)
app.get('/api/contact', async (req, res) => {
  try {
    const messages = await sql`SELECT * FROM contacts ORDER BY created_at DESC`;
    res.json(messages);
  } catch (err) {
    console.error('Error fetching contact messages:', err);
    res.status(500).json({ message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
}); 
