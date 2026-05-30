import express from 'express';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 8000;

// Konfigurimi i lidhjes me Supabase
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Inicializimi i Databazës në PostgreSQL
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY, 
        email TEXT UNIQUE, 
        password TEXT
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY, 
        customer_name TEXT, 
        phone TEXT, 
        date TEXT, 
        time TEXT, 
        status TEXT DEFAULT 'pending', 
        UNIQUE(date, time)
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS available_slots (
        id SERIAL PRIMARY KEY, 
        time TEXT UNIQUE
      )
    `);

    const slots = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
    for (const slot of slots) {
      await pool.query("INSERT INTO available_slots (time) VALUES ($1) ON CONFLICT (time) DO NOTHING", [slot]);
    }

    const hashedPassword = await bcrypt.hash('berberi2026', 10);
    // Në Postgres përdoret ON CONFLICT për të mos dublikuar adminin
    await pool.query(`
      INSERT INTO users (email, password) 
      VALUES ('info@berberi.com', $1) 
      ON CONFLICT (email) DO NOTHING
    `, [hashedPassword]);

    console.log("✅ Supabase Database u sinkronizua dhe është gati!");
  } catch (err) {
    console.error("❌ Gabim gjatë inicializimit të databazës:", err.message);
  }
}
initDB();

// KONFIGURIMI I EMAIL-IT (SMTP)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'emaili_yt_konfigurues@gmail.com', 
    pass: 'fjalekalimi_i_aplikacionit'       
  }
});

/**
 * 🚀 TRUKU KUNDËR GJUMIT (CRONJOB ROUTE)
 * Klikohet çdo 30 minuta nga cron-job.org për të mbajtur serverin dhe databazën ndezur.
 */
app.get('/ping', async (req, res) => {
  try {
    await pool.query('SELECT 1;');
    console.log('--- PING: Serveri dhe Supabase u mbajtën zgjuar! ---');
    res.status(200).send('Serveri OK');
  } catch (err) {
    console.error('Gabim gjatë ping-ut:', err.message);
    res.status(500).send('Gabim Databaze');
  }
});

// API LOGIN
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'Llogari e pasaktë' });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Llogari e pasaktë' });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Gabim në server' });
  }
});

// API SLOTS
app.get('/api/slots', async (req, res) => {
  const { date } = req.query;
  const dayOfWeek = new Date(date).getDay();
  if (dayOfWeek === 3) return res.json([]); // E mërkurë = Pushim

  try {
    const allSlotsRes = await pool.query("SELECT time FROM available_slots");
    const bookedSlotsRes = await pool.query("SELECT time FROM bookings WHERE date = $1 AND status != 'cancelled'", [date]);

    const bookedTimes = bookedSlotsRes.rows.map(b => b.time);
    const todayStr = new Date().toISOString().split('T')[0];
    const currentHour = new Date().toTimeString().slice(0, 5);

    const available = allSlotsRes.rows.filter(slot => {
      if (bookedTimes.includes(slot.time)) return false;
      if (date === todayStr && slot.time <= currentHour) return false;
      return true;
    });

    res.json(available.map(s => s.time));
  } catch (err) {
    res.status(500).json({ error: 'Gabim gjatë leximit të orareve' });
  }
});

// API REZERVIMI (KËTU DËRGOHET EMAIL-I)
app.post('/api/bookings', async (req, res) => {
  const { customer_name, phone, date, time } = req.body;
  
  try {
    const checkRow = await pool.query("SELECT id FROM bookings WHERE date = $1 AND time = $2 AND status != 'cancelled'", [date, time]);
    if (checkRow.rows.length > 0) return res.status(400).json({ error: 'Ky orar u zura sapo tani!' });
    
    await pool.query(
      "INSERT INTO bookings (customer_name, phone, date, time) VALUES ($1, $2, $3, $4)",
      [customer_name, phone, date, time]
    );

    // Dërgimi i Email-it
    const mailOptions = {
      from: '"Salloni i Berberit" <emaili_yt_konfigurues@gmail.com>',
      to: 'info@berberi.com', 
      subject: '🚨 REZERVIM I RI NGA SNEKANDI!',
      html: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #f4f4f4;">
          <div style="max-width: 500px; margin: 0 auto; background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
            <h2 style="color: #000; text-transform: uppercase; margin-bottom: 20px;">Rezervim i Ri</h2>
            <p><b>Klienti:</b> ${customer_name}</p>
            <p><b>Tel:</b> ${phone}</p>
            <p><b>Data:</b> ${date}</p>
            <p><b>Ora:</b> ${time}</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 11px; color: #777;">Hapni panelin e administrimit te Koyeb për të menaxhuar statuset.</p>
          </div>
        </div>
      `
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) console.log("❌ Email-i nuk u dërgua dot:", error);
      else console.log("✉️ Email njoftimi u dërgua me sukses!");
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Gabim gjatë rezervimit' });
  }
});

// API ADMIN: MARRJA E REZERVIMEVE
app.get('/api/admin/bookings', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM bookings WHERE date = $1 ORDER BY time ASC", [req.query.date]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json([]);
  }
});

// API ADMIN: NDRYSHIMI I STATUSIT
app.patch('/api/admin/bookings/:id', async (req, res) => {
  try {
    await pool.query("UPDATE bookings SET status = $1 WHERE id = $2", [req.body.status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.listen(PORT, () => console.log(`🚀 Serveri po punon në portën: ${PORT}`));