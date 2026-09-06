const twilio = require('twilio');

// Twilio requires strict E.164: "+" + country code + digits, no spaces,
// dashes, or parens. Normalize whatever the user typed into that shape.
function toE164(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;          // US, no country code typed
  if (digits.length === 11 && digits[0] === '1') return '+' + digits; // US with leading 1
  if (raw.trim().startsWith('+') && digits.length > 7) return '+' + digits; // already had a +
  return null; // not enough digits to be a real number
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { phone } = req.body || {};
  if (!phone || typeof phone !== 'string') {
    res.status(400).json({ error: 'Phone number is required.' });
    return;
  }

  const normalizedPhone = toE164(phone);
  if (!normalizedPhone) {
    res.status(400).json({ error: 'Enter a valid phone number, e.g. +1 555 010 1234.' });
    return;
  }

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID } = process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
    res.status(500).json({ error: 'Server is missing required environment variables.' });
    return;
  }

  try {
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    // Twilio Verify generates, stores, and sends the code itself using its
    // own pre-approved verification template, then tracks it server-side
    // against this phone number for a few minutes.
    await client.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: normalizedPhone, channel: 'sms' });
  } catch (err) {
    res.status(502).json({ error: 'Could not send the text: ' + (err.message || 'unknown error') });
    return;
  }

  // No code or token to hand back — Verify tracks the pending code by
  // phone number on Twilio's side. We just tell the client which
  // normalized phone number to check against later.
  res.status(200).json({ phone: normalizedPhone });
};
