# ROA Store E-commerce Website

A modern, responsive e-commerce site for handcrafted beaded bags and accessories, built with Node.js, Express, Supabase (PostgreSQL), and vanilla JS/CSS.

## Features
- Responsive, luxury-themed UI (black & gold)
- Product slider and grid
- Product filtering by category and tag
- Product details page
- Secure admin CRUD interface (password protected)
- Supabase/PostgreSQL backend

## Getting Started

### 1. Clone the repository
```sh
git clone <your-repo-url>
cd store-dada
```

### 2. Install dependencies
```sh
npm install
```

### 3. Set up environment variables
Create a `.env` file in the project root:
```
DATABASE_URL=postgresql://postgres:<your-db-password>@db.<your-supabase-ref>.supabase.co:5432/postgres
ADMIN_PASSWORD=yourStrongAdminPassword
```

**Never commit your `.env` file!**

### 4. Start the server
```sh
node server.js
```
Visit [http://localhost:3000](http://localhost:3000)

## Deployment

You can deploy to any Node.js-friendly host (Vercel, Heroku, Render, etc).
- Set the same environment variables (`DATABASE_URL`, `ADMIN_PASSWORD`) in your host's dashboard.
- Use the `start` script: `npm start`

## Folder Structure
```
store-dada/
  public/         # Static assets (css, js, images)
  views/          # HTML templates
  .env            # Environment variables (not committed)
  server.js       # Express server
  db.js           # Database connection
  package.json    # Project config
```

## Security
- The admin interface is protected by a password (set in `.env`).
- All admin API actions require the correct password.
- Never expose your `.env` or database credentials publicly.

## Credits
- [Supabase](https://supabase.com/) for the free PostgreSQL backend
- [Swiper.js](https://swiperjs.com/) for the product slider

---

For questions or help, contact: contact@roastore.com 