# OTP page — setup (Twilio Verify)

A minimal phone-verification page (`index.html`) plus two backend functions
(`api/send-otp.js`, `api/verify-otp.js`) built on **Twilio Verify** — a
Twilio product made specifically for one-time codes. It generates, sends,
and checks the code for you, so there's no code-signing logic to maintain,
and it isn't subject to the "custom message body" restriction that trial
accounts hit on plain Programmable Messaging.

## 1. Create a Verify Service

1. In the Twilio Console, go to Verify → Services.
2. Click Create new Service, give it any friendly name (e.g. "otp-page").
3. Copy the **Service SID** it gives you (starts with `VA...`) — this is
   `TWILIO_VERIFY_SERVICE_SID`.
4. From the main Console dashboard, also copy your **Account SID** and
   **Auth Token**.

You do NOT need to buy a phone number for this — Verify sends from its own
infrastructure.

## 2. Verify the number you'll be texting

Trial accounts can only send to numbers you've verified in the console:

1. Go to Phone Numbers → Manage → Verified Caller IDs.
2. Add your own phone number and confirm it.
3. Until you upgrade, only verified numbers can receive codes — fine for
   testing with your own phone.

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
   - `TWILIO_VERIFY_SERVICE_SID`
4. Click Deploy. `index.html` is served at the root, and `/api/send-otp`
   and `/api/verify-otp` run as serverless functions automatically.

## How it works

- `send-otp.js` calls Twilio Verify's `verifications.create` for the
  phone number — Twilio generates the code, sends it, and tracks it
  server-side for a few minutes.
- `verify-otp.js` calls Verify's `verificationChecks.create` with the code
  the user typed. Twilio checks it against what it sent and returns
  `approved` or not.
- No token, no code storage, no signing secret needed on our side at all —
  Twilio is the source of truth for whether a code is correct.

## If a text doesn't arrive

- Confirm the number is added under Verified Caller IDs (step 2).
- Check Verify → Services → [your service] → Logs in the Twilio Console —
  it shows delivery status and the exact reason for any failure.
