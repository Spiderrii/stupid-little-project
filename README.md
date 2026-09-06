# OTP page — setup (Twilio)

A minimal phone-verification page (`index.html`) plus two backend functions
(`api/send-otp.js`, `api/verify-otp.js`) that text a real code via Twilio
and check it.

## 1. Get your Twilio credentials

1. Go to the Twilio Console (console.twilio.com) — you should already have
   an account.
2. On the dashboard, copy your **Account SID** and **Auth Token**.
3. Go to Phone Numbers → Manage → Buy a Number (your trial account comes
   with free credit — a US number costs a small amount of that credit, or
   may already be assigned). Copy the number in `+1XXXXXXXXXX` format —
   this is `TWILIO_PHONE_NUMBER`.

## 2. Verify the number you'll be texting

Trial accounts can only send to numbers you've verified in the console:

1. Go to Phone Numbers → Manage → Verified Caller IDs.
2. Add your own phone number and confirm it (Twilio calls or texts you a
   code to prove you own it).
3. Until you upgrade the account, only verified numbers will receive texts
   from this app — that's fine for testing with your own phone.

## 3. Push this folder to GitHub

```
cd otp-project
git init
git add .
git commit -m "otp page"
gh repo create otp-page --public --source=. --push
```

(Or create a repo on github.com and push normally if you don't have `gh`.)

## 4. Deploy on Vercel (free)

1. Go to vercel.com → sign in with GitHub.
2. "Add New Project" → import the `otp-page` repo.
3. Before deploying, add these Environment Variables:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
   - `OTP_SECRET` — any random long string you make up (e.g. run
     `openssl rand -hex 32` in a terminal)
4. Click Deploy. Vercel gives you a live URL — `index.html` is served at
   the root, and `/api/send-otp` and `/api/verify-otp` run as serverless
   functions automatically (no server to manage).

## How verification works

- `send-otp.js` generates a 6-digit code, texts it via Twilio, and returns
  a signed token to the browser. The code itself is never stored
  anywhere — it's folded into a hash inside that token.
- `verify-otp.js` takes the code the user typed plus that token, recomputes
  the same hash, and checks it matches and hasn't expired (5 minutes).
- No database needed. Everything the server needs to check the code
  travels in that one signed token.

## If a text doesn't arrive

- Double check the number you're sending to is verified (step 2) if you're
  still on a trial account.
- Check the Twilio Console's Monitor → Logs → Messaging tab — it shows the
  exact delivery status and error code for every send attempt, which is
  far more useful than guessing.
