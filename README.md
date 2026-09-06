# OTP page — setup (Textbelt, no account needed)

A minimal phone-verification page (`index.html`) plus two backend functions
(`api/send-otp.js`, `api/verify-otp.js`). Sending goes through Textbelt's
free tier — no signup, no API key, no account of any kind. Verification
works the same way it did before: the code is folded into a signed token
handed back to the browser, so the server never has to store it anywhere.

## What you actually need

Nothing to sign up for. The only thing you set yourself is `OTP_SECRET` —
any random string you make up, used only to sign the token.

## 1. Push this folder to GitHub

```
cd otp-project
git init
git add .
git commit -m "otp page"
gh repo create otp-page --public --source=. --push
```

(Or create a repo on github.com and push normally if you don't have `gh`.)

## 2. Deploy on Vercel (free)

1. Go to vercel.com → sign in with GitHub.
2. "Add New Project" → import the `otp-page` repo.
3. Before deploying, add one Environment Variable:
   - `OTP_SECRET` — any random long string (e.g. run
     `openssl rand -hex 32` in a terminal)
4. Click Deploy. `index.html` is served at the root, and `/api/send-otp`
   and `/api/verify-otp` run as serverless functions automatically.

## The catch — read this before relying on it

Textbelt's free tier (`key: "textbelt"`) allows **1 free text per phone
number per day**, US numbers only, and it's a shared pool used by anyone
on the internet who hits that same free key — so delivery isn't guaranteed
and there's no support if it silently fails. It's genuinely fine for
testing this yourself a few times a day. If you outgrow that, Textbelt
sells a personal API key (a few dollars for dozens of texts) — you'd just
set it as `TEXTBELT_KEY` in your environment variables and the code picks
it up automatically, no other changes needed.

## How verification works

- `send-otp.js` generates a 6-digit code, posts it to Textbelt to text it
  out, and returns a signed token to the browser. The code itself is never
  stored anywhere — it's folded into a hash inside that token.
- `verify-otp.js` takes the code the user typed plus that token, recomputes
  the same hash, and checks it matches and hasn't expired (5 minutes).
- No database, no third-party account, nothing else to configure.
