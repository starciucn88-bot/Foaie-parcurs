/* APK NS AutoBook 1.3.19 - Vehicle documents and separated menus.
   Overlay designed for the existing 1.3.x indexedDB('ns-autobook-documents')
   and data variable `d`. It does NOT change the storage key or erase data.
*/
(function () {
  'use strict';
  const APP = 'NS AutoBook 1.3.20';
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
    const edit=!!x;
    const body=`<form id="ns19ExtraForm">
      <label>Denumire document</label><input required name="title" maxlength="100" value="${e(x?.title||'')}">
      <label>Data expirării (opțional)</label><input name="expiry" type="date" value="${e(x?.expiry||'')}">
      <div class="ns19-card"><b>Document propriu-zis</b>
        <p class="ns19-note">Încarcă direct un PDF complet sau o fotografie JPG/PNG. Poți și fotografia documentul.</p>
        <label>Încarcă document (PDF / JPG / PNG)</label>
        <input id="ns20MainFile" type="file" accept="application/pdf,.pdf,image/jpeg,image/png">
        <button type="button" class="q" id="ns20Camera">📷 Fotografiază documentul</button>
        <input id="ns20CameraFile" style="display:none" type="file" accept="image/*" capture="environment">
        <small id="ns20MainStatus" class="ns19-status">${edit?'Poți păstra documentul existent sau încărca altul.':'Fișierul poate fi selectat acum.'}</small>
      </div>
      <div class="ns19-card" id="ns20BackBox"><b>Verso (opțional, numai pentru fotografii)</b>
        <label>Încarcă fotografia verso</label><input id="ns20BackFile" type="file" accept="image/jpeg,image/png">
        <button type="button" class="q" id="ns20CameraBack">📷 Fotografiază verso</button>
        <input id="ns20CameraBackFile" style="display:none" type="file" accept="image/*" capture="environment">
        <small id="ns20BackStatus" class="ns19-status">Fața și verso se păstrează ca două fotografii separate.</small>
      </div>
      <button class="p" type="submit">Salvează</button>
    </form>`;
    page(edit?'Editează document':'Adaugă document',body,extraList);
    let front=null,back=null;
    const main=document.getElementById('ns20MainFile'),mainCam=document.getElementById('ns20CameraFile');
    const reverse=document.getElementById('ns20BackFile'),backCam=document.getElementById('ns20CameraBackFile');
    const isPdf=f=>f&&(f.type==='application/pdf'||/\.pdf$/i.test(f.name));
    const validMain=f=>!f||isPdf(f)||/^image\/(jpeg|png)$/.test(f.type);
    const validPhoto=f=>!f||/^image\/(jpeg|png)$/.test(f.type);
    function mainSet(file){
      if(!validMain(file)){alert('Selectează PDF, JPG sau PNG.');return}
      front=file||null;
      document.getElementById('ns20MainStatus').textContent=front?'Selectat: '+front.name:'Niciun fișier nou selectat';
      const pdf=!!isPdf(front);document.getElementById('ns20BackBox').hidden=pdf;
      if(pdf){back=null;reverse.value='';backCam.value=''}
    }
    function backSet(file){
      if(!validPhoto(file)){alert('Verso trebuie să fie JPG sau PNG.');return}
      back=file||null;document.getElementById('ns20BackStatus').textContent=back?'Selectat: '+back.name:'Nicio fotografie verso selectată';
    }
    main.onchange=()=>mainSet(main.files?.[0]);mainCam.onchange=()=>mainSet(mainCam.files?.[0]);
    reverse.onchange=()=>backSet(reverse.files?.[0]);backCam.onchange=()=>backSet(backCam.files?.[0]);
    document.getElementById('ns20Camera').onclick=()=>mainCam.click();
    document.getElementById('ns20CameraBack').onclick=()=>backCam.click();
    document.getElementById('ns19ExtraForm').onsubmit=async ev=>{
      ev.preventDefault();const values=Object.fromEntries(new FormData(ev.target));
      if(!values.title?.trim())return;
      const id=edit?x.id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
      const key='extra:'+id;
      try{
        const existingFront=edit?await docGet(key):null;
        if(back&&(isPdf(front)||(!front&&existingFront?.type==='application/pdf'))){alert('Un PDF se atașează integral, fără verso separat.');return}
        if(front){await docPut(key,{name:front.name,type:isPdf(front)?'application/pdf':front.type,updated:new Date().toISOString(),blob:front});if(isPdf(front))await docDelete(backKey(key))}
        if(back){await docPut(backKey(key),{name:back.name,type:back.type,updated:new Date().toISOString(),blob:back})}
        if(edit){x.title=values.title.trim();x.expiry=values.expiry||''}
        else otherList().push({id,title:values.title.trim(),expiry:values.expiry||''});
        save();extraList();
      }catch(err){alert('Documentul nu a putut fi salvat: '+err.message)}
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
  window.ns20Version=APP;
})();


/* NS AutoBook 1.3.20: o singura importare, fara dubluri, doar DACIA B-95-SEP.
   Inregistrarile importate sunt editabile si apar in rapoartele existente. */
(function(){
 'use strict';
 const version='B95SEP_2021_2026_v1320';
 const FUEL=[["02.07.2021","BN/02.07.2021 204/204 OMVMaxx95","6","51.38","296.46","cash","2021 07 DACIA.xls",10],["03.11.2021","BN - 1119-00035 - 03.11.2021","2700","46.77","302.13","card_combustibil","2021 11 DACIA.xls",10],["19.11.2021","BN - 1153-00018 - 19.11.2021","3420","48.19","306.60","card_combustibil","2021 11 DACIA.xls",13],["03.12.2021","BN - 1149-00092 - 03.12.2021","3890","46.85","289.06","card_combustibil","2021 12 DACIA.xls",10],["20.12.2021","BN - 1166-00013 - 20.12.2021","4720","38.22","235.05","card_combustibil","2021 12 DACIA.xls",13],["23.12.2021","BN - 1169-00103 - 23.12.2021","5490","45.51","278.98","card_combustibil","2021 12 DACIA.xls",14],["14.01.2022","BN - 1209-00050 - 14.01.2022","5790","40.75","266.10","card_combustibil","2022 01 DACIA.xls",10],["27.01.2022","BN - 1204-00108 - 27.01.2022","6330","45.12","305.91","card_combustibil","2022 01 DACIA.xls",13],["08.02.2022","BN - 1236-00053 - 08.02.2022","7010","46.87","325.28","card_combustibil","2022 02 DACIA.xls",10],["25.02.2022","BN - 1234-00014 - 27.01.2022","7730","44.06","314.59","card_combustibil","2022 02 DACIA.xls",13],["14.03.2022","BN - 1358-00346 - 14.03.2022","8400","45.65","364.74","card_combustibil","2022 03 DACIA.xls",10],["31.03.2022","BN - 1359-00378 - 31.03.2022","9170","43.2","337.82","card_combustibil","2022 03 DACIA.xls",13],["18.04.2022","BN - 1398-00389 - 18.04.2022","9670","46.44","357.59","card_combustibil","2022 04 DACIA.xls",10],["20.04.2022","BN - 1724-00418 - 20.04.2022","10010","20.52","156.98","card_combustibil","2022 04 DACIA.xls",13],["26.04.2022","BN - 1385-00377 - 26.04.2022","10270","20.82","160.31","card_combustibil","2022 04 DACIA.xls",14],["04.05.2022","BN - 1414-00381 - 04.05.2022","10630","48.4","378.49","card_combustibil","2022 05 DACIA.xls",10],["19.05.2022","BN - 1321-00016 - 19.05.2022","11290","46.8","384.23","card_combustibil","2022 05 DACIA.xls",14],["01.06.2022","BN - 1354-00053 - 01.06.2022","11770","48.21","403.52","card_combustibil","2022 06 DACIA.xls",10],["14.06.2022","BN - 1367-00072 - 14.06.2022","12670","49.3","429.40","card_combustibil","2022 06 DACIA.xls",13],["24.06.2022","BN - 1363-00358 - 24.06.2022","13723","46.88","408.32","card_combustibil","2022 06 DACIA.xls",14],["01.07.2022","BN - 1386-00076 - 01.07.2022","14480","20.4","190.94","card_combustibil","2022 07 DACIA.xls",10],["06.07.2022","BN - 1391-00008 - 06.07.2022","14660","48.7","424.18","card_combustibil","2022 07 DACIA.xls",13],["15.07.2022","BN - 1811-00311 - 15.07.2022","15430","49.15","420.72","card_combustibil","2022 07 DACIA.xls",14],["22.07.2022","BN - 1388-00130 - 22.07.2023","16040","46.33","392.88","card_combustibil","2022 07 DACIA.xls",16],["01.08.2022","BN - 1398-00026 - 01.08.2022","16820","51.09","437.52","card_combustibil","2022 08 DACIA.xls",10],["18.08.2022","BN - 1435-00081 - 18.08.2022","18120","53.39","431.93","card_combustibil","2022 08 DACIA.xls",13],["02.09.2022","NF - 1449-00101 - 02.09.2022","18720","51.53","408.12","card_combustibil","2022 09 DACIA.xls",10],["16.09.2022","NF - 1444-00077 - 16.09.2022","19720","12.51","103.71","card_combustibil","2022 09 DACIA.xls",13],["20.09.2022","NF - 1468-00009 - 20.09.2022","19872","47.82","352.91","card_combustibil","2022 09 DACIA.xls",14],["26.09.2022","NF - 1455-00010 - 26.09.2022","20630","48.03","349.18","card_combustibil","2022 09 DACIA.xls",15],["10.10.2022","NF - 1469-00046 - 10.10.2022","21630","50.22","363.09","card_combustibil","2022 10 DACIA.xls",10],["21.10.2022","NF - 1480-00121 - 21.10.2022","22230","47.79","358.90","card_combustibil","2022 10 DACIA.xls",11],["04.11.2022","NF - 1514-00074 - 04.11.2022","22830","34.48","265.15","card_combustibil","2022 11 DACIA.xls",10],["18.11.2022","NF - 1508-00087 - 18.11.2022","23430","33.61","261.15","card_combustibil","2022 11 DACIA.xls",11],["25.11.2022","NF - 1516-00135 - 25.11.2022","23730","42.79","322.64","card_combustibil","2022 11 DACIA.xls",13],["02.12.2022","NF - 1542-00039 - 02.12.2022","23910","31.11","228.86","card_combustibil","2022 12 DACIA.xls",10],["06.12.2022","NF - 1615-00101 - 06.12.2022","24100","46.56","332.58","card_combustibil","2022 12 DACIA.xls",11],["17.12.2022","NF - 1645-00075 - 17.12.2022","24950","39.22","261.99","card_combustibil","2022 12 DACIA.xls",12],["23.12.2022","NF - 1544-00035 - 23.12.2022","25650","37.06","243.85","card_combustibil","2022 12.2 DACIA.xls",13],["01.01.2023","NF - 1557-00014 - 01.01.2023","26100","46.17","296.87","card_combustibil","2023 01 DACIA.xls",10],["17.01.2023","NF - 1588-00060 - 17.01.2023","26920","46.47","301.13","card_combustibil","2023 01 DACIA.xls",11],["23.01.2023","NF - 1575-00011 - 23.01.2023","27220","31.24","205.56","card_combustibil","2023 01 DACIA.xls",12],["30.01.2023","NF - 1603-00010 - 30.01.2023","28350","46.23","306.97","card_combustibil","2023 01 DACIA.xls",13],["01.02.2023","NF - 2012-00093 - 01.02.2023","28792","21.44","140.00","card_combustibil","2023 02 DACIA.xls",10],["07.02.2023","NF - 1591-00054 - 07.02.2023","29520","10.51","69.68","card_combustibil","2023 02 DACIA.xls",11],["10.02.2023","NF - 1596-00020 - 10.02.2023","29557","16.17","106.88","cash","2023 02 DACIA.xls",12],["12.02.2023","NF - 1594-00224 - 12.02.2023","29593","42.39","280.20","card_combustibil","2023 02 DACIA.xls",13],["17.02.2023","NF - 1621-00090 - 17.02.2023","30309","46.62","310.49","card_combustibil","2023 02 DACIA.xls",14],["21.02.2023","NF - 2036-00017 - 21.02.2023","30963","37.81","246.90","card_combustibil","2023 02 DACIA.xls",15],["06.03.2023","NF - 1724-00041 - 06.03.2023","31739","47.57","316.34","card_combustibil","2023 03 DACIA.xls",10],["17.03.2023","NF - 1631-00087 - 17.03.2023","32373","44.99","301.43","card_combustibil","2023 03 DACIA.xls",11],["31.03.2023","NF - 1666-00064 - 31.03.2023","32890","33.88","229.03","card_combustibil","2023 03 DACIA.xls",12],["07.04.2023","NF - 1674-00041 - 07.04.2023","33680","45.2","310.98","card_combustibil","2023 04 DACIA.xls",10],["13.04.2023","NF - 1678-00090 - 13.04.2023","34443","47.39","329.83","card_combustibil","2023 04 DACIA.xls",11],["20.04.2023","NF - 1770-00063 - 20.04.2023","34711","52.26","357.98","card_combustibil","2023 04 DACIA.xls",12],["02.05.2023","NF - 1679-00061 - 02.05.2023","35365","48.15","322.12","card_combustibil","2023 05 DACIA.xls",10],["16.05.2023","NF - 1693-00071 - 16.05.2023","36002","49.23","318.52","card_combustibil","2023 05 DACIA.xls",11],["22.05.2023","NF - 1699-00020 - 22.05.2023","36765","49.46","322.48","card_combustibil","2023 05 DACIA.xls",12],["29.05.2023","NF - 1621-00090 - 29.05.2023","37280","33.4","220.11","card_combustibil","2023 05 DACIA.xls",14],["31.05.2023","NF - 2036-00017 - 31.05.2023","38030","40.75","270.17","card_combustibil","2023 05 DACIA.xls",15],["09.06.2023","NF - 1738-00035 - 09.06.2023","38935","49.18","330.00","card_combustibil","2023 06 DACIA.xls",10],["16.06.2023","NF - 2149-00059 - 16.06.2023","39455","46.99","313.42","card_combustibil","2023 06 DACIA.xls",11],["17.06.2023","NF - 1699-00020 - 17.06.2023","39998","45.57","301.22","card_combustibil","2023 06 DACIA.xls",12],["23.06.2023","NF - 2160-00117 - 23.06.2023","40499","46.95","315.97","card_combustibil","2023 06 DACIA.xls",14],["30.06.2023","NF - 2167-00217 - 30.06.2023","41314","48.22","321.15","card_combustibil","2023 06 DACIA.xls",15],["07.07.2023","NF - 1962-00081 - 07.07.2023","42259","49.01","325.03","card_combustibil","2023 07 DACIA.xls",10],["18.07.2023","NF - 1995-00035 - 18.07.2023","42784","47.05","318.06","card_combustibil","2023 07 DACIA.xls",11],["22.07.2023","NF - 1977-00032 - 22.07.2023","43559","36.56","247.15","card_combustibil","2023 07 DACIA.xls",12],["28.07.2023","NF - 1769-00349 - 28.07.2023","44124","38.35","261.16","card_combustibil","2023 07 DACIA.xls",13],["02.08.2023","NF - 1774-00305 - 02.08.2023","44804","28.82","200.01","cash","2023 08 DACIA.xls",10],["07.08.2023","NF - 1779-00125 - 07.08.2023","45544","47.05","304.87","card_combustibil","2023 08 DACIA.xls",11],["18.08.2023","NF - 2108-00075 - 18.08.2023","46954","48.65","355.63","card_combustibil","2023 08 DACIA.xls",12],["28.08.2023","NF - 1988-00011 - 28.08.2023","46954","48.5","353.08","card_combustibil","2023 08 DACIA.xls",13],["01.09.2023","NF - 2018-00101 - 01.09.2023","47794","30.98","225.22","card_combustibil","2023 09 DACIA.xls",10],["17.09.2023","NF - 2034-00069 - 17.09.2023","48354","40.56","298.52","card_combustibil","2023 09 DACIA.xls",11],["25.09.2023","NF - 1985-00014 - 25.09.2023","48644","46.44","340.41","card_combustibil","2023 09 DACIA.xls",12],["02.10.2023","NF - 2049-00080 - 02.10.2023","49574","37.34","272.96","card_combustibil","2023 10 DACIA.xls",10],["09.10.2023","NF - 2056-00014 - 09.10.2023","49976","27.96","200.19","card_combustibil","2023 10 DACIA.xls",11],["15.10.2023","NF - 2062-00083 - 15.10.2023","50756","39.1","275.26","card_combustibil","2023 10 DACIA.xls",12],["23.10.2023","NF - 2070-00017 - 23.10.2023","51556","45.14","317.79","card_combustibil","2023 10 DACIA.xls",13],["29.10.2023","NF - 1863-00171 - 29.10.2023","52336","47.7","329.61","card_combustibil","2023 10 DACIA.xls",14],["06.11.2023","NF - 2293-00020 - 06.11.2023","53136","45.89","314.35","card_combustibil","2023 11 DACIA partial.xls",10],["16.11.2023","NF - 11881-00106 - 16.11.2023","54196","44.12","296.05","card_combustibil","2023 11 DACIA partial.xls",11],["23.11.2023","NF - 11681-00094 - 23.11.2023","54971","6.89","50.09","cash","2023 11 DACIA partial 2.xls",10],["23.11.2023","NF - 2310-00104 - 23.11.2023","54986","43.66","288.16","card_combustibil","2023 11 DACIA partial 2.xls",11],["27.11.2023","NF - 2105-00015 - 27.11.2023","55156","30.08","200.63","card_combustibil","2023 11 DACIA partial 2.xls",12],["14.12.2023","NF - 1909-00190 - 14.12.2023","56806","46.92","305.51","card_combustibil","2023 12 DACIA.xls",11],["20.12.2023","NF - 1915-00259 - 20.12.2023","57446","40.14","260.91","card_combustibil","2023 12 DACIA.xls",12],["08.01.2024","NF - 2147-00009 - 08.01.2024","58266","47.07","319.13","card_combustibil","2024 01 DACIA.xls",10],["15.01.2024","NF - 2154-00019 - 15.01.2024","58956","39.28","264.35","card_combustibil","2024 01 DACIA.xls",11],["21.01.2024","NF - 2160-00010 - 21.01.2024","59646","27.56","185.48","card_combustibil","2024 01 DACIA.xls",12],["25.01.2024","NF - 1951-00051 - 25.01.2024","60036","21.96","147.79","card_combustibil","2024 01 DACIA.xls",13],["05.02.2024","NF - 2147-00009 - 05.02.2024","60525","45.75","315.22","card_combustibil","2024 02 DACIA partial2.1.xls",10],["16.02.2024","NF - 1978-00125 - 16.02.2024","61635","","287.44","card_combustibil","2024 02 DACIA partial2.2.xls",12],["02.03.2024","NF - 2202-00061 - 02.03.2024","63285","44.5","322.18","card_combustibil","2024 03 DACIA.xls",10],["11.03.2024","NF - 2420-00018 - 11.03.2024","60903","43.85","312.21","card_combustibil","2024 03 DACIA.xls",11],["19.03.2024","NF - 2416-00018 - 19.03.2024","65115","48.31","345.90","card_combustibil","2024 03 DACIA.xls",12],["25.03.2024","NF - 2036-00041 - 25.03.2024","65965","48.89","347.61","card_combustibil","2024 03 DACIA.xls",13],["05.04.2024","factura fiscala TRT000029249 din 05.04.2024","66730","54.88","400.08","cash","2024 04 DACIA.xls",10],["15.04.2024","NF - 2246-00009 - 15.04.2024","67615","45.72","339.24","card_combustibil","2024 04 DACIA.xls",11],["19.04.2024","NF - 2046-00070 - 19.04.2024","68160","45.04","333.30","card_combustibil","2024 04 DACIA.xls",13],["26.04.2024","NF - 2466-00160 - 26.04.2024","68845","46.44","342.26","card_combustibil","2024 04 DACIA.xls",14],["29.04.2024","NF - 2193-00081 - 29.04.2024","69115","42.78","316.57","card_combustibil","2024 04 DACIA.xls",15],["07.05.2024","NF - 2477-00048 - 07.05.2024","69840","44.35","326.42","card_combustibil","2024 05 DACIA.xls",10],["17.05.2024","Bon fiscal nr.426 din 17.05.2024","71340","50.87","372.88","cash","2024 05 DACIA.xls",12],["27.05.2024","NF - 2497-00059 - 27.05.2024","72295","43.82","310.25","card_combustibil","2024 05 DACIA.xls",13],["04.06.2024","NF - 0331- - 04.06.2024","73155","51.96","389.18","cash","2024 06 DACIA.xls",10],["10.06.2024","NF - 2088-00120 - 10.06.2024","73740","52.71","365.81","card_combustibil","2024 06 DACIA.xls",11],["20.06.2024","NF - 2521-00086 - 20.06.2024","74370","41.56","288.84","card_combustibil","2024 06 DACIA.xls",12],["29.06.2024","NF - 2530-00089 - 29.06.2024","74875","49.87","378.51","card_combustibil","2024 06 DACIA.xls",13],["02.07.2024","NF - 2379-00083 - 02.07.2024","75290","21.84","162.71","card_combustibil","2024 07 DACIA.xls",11],["05.07.2024","NF - 2113-00154 - 05.07.2024","75395","36.85","276.38","card_combustibil","2024 07 DACIA.xls",12],["12.07.2024","NF - 2145-00077 - 12.07.2024","76040","34.55","279.16","card_combustibil","2024 07 DACIA.xls",13],["22.07.2024","NF - 2130-00091 - 22.07.2024","76955","43.53","324.73","card_combustibil","2024 07 DACIA.xls",14],["31.07.2024","NF - 2164-00073 - 31.07.2024","77905","45.07","332.17","card_combustibil","2024 07 DACIA.xls",15],["09.08.2024","NF - 2379-00083 - 09.08.2024","78620","37.98","279.91","card_combustibil","2024 08 DACIA.xls",11],["14.08.2024","NF - 2113-00154 - 14.08.2024","79195","51.87","386.43","card_combustibil","2024 08 DACIA.xls",12],["23.08.2024","NF - 2145-00077 - 23.08.2024","79840","48.81","353.87","card_combustibil","2024 08 DACIA.xls",13],["29.08.2024","NF - 2130-00091 - 29.08.2024","80110","44.94","328.96","card_combustibil","2024 08 DACIA.xls",15],["29.08.2024","NF - 2164-00073 - 29.08.2024","80722","40.66","294.38","card_combustibil","2024 08 DACIA.xls",16],["03.09.2024","NF - 2387-00023 - 03.09.2024","80722","38.52","279.27","card_combustibil","2024 09 DACIA.xls",11],["06.09.2024","NF - 2361-00096 - 06.09.2024","81527","42.58","303.60","card_combustibil","2024 09 DACIA.xls",12],["19.09.2024","NF - 2189-00059 - 19.09.2024","82512","48.55","300.06","card_combustibil","2024 09 DACIA.xls",13],["23.09.2024","NF - 2381-00034 - 23.09.2024","83052","27.91","207.37","card_combustibil","2024 09 DACIA.xls",14],["30.09.2024","NF - 2626-00052 - 30.09.2024","84007","32.87","224.83","card_combustibil","2024 09 DACIA.xls",15],["04.10.2024","NF - 2418-00087 - 04.10.2024","84122","45.71","321.80","card_combustibil","2024 10 DACIA.xls",11],["18.10.2024","NF - 2432-00029 - 18.10.2024","85502","28.46","204.06","card_combustibil","2024 10 DACIA.xls",12],["25.10.2024","NF - 2439-00107 - 25.10.2024","85787","25.75","183.19","card_combustibil","2024 10 DACIA.xls",14],["01.11.2024","NF - 2447-00063 - 01.11.2024","86342","25.08","197.38","card_combustibil","2024 11 DACIA.xls",11],["04.11.2024","NF - 2643-00067 - 04.11.2024","86882","20.62","145.58","card_combustibil","2024 11 DACIA.xls",14],["08.11.2024","NF - 2666-00046 - 08.11.2024","87167","26.12","184.15","card_combustibil","2024 11 DACIA.xls",15],["11.11.2024","NF - 2561-00021 - 11.11.2024","87437","33.23","236.93","card_combustibil","2024 11 DACIA.xls",16],["20.11.2024","NF - 2700-00355 - 20.11.2024","88267","39.21","296.04","cash","2024 11 DACIA.xls",17],["29.11.2024","NF - 2475-00208 - 29.11.2024","88832","25.48","200.02","cash","2024 11 DACIA.xls",18],["09.12.2024","NF - 734-00016 - 9.12.2024","89617","39.94","281.60","card_combustibil","2024 12 DACIA partial 1.xls",9],["13.12.2024","NF - 2489-00105 - 13.12.2024","89912","28.87","205.27","card_combustibil","2024 12 DACIA partial 1.xls",11],["18.12.2024","NF - 2743-00015 - 18.12.2024","90427","37.2","264.49","card_combustibil","2024 12 DACIA partial 1.xls",12],["20.12.2024","NF - 2496-00082 - 20.12.2024","90477","23.04","182.02","card_combustibil","2024 12 DACIA partial 2.xls",12],["08.01.2025","NF - 2714-00040 - 08.01.2025","89077","47.32","347.80","card_combustibil","2025 01 DACIA.xls",9],["13.01.2025","NF - 2521-00016 - 13.01.2025","89372","16.19","120.94","card_combustibil","2025 01 DACIA.xls",10],["20.01.2025","NF - 2528-00010 - 20.01.2025","89912","15.56","129.00","card_combustibil","2025 01 DACIA.xls",11],["27.01.2025","NF - 2477-00022 - 27.01.2025","90522","46.41","372.67","card_combustibil","2025 01 DACIA.xls",12],["31.01.2025","NF - 2642-00071 - 31.01.2025","90992","26.53","200.04","card_combustibil","2025 01 DACIA.xls",14],["31.01.2025","NF - 2642-00072 - 31.01.2025","90992","5.86","44.22","card_combustibil","2025 01 DACIA.xls",15],["03.02.2025","NF - 2714-00040 - 03.02.2025","93397","27.25","202.74","card_combustibil","2025 02 DACIA.xls",9],["10.02.2025","NF - 2521-00016 - 10.02.2025","93692","20.42","154.99","card_combustibil","2025 02 DACIA.xls",10],["12.02.2025","NF - 2528-00010 - 12.02.2025","93987","30.32","245.29","card_combustibil","2025 02 DACIA.xls",11],["17.02.2025","NF - 2477-00022 - 17.02.2025","94282","45.97","352.29","card_combustibil","2025 02 DACIA.xls",12],["21.02.2025","NF - 2477-00022 - 21.02.2025","94822","17.98","137.55","card_combustibil","2025 02 DACIA.xls",13],["03.03.2025","NF - 2570-00018 - 03.03.2025","94822","25.71","194.11","card_combustibil","2025 03 DACIA.xls",9],["05.03.2025","NF - 2421-00060 - 05.03.2025","95107","20.23","150.11","card_combustibil","2025 03 DACIA.xls",10],["07.03.2025","NF - 2677-00011 - 07.03.2025","95392","44.99","332.93","card_combustibil","2025 03 DACIA.xls",11],["10.03.2025","NF - 2810-00058 - 10.03.2025","95687","18.11","131.12","card_combustibil","2025 03 DACIA.xls",12],["14.03.2025","NF - 2581-00068 - 14.03.2025","95932","20.18","147.11","card_combustibil","2025 03 DACIA.xls",13],["24.03.2025","NF - 2591-00025 - 24.03.2025","95932","18.91","138.04","card_combustibil","2025 03 DACIA.xls",14],["27.03.2025","NF - 2874-00080 - 27.03.2025","96237","36.08","259.78","card_combustibil","2025 03 DACIA.xls",15],["07.04.2025","NF - 2605-00015 - 07.04.2025","96482","40.39","293.64","card_combustibil","2025 04 DACIA.xls",9],["14.04.2025","NF - 2612-00022 - 14.04.2025","97267","29.51","208.64","card_combustibil","2025 04 DACIA.xls",10],["17.04.2025","NF - 2826-00098 - 17.04.2025","97462","17.67","121.57","card_combustibil","2025 04 DACIA.xls",11],["25.04.2025","NF - 2623-00034 - 25.04.2025","97566","22.21","155.03","card_combustibil","2025 04 DACIA.xls",12],["28.04.2025","NF - 2906-00134 - 28.04.2025","97595","20.18","147.11","card_combustibil","2025 04 DACIA.xls",13],["02.05.2025","NF - 2630-00022 - 2.5.2025\nNF- 2647-00004- 2.5.2025","98115","52.24","364.64","card_combustibil","2025 05 DACIA.xls",9],["05.05.2025","NF - 2612-00022 - 05.05.2025","98365","23.48","160.13","card_combustibil","2025 05 DACIA.xls",11],["09.05.2025","NF - 2913-00199 - 09.05.2025","98655","45.81","317.92","card_combustibil","2025 05 DACIA.xls",12],["19.05.2025","NF - 2740-00052 - 19.05.2025","98905","26.97","187.71","card_combustibil","2025 05 DACIA.xls",13],["26.05.2025","NF - 2960-00107 - 26.05.2025","99445","35.84","251.60","card_combustibil","2025 05 DACIA.xls",14],["02.06.2025","NF - 2661-00023 - 02.06.2025","99735","21.21","150.38","card_combustibil","2025 06 DACIA.xls",9],["05.06.2025","NF - 2868-00073 - 05.06.2025","100035","39.5","280.06","card_combustibil","2025 06 DACIA.xls",10],["16.06.2025","NF - 2879-00019 - 16.06.2025","101155","34.08","268.90","card_combustibil","2025 06 DACIA.xls",11],["20.06.2025","NF - 2783-00073 - 20.06.2025","101430","16.9","123.44","card_combustibil","2025 06 DACIA.xls",13],["25.06.2025","NF - 2883-00327 - 25.06.2025","101735","45.08","327.30","cash","2025 06 DACIA.xls",14],["04.07.2025","NF - 2797-00045 - 04.07.2025","102310","52.1","373.04","card_combustibil","2025 07 DACIA.xls",9],["13.07.2025","NF - 2702-00067 - 13.07.2025","103135","42.52","334.63","card_combustibil","2025 07 DACIA.xls",10],["25.07.2025","NF - 2563-00715 - 25.07.2025","103980","32.18","241.67","card_personal","2025 07 DACIA.xls",11],["28.07.2025","NF - -00157 - 28.07.2025","104450","23.97","166.59","card_personal","2025 07 DACIA.xls",12],["05.08.2025","NF - 2925-00021 - 05.08.2025","105110","50.65","374.81","card_combustibil","2025 08 DACIA.xls",9],["18.08.2025","NF - 2739-00034 - 18.08.2025","105985","32.87","244.88","card_combustibil","2025 08 DACIA.xls",10],["01.09.2025","NF - 2925-00021 - 01.09.2025","105990","49.38","369.36","card_combustibil","2025 09 DACIA.xls",9],["05.09.2025","NF - 2739-00034 - 05.09.2025","106535","29.44","222.57","card_combustibil","2025 09 DACIA.xls",10],["15.09.2025","NF - 2563-00715 - 15.09.2025","107090","16.87","128.21","card_combustibil","2025 09 DACIA.xls",11],["22.09.2025","NF - -00157 - 22.09.2025","107640","47.49","362.82","card_combustibil","2025 09 DACIA.xls",12],["26.09.2025","NF - 2783-00073 - 26.09.2025","108185","35.67","272.31","card_combustibil","2025 09 DACIA.xls",13],["01.10.2025","NF - 0028-00035 - 01.10.2025","108475","25.96","195.48","card_combustibil","2025 10 DACIA.xls",9],["04.10.2025","NF - 2786-00035 - 04.10.2025","108760","14.15","106.69","card_combustibil","2025 10 DACIA.xls",10],["09.10.2025","NF - 0037-00137 - 09.10.2025","109035","35.6","263.80","card_combustibil","2025 10 DACIA.xls",12],["13.10.2025","NF - 2795-00028 - 13.10.2025","109325","44.06","327.81","card_combustibil","2025 10 DACIA.xls",13],["17.10.2025","NF - 3079-00091 - 17.10.2025","109620","24.26","177.34","card_combustibil","2025 10 DACIA.xls",14],["23.10.2025","NF - 0051-00014 - 23.10.2025","110410","48.29","353.00","card_combustibil","2025 10 DACIA.xls",16],["31.10.2025","NF - 2917-00038 - 31.10.2025","110970","40.84","307.53","card_combustibil","2025 10 DACIA.xls",17],["10.11.2025","NF - 2928-00013 - 10.11.2025","110965","48.8","371.37","card_combustibil","2025 11 DACIA.xls",9],["17.11.2025","NF - 3025-00068 - 17.11.2025","111755","42.9","323.90","card_combustibil","2025 11 DACIA.xls",10],["24.11.2025","NF - 2942-00008 - 24.11.2025","112075","41","313.65","card_combustibil","2025 11 DACIA.xls",11],["02.12.2025","NF - 2845-00013 - 02.12.2025","110965","47.3","361.37","card_combustibil","2025 12 DACIA.xls",9],["08.12.2025","NF - 3085-00086 - 08.12.2025","111750","46.56","349.20","card_combustibil","2025 12 DACIA.xls",10],["19.12.2025","NF - 2862-00059 - 19.12.2025","112355","43.12","316.57","card_combustibil","2025 12 DACIA.xls",11],["05.01.2026","NF - 2879-00037 - 05.01.2026","112625","41.66","318.28","card_combustibil","2026 01 DACIA.xls",9],["19.01.2026","NF - 2893-00015 - 19.01.2026","113175","41.33","320.72","card_combustibil","2026 01 DACIA.xls",10],["23.01.2026","NF - 0101-00024 - 23.01.2026","113470","29.82","229.61","card_combustibil","2026 01 DACIA.xls",11],["28.01.2026","NF - 0148-00088 - 28.01.2026","114003","44.08","339.42","card_combustibil","2026 01 DACIA.xls",12],["02.02.2026","NF - 2907-00011 - 02.02.2026","114290","43.92","343.89","card_combustibil","2026 02 DACIA.xls",9],["06.02.2026","NF - 3016-00046 - 06.02.2026","114580","45.31","354.78","card_combustibil","2026 02 DACIA.xls",10],["13.02.2026","NF - 2918-00084 - 13.02.2026","115185","17.51","137.80","card_combustibil","2026 02 DACIA.xls",11],["24.02.2026","NF - 0175-00091 - 24.02.2026","115758","42.71","337.41","card_combustibil","2026 02 DACIA.xls",12],["02.03.2026","NF - 2935-00028 - 02.03.2026","116600","37.6898","303.78","card_combustibil","2026 03 DACIA.xls",9],["09.03.2026","NF - 3047-00022 - 09.03.2026","117155","48.9204","406.04","card_combustibil","2026 03 DACIA.xls",10],["16.03.2026","NF - 0155-00035 - 16.03.2026","117960","42.1405","359.88","card_combustibil","2026 03 DACIA.xls",11],["24.03.2026","NF - 3062-00037 - 24.03.2026","118265","37.6403","347.42","card_combustibil","2026 03 DACIA.xls",13],["30.03.2026","NF - 0071-00029 - 30.03.2026","118895","43.9504","407.86","card_combustibil","2026 03 DACIA.xls",14],["06.04.2026","BF - 0216-00262 - 06.04.2026","119110","42.8695","390.97","card_personal","2026 04 DACIA.xls",9],["23.04.2026","NF - 0234-00044 - 23.04.2026","119750","46.7794","377.51","card_combustibil","2026 04 DACIA.xls",12],["29.04.2026","NF - 0240-00173 - 29.04.2026","120640","33.9002","295.61","card_combustibil","2026 04 DACIA.xls",14],["04.05.2026","BN - 2998-00020 - 04.05.2026","120665","44.46","401.03","card_combustibil","2026 05 DACIA .xls",9],["18.05.2026","BN - 3012-00018 - 18.05.2026","121215","44.9694","412.82","card_combustibil","2026 05 DACIA .xls",10],["28.05.2026","BN - 3127-00036 - 28.05.2026","122040","36.9504","357.68","card_combustibil","2026 05 DACIA .xls",11],["02.06.2026","NF - 0136-00020 - 02.06.2026","122315","46.5103","447.43","card_combustibil","2026 06 DACIA.xls",9],["15.06.2026","NF - 3060-00006 - 15.06.2026","122895","34.3701","301.77","card_combustibil","2026 06 DACIA.xls",10],["19.06.2026","NF - 0003-00082 - 19.06.2026","123206","34.3705","302.64","card_combustibil","2026 06 DACIA.xls",11],["26.06.2026","NF - 0010-00047 - 26.06.2026","123790","46.984","407.87","card_combustibil","2026 06 DACIA.xls",13],["03.07.2026","NF - 0304-00023 - 03.07.2026","124405","37.9303","326.96","card_combustibil","2026 07 DACIA.xls",9],["17.07.2026","NF - 0320-00171 - 17.07.2026","125485","36.2099","312.13","card_combustibil","2026 07 DACIA.xls",10],["23.07.2026","NF - 0326-00155 - 23.07.2026","126026","27.2502","241.71","card_combustibil","2026 07 DACIA.xls",11],["27.07.2026","NF - 0119-00118 - 27.07.2026","126333","50.0298","453.27","card_combustibil","2026 07 DACIA.xls",12],["31.07.2026","NF - 0045-00132 - 31.07.2026","126560","28.9097","272.33","card_combustibil","2026 07 DACIA.xls",13],["03.08.2026","NF - 0337-00166 - 03.08.2026","126835","35.87","337.54","card_combustibil","2026 08 DACIA.xls",9],["10.08.2026","NF - 0055-00030 - 10.08.2026","127375","30.5902","288.16","card_combustibil","2026 08 DACIA.xls",10],["14.08.2026","NF - 0059-00161 - 14.08.2026","127646","36.3605","347.97","card_combustibil","2026 08 DACIA.xls",11],["20.08.2026","NF - 0354-00160 - 20.08.2026","128223","39.27","373.46","card_combustibil","2026 08 DACIA.xls",13],["01.09.2026","NF - 0077-00010 - 01.09.2026","128485","41.9101","401.08","card_combustibil","2026 09 DACIA.xls",9],["08.09.2026","NF - 0085-00006 - 08.09.2026","129020","32.1001","314.26","card_combustibil","2026 09 DACIA.xls",10],["14.09.2026","NF - 0091-00023 - 14.09.2026","129551","42.6399","425.12","card_combustibil","2026 09 DACIA.xls",11],["21.09.2026","NF - 0386-00133 - 21.09.2026","130118","45.87","455.49","card_combustibil","2026 09 DACIA.xls",13],["29.09.2026","NF - 0198-00043 - 29.09.2026","130870","33.64","336.06","card_combustibil","2026 09 DACIA.xls",14]];
 const EXPENSES=[["02.07.2021","Lichid de parbriz","BN/02.07.2021 552/552 OMV SOL PARBR VARA 3L","6","24.99","cash","2021 07 DACIA.xls",11],["03.11.2021","Anvelope de iarnă","Factura FF TAP 361861 - 03.11.2021","2700","1087.33","card_combustibil","2021 11 DACIA.xls",11],["10.11.2021","Schimbare anvelope","Factura SB MEC 941970 - 10.11.2021","3000","140.00","cash","2021 11 DACIA.xls",12],["16.05.2022","Schimb anvelope","BF - 42051616 - 16.05.2022/ Factura SB MEC 943959 - 16.05.2022","11050","120.00","cash","2022 05 DACIA.xls",13],["29.06.2022","Revizie","FF Seria TA22-1 Nr. 221192 - 29.06.2022","14356","778.31","card_combustibil","2022 06 DACIA.xls",15],["17.07.2022","Rovinietă","plata online comanda nr. 4127:CNADNR0263522404","15670","138.40","cash","2022 07 DACIA.xls",15],["01.11.2022","Schimb anvelope","FF SB MEC 646036","22590","140.00","cash","2022 11 01 DACIA.xls",10],["18.11.2022","lichid parbriz","Factura - 1508-00223 - 18.11.2022","23430","44.99","cash","2022 11 DACIA.xls",12],["30.01.2023","Lichid parbriz","Factura - 1603-00003 - 30.01.2023","28350","44.99","cash","2023 01 DACIA.xls",14],["26.05.2023","2 Anvelope vară","Factura Serie: SB SGM Nr:1132976","37170","890.00","card_combustibil","2023 05 DACIA.xls",13],["23.06.2023","Revizie tehnică","Factura Serie: VS ANA F5 Nr:1032266","40387","1453.59","card_combustibil","2023 06 DACIA.xls",13],["16.11.2023","Schimb anvelope","fFactura nr. 1033114 seria VS ANA F5 din 16.11.2023","54213","140.00","cash","2023 11 DACIA partial.xls",12],["08.02.2024","Revizie 60.000 km","FF nr. 1033476 seria VS ANA F5 din 8.2.2024","60903","397.54","cash","2024 02 DACIA partial2.1.xls",11],["16.04.2024","Schimb anvelope + directie","factura fiscala seria VS ANA F5 nr. 1033825 din 16.04.2024","67903","310.00","cash","2024 04 DACIA.xls",12],["16.05.2024","revizie tehnică","factura fiscala seria VS ANA F5 nr. 1033992 din 16.05.2024","71170","875.01","cash","2024 05 DACIA.xls",11],["02.07.2024","ITP","Factura AS 0164","75290","230.00","cash","2024 07 DACIA.xls",10],["26.08.2024","rovinieta","factura nr 2400340399 - 26.06.2024","79840","139.31","cash","2024 08 DACIA.xls",14],["30.08.2024","lampa ceata, stergatoare parbriz","BF - 0016 - 30.08.2024","","324.00","cash","2024 08 DACIA.xls",17],["21.10.2024","lichid parpbriz","factura 20270821 din 21.10.2024","85502","30.90","cash","2024 10 DACIA.xls",13],["01.11.2024","vulcanizare","Factura - -000005 - 01.11.2024","86342","40.00","cash","2024 11 DACIA.xls",12],["01.11.2024","spalare","Factura - -000002 - 01.11.2024","86342","70.00","cash","2024 11 DACIA.xls",13],["09.12.2024","Reparatie","Factura ROS JR 24 nr. 996 - 9.12.2024","89372","5389.29","card_combustibil","2024 12 DACIA partial 1.xls",10],["27.01.2025","Lichid parbriz","Factura - 2746-00282 - 27.01.2025","90602","59.98","card_personal","2025 01 DACIA.xls",13],["03.05.2025","schimb anvelope","BF - 00005","98120","250.00","cash","2025 05 DACIA.xls",10],["20.06.2025","Revizie anuala auto","Factura - ROS JR 25-00531 - 20.06.2025","","819.82","card_combustibil","2025 06 DACIA.xls",12],["25.08.2025","rovinieta 1 buc","Factura seria CC-WEB nr.  2500419150","106000","142.16","card_personal","2025 08 DACIA.xls",11],["04.10.2025","schimb anvelope","Factura - -00006 - 04.10.2025","108755","220.00","cash","2025 10 DACIA.xls",11],["17.10.2025","Lichid parbriz","Factura - 3079-00308 - 17.10.2025","109620","31.99","cash","2025 10 DACIA.xls",15],["24.03.2026","Reparatie","Factura - ROS JR 26-205 - 24.03.2026","118267","1720.99","card_combustibil","2026 03 DACIA.xls",12],["16.04.2026","schimb anvelope","BF - -00005 - 16.04.2026","119140","200.00","cash","2026 04 DACIA.xls",10],["20.04.2026","Reparatie","Factura - ROS JR 26-268 - 20.04.2026","119447","3214.37","card_combustibil","2026 04 DACIA.xls",11],["23.04.2026","Reparatie","Factura - CHE-532 - 23.04.2026","119752","800.00","card_combustibil","2026 04 DACIA.xls",13],["22.06.2026","Revizie anuala auto + ITP","Factura - ROS JR 26-485 - 22.06.2026","123523","1038.41","card_combustibil","2026 06 DACIA.xls",12],["20.08.2026","Reparatie ambreaj","Factura - EURO-19303 - 20.08.2026","","5576.16","card_combustibil","2026 08 DACIA.xls",12],["31.08.2026","Rovinieta","Factura - CC-WEB-2600516487 - 31.08.2026","","262.20","card_personal","2026 08 DACIA.xls",14],["18.09.2026","Acumulator auto","BF - -002508 - 18.09.2026","","731.54","card_personal","2026 09 DACIA.xls",12]];
 const norm=x=>String(x??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
 const cents=x=>Math.round((Number(String(x??'0').replace(',','.'))||0)*100);
 const dkey=x=>typeof dateKey==='function'?dateKey(x):String(x||'');
 const numVal=x=>Number(String(x??'0').replace(',','.'))||0;
 function sameFuel(a,b){
   if(a.importId&&a.importId===b.importId)return true;
   if(dkey(a.date)!==dkey(b.date)||cents(a.value)!==cents(b.value))return false;
   if(norm(a.bon)&&norm(a.bon)===norm(b.bon))return true;
   const kmA=String(a.km??''),kmB=String(b.km??'');
   const lA=numVal(a.liters),lB=numVal(b.liters);
   return kmA!==''&&kmB!==''&&kmA===kmB&&(Math.abs(lA-lB)<0.02||!lA||!lB);
 }
 function sameExpense(a,b){
   if(a.importId&&a.importId===b.importId)return true;
   if(dkey(a.date)!==dkey(b.date)||cents(a.value)!==cents(b.value))return false;
   return !!(norm(a.number)&&norm(a.number)===norm(b.number))||!!(norm(a.product)&&norm(a.product)===norm(b.product));
 }
 try{
   if(!Array.isArray(d.fuel)||!Array.isArray(d.expenses))return;
   const reg=norm(d.vehicle?.registration||'');
   if(reg&&reg!=='b95sep')return;
   if(d.nsHistoryB95SEP===version)return;
   for(const x of FUEL){
     const [date,bon,km,liters,value,payment,sourceFile,sourceRow]=x;
     const importId='B95SEP-F-'+sourceFile+'-'+sourceRow;
     const item={date,bon,km,liters,value,payment,place:'',fileName:'',sourceFile,sourceRow,importId,importedHistory:true};
     if(!d.fuel.some(old=>sameFuel(old,item)))d.fuel.push(item);
   }
   for(const x of EXPENSES){
     const [date,product,number,km,value,payment,sourceFile,sourceRow]=x;
     const importId='B95SEP-E-'+sourceFile+'-'+sourceRow;
     const item={date,product,number,km,value,payment,fileName:'',sourceFile,sourceRow,importId,importedHistory:true};
     if(!d.expenses.some(old=>sameExpense(old,item)))d.expenses.push(item);
   }
   d.nsHistoryB95SEP=version;
   d.nsHistoryB95SEPNote='Septembrie 2021 - stationare / neutilizat';
   save();
 }catch(err){console.error('Import istoric B-95-SEP:',err)}
})();
