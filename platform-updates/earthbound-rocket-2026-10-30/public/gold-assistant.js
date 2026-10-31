(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const el = (tag, text, className) => {
    const node = document.createElement(tag);
    node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  let state = null, current = null, busy = false, epoch = 0, selection = 0;
  const date = value => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 'Timestamp unavailable' : parsed.toLocaleString();
  };
  const shortDate = value => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 'Saved conversation' : parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' + parsed.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  };
  function message(text, tone = 'neutral') {
    $('assistant-status').textContent = text;
    $('assistant-status').setAttribute('data-tone', tone);
  }
  async function api(action, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), action === 'ask' ? 60000 : 30000);
    try {
      const response = await fetch('/api/assistant/' + action, {
        method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: body === undefined ? { Accept: 'application/json' } : { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal
      });
      let data;
      try { data = await response.json(); }
      catch {
        const error = Error(response.status === 401 ? 'Sign in again to reopen your saved research.' : 'The connection was interrupted. Refresh the conversation before sending again.');
        error.status = response.status;
        throw error;
      }
      if (!response.ok) {
        const error = Error(data.error || 'Request failed.');
        error.status = response.status;
        throw error;
      }
      return data;
    } catch (error) {
      if (controller.signal.aborted) throw Error(action === 'ask'
        ? 'The request timed out. Refresh the conversation to check for a saved answer before sending again.'
        : 'The request timed out. Refresh your research desk to try again.');
      if (error instanceof TypeError) throw Error('Unable to reach your research desk. Check your connection and refresh.');
      throw error;
    } finally { clearTimeout(timer); }
  }
  function controls() {
    const active = !!state?.membership?.eligible && !!state.aiEnabled;
    $('assistant-start').disabled = busy || !active || !state?.reports?.length;
    $('assistant-send').disabled = busy || !active || !current || state?.remaining === 0;
    for (const id of ['assistant-new', 'assistant-export', 'assistant-delete', 'assistant-reload']) $(id).disabled = busy;
    for (const id of ['assistant-report', 'assistant-compare', 'assistant-focus', 'assistant-question']) $(id).disabled = busy || !active;
    document.querySelectorAll('[data-prompt],.chat-item').forEach(button => {
      button.disabled = busy || (!!button.dataset.prompt && !active);
    });
    document.querySelectorAll('[data-focus]').forEach(button => { button.disabled = busy || !active; });
    $('assistant-workspace').setAttribute('aria-busy', String(busy));
    $('assistant-remaining').textContent = state ? state.remaining + ' of ' + state.dailyLimit + ' requests left today · resets 00:00 UTC' : '';
    $('assistant-remaining').setAttribute('data-empty', String(state?.remaining === 0));
    $('assistant-send').textContent = busy ? 'Working…' : 'Ask assistant ↑';
    updateCharacterCount();
  }
  function updateCharacterCount() {
    $('assistant-character-count').textContent = $('assistant-question').value.length.toLocaleString() + ' / 1,200';
  }
  function libraries() {
    const root = $('assistant-chats');
    const query = $('assistant-search').value.trim().toLocaleLowerCase();
    const chats = state?.chats || [];
    const matching = chats.filter(chat => String(chat.title || '').toLocaleLowerCase().includes(query));
    $('assistant-library-count').textContent = query ? matching.length + ' / ' + chats.length : String(chats.length);
    root.replaceChildren();
    for (const chat of matching) {
      const button = el('button', '', 'chat-item');
      button.type = 'button';
      button.setAttribute('aria-current', String(current?.chat.id === chat.id));
      button.append(el('strong', chat.title), el('small', shortDate(chat.updated_at)));
      button.onclick = () => open(chat.id);
      root.append(button);
    }
    if (!matching.length) {
      const empty = el('div', '', 'assistant-library-empty');
      empty.append(el('span', query ? '⌕' : '◇'), el('h3', query ? 'No matching conversations' : 'Room for your next question'), el('p', query ? 'Try another title or clear your search.' : 'Start a conversation and return to it whenever you need.'));
      root.append(empty);
    }
    controls();
  }
  function reports() {
    const selected = $('assistant-report').value || new URLSearchParams(location.search).get('report');
    $('assistant-report').replaceChildren();
    for (const report of state.reports) {
      const option = el('option', (report.symbol || report.name || report.address.slice(0, 8)) + ' · ' + date(report.created_at));
      option.value = report.id;
      $('assistant-report').append(option);
    }
    if (state.reports.some(report => report.id === selected)) $('assistant-report').value = selected;
    $('assistant-no-reports').hidden = !!state.reports.length;
    $('assistant-create').hidden = !state.reports.length;
    comparisons();
  }
  function comparisons() {
    const chosen = state?.reports.find(report => report.id === $('assistant-report').value);
    const select = $('assistant-compare');
    const previous = select.value;
    select.replaceChildren();
    const empty = el('option', 'Single-report analysis');
    empty.value = '';
    select.append(empty);
    const matches = (state?.reports || []).filter(report => report.id !== chosen?.id && report.address === chosen?.address);
    for (const report of matches) {
      const option = el('option', date(report.created_at));
      option.value = report.id;
      select.append(option);
    }
    if (matches.some(report => report.id === previous)) select.value = previous;
    $('assistant-report-note').textContent = chosen ? 'Saved ' + date(chosen.created_at) + '. This is historical evidence.' : 'Select a snapshot from your research library.';
    $('assistant-compare-note').textContent = matches.length ? matches.length + ' other snapshot' + (matches.length === 1 ? '' : 's') + ' available for this token. Arranged by time.' : 'Save another Passport for this token to compare two moments.';
  }
  async function load(expectedEpoch = epoch) {
    const data = await api('state');
    if (expectedEpoch !== epoch) return;
    state = data;
    $('assistant-workspace').hidden = false;
    $('assistant-welcome').hidden = true;
    $('assistant-access-panel').setAttribute('data-state', data.membership.eligible ? 'active' : 'locked');
    $('assistant-access-title').textContent = data.membership.eligible ? 'Gold access verified' : 'Gold membership required for new answers';
    $('assistant-access-detail').textContent = data.membership.error || (!data.membership.eligible ? 'Hold 100,000 PRLX in your verified wallet. Your saved history stays accessible.' : data.aiEnabled ? 'Your private research desk is ready. Answers use your selected saved evidence.' : 'The AI connection is unavailable. Your saved research is still accessible.');
    $('assistant-access-link').textContent = data.membership.eligible ? 'Your membership ↗' : 'Verify Gold access ↗';
    $('assistant-access-link').href = '/pro';
    $('assistant-access-link').target = '_self';
    window.ParallaxGold?.set(data.membership.access || null);
    window.ParallaxProMembership?.set(data.membership.access || null);
    reports();
    libraries();
  }
  function safeSourceURL(source) {
    try {
      const url = new URL(source.url);
      if (url.protocol === 'https:' && ['solscan.io', 'dexscreener.com'].includes(url.hostname)) return url.href;
    } catch { /* An unavailable or malformed source is never made clickable. */ }
    return null;
  }
  function sources(list, selected = false) {
    const details = document.createElement('details');
    details.className = 'assistant-sources';
    details.append(el('summary', selected ? 'Selected evidence · ' + list.length + ' saved snapshot' + (list.length === 1 ? '' : 's') : 'Sources & snapshot times'));
    list.forEach((snapshot, index) => {
      const prefix = snapshot.sources?.[0]?.id?.split(':')[0] || (index ? 'B' : 'A');
      const block = el('div', 'Snapshot ' + prefix + ' · ' + date(snapshot.collectedAt), 'assistant-source-block');
      block.append(el('div', snapshot.address, 'assistant-source-address'));
      const passport = el('a', 'Open saved Passport ↗');
      passport.href = '/control?report=' + encodeURIComponent(snapshot.id) + '#passport';
      block.append(passport);
      for (const source of snapshot.sources || []) {
        const href = safeSourceURL(source);
        if (!href) continue;
        const link = el('a', '[' + source.id + '] ' + source.label + ' · ' + source.status);
        link.href = href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        block.append(link);
      }
      details.append(block);
    });
    return details;
  }
  function answer(text, evidence) {
    const output = el('div', '', 'assistant-answer');
    const citations = new Map();
    for (const snapshot of evidence || []) for (const source of snapshot.sources || []) {
      const href = safeSourceURL(source);
      if (href && source.status === 'retrieved') citations.set('[' + source.id + ']', { href, label: source.label });
    }
    for (const part of String(text || '').split(/(\[[AB]:S\d+\])/g)) {
      const source = citations.get(part);
      if (!source) { output.append(el('span', part)); continue; }
      const link = el('a', part, 'assistant-citation');
      link.href = source.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', part + ' ' + source.label + ' — opens current provider page');
      output.append(link);
    }
    return output;
  }
  function renderChat() {
    if (!current) return;
    $('assistant-setup').hidden = true;
    $('assistant-conversation').hidden = false;
    $('assistant-desk-mode').textContent = current.context?.length === 2 ? 'SNAPSHOT COMPARISON' : 'SAVED EVIDENCE';
    $('assistant-title').textContent = current.chat.title;
    $('assistant-chat-focus').textContent = current.chat.focus ? 'Research focus · ' + current.chat.focus : 'Research focus · Explain the evidence and useful next checks.';
    const root = $('assistant-messages');
    root.replaceChildren();
    if (current.context?.length) root.append(sources(current.context, true));
    if (!current.turns.length) {
      const empty = el('div', '', 'assistant-chat-empty');
      empty.append(el('span', '↗'), el('h3', 'The evidence is in place.'), el('p', 'Ask your first question, or choose a prompt below. Every answer stays with this conversation.'));
      root.append(empty);
    }
    for (const turn of current.turns) {
      const article = document.createElement('article');
      article.className = 'assistant-turn';
      article.append(el('p', 'You · ' + turn.question, 'assistant-question'));
      const heading = el('div', '', 'assistant-answer-heading');
      heading.append(el('span', '✧'), el('span', 'GOLD ASSISTANT'));
      article.append(heading);
      if (turn.status === 'completed') article.append(answer(turn.answer, turn.evidence));
      else {
        const pending = el('div', turn.status === 'failed' ? 'This request did not finish. No AI answer was saved.' : Date.now() - turn.created_at > 60000 ? 'This request was interrupted. No completed answer is saved. You may submit a new question.' : 'Your answer is processing. Refresh the workspace in a moment.', 'assistant-answer');
        pending.setAttribute('data-state', turn.status);
        article.append(pending);
      }
      article.append(el('p', (turn.status === 'completed' ? 'AI analysis · ' : 'Request · ') + date(turn.created_at), 'assistant-small'));
      if (turn.evidence?.length) article.append(sources(turn.evidence));
      root.append(article);
    }
    libraries();
  }
  async function open(id) {
    if (busy) return;
    const turn = ++selection, token = epoch;
    busy = true;
    controls();
    message('Opening your saved conversation…');
    try {
      const data = await api('chat?id=' + encodeURIComponent(id));
      if (token !== epoch || turn !== selection) return;
      current = data;
      renderChat();
      message('Conversation loaded. Answers use the selected saved snapshots.');
    } catch (error) { if (token === epoch) { locked(error); message(error.message, 'error'); } }
    finally { busy = false; controls(); }
  }
  function resetView() {
    selection++;
    current = null;
    $('assistant-setup').hidden = false;
    $('assistant-conversation').hidden = true;
    $('assistant-question').value = '';
    $('assistant-focus').value = '';
    $('assistant-desk-mode').textContent = 'NEW CONVERSATION';
    updateFocusPrompts();
    libraries();
    message('Choose the evidence for your next conversation.');
  }
  function locked(error) {
    if (error.status === 401) {
      epoch++;
      state = null;
      current = null;
      $('assistant-workspace').hidden = true;
      $('assistant-welcome').hidden = false;
      $('assistant-messages').replaceChildren();
      $('assistant-chats').replaceChildren();
      $('assistant-question').value = '';
      $('assistant-focus').value = '';
      $('assistant-access-panel').setAttribute('data-state', 'locked');
      $('assistant-access-title').textContent = 'Your private research desk';
      $('assistant-access-detail').textContent = 'Sign in to open your library. Verify Gold to start asking questions.';
      $('assistant-access-link').textContent = 'Sign in with ChatGPT ↗';
      $('assistant-access-link').href = '/signin-with-chatgpt?return_to=%2Fassistant';
      $('assistant-access-link').target = '_top';
      $('assistant-welcome-action').href = '/signin-with-chatgpt?return_to=%2Fassistant';
      $('assistant-welcome-action').textContent = 'Open my research desk ↗';
      message('Sign in to open your private research library.');
    } else if (error.status === 403 && state) {
      state.membership.eligible = false;
      $('assistant-access-panel').setAttribute('data-state', 'locked');
      $('assistant-access-title').textContent = 'Verify Gold access to continue';
      $('assistant-access-link').href = '/pro';
      $('assistant-access-link').textContent = 'Verify Gold access ↗';
    } else if (!state) {
      $('assistant-access-panel').setAttribute('data-state', 'unavailable');
      $('assistant-access-title').textContent = 'Your research desk could not connect';
      $('assistant-access-detail').textContent = 'Refresh to try again. Your library appears once your account loads.';
      $('assistant-welcome-detail').textContent = 'We could not load your research library. Refresh the workspace to reconnect and open your saved evidence.';
      $('assistant-welcome-action').href = '/assistant';
      $('assistant-welcome-action').textContent = 'Reload research desk ↗';
    }
    controls();
  }
  $('assistant-report').onchange = comparisons;
  $('assistant-new').onclick = resetView;
  $('assistant-search').oninput = libraries;
  $('assistant-question').oninput = updateCharacterCount;
  $('assistant-question').onkeydown = event => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && !event.isComposing) {
      event.preventDefault();
      if (!$('assistant-send').disabled) $('assistant-ask').requestSubmit?.();
    }
  };
  function updateFocusPrompts() {
    document.querySelectorAll('[data-focus]').forEach(button => button.setAttribute('aria-pressed', String($('assistant-focus').value === button.dataset.focus)));
  }
  $('assistant-focus').oninput = updateFocusPrompts;
  document.querySelectorAll('[data-focus]').forEach(button => {
    button.setAttribute('aria-pressed', 'false');
    button.onclick = () => {
      $('assistant-focus').value = button.dataset.focus;
      updateFocusPrompts();
      $('assistant-focus').focus();
    };
  });
  $('assistant-create').onsubmit = async event => {
    event.preventDefault();
    if (busy || !state?.membership?.eligible || !state.aiEnabled) return;
    const token = epoch;
    busy = true;
    controls();
    message('Preparing your research conversation…');
    let id;
    try {
      const data = await api('create', { reportId: $('assistant-report').value, compareId: $('assistant-compare').value || null, focus: $('assistant-focus').value });
      if (token !== epoch) return;
      id = data.id;
      await load(token);
    } catch (error) { if (token === epoch) { locked(error); message(error.message, 'error'); } }
    finally { busy = false; controls(); }
    if (id && token === epoch) { await open(id); $('assistant-question').focus(); }
  };
  $('assistant-ask').onsubmit = async event => {
    event.preventDefault();
    if (busy || !current || !state?.membership?.eligible || !state.aiEnabled || state.remaining === 0) return;
    const token = epoch, id = current.chat.id, question = $('assistant-question').value.trim();
    if (!question) return;
    busy = true;
    controls();
    message('Reading your selected evidence and preparing an answer…');
    let failure = null;
    try {
      await api('ask', { id, question, requestId: crypto.randomUUID() });
      if (token !== epoch) return;
      $('assistant-question').value = '';
    } catch (error) { if (token === epoch) { failure = error; locked(error); } }
    finally {
      if (token === epoch) {
        try {
          const data = await api('chat?id=' + encodeURIComponent(id));
          if (token === epoch) { current = data; renderChat(); await load(token); }
        } catch (error) { if (token === epoch) { locked(error); if (!failure) failure = error; } }
        if (token === epoch) {
          message(failure ? failure.message : 'Answer saved. Follow the source links to review the evidence.', failure ? 'error' : 'neutral');
          if (!failure) $('assistant-messages').scrollTop = $('assistant-messages').scrollHeight;
        }
      }
      busy = false;
      controls();
    }
  };
  document.querySelectorAll('[data-prompt]').forEach(button => {
    button.onclick = () => {
      $('assistant-question').value = button.dataset.prompt;
      updateCharacterCount();
      $('assistant-question').focus();
    };
  });
  $('assistant-delete').onclick = async () => {
    if (busy || !current || !confirm('Delete this conversation and its saved questions and answers? Your original Passports will remain.')) return;
    const token = epoch, id = current.chat.id;
    busy = true;
    controls();
    try {
      await api('delete', { id });
      if (token !== epoch) return;
      await load(token);
      if (token !== epoch) return;
      resetView();
      message('Conversation deleted. Your original Passports are unchanged.');
    } catch (error) { if (token === epoch) { locked(error); message(error.message, 'error'); } }
    finally { busy = false; controls(); }
  };
  $('assistant-export').onclick = () => {
    if (!current) return;
    const data = { schema: 'parallax.gold-assistant.v1', exportedAt: new Date().toISOString(), title: current.chat.title, focus: current.chat.focus, turns: current.turns };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'parallax-gold-research.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  $('assistant-reload').onclick = async () => {
    if (busy) return;
    const token = epoch, id = current?.chat.id;
    busy = true;
    controls();
    try {
      await load(token);
      if (token !== epoch) return;
      if (id) {
        const data = await api('chat?id=' + encodeURIComponent(id));
        if (token !== epoch) return;
        current = data;
        renderChat();
      }
      message('Workspace refreshed.');
    } catch (error) { if (token === epoch) { locked(error); message(error.message, 'error'); } }
    finally { busy = false; controls(); }
  };
  for (const event of ['accountChanged', 'disconnect']) window.phantom?.solana?.on?.(event, () => {
    epoch++;
    selection++;
    if (state) state.membership.eligible = false;
    current = null;
    $('assistant-messages').replaceChildren();
    $('assistant-conversation').hidden = true;
    $('assistant-setup').hidden = false;
    $('assistant-desk-mode').textContent = 'VERIFY GOLD ACCESS';
    message('Your wallet changed. Verify Gold membership again before continuing.');
    $('assistant-access-panel').setAttribute('data-state', 'locked');
    $('assistant-access-title').textContent = 'Verify your selected wallet';
    $('assistant-access-link').href = '/pro';
    $('assistant-access-link').textContent = 'Verify Gold access ↗';
    controls();
  });
  controls();
  load().then(() => { if (state) message('Choose a Passport or continue a saved conversation.'); }).catch(error => { locked(error); message(error.status === 401 ? 'Sign in to open your private research library.' : error.message, error.status === 401 ? 'neutral' : 'error'); });
})();
