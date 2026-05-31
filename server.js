import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());

// 1. Shërben skedarët nga folderi 'public'
app.use(express.static('public'));

// 2. Detyron hapjen e index.html si faqe kryesore
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: './public' });
});

const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

// API-të
app.post('/api/bookings', async (req, res) => {
    const { customer_name, phone, date, time } = req.body;
    await pool.query("INSERT INTO bookings (customer_name, phone, date, time, status) VALUES ($1, $2, $3, $4, 'pending')", [customer_name, phone, date, time]);
    res.json({ success: true });
});

app.get('/api/admin/bookings', async (req, res) => {
    const result = await pool.query("SELECT * FROM bookings WHERE date = $1 ORDER BY time ASC", [req.query.date]);
    res.json(result.rows);
});

app.patch('/api/admin/bookings/:id', async (req, res) => {
    await pool.query("UPDATE bookings SET status = $1 WHERE id = $2", [req.body.status, req.params.id]);
    res.json({ success: true });
});

// 3. Përdor '0.0.0.0' që Back4App ta shohë serverin
const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveri ne porten ${PORT}`);
});
