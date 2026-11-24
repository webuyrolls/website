// Backup quote form: the page shows #fallback-form when HubSpot's form script can't load (usually an ad
// blocker), and posts it here. Served from our own domain so it isn't blocked, this passes the entry on to the
// same HubSpot form through HubSpot's Forms API, so it lands in HubSpot like any other quote request.
const PORTAL = '343635070';
const FORM = '0b410db3-1e3f-44e0-b8d0-66b30603cd50';
const SUBSCRIPTION = 3570139139; // "I agree to receive communications from We Buy Rolls."
const CONSENT_TEXT = 'By checking the box below, you agree to receive communications from We Buy Rolls, part of the Clean Lifecycle Network. You can unsubscribe anytime.';
const FIELDS = ['firstname', 'lastname', 'email', 'phone', 'company', 'submission_message'];

module.exports = async function handler(req, res) {
  if (!/json/.test(req.headers['content-type'] || '')) {
    // the browser posted the form itself (JavaScript off), so answer with a short page rather than JSON
    res.json = (o) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send('<!DOCTYPE html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
        '<title>We Buy Rolls</title><p>' + (o.ok ? 'Thanks, we’ve got your quote request and will be in touch shortly.' : o.error +
        ' Please call <a href="tel:+12035165235">+1 203-516-5235</a>.') + ' <a href="/">Back to We Buy Rolls</a></p>');
    };
  }
  if (req.method !== 'POST') return res.redirect(303, '/#contact');
  const body = typeof req.body === 'object' && req.body ? req.body : {};
  // a hidden field people can't see; bots that fill it in get a quiet "ok" and nothing is sent
  if (body.website) return res.status(200).json({ ok: true });

  const fields = FIELDS
    .map((name) => ({ name, value: String(body[name] || '').trim().slice(0, 5000) }))
    .filter((f) => f.value);
  // HubSpot's Forms API accepts any text as an e-mail address, so check the format here
  const email = (fields.find((f) => f.name === 'email') || {}).value || '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ ok: false, error: 'Please check your e-mail address.' });

  const cookies = Object.fromEntries((req.headers.cookie || '').split(/;\s*/).filter(Boolean).map((c) => {
    const i = c.indexOf('=');
    try { return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))]; } catch (e) { return [c.slice(0, i), '']; }
  }));
  const context = { pageUri: String(body.pageUri || '').slice(0, 500), pageName: String(body.pageName || '').slice(0, 200) };
  if (cookies.hubspotutk) context.hutk = cookies.hubspotutk; // links the entry to the visitor's HubSpot history
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  if (ip) context.ipAddress = ip;

  const legalConsentOptions = body.subscribe ? {
    consent: {
      consentToProcess: true,
      text: CONSENT_TEXT,
      communications: [{ value: true, subscriptionTypeId: SUBSCRIPTION, text: 'I agree to receive communications from We Buy Rolls.' }],
    },
  } : undefined;

  try {
    const r = await fetch(`https://api.hsforms.com/submissions/v3/integration/submit/${PORTAL}/${FORM}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields, context, legalConsentOptions }),
    });
    if (r.ok) return res.status(200).json({ ok: true });
    const detail = await r.json().catch(() => ({}));
    console.error('HubSpot rejected a quote request', r.status, JSON.stringify(detail));
    const invalidEmail = (detail.errors || []).some((e) => /EMAIL/.test(e.errorType || ''));
    return res.status(invalidEmail ? 400 : 502).json({
      ok: false,
      error: invalidEmail ? 'Please check your e-mail address.' : 'Sorry, we couldn’t send your request.',
    });
  } catch (e) {
    console.error('Could not reach HubSpot', e);
    return res.status(502).json({ ok: false, error: 'Sorry, we couldn’t send your request.' });
  }
};
