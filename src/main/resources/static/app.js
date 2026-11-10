"use strict";
const $=s=>document.querySelector(s), selected=new Map();
const state={estado:'1',pagina:0,total:0,tamanio:15,items:[],csrf:null,request:0,checkout:[],saving:false};
const money=n=>new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(n??0);
const qty=n=>new Intl.NumberFormat('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n??0);
const esc=s=>String(s??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>s?new Intl.DateTimeFormat('es-PE',{dateStyle:'medium',timeZone:'America/Lima'}).format(new Date(s+'-05:00')):'—';
const dateTime=s=>s?new Intl.DateTimeFormat('es-PE',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Lima'}).format(new Date(s+'-05:00')):'—';
const available=v=>v.activo&&v.estadoVale===1&&!v.fechaConsumo&&v.cantidadConsumida==null&&v.precioReal==null&&v.importe==null&&v.ticket==null&&Number(v.cantidadEmitida)>0;
const status=v=>`<span class="status status-${Number(v.estadoVale)}">${esc(v.estado||'SIN ESTADO')}</span>`;
async function api(path,options={}){
 const headers={...options.headers};
 if(options.method){headers[state.csrf.headerName]=state.csrf.token;}
 const r=await fetch('/api'+path,{...options,headers});
 if(r.status===401){location.replace('/login.html');throw Error('La sesión terminó.');}
 if(!r.ok){let body;try{body=await r.json();}catch{}throw Error(body?.mensaje||(r.status===403?'La sesión o el token venció. Recarga la página.':'No se pudo completar la operación.'))}
 return r.status===204?null:r.json();
}
function notify(message,failure=false){const n=$('#notification');n.textContent=message;n.hidden=false;n.classList.toggle('failure',failure);}
async function loadSummary(){const s=await api('/resumen');$('#stat-total').textContent=s.total;$('#stat-auth').textContent=s.autorizados;$('#stat-used').textContent=s.consumidos;$('#stat-amount').textContent=money(s.importe);}
async function load(){
 const request=++state.request, query=new URLSearchParams({q:$('#search').value.trim(),zonal:$('#zonal').value,pagina:state.pagina,tamanio:state.tamanio});
 if(state.estado!=='')query.set('estado',state.estado);
 $('#rows').innerHTML='<tr><td colspan="8" class="empty">Consultando vales…</td></tr>';$('#prev').disabled=true;$('#next').disabled=true;$('#select-page').disabled=true;
 try{
   const result=await api('/vales?'+query);if(request!==state.request)return;
   state.items=result.items;state.total=result.total;
   for(const v of state.items){if(selected.has(v.codigoVale)){if(available(v))selected.set(v.codigoVale,v);else selected.delete(v.codigoVale);}}
   render();
 }catch(e){if(request!==state.request)return;state.items=[];state.total=0;render();$('#rows').innerHTML=`<tr><td colspan="8" class="empty">${esc(e.message)}<br>Usa Actualizar para reintentar.</td></tr>`;notify(e.message,true);}
}
function render(){
 $('#rows').innerHTML=state.items.length?state.items.map(v=>`<tr class="${selected.has(v.codigoVale)?'selected':''}"><td class="check-cell"><input type="checkbox" data-code="${esc(v.codigoVale)}" aria-label="Seleccionar vale ${esc(v.codigoVale)}" ${selected.has(v.codigoVale)?'checked':''} ${available(v)?'':'disabled'}></td><td><strong class="code">${esc(v.codigoVale)}</strong><small>${esc(date(v.fechaEmision))}</small></td><td><strong>${esc(v.placa)}</strong><small>${esc(v.trabajador)}</small></td><td><strong>${esc(v.zonal)}</strong><small>${esc(v.localidad)}</small></td><td>${esc(v.idSuministro)}<small>${esc(v.tipoVehiculo)}</small></td><td class="number"><strong>${qty(v.cantidadEmitida)}</strong><small>galones</small></td><td>${status(v)}</td><td class="number"><button class="link-button detail" data-code="${esc(v.codigoVale)}">Ver detalle →</button></td></tr>`).join(''):'<tr><td colspan="8" class="empty">No hay vales para estos filtros.<br>Prueba con otro código o zonal.</td></tr>';
 const from=state.total?state.pagina*state.tamanio+1:0, to=Math.min((state.pagina+1)*state.tamanio,state.total);
 $('#page-label').textContent=`Mostrando ${from}–${to} de ${state.total} vales`;
 $('#prev').disabled=state.pagina===0;$('#next').disabled=to>=state.total;
 const eligible=state.items.filter(available), count=eligible.filter(v=>selected.has(v.codigoVale)).length;
 $('#select-page').checked=eligible.length>0&&count===eligible.length;$('#select-page').indeterminate=count>0&&count<eligible.length;$('#select-page').disabled=!eligible.length;
 $('#selection-bar').hidden=!selected.size;$('#selection-label').textContent=`${selected.size} ${selected.size===1?'vale seleccionado':'vales seleccionados'}`;
}
$('#rows').addEventListener('change',e=>{
 const code=e.target.dataset.code;if(!code)return;
 if(e.target.checked&&selected.size>=20){e.target.checked=false;notify('Puedes registrar hasta 20 vales por lote.',true);return;}
 if(e.target.checked)selected.set(code,state.items.find(v=>v.codigoVale===code));else selected.delete(code);render();
});
$('#select-page').addEventListener('change',e=>{for(const v of state.items.filter(available)){if(e.target.checked&&selected.size<20)selected.set(v.codigoVale,v);else if(!e.target.checked)selected.delete(v.codigoVale);}render();});
$('#clear').addEventListener('click',()=>{selected.clear();render();});
$('#filters').addEventListener('submit',e=>{e.preventDefault();state.pagina=0;load();});
$('#zonal').addEventListener('change',()=>{state.pagina=0;load();});
for(const b of document.querySelectorAll('.tab'))b.addEventListener('click',()=>{state.estado=b.dataset.state;state.pagina=0;for(const tab of document.querySelectorAll('.tab')){const active=tab===b;tab.classList.toggle('active',active);tab.setAttribute('aria-pressed',active);}load();});
$('#prev').addEventListener('click',()=>{state.pagina--;load();});$('#next').addEventListener('click',()=>{state.pagina++;load();});
$('#refresh').addEventListener('click',async()=>{try{await Promise.all([load(),loadSummary()]);}catch(e){notify(e.message,true);}});
function cents(value){const s=String(value).trim();if(!/^\d{1,12}(\.\d{1,2})?$/.test(s))return null;const [a,b='']=s.split('.');return BigInt(a)*100n+BigInt(b.padEnd(2,'0'));}
function subtotal(a,b){const x=cents(a),y=cents(b);return x===null||y===null?null:(x*y+50n)/100n;}
function updateTotals(){let total=0n;for(const item of document.querySelectorAll('.attention-item')){const value=subtotal(item.querySelector('[name=cantidad]').value,item.querySelector('[name=precio]').value);item.querySelector('.line-total strong').textContent=value===null?'—':money(Number(value)/100);if(value!==null)total+=value;}$('#checkout-total').textContent=money(Number(total)/100);}
function checkout(vales){
 if(!vales.length)return;state.checkout=vales;$('#checkout-error').hidden=true;
 $('#checkout-items').innerHTML=vales.map(v=>`<section class="attention-item" data-code="${esc(v.codigoVale)}"><div class="item-title"><strong>${esc(v.codigoVale)} · ${esc(v.placa)}</strong><small>${esc(v.idSuministro)} · Emitido: ${qty(v.cantidadEmitida)} gal</small></div><div class="item-inputs"><label>Galones entregados<input name="cantidad" type="number" min="0.01" max="${esc(v.cantidadEmitida)}" step="0.01" value="${esc(v.cantidadEmitida)}" required inputmode="decimal"></label><label>Precio real / galón (S/)<input name="precio" type="number" min="0.01" max="999999999999.99" step="0.01" placeholder="0.00" required inputmode="decimal"></label><label>Número de ticket<input name="ticket" maxlength="15" required placeholder="Ej. T001-00452" autocomplete="off"></label></div><p class="line-total">Importe <strong>S/ 0.00</strong></p></section>`).join('');
 updateTotals();$('#checkout').showModal();
}
$('#review').addEventListener('click',()=>checkout([...selected.values()]));
$('#checkout-items').addEventListener('input',updateTotals);
for(const b of document.querySelectorAll('.close-dialog'))b.addEventListener('click',()=>{if(!state.saving)$('#checkout').close();});
$('#checkout').addEventListener('cancel',e=>{if(state.saving)e.preventDefault();});
$('#attention-form').addEventListener('submit',async e=>{
 e.preventDefault();if(state.saving)return;
 const vales=[...document.querySelectorAll('.attention-item')].map(el=>({codigoVale:el.dataset.code,cantidadConsumida:el.querySelector('[name=cantidad]').value,precioReal:el.querySelector('[name=precio]').value,ticket:el.querySelector('[name=ticket]').value.trim()}));
 const error=$('#checkout-error');error.hidden=true;
 if(vales.some(v=>cents(v.cantidadConsumida)===null||cents(v.precioReal)===null)){error.textContent='Usa valores positivos con un máximo de dos decimales.';error.hidden=false;return;}
 state.saving=true;$('#save').disabled=true;$('#save').textContent='Registrando…';for(const b of document.querySelectorAll('.close-dialog'))b.disabled=true;
 try{
   const result=await api('/atenciones',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({vales})});
   for(const v of result)selected.delete(v.codigoVale);
   $('#checkout').close();state.pagina=0;notify(`${result.length===1?'Atención registrada':'Atenciones registradas'}: ${result.length} ${result.length===1?'vale consumido':'vales consumidos'}. Importe: ${money(result.reduce((a,v)=>a+Number(v.importe),0))}.`);
   await Promise.all([load(),loadSummary()]);
 }catch(e){if($('#checkout').open){error.textContent=e.message+' Si hubo una interrupción de conexión, consulta los vales antes de reintentar.';error.hidden=false;error.scrollIntoView({block:'nearest'});}else notify('El consumo se registró, pero no se pudo actualizar el resumen. Pulsa Actualizar.',true);}
 finally{state.saving=false;$('#save').disabled=false;$('#save').textContent='Registrar consumo';for(const b of document.querySelectorAll('.close-dialog'))b.disabled=false;}
});
$('#rows').addEventListener('click',async e=>{const b=e.target.closest('.detail');if(!b)return;try{const v=await api('/vales/'+encodeURIComponent(b.dataset.code));$('#detail-title').textContent=v.codigoVale;
 const field=(name,value)=>`<div><dt>${esc(name)}</dt><dd>${esc(value)}</dd></div>`;
 $('#detail-content').innerHTML=status(v)+`<dl class="detail-grid">${field('Unidad',v.placa)}${field('Tipo',v.tipoVehiculo)}${field('Trabajador',v.trabajador)}${field('Suministro (código)',v.idSuministro)}${field('Zonal',v.zonal)}${field('Localidad',v.localidad)}${field('Galones emitidos',qty(v.cantidadEmitida))}${field('Precio referencial / galón',money(v.precioReferencial))}${field('Proveedor',v.proveedor)}${field('RUC',v.codProveedor)}${field('Contrato',v.nrocontrato||'S/C')}${field('Emisión',dateTime(v.fechaEmision))}</dl>`+(v.fechaConsumo?`<h3 class="detail-separator">Atención registrada</h3><dl class="detail-grid">${field('Consumo (hora de Lima)',dateTime(v.fechaConsumo))}${field('Galones entregados',qty(v.cantidadConsumida))}${field('Precio real / galón',money(v.precioReal))}${field('Importe registrado',money(v.importe))}${field('Ticket',v.ticket)}${field('Usuario que registró',v.usuario)}</dl>`:'')+(available(v)?'<button class="primary" id="attend-detail">Atender este vale →</button>':'');
 $('#details').showModal();$('#attend-detail')?.addEventListener('click',()=>{$('#details').close();checkout([v]);});
 }catch(e){notify(e.message,true);}});
for(const b of document.querySelectorAll('.close-details'))b.addEventListener('click',()=>$('#details').close());
$('#logout').addEventListener('click',async()=>{try{const response=await fetch('/logout',{method:'POST',headers:{[state.csrf.headerName]:state.csrf.token}});if(!response.ok)throw Error('Error de sesión');location.replace('/login.html');}catch(e){notify('No se pudo cerrar la sesión. Intenta nuevamente.',true);}});
async function init(){try{const [csrf,sesion]=await Promise.all([api('/csrf'),api('/sesion')]);state.csrf=csrf;$('#usuario').textContent=sesion.usuario;$('#ruc').textContent='RUC '+sesion.ruc;$('#environment').textContent=sesion.demo?'●  Entorno de demostración':'●  Base administrativa';$('#demo-banner').hidden=!sesion.demo;
 const zonas=await api('/zonales');for(const z of zonas){const option=document.createElement('option');option.value=z.codigo;option.textContent=z.nombre;$('#zonal').append(option);}await Promise.all([load(),loadSummary()]);
}catch(e){notify(e.message,true);}}
init();
