(function (root) {
  'use strict';
  async function request(url, body, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeout || 35000);
    try {
      const response = await (options.fetch || fetch)(url, {
        method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin',
        headers: body === undefined ? {Accept: 'application/json'} : {'Content-Type': 'application/json', Accept: 'application/json'},
        body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal
      });
      let data;
      try { data = await response.json(); }
      catch {
        const error = new Error(response.status === 401 || response.status === 403 ? 'Your account could not be verified. Sign in again, then retry.' : 'The service returned an unreadable response. Please retry shortly.');
        error.status = response.status; throw error;
      }
      if (!response.ok) { const error = new Error(data.error || 'Request failed. Please retry.'); error.status = response.status; throw error; }
      return data;
    } catch (error) {
      if (controller.signal.aborted) throw new Error('The request timed out. Check the current state before trying again.');
      if (error instanceof TypeError) throw new Error('Unable to reach PARALLAX. Check your connection and retry.');
      throw error;
    } finally { clearTimeout(timer); }
  }
  function parseExport(text) {
    let data;
    try { data = JSON.parse(text.replace(/^\uFEFF/, '')); } catch { throw new Error('This file is not valid JSON. Choose a downloaded PARALLAX passport export.'); }
    if (!data || data.format !== 'parallax.passport.export.v1' || typeof data.payload !== 'string' ||
        typeof data.reportId !== 'string' || !data.reportId || data.reportId.length > 64 ||
        typeof data.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(data.sha256)) {
      throw new Error('This is not a PARALLAX passport export. Open a passport in My reports and choose Download passport JSON.');
    }
    return {...data, sha256: data.sha256.toLowerCase()};
  }
  async function verifyExport(data) {
    if (!root.crypto?.subtle) throw new Error('File verification requires a secure browser connection. Open this site in Safari or Chrome over HTTPS.');
    const digest = Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256', new TextEncoder().encode(data.payload))), x => x.toString(16).padStart(2, '0')).join('');
    if (digest !== data.sha256) throw new Error('Mismatch: the exported source payload or its declared fingerprint has changed.');
    return digest;
  }
  const api = {request, parseExport, verifyExport};
  root.ParallaxResearch = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
