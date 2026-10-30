/* APK NS AutoBook 1.3.19 - Vehicle documents and separated menus.
   Overlay designed for the existing 1.3.x indexedDB('ns-autobook-documents')
   and data variable `d`. It does NOT change the storage key or erase data.
*/
(function () {
  'use strict';
  const APP = 'NS AutoBook 1.3.19';
  const TYPES = [
    ['rca', 'RCA', true],
    ['itp', 'ITP', true],
    ['casco', 'CASCO', true],
    ['rovinieta', 'Rovinietă', true],
    ['talon', 'Certificat de înmatriculare', false],
    ['civ', 'Carte de identitate a vehiculului (CIV)', false]
  ];
  const e = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const store = () => document.getElementById('h');
  const getVehicle = () => (d.vehicle = d.vehicle || {});
  const otherList = () => (d.vehicleAdditionalDocs = Array.isArray(d.vehicleAdditionalDocs) ? d.vehicleAdditionalDocs : []);
  const baseKey = key => key.startsWith('extra:') ? key : key;
  const backKey = key => key + '::verso';
  let objectUrls = [], activePanel = 'menu';
  const url = blob => { const x=URL.createObjectURL(blob);objectUrls.push(x);return x; };
  function clearUrls(){for(const x of objectUrls) URL.revokeObjectURL(x);objectUrls=[];}
  function css(){
    if (document.getElementById('ns19-css')) return;
    const style = document.createElement('style');style.id='ns19-css';style.textContent=`
    .ns19-root{position:fixed;inset:0;background:#eef2f6;z-index:10000;overflow:auto;color:#192838}
    .ns19-shell{box-sizing:border-box;min-height:100dvh;max-width:720px;margin:0 auto;background:#fff;padding:calc(env(safe-area-inset-top,0px) + 12px) 16px calc(env(safe-area-inset-bottom,0px) + 24px)}
    .ns19-header{position:sticky;top:0;display:flex;align-items:center;gap:9px;background:#fff;z-index:2;padding:4px 0 13px;border-bottom:1px solid #dbe3ec}
    .ns19-header strong{flex:1;font-size:18px}.ns19-header button{width:auto;min-width:44px;min-height:42px;padding:8px 12px;margin:0}
    .ns19-menu{width:100%;text-align:left;font-size:16px;margin:9px 0;padding:15px;border:1px solid #dbe3ec;border-radius:12px;background:#f6f8fa;color:#192838;font-weight:650}
    .ns19-note{font-size:13px;color:#607287;line-height:1.5}.ns19-row{display:flex;gap:8px;flex-wrap:wrap}.ns19-row button{flex:1;min-width:105px}
    .ns19-card{padding:12px;border:1px solid #dbe3ec;border-radius:12px;margin:12px 0}
    .ns19-shell label{display:block;margin-top:13px;font-size:13px}.ns19-shell input,.ns19-shell select{box-sizing:border-box;width:100%;min-height:46px;padding:10px;margin-top:5px}
    .ns19-shell button.p,.ns19-shell button.q{margin-top:9px}.ns19-status{font-size:12px;color:#667;display:block;margin-top:5px}
    .ns19-preview{position:fixed;inset:0;z-index:10001;background:#fff;display:flex;flex-direction:column}
    .ns19-preview-bar{display:flex;gap:7px;align-items:center;padding:8px;background:#fff;border-bottom:1px solid #ddd;flex-wrap:wrap}
    .ns19-preview-bar button{width:auto;min-width:42px;margin:0;padding:7px 12px}
    .ns19-viewbox{flex:1;min-height:0;position:relative;overflow:hidden;background:#e6e9ee;touch-action:none;display:flex;justify-content:center;align-items:center}
    .ns19-viewbox img{max-width:100%;max-height:100%;object-fit:contain;touch-action:none;transform-origin:center center;user-select:none;-webkit-user-drag:none}
    .ns19-viewbox iframe{width:100%;height:100%;border:0;background:white;transform-origin:center center}
    .ns19-counter{margin:0 7px;color:#567;font-size:13px}
    `;document.head.appendChild(style);
  }
  function page(title, body, back){
    css();clearUrls();activePanel=title;
    const r=store();r.innerHTML=`<div class="ns19-root"><div class="ns19-shell"><div class="ns19-header"><button type="button" class="q" id="ns19Back">‹ Înapoi</button><strong>${e(title)}</strong><button type="button" class="q" id="ns19Close" aria-label="Închide">✕</button></div><section id="ns19Panel">${body}</section></div></div>`;
    document.getElementById('ns19Back').onclick=back||menu;
    document.getElementById('ns19Close').onclick=close;
  }
  function close(){clearUrls();store().innerHTML='';activePanel='closed';}
  function menu(){
    page('Date vehicul', `<p class="ns19-note">Alege secțiunea pe care dorești să o deschizi.</p>
     <button class="ns19-menu" id="ns19Identity">Date de identificare</button>
     <button class="ns19-menu" id="ns19Revision">Revizie ulei și filtre</button>
     <button class="ns19-menu" id="ns19Documents">Documente vehicul</button>
     <button class="ns19-menu" id="ns19Extra">Alte documente</button>
     <button class="ns19-menu" id="ns19Notifications">Notificări</button>`, close);
    document.getElementById('ns19Identity').onclick=identity;
    document.getElementById('ns19Revision').onclick=revision;
    document.getElementById('ns19Documents').onclick=documents;
    document.getElementById('ns19Extra').onclick=extraList;
    document.getElementById('ns19Notifications').onclick=notifications;
  }
  function fields(form, flds){return flds.map(([key,label,type])=>`<label for="ns19-${key}">${e(label)}</label><input id="ns19-${key}" name="${key}" type="${type}" ${type==='number'?'min="0" step="1"':''} value="${e((getVehicle())[key]||'')}">`).join('');}
  function saveVehicleFrom(form, revisionMode){
    const values=Object.fromEntries(new FormData(form));
    if ('registration' in values)values.registration=values.registration.trim().toUpperCase();
    if (revisionMode) {
      const km=Number(values.lastRevisionKm), interval=Number(values.revisionIntervalKm);
      values.revisionKm=values.lastRevisionKm!==''&&values.revisionIntervalKm!==''&&interval>0 ? String(km+interval) : '';
      values.revisionDate=typeof calculateNextRevisionDate==='function'?calculateNextRevisionDate(values.lastRevisionDate,values.revisionIntervalMonths):'';
    }
    d.vehicle={...getVehicle(),...values};save();alert('Datele au fost salvate.');menu();
  }
  function identity(){
    page('Date de identificare', `<form id="ns19Form">${fields(null,[['registration','Număr de înmatriculare','text'],['brand','Marcă / model','text']])}
      <label>Serie șasiu (VIN)</label><input name="vin" maxlength="17" autocomplete="off" autocapitalize="characters" value="${e(getVehicle().vin||'')}">
      <button class="q" type="button" id="ns19CopyVin">Copiază VIN</button><button class="p">Salvează</button></form>`,menu);
    document.getElementById('ns19CopyVin').onclick=async()=>{
      const vin=document.querySelector('#ns19Form [name="vin"]').value.replace(/\s/g,'').toUpperCase();
      if(!vin)return alert('Introdu seria VIN.');
      try{await navigator.clipboard.writeText(vin);alert('VIN copiat.')}catch(_){alert('Copiere indisponibilă. Selectează VIN manual.')}
    };
    document.getElementById('ns19Form').onsubmit=ev=>{
      ev.preventDefault();const v=ev.target.elements.namedItem('vin');v.value=v.value.replace(/\s/g,'').toUpperCase();
      if(v.value&&!/^[A-HJ-NPR-Z0-9]{17}$/.test(v.value))return alert('VIN trebuie să conțină 17 caractere valide, fără I, O sau Q.');
      saveVehicleFrom(ev.target,false)
    };
  }
  function revision(){
    page('Revizie ulei și filtre', `<form id="ns19Form">${fields(null,[['lastRevisionDate','Ultima revizie – data','date'],['lastRevisionKm','Ultima revizie – kilometraj','number'],['revisionIntervalKm','Interval revizie – km','number'],['revisionIntervalMonths','Interval revizie – luni','number']])}<div id="ns19RevisionComputed" class="ns19-card"></div><button class="p">Salvează</button></form>`, menu);
    const f=document.getElementById('ns19Form');
    function refresh(){
      const a=f.elements,days=typeof calculateNextRevisionDate==='function'?calculateNextRevisionDate(a.lastRevisionDate.value,a.revisionIntervalMonths.value):'';
      const km=Number(a.lastRevisionKm.value)+Number(a.revisionIntervalKm.value);
      document.getElementById('ns19RevisionComputed').innerHTML=`<b>Următoarea revizie</b><div>Data: ${e(days||'necalculată')}</div><div>Kilometraj: ${a.lastRevisionKm.value!==''&&a.revisionIntervalKm.value!==''&&Number(a.revisionIntervalKm.value)>0?e(km)+' km':'necalculat'}</div>`;
    }
    f.addEventListener('input',refresh);refresh();f.onsubmit=ev=>{ev.preventDefault();saveVehicleFrom(ev.target,true)};
  }
  function notifications(){
    page('Notificări', '<p class="ns19-note">Notificările scadențelor rămân gestionate de modulul existent.</p><button class="p" id="ns19Enable">Activează notificările Android</button>',menu);
    document.getElementById('ns19Enable').onclick=()=>{if(typeof enableDueNotifications==='function')enableDueNotifications()};
  }
  async function documents(){
    page('Documente vehicul','<p class="ns19-note">Se încarcă documentele…</p>',menu);
    let h='';
    for(const [key,title,hasExpiry] of TYPES){
      const doc=await docGet(key),back=await docGet(backKey(key));
      const due=hasExpiry?getVehicle()[key]:'';
      h+=`<button class="ns19-menu" data-doc="${key}">${e(title)}<small class="ns19-status">${doc?e(doc.name):'Niciun document atașat'}${back?' · Verso atașat':''}${due?' · Expiră: '+e(due):''}</small></button>`;
    }
    const container=document.getElementById('ns19Panel');if(!container)return;
    container.innerHTML='<p class="ns19-note">Selectează documentul pentru încărcare, fotografiere sau vizualizare.</p>'+h;
    container.querySelectorAll('[data-doc]').forEach(b=>b.onclick=()=>openDocument(b.dataset.doc,false));
  }
  async function extraList(){
    page('Alte documente','<p class="ns19-note">Documente suplimentare, cu denumire și expirare opțională.</p><button class="p" id="ns19Add">+ Adaugă document</button><div id="ns19Items"></div>',menu);
    document.getElementById('ns19Add').onclick=()=>extraEdit();
    const list=document.getElementById('ns19Items');
    for(const x of otherList()){
      const doc=await docGet('extra:'+x.id);
      const b=document.createElement('button');b.className='ns19-menu';b.textContent=x.title;
      const s=document.createElement('small');s.className='ns19-status';s.textContent=[doc?doc.name:'Niciun fișier atașat',x.expiry?'Expiră: '+x.expiry:''].filter(Boolean).join(' · ');b.appendChild(s);
      b.onclick=()=>openDocument('extra:'+x.id,true);list.appendChild(b);
    }
  }
  function extraEdit(x=null){
    page(x?'Editează document':'Adaugă document',`<form id="ns19ExtraForm"><label>Denumire document</label><input required name="title" maxlength="100" value="${e(x?.title||'')}"><label>Data expirării (opțional)</label><input name="expiry" type="date" value="${e(x?.expiry||'')}"><button class="p">Salvează</button></form>`,extraList);
    document.getElementById('ns19ExtraForm').onsubmit=ev=>{
      ev.preventDefault();const values=Object.fromEntries(new FormData(ev.target));if(!values.title.trim())return;
      if(x){x.title=values.title.trim();x.expiry=values.expiry||'';}
      else {const id=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);otherList().push({id,title:values.title.trim(),expiry:values.expiry||''})}
      save();extraList();
    };
  }
  async function openDocument(key,extra){
    const obj=extra?otherList().find(x=>'extra:'+x.id===key):TYPES.find(t=>t[0]===key);
    if(!obj)return;
    const title=extra?obj.title:obj[1],hasExpiry=extra?true:obj[2],expiry=extra?obj.expiry:getVehicle()[key];
    const front=await docGet(key),back=await docGet(backKey(key)),isPdf=front?.type==='application/pdf';
    const body=`<p class="ns19-note">Fotografiile se salvează separat pentru față și verso. PDF-ul rămâne un document integral.</p>
      ${hasExpiry?`<label>Data expirării ${extra?'(opțional)':''}</label><input id="ns19Expiry" type="date" value="${e(expiry||'')}">`:''}
      <div class="ns19-card"><b>Document principal ${isPdf?'– PDF integral':'/ Față'}</b><small class="ns19-status">${front?e(front.name):'Neatașat'}</small>
        <button class="q" id="ns19File">Încarcă fotografie (JPG / PNG)</button>
        <button class="q" id="ns19Camera">Fotografiază fața</button>
        <button class="q" id="ns19Pdf">Încarcă PDF integral</button>
        ${front?'<button class="q" id="ns19ViewFront">Vizualizează / Zoom</button><button class="q" id="ns19DeleteFront">Șterge fișierul</button>':''}</div>
      ${!isPdf?`<div class="ns19-card"><b>Verso (fotografie)</b><small class="ns19-status">${back?e(back.name):'Neatașat'}</small>
        <button class="q" id="ns19BackFile">Încarcă fotografie verso</button><button class="q" id="ns19BackCamera">Fotografiază verso</button>
        ${back?'<button class="q" id="ns19ViewBack">Vizualizează / Zoom</button><button class="q" id="ns19DeleteBack">Șterge verso</button>':''}</div>`:''}
      ${extra?'<button class="q" id="ns19Rename">Modifică denumirea</button><button class="q" id="ns19DeleteEntry">Șterge documentul din listă</button>':''}`;
    page(title,body,extra?extraList:documents);
    const wire=(id,fn)=>{const b=document.getElementById(id);if(b)b.onclick=fn;};
    if(hasExpiry){document.getElementById('ns19Expiry').onchange=ev=>{
      if(extra)obj.expiry=ev.target.value;
      else getVehicle()[key]=ev.target.value;
      save();
    }}
    wire('ns19File',()=>pickFile(key,'front','photo',extra));wire('ns19Camera',()=>pickFile(key,'front','camera',extra));
    wire('ns19Pdf',()=>pickFile(key,'front','pdf',extra));
    wire('ns19BackFile',()=>pickFile(key,'back','photo',extra));wire('ns19BackCamera',()=>pickFile(key,'back','camera',extra));
    wire('ns19ViewFront',()=>previewDoc(key));wire('ns19ViewBack',()=>previewDoc(backKey(key)));
    wire('ns19DeleteFront',()=>removeFile(key,extra));wire('ns19DeleteBack',()=>removeFile(backKey(key),extra));
    wire('ns19Rename',()=>extraEdit(obj));
    wire('ns19DeleteEntry',async()=>{if(!confirm('Ștergi documentul suplimentar și toate fișierele lui?'))return;await docDelete(key);await docDelete(backKey(key));d.vehicleAdditionalDocs=otherList().filter(x=>x!==obj);save();extraList()});
  }
  function pickFile(key,side,mode,extra){
    const input=document.createElement('input');input.type='file';
    input.accept=mode==='pdf'?'application/pdf,.pdf':'image/jpeg,image/png,image/*';
    if(mode==='camera')input.setAttribute('capture','environment');
    input.onchange=async()=>{
      const file=input.files?.[0];if(!file)return;
      const isPdf=file.type==='application/pdf'||/\.pdf$/i.test(file.name);
      const isPhoto=/^image\/(jpeg|png)$/.test(file.type);
      if(mode==='pdf'&&!isPdf||mode!=='pdf'&&!isPhoto){alert('Selectează un fișier JPG, PNG sau PDF, după opțiune.');return}
      try{
        const storageKey=side==='back'?backKey(key):key;
        await docPut(storageKey,{name:file.name,type:isPdf?'application/pdf':file.type,blob:file,updated:new Date().toISOString()});
        if(isPdf)await docDelete(backKey(key));
        await openDocument(key,extra);
      }catch(err){alert('Documentul nu a putut fi salvat: '+err.message)}
    };
    input.click();
  }
  async function removeFile(storageKey,extra){
    if(!confirm('Ștergi fișierul atașat?'))return;
    await docDelete(storageKey);await openDocument(storageKey.replace(/::verso$/,''),extra);
  }
  async function previewDoc(storageKey){
    const doc=await docGet(storageKey);if(!doc)return;
    css();clearUrls();
    const pdf=doc.type==='application/pdf';
    if(pdf&&!window.pdfjsLib){alert('Modulul PDF.js local nu este disponibil.');return}
    const popup=document.createElement('div');popup.className='ns19-preview';popup.id='ns19Preview';
    popup.innerHTML=`<div class="ns19-preview-bar"><b style="flex:1;max-width:50%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e(doc.name)}</b><button id="ns19Minus" class="q">−</button><span class="ns19-counter" id="ns19Zoom">100%</span><button id="ns19Plus" class="q">+</button><button id="ns19Reset" class="q">Reset</button><button id="ns19Exit" class="q">✕</button></div><div id="ns19Stage" class="ns19-viewbox"></div><div class="ns19-preview-bar"><button id="ns19Share" class="q" style="flex:1">Deschide / partajează extern</button></div>`;
    document.body.appendChild(popup);
    const stage=popup.querySelector('#ns19Stage');
    stage.style.cssText+=';display:block;position:relative;overflow:hidden;touch-action:none';
    const media=document.createElement('div');media.style.cssText='position:absolute;left:0;top:0;transform-origin:top left;will-change:transform';
    stage.appendChild(media);
    let scale=1,dx=0,dy=0,lastTouch=0,pointers=new Map(),oldDistance=0,oldMid=null;
    let baseWidth=0,baseHeight=0;
    try{
      if(pdf){
        window.pdfjsLib.GlobalWorkerOptions.workerSrc='pdfjs/pdf.worker.min.js';
        const pdfData=new Uint8Array(await doc.blob.arrayBuffer());
        const instance=await window.pdfjsLib.getDocument({data:pdfData}).promise;
        const availableWidth=Math.max(250,stage.clientWidth-20),density=Math.min(2,window.devicePixelRatio||1);
        media.style.cssText+=';background:transparent;padding:8px 0';
        for(let pageNo=1;pageNo<=instance.numPages;pageNo++){
          const page=await instance.getPage(pageNo);
          const raw=page.getViewport({scale:1});const factor=Math.min(1.6,availableWidth/raw.width);
          const cssWidth=raw.width*factor,cssHeight=raw.height*factor;
          const viewport=page.getViewport({scale:factor*density});
          const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
          canvas.style.cssText='display:block;margin:0 auto 9px;background:white;box-shadow:0 1px 5px #999';
          canvas.style.width=cssWidth+'px';canvas.style.height=cssHeight+'px';
          media.appendChild(canvas);await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
          baseWidth=Math.max(baseWidth,cssWidth);baseHeight+=cssHeight+9;
        }
        media.style.width=Math.ceil(baseWidth+12)+'px';
      }else{
        const img=document.createElement('img');img.alt=doc.name;img.draggable=false;img.src=url(doc.blob);
        media.appendChild(img);
        await new Promise((resolve,reject)=>{if(img.complete&&img.naturalWidth)return resolve();img.onload=resolve;img.onerror=reject});
        const factor=Math.min((stage.clientWidth-16)/img.naturalWidth,(stage.clientHeight-16)/img.naturalHeight,1);
        baseWidth=img.naturalWidth*factor;baseHeight=img.naturalHeight*factor;
        img.style.cssText='display:block;max-width:none;max-height:none;width:'+baseWidth+'px;height:'+baseHeight+'px;touch-action:none';
      }
      dx=(stage.clientWidth-baseWidth)/2;dy=pdf?8:Math.max(8,(stage.clientHeight-baseHeight)/2);
      function render(){scale=Math.min(8,Math.max(.5,scale));media.style.transform=`translate(${dx}px,${dy}px) scale(${scale})`;popup.querySelector('#ns19Zoom').textContent=Math.round(scale*100)+'%';}
      function setZoom(v){scale=Math.min(8,Math.max(.5,v));if(scale===1){dx=(stage.clientWidth-baseWidth)/2;dy=pdf?8:Math.max(8,(stage.clientHeight-baseHeight)/2)}render()}
      popup.querySelector('#ns19Minus').onclick=()=>setZoom(scale/1.35);
      popup.querySelector('#ns19Plus').onclick=()=>setZoom(scale*1.35);
      popup.querySelector('#ns19Reset').onclick=()=>setZoom(1);
      popup.querySelector('#ns19Exit').onclick=()=>{popup.remove();clearUrls()};
      popup.querySelector('#ns19Share').onclick=async()=>{if(typeof saveFile==='function')await saveFile(doc.name,new Uint8Array(await doc.blob.arrayBuffer()),doc.type)};
      stage.addEventListener('pointerdown',ev=>{stage.setPointerCapture(ev.pointerId);pointers.set(ev.pointerId,[ev.clientX,ev.clientY]);if(pointers.size===2){const ps=[...pointers.values()];oldDistance=Math.hypot(ps[1][0]-ps[0][0],ps[1][1]-ps[0][1]);oldMid=[(ps[0][0]+ps[1][0])/2,(ps[0][1]+ps[1][1])/2]} });
      stage.addEventListener('pointermove',ev=>{if(!pointers.has(ev.pointerId))return;const prev=pointers.get(ev.pointerId);pointers.set(ev.pointerId,[ev.clientX,ev.clientY]);if(pointers.size===1){dx+=ev.clientX-prev[0];dy+=ev.clientY-prev[1];render()}else if(pointers.size===2){const ps=[...pointers.values()],distance=Math.hypot(ps[1][0]-ps[0][0],ps[1][1]-ps[0][1]);const mid=[(ps[0][0]+ps[1][0])/2,(ps[0][1]+ps[1][1])/2];if(oldDistance)scale*=distance/oldDistance;if(oldMid){dx+=mid[0]-oldMid[0];dy+=mid[1]-oldMid[1]}oldDistance=distance;oldMid=mid;render()}});
      const up=ev=>{pointers.delete(ev.pointerId);oldDistance=0;oldMid=null};stage.addEventListener('pointerup',up);stage.addEventListener('pointercancel',up);
      stage.addEventListener('dblclick',()=>setZoom(scale<1.5?2:1));
      stage.addEventListener('touchend',ev=>{if(ev.touches.length)return;const now=Date.now();if(now-lastTouch<300)setZoom(scale<1.5?2:1);lastTouch=now},{passive:true});
      stage.addEventListener('wheel',ev=>{ev.preventDefault();setZoom(scale*(ev.deltaY<0?1.15:1/1.15))},{passive:false});
      render();
    }catch(err){popup.remove();clearUrls();alert('Nu s-a putut deschide documentul: '+err.message)}
  }
  // Unlike the 1.3.16 restore routine, this accepts document front/back and
  // additional documents while validating all keys before touching IndexedDB.
  function restore19(){
    if(!confirm('Restaurarea va înlocui înregistrările actuale. Ai o copie de siguranță?'))return;
    const input=document.createElement('input');input.type='file';input.accept='.json,application/json';
    input.onchange=async()=>{
      const file=input.files?.[0];if(!file)return;
      try{
        const z=JSON.parse(await file.text());
        if(z.app!=='foaie-parcurs'||!z.data||!Array.isArray(z.data.trips)||!Array.isArray(z.data.fuel)||!Array.isArray(z.data.expenses))throw Error('Backup invalid');
        const valid=new Set(TYPES.map(t=>t[0]));
        const extraIds=new Set((z.data.vehicleAdditionalDocs||[]).map(x=>String(x.id)));
        const staged=[];
        for(const [key,x] of Object.entries(z.vehicleDocuments||{})){
          const base=key.replace(/::verso$/,'');
          if(!(valid.has(base)||(base.startsWith('extra:')&&extraIds.has(base.slice(6)))))throw Error('Cheie document necunoscută: '+key);
          if(!x.data?.startsWith('data:'))throw Error('Document invalid în backup: '+key);
          const res=await fetch(x.data);staged.push([key,{name:x.name,type:x.type,updated:x.updated,blob:await res.blob()}]);
        }
        for(const key of await docList())await docDelete(key);
        for(const [key,obj] of staged)await docPut(key,obj);
        d=z.data;d.places=typeof uniquePlaces==='function'?uniquePlaces(d.places||[]):(d.places||[]);
        d.purposes=Array.isArray(d.purposes)?d.purposes.filter(x=>typeof legacyPurposes==='undefined'||!legacyPurposes.has(x)):[];
        d.purposeFromOptions=d.purposeFromOptions||[];d.purposeToOptions=d.purposeToOptions||[];
        d.vehicleAdditionalDocs=d.vehicleAdditionalDocs||[];
        save();alert('Restaurare finalizată.');
      }catch(err){alert('Restaurarea a eșuat: '+err.message)}
    };input.click();
  }
  // Work with the current data objects; preserve original external app routes.
  window.vehicleDetails=menu;
  window.restore=restore19;
  window.ns19Version=APP;
})();
