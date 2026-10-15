const $ = s => document.querySelector(s), app = $('#app');
const CATS = ['Matemáticas', 'Ciencias', 'Idiomas', 'Tecnología', 'Arte y diseño', 'Historia', 'Otros'];
const LICENSES = ['Obra propia', 'Creative Commons', 'Dominio público', 'Tengo permiso del autor'];
let cat = '', sort = 'new';
const user = localStorage.uid || (localStorage.uid = crypto.randomUUID());
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ago = t => { const m = (Date.now() - t) / 6e4; return m < 60 ? `hace ${Math.max(1, m | 0)} min` : m < 1440 ? `hace ${m / 60 | 0} h` : `hace ${m / 1440 | 0} d`; };
const stars = r => '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r));
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2200); };
const api = (u, o) => fetch(u, o).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; });
const post = (u, b) => api(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });

function renderCats() {
  $('#cats').innerHTML = ['Todo', ...CATS].map(c => `<button class="${(c === 'Todo' ? !cat : c === cat) ? 'on' : ''}">${c}</button>`).join('') +
    `<button data-s="top">⭐ Mejor calificados</button><button data-s="views">🔥 Más vistos</button>`;
}
$('#cats').onclick = e => {
  if (e.target.tagName !== 'BUTTON') return;
  if (e.target.dataset.s) sort = sort === e.target.dataset.s ? 'new' : e.target.dataset.s;
  else cat = e.target.textContent === 'Todo' ? '' : e.target.textContent;
  location.hash = '#/'; route();
};
$('#search').onsubmit = e => { e.preventDefault(); location.hash = '#/'; route(); };

async function home() {
  const vs = await api(`/api/videos?q=${encodeURIComponent($('#q').value)}&cat=${encodeURIComponent(cat)}&sort=${sort}`);
  app.innerHTML = vs.length ? `<div class="grid">${vs.map(v => `
    <a class="card" href="#/v/${v.id}"><video src="${v.file}#t=0.5" preload="metadata" muted></video>
    <div><h3>${esc(v.title)}</h3><span class="meta">${esc(v.channel)} · ${v.views} vistas · ${ago(v.createdAt)}</span><br>
    <span class="stars">${stars(v.rating)}</span> <span class="meta">${v.votes ? v.rating.toFixed(1) : 'Sin votos'}</span></div></a>`).join('')}</div>`
    : `<div class="empty"><h2>Aún no hay videos aquí</h2><p>Sé el primero en compartir una clase.</p><a class="btn" href="#/subir">Subir video</a></div>`;
}

async function watch(id) {
  const v = await api('/api/videos/' + id), mine = +localStorage['r' + id] || 0;
  app.innerHTML = `<div class="watch"><video src="${v.file}" controls autoplay></video>
    <div><h1 style="margin:0">${esc(v.title)}</h1><p class="meta">${esc(v.channel)} · ${v.views} vistas · ${esc(v.category)} · Licencia: ${esc(v.license)}</p></div>
    <div class="box row" style="justify-content:space-between">
      <div><div class="rate" id="rate">${[1, 2, 3, 4, 5].map(n => `<button data-n="${n}" aria-label="${n} estrellas" class="${n <= mine ? 'on' : ''}">★</button>`).join('')}</div>
      <span class="meta" id="avg">${v.votes ? `${v.rating.toFixed(1)} de 5 (${v.votes} votos)` : 'Sé el primero en calificar'}</span></div>
      <div class="row"><button class="btn" id="share">Compartir</button><button class="btn ghost" id="rep">Reportar</button></div></div>
    <div class="box"><p style="white-space:pre-wrap;margin:0">${esc(v.description) || '<span class="meta">Sin descripción.</span>'}</p></div>
    <div class="box"><h2 style="margin-top:0">Comentarios</h2>
      <div class="form" style="max-width:none"><input id="cn" placeholder="Tu nombre (opcional)" maxlength="40"><textarea id="ct" rows="2" placeholder="Escribe un comentario" maxlength="1000"></textarea>
      <button class="btn" id="cs" style="justify-self:start">Comentar</button></div><div id="cl"></div></div></div>`;
  const list = cs => $('#cl').innerHTML = cs.map(c => `<div class="comment"><b>${esc(c.name)}</b> <span class="meta">${ago(c.createdAt)}</span><br>${esc(c.text)}</div>`).join('');
  list(v.comments);
  $('#rate').onclick = async e => {
    const n = +e.target.dataset.n; if (!n) return;
    const r = await post(`/api/videos/${id}/rate`, { stars: n, user }); localStorage['r' + id] = n;
    document.querySelectorAll('#rate button').forEach(b => b.classList.toggle('on', +b.dataset.n <= n));
    $('#avg').textContent = `${r.rating.toFixed(1)} de 5 (${r.votes} votos)`; toast('¡Gracias por calificar!');
  };
  $('#cs').onclick = async () => {
    try { list(await post(`/api/videos/${id}/comments`, { name: $('#cn').value, text: $('#ct').value })); $('#ct').value = ''; }
    catch (e) { toast(e.message); }
  };
  $('#share').onclick = async () => {
    const url = location.href;
    if (navigator.share) try { return await navigator.share({ title: v.title, url }); } catch { return; }
    await navigator.clipboard.writeText(url); toast('Enlace copiado');
  };
  $('#rep').onclick = async () => {
    const reason = prompt('¿Por qué reportas este video? (por ejemplo: derechos de autor, contenido inapropiado)');
    if (reason) { await post(`/api/videos/${id}/report`, { reason }); toast('Reporte enviado'); }
  };
}

function upload() {
  app.innerHTML = `<form class="form box" id="uf"><h1 style="margin:0">Sube tu video</h1>
    <label>Video<input type="file" name="video" accept="video/*" required></label>
    <label>Título<input name="title" maxlength="120" required placeholder="Ej: Ecuaciones de segundo grado"></label>
    <label>Descripción<textarea name="description" rows="4" maxlength="2000"></textarea></label>
    <label>Tu nombre o canal<input name="channel" maxlength="40"></label>
    <label>Categoría<select name="category">${CATS.map(c => `<option>${c}</option>`).join('')}</select></label>
    <label>Licencia del contenido<select name="license">${LICENSES.map(c => `<option>${c}</option>`).join('')}</select></label>
    <div class="bar" hidden><i></i></div><button class="btn">Publicar video</button></form>`;
  $('#uf').onsubmit = e => {
    e.preventDefault();
    const x = new XMLHttpRequest(), bar = $('.bar');
    bar.hidden = false;
    x.upload.onprogress = p => bar.firstChild.style.width = (p.loaded / p.total * 100) + '%';
    x.onload = () => { const d = JSON.parse(x.responseText); x.status < 300 ? (toast('¡Video publicado!'), location.hash = '#/v/' + d.id) : toast(d.error); };
    x.onerror = () => toast('Error de conexión');
    x.open('POST', '/api/videos'); x.send(new FormData(e.target));
  };
}

function route() {
  renderCats();
  const h = location.hash.slice(2);
  (h === 'subir' ? upload : h.startsWith('v/') ? () => watch(h.slice(2)) : home)()?.catch?.(e => toast(e.message));
  scrollTo(0, 0);
}
addEventListener('hashchange', route); route();
