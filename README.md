# OTP page — setup (email)

A minimal email-verification page (`index.html`) plus two backend functions
(`api/send-otp.js`, `api/verify-otp.js`). Sends a real 6-digit code by
email via Gmail SMTP — normal email delivery, not a carrier gateway, so it
should be far more reliable than the SMS approaches we tried before.

## 1. Create a Gmail app password

Gmail won't let outside code log in with your normal password — you need a
16-character "app password" instead.

1. Go to your Google Account → Security.
2. Turn on **2-Step Verification** if it isn't already on (required for app
   passwords to be available).
3. Search "App passwords" in account settings, or go directly to
   myaccount.google.com/apppasswords.
4. Create one (name it anything, e.g. "otp-page"). Copy the 16-character
   password — you won't see it again after this screen.

## 2. Push this folder to GitHub

```
cd otp-project
git init
git add .
git commit -m "otp page (email)"
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
4. Click Deploy. `index.html` is served at the root, and `/api/send-otp`
   and `/api/verify-otp` run as serverless functions automatically.

## How it works

- `send-otp.js` generates a 6-digit code and emails it via Gmail SMTP to
  the address the user typed, then returns a signed token to the browser.
  The code itself is never stored anywhere — it's folded into a hash
  inside that token.
- `verify-otp.js` takes the code the user typed plus that token, recomputes
  the same hash, and checks it matches and hasn't expired (5 minutes).
- No database needed.

## If something goes wrong

Check Vercel's Runtime Logs (Deployments → your deployment → Runtime Logs)
for the actual error — a wrong app password or a typo in an env variable
name will show up there clearly, same way the earlier `twilio` error did.
