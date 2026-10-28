(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  if (!$('pro-membership-panel')) return;
  // Exact decimal display, including a holder one fractional token below the threshold.
  const scale = 1000000000n;
  function units(value) {
    if (typeof value !== 'string' || !/^\d{1,24}(?:\.\d{1,9})?$/.test(value)) return null;
    const [whole, fraction = ''] = value.split('.');
    return BigInt(whole) * scale + BigInt(fraction.padEnd(9, '0'));
  }
  function format(value) {
    const whole = (value / scale).toLocaleString('en-US');
    const fraction = (value % scale).toString().padStart(9, '0').replace(/0+$/, '');
    return whole + (fraction ? '.' + fraction : '');
  }
  function set(member) {
    const balance = units(member?.balance), required = units(member?.required);
    const known = balance !== null && required !== null && required > 0n &&
      typeof member?.eligible === 'boolean' && typeof member?.wallet === 'string' &&
      /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(member.wallet);
    const active = known && member.eligible === true;
    $('pro-membership-state').textContent = active ? 'Pro Active' : known ? 'Requirement not met' : 'Not verified';
    $('pro-membership-state').dataset.active = String(active);
    $('access-balance').textContent = known ? format(balance) + ' PRLX' : 'Not checked';
    $('pro-required').textContent = known ? format(required) : '100,000';
    $('pro-holding-progress').hidden = !known;
    const remaining = known && required > balance ? required - balance : 0n;
    $('pro-remaining').textContent = active ? 'Holding requirement met' : known ? format(remaining) + ' PRLX more needed' : 'Verify to check holdings';
    const progress = known ? Math.min(100, Number(balance * 10000n / required) / 100) : 0;
    $('pro-holding-meter').value = progress;
    $('pro-holding-meter').textContent = progress + '%';
    $('pro-holding-meter').setAttribute('aria-valuetext', $('pro-remaining').textContent);
    const checked = known && member.checkedAt ? new Date(member.checkedAt) : null;
    $('pro-checked').textContent = checked && Number.isFinite(checked.getTime())
      ? 'Last verified ' + checked.toLocaleString() : 'Your balance appears after wallet verification.';
    $('pro-benefits-state').textContent = active ? 'Unlocked for your wallet' : 'Included with Pro';
    $('pro-open-monitor').hidden = !active;
  }
  window.ParallaxProPanel = { set };
  set(window.ParallaxProMemberState || null);
})();
