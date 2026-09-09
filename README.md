# OTP page — phone simulated, email real

The phone/email switch stays, but now behaves differently per channel:

- **Phone**: still fully simulated, client-side only. No account, no
  server call, no real text sent. The code shown in the toast is the
  actual (fake) code used for verification.
- **Email**: actually sends, through Resend, using a proper HTML template
  (subject line, boxed code, "ignore if you didn't request this" note —
  looks like a real product email, not a plain-text notice). The toast
  still shows the code too, as a convenience — the server hands it back
  in the response for exactly that reason. See the comment in
  `api/send-otp.js` if this ever needs to become a real (non-demo)
  verification flow — that's the one field to remove.

## Environment variables (only needed for the email channel)

- `RESEND_API_KEY` — sign up at resend.com (no phone/card needed), create
  a key under API Keys.
- `OTP_SECRET` — any random long string you make up (e.g.
  `openssl rand -hex 32`). Signs the verification token.

Note: Resend's sandbox sender (`onboarding@resend.dev`) only delivers to
the address you signed up to Resend with, until you verify a domain.

## Deploy

```
cd otp-project
git init
git add .
git commit -m "otp page: real email, simulated phone"
gh repo create otp-page --public --source=. --push
```

Then on vercel.com: Add New Project → import the repo → add the two env
vars above → Deploy. `index.html` is served at the root; `/api/send-otp`
and `/api/verify-otp` run as serverless functions automatically.

If you just want to see the page (switch animation, dark mode, the fake
phone flow) without deploying anything, open `index.html` directly in a
browser — only the email "Send code" button needs the live backend.
