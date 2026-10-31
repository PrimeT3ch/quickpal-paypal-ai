require('dotenv').config();
const express = require('express');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const PAYPAL_BASE = 'https://api-m.sandbox.paypal.com';
const NGN_PER_USD = Number(process.env.NGN_PER_USD) || 1500; // demo exchange rate

if (!process.env.OPENROUTER_API_KEY) console.warn('Missing OPENROUTER_API_KEY in .env');
if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    console.warn('Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET in .env');
}

// ---------- AI: turn a typed request into quote details ----------
app.post('/api/quote', async (req, res) => {
    try {
        const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY,
            },
            body: JSON.stringify({
                model: 'openrouter/free',
                messages: [
                    {
                        role: 'system',
                        content: 'Extract quote details from the user request. Return ONLY a valid JSON object with keys: clientName, serviceName, quantity (integer), price (number without commas or currency symbols).',
                    },
                    { role: 'user', content: String(req.body.prompt || '').slice(0, 500) },
                ],
            }),
        });
        const data = await r.json();
        res.status(r.status).json(data);
    } catch (err) {
        res.status(500).json({ error: { message: err.message } });
    }
});

// ---------- PayPal: get an access token ----------
async function getPayPalToken() {
    const auth = Buffer.from(
        process.env.PAYPAL_CLIENT_ID + ':' + process.env.PAYPAL_CLIENT_SECRET
    ).toString('base64');

    const r = await fetch(PAYPAL_BASE + '/v1/oauth2/token', {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + auth,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error_description || 'Could not get PayPal token');
    return data.access_token;
}

// ---------- PayPal: create an order from the quote ----------
app.post('/api/orders', async (req, res) => {
    try {
        const client = String(req.body.client || 'Client').slice(0, 100);
        const service = String(req.body.service || 'Service').slice(0, 100);
        const qty = Math.max(1, parseInt(req.body.quantity) || 1);
        const priceNgn = Number(req.body.price) || 0;

        const unitCents = Math.max(100, Math.round((priceNgn / NGN_PER_USD) * 100));
        const unit = (unitCents / 100).toFixed(2);
        const total = ((unitCents * qty) / 100).toFixed(2);

        const token = await getPayPalToken();
        const r = await fetch(PAYPAL_BASE + '/v2/checkout/orders', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [
                    {
                        description: 'Quote for ' + client,
                        amount: {
                            currency_code: 'USD',
                            value: total,
                            breakdown: { item_total: { currency_code: 'USD', value: total } },
                        },
                        items: [
                            {
                                name: service,
                                quantity: String(qty),
                                unit_amount: { currency_code: 'USD', value: unit },
                            },
                        ],
                    },
                ],
            }),
        });
        const data = await r.json();
        res.status(r.status).json(data);
    } catch (err) {
        res.status(500).json({ error: { message: err.message } });
    }
});

// ---------- PayPal: capture (complete) the payment ----------
app.post('/api/orders/:id/capture', async (req, res) => {
    try {
        const token = await getPayPalToken();
        const r = await fetch(
            PAYPAL_BASE + '/v2/checkout/orders/' + encodeURIComponent(req.params.id) + '/capture',
            {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json',
                },
            }
        );
        const data = await r.json();
        res.status(r.status).json(data);
    } catch (err) {
        res.status(500).json({ error: { message: err.message } });
    }
});

// ---------- Send the public PayPal Client ID to the web page ----------
app.get('/api/config', (req, res) => {
    res.json({ paypalClientId: process.env.PAYPAL_CLIENT_ID });
});

app.get('/', (req, res) => res.redirect('/quickquote.html'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Running at http://localhost:' + PORT));