# OTP page — setup

A minimal phone-verification page (`index.html`) plus two backend functions
(`api/send-otp.js`, `api/verify-otp.js`). Sending works by emailing your
carrier's SMS gateway from a Gmail account — no third-party SMS service,
no cost.

## How the texting actually works

Every carrier has a hidden email address that forwards straight to a phone
as a text. This project is set for **AT&T** (`@txt.att.net`) — if a number
you enter isn't on AT&T, the text won't arrive. To support another carrier
later, just change `CARRIER_GATEWAY` at the top of `api/send-otp.js`
(e.g. `vtext.com` for Verizon, `tmomail.net` for T-Mobile).

## 1. Create a Gmail app password

Gmail won't let outside code log in with your normal password — you need a
16-character "app password" instead.

1. Go to your Google Account → Security.
2. Turn on **2-Step Verification** if it isn't already on (required for app
   passwords to be available).
3. Search for "App passwords" in account settings, or go directly to
   myaccount.google.com/apppasswords.
4. Create one (name it anything, e.g. "otp-page"). Copy the 16-character
   password it gives you — you won't see it again.

## 2. Push this folder to GitHub

```
cd otp-project
git init
git add .
git commit -m "otp page"
gh repo create otp-page --public --source=. --push
```

(Or create a repo on github.com and push normally if you don't have `gh`.)

## 3. Deploy on Vercel (free)

1. Go to vercel.com → sign in with GitHub.
2. "Add New Project" → import the `otp-page` repo.
3. Before deploying, add these Environment Variables:
   - `GMAIL_USER` — your Gmail address
   - `GMAIL_APP_PASSWORD` — the 16-character app password from step 1
   - `OTP_SECRET` — any random long string you make up (e.g. run
     `openssl rand -hex 32` in a terminal)
4. Click Deploy. Vercel builds it and gives you a live URL — `index.html`
   is served at the root, and `/api/send-otp` and `/api/verify-otp` run
   as serverless functions automatically (no server to manage).

## How verification works

- `send-otp.js` generates a 6-digit code, emails it to
  `<your-number>@txt.att.net` (which your carrier turns into a text), and
  returns a signed token to the browser. The code itself is never stored
  anywhere — it's folded into a hash inside that token.
- `verify-otp.js` takes the code the user typed plus that token, recomputes
  the same hash, and checks it matches and hasn't expired (5 minutes).
- No database needed. Everything the server needs to check the code travels
  in that one signed token.

## Heads up on reliability

Email-to-SMS gateways are a bit less consistent than a paid SMS API:
delivery can lag a minute or two, and some carriers occasionally block or
delay messages that look automated. If it gets flaky, Twilio (or another
SMS API) is the sturdier fallback.
