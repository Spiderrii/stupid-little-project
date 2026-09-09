const crypto = require('crypto');

const CODE_TTL_SECONDS = 5 * 60; // 5 minutes

function toE164(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits[0] === '1') return '+' + digits;
  if (raw.trim().startsWith('+') && digits.length > 7) return '+' + digits;
  return null;
}

function isValidEmail(raw) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);
}

function buildToken(contact, code, exp, secret) {
  const codeHash = crypto.createHash('sha256').update(`${contact}.${code}.${exp}.${secret}`).digest('hex');
  const payload = `${contact}.${exp}.${codeHash}`;
  const outerSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${contact}.${exp}.${codeHash}.${outerSig}`).toString('base64url');
}

async function sendPhone(normalizedPhone, code) {
  const { TEXTBELT_KEY } = process.env;
  const resp = await fetch('https://textbelt.com/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: normalizedPhone,
      message: `Your verification code is ${code}. It expires in 5 minutes.`,
      key: TEXTBELT_KEY || 'textbelt'
    })
  });
  const data = await resp.json();
  if (!data.success) throw new Error(data.error || 'Could not send the text.');
}

async function sendEmail(email, code) {
  const { RESEND_API_KEY } = process.env;
  if (!RESEND_API_KEY) throw new Error('Server is missing RESEND_API_KEY.');
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'Your verification code',
      text: `Your verification code is ${code}. It expires in 5 minutes.`
    })
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.message || 'Resend could not send the email.');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { channel, contact } = req.body || {};
  if (!contact || typeof contact !== 'string') {
    res.status(400).json({ error: 'Contact info is required.' });
    return;
  }
  if (channel !== 'phone' && channel !== 'email') {
    res.status(400).json({ error: 'Channel must be "phone" or "email".' });
    return;
  }

  const { OTP_SECRET } = process.env;
  if (!OTP_SECRET) {
    res.status(500).json({ error: 'Server is missing required environment variables.' });
    return;
  }

  let normalizedContact;
  if (channel === 'phone') {
    normalizedContact = toE164(contact);
    if (!normalizedContact) {
      res.status(400).json({ error: 'Enter a valid US phone number, e.g. +1 555 010 1234.' });
      return;
    }
  } else {
    if (!isValidEmail(contact)) {
      res.status(400).json({ error: 'Enter a valid email address.' });
      return;
    }
    normalizedContact = contact;
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const exp = Date.now() + CODE_TTL_SECONDS * 1000;

  try {
    if (channel === 'phone') {
      await sendPhone(normalizedContact, code);
    } else {
      await sendEmail(normalizedContact, code);
    }
  } catch (err) {
    res.status(502).json({ error: 'Could not send the code: ' + (err.message || 'unknown error') });
    return;
  }

  res.status(200).json({
    token: buildToken(normalizedContact, code, exp, OTP_SECRET),
    contact: normalizedContact
  });
};
