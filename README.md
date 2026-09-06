# OTP page — setup (Resend)

A minimal email-verification page (`index.html`) plus two backend functions
(`api/send-otp.js`, `api/verify-otp.js`). Sends a real 6-digit code by
email via Resend — a transactional email API. Signup needs no phone
number and no card, unlike Google's 2-Step Verification requirement for
Gmail app passwords.

## 1. Create a Resend account and API key

1. Go to resend.com → sign up (email or GitHub login, no phone, no card).
2. In the dashboard, go to API Keys → Create API Key. Copy it — it starts
   with `re_`. This is `RESEND_API_KEY`.

## 2. About the sender address

This project sends from `onboarding@resend.dev`, Resend's shared sandbox
address. It works immediately with zero setup, but **only delivers to the
email address you signed up to Resend with** — that's a deliberate
anti-spam limit on the sandbox sender, not a bug. That's completely fine
for testing this yourself.

If you want it to send to *any* email address later, you'd verify your own
domain in Resend (Domains → Add Domain, then add a couple of DNS records)
and change the `from` address in `api/send-otp.js` to something at that
domain. Not needed to get this working for yourself right now.

## 3. Push this folder to GitHub

```
cd otp-project
git init
git add .
git commit -m "otp page (resend)"
gh repo create otp-page --public --source=. --push
```

(Or create a repo on github.com and push normally if you don't have `gh`.)

## 4. Deploy on Vercel (free)

1. Go to vercel.com → sign in with GitHub.
2. "Add New Project" → import the `otp-page` repo.
3. Before deploying, add these Environment Variables:
   - `RESEND_API_KEY` — from step 1
   - `OTP_SECRET` — any random long string you make up (e.g. run
     `openssl rand -hex 32` in a terminal)
4. Click Deploy. `index.html` is served at the root, and `/api/send-otp`
   and `/api/verify-otp` run as serverless functions automatically.

## How it works

- `send-otp.js` generates a 6-digit code and emails it via Resend's API to
  the address the user typed, then returns a signed token to the browser.
  The code itself is never stored anywhere — it's folded into a hash
  inside that token.
- `verify-otp.js` takes the code the user typed plus that token, recomputes
  the same hash, and checks it matches and hasn't expired (5 minutes).
- No database, no SMTP credentials, no extra npm package needed — it's a
  single fetch call to Resend's REST API.

## If something goes wrong

Check Vercel's Runtime Logs (Deployments → your deployment → Runtime Logs)
for the actual error. Also check Resend's own dashboard (Logs tab) — it
shows every send attempt and exactly why one failed, if it did.
