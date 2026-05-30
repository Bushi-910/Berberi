import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 8000;
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// FAQJA KLIENTIT
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.tailwindcss.com"></script></head>
    <body class="bg-black text-white p-6">
        <h1 class="text-2xl font-bold mb-4">Rezervo</h1>
        <input id="name" placeholder="Emri" class="w-full p-2 mb-2 bg-zinc-900 text-white">
        <input id="time" placeholder="Ora (p.sh 09:00)" class="w-full p-2 mb-2 bg-zinc-900 text-white">
        <button onclick="book()" class="w-full bg-white text-black p-2 font-bold">Rezervo</button>
        <script>
            async function book() {
                const n = document.getElementById('name').value;
                const t = document.getElementById('time').value;
                await fetch('/api/book', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name:n, time:t})});
                alert('Rezervuar!');
            }
        </script>
    </body></html>`);
});

// FAQJA ADMIN
app.get('/admin', (req, res) => {
    res.send(`
    <!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body class="p-4">
        <h1>Rezervimet</h1>
        <div id="list"></div>
        <script>
            async function load() {
                const res = await fetch('/api/list');
                const data = await res.json();
                document.getElementById('list').innerHTML = data.map(b => '<div>'+b.customer_name+' - '+b.time+'</div>').join('');
            }
            load();
        </script>
    </body></html>`);
});

// API
app.post('/api/book', async (req, res) => {
    await pool.query("INSERT INTO bookings (customer_name, time, date) VALUES ($1, $2, '2026-05-31')", [req.body.name, req.body.time]);
    res.json({success:true});
});

app.get('/api/list', async (req, res) => {
    const r = await pool.query("SELECT * FROM bookings");
    res.json(r.rows);
});

app.listen(PORT, () => console.log('Serveri ndezur'));
