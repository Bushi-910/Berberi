import express from 'express';
import pg from 'pg';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());
// Kjo vijë shërben të gjithë skedarët në folderin 'public' automatikisht
app.use(express.static('public')); 

const PORT = process.env.PORT || 8000;
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// Konfigurimi i Email-it
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'indonesiaeurope11@gmail.com', pass: 'KODI_YT_ME_16_SHKRONJA' }
});

// API REZERVIMI
app.post('/api/bookings', async (req, res) => {
    const { customer_name, phone, date, time } = req.body;
    try {
        await pool.query("INSERT INTO bookings (customer_name, phone, date, time) VALUES ($1, $2, $3, $4)", [customer_name, phone, date, time]);
        transporter.sendMail({ from: 'Salloni', to: 'indonesiaeurope11@gmail.com', subject: 'Rezervim i ri', text: `${customer_name} rezervoi për datën ${date} në orën ${time}.` });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Gabim' }); }
});

// API ADMIN
app.get('/api/admin/bookings', async (req, res) => {
    const result = await pool.query("SELECT * FROM bookings WHERE date = $1 ORDER BY time ASC", [req.query.date]);
    res.json(result.rows);
});

app.patch('/api/admin/bookings/:id', async (req, res) => {
    const { status } = req.body;
    await pool.query("UPDATE bookings SET status = $1 WHERE id = $2", [status, req.params.id]);
    if (status === 'cancelled') {
        transporter.sendMail({ from: 'Salloni', to: 'indonesiaeurope11@gmail.com', subject: 'Anulim', text: 'Rezervimi u anulua.' });
    }
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`Serveri ne porten ${PORT}`));
