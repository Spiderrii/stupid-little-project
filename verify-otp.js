const crypto = require('crypto');

module.exports = (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { contact, code, token } = req.body || {};
  const { OTP_SECRET } = process.env;

  if (!OTP_SECRET) {
    res.status(500).json({ error: 'Server is missing required environment variables.' });
    return;
  }
  if (!contact || !code || !token) {
    res.status(400).json({ success: false, error: 'Missing contact, code, or token.' });
    return;
  }

  let decoded;
  try {
    decoded = Buffer.from(token, 'base64url').toString('utf8');
  } catch (err) {
    res.status(400).json({ success: false, error: 'Invalid token.' });
    return;
  }

  const parts = decoded.split('.');
  if (parts.length !== 4) {
    res.status(400).json({ success: false, error: 'Invalid token.' });
    return;
  }
  const [tokenContact, expStr, codeHash, outerSig] = parts;
  const exp = Number(expStr);

  if (tokenContact !== contact) {
    res.status(400).json({ success: false, error: 'Token does not match this contact info.' });
    return;
  }
  if (!exp || Date.now() > exp) {
    res.status(400).json({ success: false, error: 'Code has expired.' });
    return;
  }

  const expectedOuterSig = crypto
    .createHmac('sha256', OTP_SECRET)
    .update(`${tokenContact}.${exp}.${codeHash}`)
    .digest('hex');
  if (!timingSafeEqual(outerSig, expectedOuterSig)) {
    res.status(400).json({ success: false, error: 'Invalid token.' });
    return;
  }

  const expectedCodeHash = crypto
    .createHash('sha256')
    .update(`${contact}.${code}.${exp}.${OTP_SECRET}`)
    .digest('hex');

  if (!timingSafeEqual(codeHash, expectedCodeHash)) {
    res.status(200).json({ success: false, error: 'Incorrect code.' });
    return;
  }

  res.status(200).json({ success: true });
};

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
