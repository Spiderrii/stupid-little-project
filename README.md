# OTP page — setup (phone + email switch)

A verification page (`index.html`) with a pill switch to toggle between
texting a code (via Textbelt's free tier) or emailing one (via Resend),
plus two backend functions (`api/send-otp.js`, `api/verify-otp.js`) that
branch on whichever channel was picked.

## Environment variables

- `OTP_SECRET` — required always. Any random long string you make up
  (e.g. run `openssl rand -hex 32` in a terminal). Used only to sign the
  verification token — nothing else needs it.
- `RESEND_API_KEY` — required for the email channel to work. Sign up at
  resend.com (no phone/card needed), grab a key under API Keys. Note the
  sandbox sender (`onboarding@resend.dev`) only delivers to the address
  you signed up to Resend with, until you verify your own domain.
- `TEXTBELT_KEY` — optional, for the phone channel. Leave unset to use
  the free shared key (1 text/day per number, no signup, not
  guaranteed to deliver). Set your own paid key here later for more
  reliable/volume texting — no code changes needed.

If a channel's key is missing or wrong, that channel will error when
used, but the other one still works fine — they're independent.

## Push this folder to GitHub

```
cd otp-project
git init
git add .
git commit -m "otp page with phone/email switch"
gh repo create otp-page --public --source=. --push
```

## Deploy on Vercel (free)

1. vercel.com → sign in with GitHub → Add New Project → import the repo.
2. Add whichever of the environment variables above you're using.
3. Deploy. `index.html` is served at the root, `/api/send-otp` and
   `/api/verify-otp` run as serverless functions automatically.

## How it works

- The switch just changes local UI state (`mode`) and which input is
  shown — the animation is a sliding `.mode-thumb` div with a springy
  cubic-bezier transition.
- Both modes post to the same two endpoints with a `channel` field
  (`"phone"` or `"email"`) plus `contact` (the phone number or email
  typed in). `send-otp.js` branches on that to decide whether to call
  Textbelt or Resend.
- Verification is identical either way: a signed token (not the code
  itself) comes back from `send-otp`, and `verify-otp` recomputes the
  same hash from what the user typed to check it matches and hasn't
  expired (5 minutes). No database needed.
