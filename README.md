# QuickPal: AI Quotes with PayPal Checkout

QuickPal turns a plain-English request into a professional quotation and lets the client pay for it through PayPal, all in one flow. A small business owner types something like "quote for Ada, 2 cakes at 8000 naira each". An AI agent fills in the quote, a WhatsApp-ready message is generated, and a PayPal Checkout button lets the client pay.

Built for the "Build What's Next with PayPal and AI" hackathon.

## Demo

- Demo video: (add your YouTube link here)

## Features

- **AI Quote Agent:** describe the job in natural language and the AI extracts the client name, service, quantity and price.
- **WhatsApp-ready quotation:** a formatted message with the total, ready to copy and send.
- **PayPal Checkout (sandbox):** the quote becomes a real PayPal order. The server creates the order and captures the payment.
- **Secure by design:** API keys stay on the server in a `.env` file and are never sent to the browser.

## How it uses PayPal

- The server gets an access token from the PayPal sandbox using the Client ID and Secret.
- `POST /api/orders` creates a PayPal order from the quote details (client, service, quantity, price).
- The PayPal JavaScript SDK shows the checkout button in the browser.
- `POST /api/orders/:id/capture` captures the payment after the buyer approves it, and the app shows the transaction ID.
- Naira prices are converted to USD with a fixed demo rate (`NGN_PER_USD`, default 1500).

## How it uses AI

- The server sends the user's request to the OpenRouter API using the free `openrouter/free` model router.
- The model returns the quote details as JSON, and the app fills in the form from it.

## Tech stack

- Node.js and Express (backend)
- HTML, Tailwind CSS and vanilla JavaScript (frontend)
- PayPal Orders API and JavaScript SDK (sandbox)
- OpenRouter API (AI)

## Run it yourself

You need [Node.js](https://nodejs.org) (version 18 or newer).

1. Clone or download this repository and open a terminal in its folder.
2. Install the dependencies:

   ```
   npm install
   ```

3. Create your own `.env` file from the template.
   - Windows: `copy .env.example .env`
   - Mac or Linux: `cp .env.example .env`
4. Open `.env` and fill in your keys:
   - `OPENROUTER_API_KEY`: a free key from https://openrouter.ai/keys
   - `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`: create a REST app in the sandbox at https://developer.paypal.com/dashboard (Apps & Credentials, with Sandbox selected)
5. Start the server:

   ```
   node server.js
   ```

6. Open http://localhost:3000/quickquote.html in your browser.

### Testing a payment

1. Type a request in the AI box, or fill in the form, and click **Generate Quote & Payment Button**.
2. Click the PayPal button and log in with a **Personal** sandbox account from the developer dashboard (Testing Tools, Sandbox Accounts).
3. Click **Pay Now**. A green message with a transaction ID confirms the payment.

Sandbox accounts use fake money, so no real payment is made.

## Security

Real keys belong only in `.env`, which is listed in `.gitignore` and never committed. Only `.env.example` with placeholder values is in the repository.

## License

MIT. See the [LICENSE](LICENSE) file.