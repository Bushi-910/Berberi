import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());

// Kjo shërben skedarët nga folderi 'public'
app.use(express.static('public')); 

// SHTESA QË TË HAPET FAQJA KRYESORE KUR SHKON TE LINKU
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: './public' });
});

const PORT = process.env.PORT || 8000;
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// API PËR REZERVIM
app.post('/api/bookings', async (req, res) => {
    const { customer_name, phone, date, time } = req.body;
    try {
        await pool.query("INSERT INTO bookings (customer_name, phone, date, time, status) VALUES ($1, $2, $3, $4, 'pending')", [customer_name, phone, date, time]);
        res.json({ success: true });
    } catch (err) { 
        res.status(500).json({ error: 'Gabim në bazën e të dhënave' }); 
    }
});

// API PËR ADMIN
app.get('/api/admin/bookings', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM bookings WHERE date = $1 ORDER BY time ASC", [req.query.date]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Gabim' });
    }
});

app.patch('/api/admin/bookings/:id', async (req, res) => {
    const { status } = req.body;
    try {
        await pool.query("UPDATE bookings SET status = $1 WHERE id = $2", [status, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Gabim' });
    }
});

app.listen(PORT, () => console.log(`Serveri ne porten ${PORT}`));
