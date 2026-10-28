(() => {
  'use strict';
  const names = {bonk:'BONK',pengu:'Pudgy Penguins',wif:'dogwifhat',popcat:'POPCAT',sheeple:'Sheeple',trump:'OFFICIAL TRUMP'};
  const addressOK = value => typeof value === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
  const node = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  function link(text, href, className) {
    const element = node('a', text, className);
    element.href = href;
    if (href.startsWith('https://')) {
      element.target = '_blank';
      element.rel = 'noopener noreferrer';
    }
    return element;
  }
  function button(text, action, className) {
    const element = node('button', text, className || 'pw-button');
    element.type = 'button';
    element.addEventListener('click', action);
    return element;
  }
  function date(value) {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed.toLocaleDateString(undefined, {year:'numeric',month:'short',day:'numeric'}) : 'Unavailable';
  }
  async function request(action, project, body) {
    const response = await fetch('/api/project-wallet/' + action + (body === undefined ? '?project=' + encodeURIComponent(project) : ''), {
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: body === undefined ? {} : {'Content-Type':'application/json'},
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000)
    });
    let data;
    try { data = await response.json(); }
    catch { throw new Error('The wallet connection service is temporarily unavailable. Please retry.'); }
    if (!response.ok) {
      const error = new Error(data.error || 'The wallet request could not be completed.');
      error.status = response.status;
      throw error;
    }
    return data;
  }
  function mount(root) {
    const project = root.dataset.projectWallet;
    if (!names[project]) return;
    root.id = 'project-wallet';
    const state = {association:null,mine:null,project:null,signedIn:null,expanded:false,busy:false,loading:true,message:'',tone:'',wallet:'',role:'project',revision:0,privateError:''};
    const contents = node('div');
    const status = node('p','','pw-status');
    status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    root.replaceChildren(contents,status);
    function updateStatus() {
      status.className = 'pw-status' + (state.tone ? ' pw-status--' + state.tone : '');
      status.textContent = state.message;
    }
    const returnPath = () => location.pathname + location.search + '#project-wallet';
    const signIn = () => { location.href = '/signin-with-chatgpt?return_to=' + encodeURIComponent(returnPath()); };
    const provider = () => window.phantom?.solana || (window.solana?.isPhantom ? window.solana : null);
    const phantomURL = () => 'https://phantom.app/ul/browse/' + encodeURIComponent(location.origin + returnPath()) + '?ref=' + encodeURIComponent(location.origin);
    const feedback = (message, tone) => {state.message = message; state.tone = tone || '';};
    async function refresh() {
      const revision = ++state.revision;
      const results = await Promise.allSettled([request('status',project),request('mine',project)]);
      if (revision !== state.revision || !root.isConnected) return;
      const [publicResult, privateResult] = results;
      if (publicResult.status === 'fulfilled') {
        state.project = publicResult.value.project;
        state.association = publicResult.value.association;
      } else {
        state.project = null;
        state.association = null;
        feedback(publicResult.reason.message, 'error');
      }
      state.privateError = '';
      if (privateResult.status === 'fulfilled') {
        state.mine = privateResult.value;
        state.signedIn = privateResult.value.signedIn === true;
      } else if (privateResult.reason.status === 401) {
        state.mine = null;
        state.signedIn = false;
        state.expanded = false;
      } else {
        state.privateError = 'Your latest sign-in and wallet-link status could not be loaded. Any proof shown below is your last confirmed request. Choose Refresh status to check again.';
        if (state.project) feedback(state.privateError, 'error');
      }
      state.loading = false;
    }
    async function run(message, action) {
      if (state.busy) return;
      state.busy = true;
      feedback(message);
      render();
      try {
        const result = await action();
        await refresh();
        if (state.project && !state.privateError) feedback(result || 'Project wallet status refreshed.', 'success');
      } catch (error) {
        if (error.status === 401) {state.signedIn = false;state.mine = null;state.expanded = false;}
        feedback(error.code === 4001 ? 'Signature cancelled. You can return to this step whenever you are ready.' : error.message || 'The wallet request could not be completed.', 'error');
      } finally {
        state.busy = false;
        render();
      }
    }
    async function sign(action) {
      if (state.signedIn === false) {signIn();return;}
      if (state.signedIn !== true) {
        feedback('Your sign-in status could not be checked. Refresh the connection and try again.', 'error');
        render();
        return;
      }
      if (action === 'link' && state.wallet && !addressOK(state.wallet.trim())) {
        feedback('Enter a complete Solana wallet address, or leave it blank to use your signing wallet.', 'error');
        render();
        return;
      }
      const walletProvider = provider();
      if (!walletProvider?.connect || !walletProvider?.signMessage) {
        feedback('Open this page in Phantom’s browser, or use a browser with the Phantom extension, to sign the wallet message.', 'error');
        state.expanded = true;
        render();
        return;
      }
      await run('Connect the wallet you use to represent this project.', async () => {
        const connected = await walletProvider.connect();
        const operatorWallet = connected.publicKey?.toString();
        if (!addressOK(operatorWallet)) throw new Error('Phantom did not return a valid wallet address.');
        if (action === 'revoke' && state.mine?.operatorWallet && operatorWallet !== state.mine.operatorWallet) {
          throw new Error('Switch Phantom to the wallet that signed this project link, then try again.');
        }
        const body = {project,action,operatorWallet};
        if (action === 'link') {
          body.projectWallet = state.wallet.trim() || operatorWallet;
          body.role = state.role;
        } else {
          if (!state.association?.id) throw new Error('This wallet link is no longer available. Refresh its status.');
          body.associationId = state.association.id;
        }
        const challenge = await request('challenge',project,body);
        if (typeof challenge.message !== 'string' || !challenge.challengeId) throw new Error('The signing challenge is incomplete. Please retry.');
        feedback(action === 'revoke' ? 'Review the message to remove this public wallet link.' : 'Review the project and wallet addresses in Phantom. This is a message signature.');
        render();
        const signed = await walletProvider.signMessage(new TextEncoder().encode(challenge.message), 'utf8');
        const signature = Array.from(signed.signature || []);
        if (signature.length !== 64 || signature.some(n => !Number.isInteger(n) || n < 0 || n > 255)) throw new Error('Phantom did not return a valid message signature.');
        if (walletProvider.publicKey && walletProvider.publicKey.toString() !== operatorWallet) throw new Error('The connected wallet changed. Start a fresh verification for the selected wallet.');
        const result = await request('prove',project,{challengeId:challenge.challengeId,signature});
        if (result.status === 'pending-website') {
          state.mine = {...(state.mine || {}),signedIn:true,pending:result};
        } else if (result.status === 'revoked') {
          state.association = null;
          state.mine = {...(state.mine || {}),pending:null,association:null,canRevoke:false,operatorWallet:null};
        }
        state.expanded = action === 'link';
        return result.status === 'revoked' ? 'The public wallet link has been removed.' : 'Wallet control confirmed. Publish the website proof below to complete the link.';
      });
    }
    async function copy(text, description) {
      try {
        if (!navigator.clipboard?.writeText) throw new Error();
        await navigator.clipboard.writeText(text);
        feedback(description + ' copied.', 'success');
      } catch {
        feedback('Copy is unavailable in this browser. Select and copy the displayed ' + description.toLowerCase() + '.', 'error');
      }
      updateStatus();
    }
    function renderAssociation(body) {
      const association = state.association;
      if (!association || !addressOK(association.wallet)) {
        const empty = node('div',undefined,'pw-empty');
        empty.append(node('span','AWAITING PROJECT PROOF','pw-eyebrow'),node('h3','Ready for the team’s wallet.'),node('p','This showcase is linked to the token. Its project wallet will appear here after a wallet signature and verification on the project’s website.'));
        body.append(empty);
        return;
      }
      const card = node('div',undefined,'pw-linked');
      const title = node('div',undefined,'pw-linked-title');
      title.append(node('span','Verified via project website','pw-badge'),node('span',association.role === 'treasury' ? 'Public treasury wallet' : 'Public project wallet','pw-role'));
      const address = node('code',association.wallet,'pw-address');
      const actions = node('div',undefined,'pw-actions');
      actions.append(link('Open Wallet Watch ↗','/control?wallet=' + encodeURIComponent(association.wallet) + '#wallet','pw-button pw-primary'),button('Copy address',()=>copy(association.wallet,'Wallet address'),'pw-button pw-quiet'),link('View website proof ↗',state.project.proofUrl,'pw-text-link'));
      card.append(title,address,actions,node('p','Checked ' + date(association.verifiedAt) + ' · Valid through ' + date(association.expiresAt) + '.','pw-date'));
      const identity = node('div',undefined,'pw-handle');
      identity.dataset.solhandleWallet = association.wallet;
      card.append(identity,node('p','This verifies the website-to-wallet association. Planet management and SolHandle ownership are checked separately.','pw-note'));
      body.append(card);
    }
    function renderProof(body, pending) {
      const panel = node('div',undefined,'pw-flow');
      panel.tabIndex = -1;
      panel.append(node('div','WALLET SIGNED · WEBSITE PROOF NEXT','pw-step'),node('h3','Confirm the link on the project’s website.'),node('p','Publish this exact JSON file at the address below. It ties the signing wallet, public wallet and token to the project’s existing website.'));
      const endpoint = node('code',pending.proofUrl,'pw-proof-url');
      const label = node('label','Verification file','pw-label');
      const area = node('textarea',undefined,'pw-proof-document');
      area.id = 'pw-proof-document-' + project;
      area.readOnly = true;
      area.rows = 9;
      area.spellcheck = false;
      area.value = JSON.stringify(pending.proofDocument,null,2);
      label.htmlFor = area.id;
      const json = area.value;
      const actions = node('div',undefined,'pw-actions');
      actions.append(button('Copy JSON',()=>copy(json,'Verification file'),'pw-button pw-quiet'),button('Download JSON',()=>{
        const url = URL.createObjectURL(new Blob([json + '\n'],{type:'application/json'}));
        const a = link('Download file',url);
        a.download = 'parallax-wallet.json';
        document.body.append(a);a.click();a.remove();
        setTimeout(()=>URL.revokeObjectURL(url),1000);
      },'pw-button pw-quiet'),button('Check website proof',()=>run('Checking the verification file on the official project website…',async()=>{
        const result = await request('verify',project,{claimId:pending.claimId});
        if (result.status !== 'verified') throw new Error('The website proof has not been verified yet.');
        state.association = result.association;
        state.mine = {...(state.mine || {}),signedIn:true,pending:null,association:result.association,canRevoke:true,operatorWallet:pending.operatorWallet};
        state.expanded = false;
        return 'The project wallet is now linked. Visitors can open it in Wallet Watch.';
      }),'pw-button pw-primary'));
      panel.append(endpoint,label,area,actions,node('p','Publish and check this file before ' + new Date(pending.expiresAt).toLocaleString() + '. The link becomes public only after both checks pass.','pw-note'));
      const details = node('details',undefined,'pw-details');
      details.append(node('summary','Which addresses are in this proof?'),node('p','Signing wallet: ' + pending.operatorWallet),node('p','Public ' + (pending.role === 'treasury' ? 'treasury' : 'project') + ' wallet: ' + pending.projectWallet),node('p','The file you publish makes both addresses public on the project website.'),link('Read the verification guide ↗','/docs/project-wallets','pw-text-link'));
      panel.append(details,button('Use a different wallet',()=>{state.mine.pending=null;state.expanded=true;render();},'pw-text-button'));
      body.append(panel);
    }
    function renderForm(body) {
      const panel = node('form',undefined,'pw-flow');
      panel.tabIndex = -1;
      panel.addEventListener('submit',event=>{event.preventDefault();sign('link');});
      panel.append(node('div','FOR THE PROJECT TEAM','pw-step'),node('h3','Sign first. Confirm through your website.'),node('p','Use a wallet authorized to represent this project. After signing, you’ll publish a short verification file on ' + new URL(state.project.proofUrl).hostname + '.'));
      const fields = node('div',undefined,'pw-fields');
      const addressLabel = node('label',undefined,'pw-field');
      addressLabel.append(node('span','Public project wallet'));
      const input = node('input');
      input.type = 'text';input.name = 'projectWallet';input.value = state.wallet;input.maxLength = 44;input.autocomplete = 'off';input.spellcheck = false;
      input.placeholder = 'Leave blank to use your signing wallet';
      input.addEventListener('input',()=>{state.wallet=input.value;});
      addressLabel.append(input,node('small','A treasury or multisig can use a different address from the wallet signing this request.'));
      const roleLabel = node('label',undefined,'pw-field');
      roleLabel.append(node('span','Wallet purpose'));
      const select = node('select');select.name = 'role';
      for (const [value,text] of [['project','Project / operations'],['treasury','Treasury']]) {const option=node('option',text);option.value=value;select.append(option);}
      select.value = state.role;
      select.addEventListener('change',()=>{state.role=select.value;});
      roleLabel.append(select);
      fields.append(addressLabel,roleLabel);
      const actions = node('div',undefined,'pw-actions');
      const submit = node('button','Connect and sign with Phantom','pw-button pw-primary');submit.type='submit';
      actions.append(submit,link('Open in Phantom ↗',phantomURL(),'pw-button pw-quiet'));
      panel.append(fields,actions,node('p','Message signature only. No payment, token transfer or spending approval. The website verification file makes both addresses public. Linking a wallet grants no planet editing rights.','pw-note'),button('Close',()=>{state.expanded=false;render();root.querySelector('.pw-team-actions button')?.focus();},'pw-text-button'));
      body.append(panel);
    }
    function render() {
      const heading = node('div',undefined,'pw-heading');
      const titles = node('div');
      titles.append(node('p','PROJECT IDENTITY','pw-eyebrow'),node('h2','A clearer connection.'),node('p','Trace the link between ' + names[project] + ' and its public project wallet.'));
      heading.append(titles,link('How verification works ↗','/docs/project-wallets','pw-text-link'));
      const body = node('div',undefined,'pw-body');
      if (state.loading) body.append(node('p','Checking the project wallet…','pw-loading'));
      else if (!state.project) {
        body.append(node('h3','Wallet connections are temporarily unavailable.'),button('Try again',()=>run('Refreshing the project wallet…',async()=>''),'pw-button'));
      } else {
        renderAssociation(body);
        const pending = state.mine?.pending;
        if (pending && state.expanded) renderProof(body,pending);
        else if (state.expanded && state.signedIn === true) renderForm(body);
        const actions = node('div',undefined,'pw-actions pw-team-actions');
        if (!state.expanded) actions.append(button(pending?'Continue website verification':state.association?'Link or refresh a project wallet':'Link project wallet',()=>{
          if(state.signedIn===false){signIn();return;}
          if(state.signedIn===null){run('Checking your sign-in…',async()=> 'Sign-in status refreshed.');return;}
          state.expanded=true;
          if(state.association&&!pending){state.wallet=state.association.wallet;state.role=state.association.role;}
          render();
          const flow = root.querySelector('.pw-flow');
          flow?.focus({preventScroll:true});
          flow?.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});
        },'pw-button pw-quiet'));
        if (state.mine?.canRevoke && state.association) actions.append(button('Sign to remove wallet link',()=>sign('revoke'),'pw-text-button'));
        actions.append(button('Refresh status',()=>run('Refreshing the project wallet…',async()=>''),'pw-text-button'));
        body.append(actions);
      }
      contents.replaceChildren(heading,body);
      updateStatus();
      root.setAttribute('aria-busy',String(state.busy || state.loading));
      if (state.busy) root.querySelectorAll('button,input,select').forEach(element=>{element.disabled=true;});
    }
    render();
    refresh().then(render).catch(error=>{state.loading=false;feedback(error.message,'error');render();});
    window.addEventListener('pageshow',event=>{if(event.persisted&&!state.busy)refresh().then(render);});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!state.busy)refresh().then(render);});
  }
  document.querySelectorAll('[data-project-wallet]').forEach(mount);
})();
