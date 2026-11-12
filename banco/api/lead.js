// Cadastro do ebook Ações sem Mistério: valida e grava no Supabase (a chave pública só permite inserir, RLS)
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Use POST' });
  const { SUPABASE_URL, SUPABASE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(503).json({ erro: 'Cadastro indisponível agora' });
  let b = req.body || {};
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  if (b.site) return res.status(200).json({ ok: true }); // campo invisível: robôs
  const nome = String(b.nome || '').trim().replace(/\s+/g, ' ');
  const email = String(b.email || '').trim().toLowerCase();
  let whats = String(b.whatsapp || '').replace(/\D/g, '');
  if (whats.length === 10 || whats.length === 11) whats = '55' + whats;
  if (nome.length < 3 || !nome.includes(' ')) return res.status(400).json({ erro: 'Escreva seu nome completo.' });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 160) return res.status(400).json({ erro: 'Confira o seu e-mail.' });
  if (!/^55\d{10,11}$/.test(whats)) return res.status(400).json({ erro: 'Confira o WhatsApp com DDD.' });
  if (b.consentimento !== true) return res.status(400).json({ erro: 'Marque a autorização para continuar.' });
  const r = await fetch(SUPABASE_URL + '/rest/v1/leads_9pilla_ebook', {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ nome: nome.slice(0, 120), email, whatsapp: whats, consentimento: true, origem: String(b.origem || 'ebook-acoes-sem-misterio').slice(0, 60) })
  });
  if (!r.ok) return res.status(502).json({ erro: 'Não conseguimos salvar agora. Tente de novo em instantes.' });
  res.status(200).json({ ok: true, link: '/e/acoes-sem-misterio-9pilla.pdf' });
};
