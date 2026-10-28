(() => {
  'use strict';
  const $=id=>document.getElementById(id),form=$('creator-update-form');if(!form)return;
  const api=(action,body)=>window.ParallaxPlanetUpdates.request(action,body),el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  let project='',editing=null,clientId=null,epoch=0,busy=false,ready=false,capabilities={maxImages:1,premium:false},active=true;
  const status=(text,error=false)=>{const n=$('creator-update-status');n.textContent=text;n.dataset.error=String(error);};
  function controls(){form.querySelectorAll('input,textarea,select,button').forEach(n=>n.disabled=busy||!project||!ready);$('creator-update-project').disabled=busy;$('creator-verify').disabled=busy;$('creator-update-theme').disabled=busy||!ready||!capabilities.premium;$('creator-update-add-image').disabled=busy||!ready||$('creator-update-media').children.length>=capabilities.maxImages;$('creator-publish-update').textContent=busy?'Saving…':editing?'Save changes ↗':'Publish update ↗';$('creator-update-cancel').hidden=!editing&&!clientId;$('creator-update-mode').textContent=editing?'Editing published update':'New public update';}
  function imageRow(value={url:'',alt:''}){const row=el('fieldset','update-image-row'),index=$('creator-update-media').children.length+1;row.append(el('legend','','Screenshot '+index));
    const a=el('label','','Image URL (HTTPS)'),url=el('input');url.type='url';url.required=true;url.maxLength=500;url.value=value.url;url.placeholder='https://your-site.com/screenshot.webp';url.dataset.imageUrl='';a.append(url);
    const b=el('label','','Image description'),alt=el('input');alt.required=true;alt.maxLength=160;alt.value=value.alt;alt.placeholder='Describe what the screenshot shows';alt.dataset.imageAlt='';b.append(alt);
    const remove=el('button','creator-text-button','Remove screenshot');remove.type='button';remove.onclick=()=>{row.remove();renumber();controls();};row.append(a,b,remove);$('creator-update-media').append(row);controls();
  }
  function renumber(){Array.from($('creator-update-media').children).forEach((r,i)=>r.querySelector('legend').textContent='Screenshot '+(i+1));}
  function clear(){editing=null;clientId=null;$('creator-update-title').value='';$('creator-update-body').value='';$('creator-update-progress').value='update';$('creator-update-link').value='';$('creator-update-theme').value='standard';$('creator-update-characters').textContent='0 / 800';$('creator-update-media').replaceChildren();$('creator-update-preview').replaceChildren();$('creator-update-preview-wrap').hidden=true;controls();}
  function values(){return {projectId:project,title:$('creator-update-title').value.trim(),body:$('creator-update-body').value.trim(),status:$('creator-update-progress').value,linkUrl:$('creator-update-link').value.trim(),presentation:$('creator-update-theme').value,media:Array.from($('creator-update-media').children).map(row=>({url:row.querySelector('[data-image-url]').value.trim(),alt:row.querySelector('[data-image-alt]').value.trim()}))};}
  function edit(item){if(busy)return;editing=item;clientId=null;$('creator-update-title').value=item.title;$('creator-update-body').value=item.body;$('creator-update-progress').value=item.status;$('creator-update-link').value=item.linkUrl;$('creator-update-theme').value=capabilities.premium?item.presentation:'standard';$('creator-update-characters').textContent=item.body.length+' / 800';$('creator-update-media').replaceChildren();for(const m of item.media||[])imageRow(m);$('creator-update-preview-wrap').hidden=true;controls();status('Editing “'+item.title+'”. The original publication date will stay visible.');form.scrollIntoView({block:'start',behavior:'auto'});$('creator-update-title').focus();}
  async function load(){const id=project,token=++epoch,host=$('creator-update-list');ready=false;controls();host.replaceChildren(el('p','creator-help',id?'Loading update history…':'Choose a world to see its updates.'));if(!id)return;
    try{const data=await api('updates?manage=1&project='+encodeURIComponent(id));if(token!==epoch||!active)return;capabilities=data.capabilities;ready=true;
      $('creator-update-plan').textContent=capabilities.premium?'Premium Worlds · up to 4 screenshots and mint, violet or amber presentation.':'Free creator updates · progress labels, a supporting link and 1 screenshot per post.';
      $('creator-update-upgrade').href='/premium?project='+encodeURIComponent(id);$('creator-update-upgrade').hidden=capabilities.premium;host.replaceChildren();
      if(!data.updates.length)host.append(el('p','creator-help','No updates yet. Share a release, milestone, or plan for this world.'));
      for(const item of data.updates){const row=window.ParallaxPlanetUpdates.card(item),actions=el('div','creator-update-actions'),editButton=el('button','creator-button','Edit update'),remove=el('button','creator-text-button','Remove update');editButton.type=remove.type='button';editButton.onclick=()=>edit(item);remove.onclick=async()=>{if(busy||!confirm('Remove “'+item.title+'” from your public planet and followers’ feeds? This cannot be undone.'))return;busy=true;controls();remove.disabled=true;
        try{await api('delete-update',{projectId:id,id:item.id,revision:item.revision});if(editing?.id===item.id)clear();await load();status('Update removed from the public feed.');}
        catch(e){status(e.message,true);remove.disabled=false;}finally{busy=false;controls();}};actions.append(editButton,remove);row.append(actions);host.append(row);}
    }catch(e){if(token!==epoch)return;host.replaceChildren(el('p','creator-help',e.message));status('History could not load. Use Refresh history before publishing.',true);}
    finally{if(token===epoch)controls();}
  }
  $('creator-update-project').onchange=()=>{if(($('creator-update-title').value||$('creator-update-body').value||$('creator-update-media').children.length)&&!confirm('Switch planets and discard this unsaved draft or edit?')){$('creator-update-project').value=project;return;}project=$('creator-update-project').value;clear();status('');load();};
  $('creator-update-refresh').onclick=()=>{if(!busy)load();};
  $('creator-update-body').oninput=()=>{$('creator-update-characters').textContent=$('creator-update-body').value.length+' / 800';};
  $('creator-update-add-image').onclick=()=>{if($('creator-update-media').children.length<capabilities.maxImages)imageRow();};
  $('creator-update-cancel').onclick=()=>{if((editing||clientId)&&!confirm('Discard this draft or unsaved edit? Published posts stay in the history.'))return;clear();status('Ready for a new update.');};
  $('creator-update-preview-button').onclick=()=>{if(!form.reportValidity())return;const v=values();$('creator-update-preview').replaceChildren(window.ParallaxPlanetUpdates.card({...v,id:'preview',createdAt:editing?.createdAt||Date.now(),editedAt:editing?Date.now():null}));$('creator-update-preview-wrap').hidden=false;};
  form.onsubmit=async event=>{event.preventDefault();if(busy||!ready||!form.reportValidity())return;
    const payload=values();if(!editing&&!clientId)clientId=crypto.randomUUID();if(editing){payload.id=editing.id;payload.revision=editing.revision;}else payload.clientId=clientId;
    busy=true;controls();status(editing?'Saving changes…':'Publishing your update…');
    try{await api(editing?'edit-update':'updates',payload);clear();await load();status('Published. Your planet and followers’ feeds now show this update.');}
    catch(e){status(e.message+' Your text is still here. Refresh history to check the current published version before retrying.',true);}
    finally{busy=false;controls();}
  };
  window.ParallaxUpdateEditor={sync(){const selected=$('creator-update-project').value;if(project!==selected){project=selected;clear();load();}else controls();}};
  window.addEventListener('pagehide',()=>{active=false;++epoch;ready=false;$('creator-update-list').replaceChildren();clear();});
  window.addEventListener('pageshow',event=>{active=true;if(event.persisted)load();});
})();
