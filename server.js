const express = require('express'), multer = require('multer'), fs = require('fs'),
  path = require('path'), crypto = require('crypto');
const app = express(), PORT = process.env.PORT || 3000;
const BASE = process.env.DATA_DIR || __dirname; // en Render apunta al disco persistente
const DATA = path.join(BASE, 'data'), UP = path.join(BASE, 'uploads'), DB = path.join(DATA, 'db.json');
[DATA, UP].forEach(d => fs.mkdirSync(d, { recursive: true }));
const load = () => fs.existsSync(DB) ? JSON.parse(fs.readFileSync(DB)) : { videos: [], reports: [] };
const save = d => fs.writeFileSync(DB, JSON.stringify(d, null, 2));
const clip = (s, n) => String(s || '').trim().slice(0, n);

const upload = multer({
  storage: multer.diskStorage({
    destination: UP,
    filename: (req, f, cb) => cb(null, crypto.randomUUID() + path.extname(f.originalname).toLowerCase())
  }),
  limits: { fileSize: (+process.env.MAX_MB || 500) * 1024 * 1024 },
  fileFilter: (req, f, cb) => cb(null, /^video\//.test(f.mimetype))
});

const pub = v => ({
  ...v, ratings: undefined, votes: v.ratings.length,
  rating: v.ratings.length ? v.ratings.reduce((a, r) => a + r.stars, 0) / v.ratings.length : 0
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UP));

app.get('/api/videos', (req, res) => {
  const q = clip(req.query.q, 80).toLowerCase(), cat = req.query.cat;
  let list = load().videos.filter(v =>
    (!cat || v.category === cat) && (!q || (v.title + ' ' + v.description + ' ' + v.channel).toLowerCase().includes(q)));
  const sort = req.query.sort;
  list = sort === 'top' ? list.sort((a, b) => pub(b).rating - pub(a).rating)
       : sort === 'views' ? list.sort((a, b) => b.views - a.views)
       : list.sort((a, b) => b.createdAt - a.createdAt);
  res.json(list.map(pub));
});

app.get('/api/videos/:id', (req, res) => {
  const db = load(), v = db.videos.find(x => x.id === req.params.id);
  if (!v) return res.status(404).json({ error: 'Video no encontrado' });
  v.views++; save(db); res.json(pub(v));
});

app.post('/api/videos', upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Selecciona un archivo de video válido' });
  const title = clip(req.body.title, 120);
  if (!title) { fs.unlink(req.file.path, () => {}); return res.status(400).json({ error: 'Escribe un título' }); }
  const db = load();
  const v = {
    id: crypto.randomUUID().slice(0, 8), title, description: clip(req.body.description, 2000),
    channel: clip(req.body.channel, 40) || 'Anónimo', category: clip(req.body.category, 30) || 'Otros',
    license: clip(req.body.license, 40) || 'Obra propia', file: '/uploads/' + req.file.filename,
    views: 0, createdAt: Date.now(), ratings: [], comments: []
  };
  db.videos.push(v); save(db); res.json(pub(v));
});

app.post('/api/videos/:id/rate', (req, res) => {
  const db = load(), v = db.videos.find(x => x.id === req.params.id), stars = +req.body.stars, user = clip(req.body.user, 40);
  if (!v || !user || !(stars >= 1 && stars <= 5)) return res.status(400).json({ error: 'Calificación inválida' });
  const r = v.ratings.find(x => x.user === user);
  r ? (r.stars = stars) : v.ratings.push({ user, stars });
  save(db); res.json(pub(v));
});

app.post('/api/videos/:id/comments', (req, res) => {
  const db = load(), v = db.videos.find(x => x.id === req.params.id), text = clip(req.body.text, 1000);
  if (!v || !text) return res.status(400).json({ error: 'Escribe un comentario' });
  v.comments.unshift({ id: crypto.randomUUID().slice(0, 8), name: clip(req.body.name, 40) || 'Anónimo', text, createdAt: Date.now() });
  save(db); res.json(v.comments);
});

app.post('/api/videos/:id/report', (req, res) => {
  const db = load();
  db.reports.push({ videoId: req.params.id, reason: clip(req.body.reason, 500), createdAt: Date.now() });
  save(db); res.json({ ok: true });
});

app.listen(PORT, () => console.log(`AulaTube en http://localhost:${PORT}`));
