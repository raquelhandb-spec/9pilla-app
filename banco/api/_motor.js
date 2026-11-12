// Motor do Radar de Cenários 9Pilla (versão servidor, mesma regra do radar.py)
// ALTA     preço > MM21 > MM50, MM21 subindo, IFR(14) entre 50 e 70
// QUEDA    preço < MM21 < MM50, MM21 caindo, IFR(14) entre 30 e 50
// LATERAL  |inclinação da MM21| < 0,4 ATR em 5 pregões e preço a menos de 1 ATR da MM21
// OBSERVAR qualquer outro caso, ou IFR acima de 70 ou abaixo de 30

const ATIVOS = [
  ['PETR4', 'Petrobras PN', 'Energia'],
  ['VALE3', 'Vale ON', 'Mineração'],
  ['ITUB4', 'Itaú Unibanco PN', 'Banco'],
  ['BBDC4', 'Bradesco PN', 'Banco'],
  ['BBAS3', 'Banco do Brasil ON', 'Banco'],
  ['BOVA11', 'ETF do Ibovespa', 'Índice']
];
const UA = { 'User-Agent': 'Mozilla/5.0 (9Pilla app educativo)' };
const HIST_N = 10, STREAK_MAX = 60, GRAF_N = 60;

// Chave da BRAPI (plano pago): variável secreta BRAPI_TOKEN na Vercel, nunca no código
const BRAPI_TOKEN = process.env.BRAPI_TOKEN || '';
async function getJSON(url, extra) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(url, { headers: Object.assign({}, UA, extra || {}), signal: ctrl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

async function histBrapi(t) {
  const d = await getJSON(`https://brapi.dev/api/quote/${t}?range=1y&interval=1d`, BRAPI_TOKEN ? { Authorization: 'Bearer ' + BRAPI_TOKEN } : null);
  const h = d.results[0].historicalDataPrice;
  return { rows: h.filter((x) => x.close).map((x) => [x.date, x.high, x.low, x.close]), fonte: 'BRAPI' };
}

async function histYahoo(t) {
  let err;
  for (const host of ['query2', 'query1']) {
    try {
      const d = await getJSON(`https://${host}.finance.yahoo.com/v8/finance/chart/${t}.SA?range=1y&interval=1d`);
      const r = d.chart.result[0], q = r.indicators.quote[0];
      const rows = r.timestamp.map((ts, i) => [ts, q.high[i], q.low[i], q.close[i]]).filter((x) => x[1] && x[2] && x[3]);
      return { rows, fonte: 'Yahoo Finance' };
    } catch (e) { err = e; }
  }
  throw err || new Error('Yahoo indisponível');
}

async function historico(t) {
  try { return await histBrapi(t); } catch (e) { return await histYahoo(t); }
}

const mm = (v, n) => v.slice(-n).reduce((a, b) => a + b, 0) / n;
function ifr(c, n = 14) {
  let g = 0, p = 0;
  for (let i = c.length - n; i < c.length; i++) { const d = c[i] - c[i - 1]; g += Math.max(d, 0); p += Math.max(-d, 0); }
  return p === 0 ? 100 : 100 - 100 / (1 + g / p);
}
function atr(rows, n = 14) {
  let s = 0;
  for (let i = rows.length - n; i < rows.length; i++) {
    const [, h, l] = rows[i], pc = rows[i - 1][3];
    s += Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
  }
  return s / n;
}
function volHist(c, n = 20) {
  const r = [];
  for (let i = c.length - n; i < c.length; i++) r.push(Math.log(c[i] / c[i - 1]));
  const m = r.reduce((a, b) => a + b, 0) / n;
  return Math.sqrt(r.reduce((a, x) => a + (x - m) ** 2, 0) / (n - 1)) * Math.sqrt(252) * 100;
}
const br = (x, d = 2) => x.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const dia = (ts) => new Date((ts - 3 * 3600) * 1000).toISOString().slice(0, 10);
const ddmm = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7);

function classifica(rows) {
  const c = rows.map((r) => r[3]);
  const preco = c[c.length - 1];
  const m21 = mm(c, 21), m50 = mm(c, 50);
  const m21_5 = c.slice(-26, -5).reduce((a, b) => a + b, 0) / 21;
  const a = atr(rows);
  const incl = (m21 - m21_5) / a;
  const rsi = ifr(c);
  let cen;
  if (rsi > 70 || rsi < 30) cen = 'observar';
  else if (preco > m21 && m21 > m50 && incl > 0 && rsi >= 50 && rsi <= 70) cen = 'alta';
  else if (preco < m21 && m21 < m50 && incl < 0 && rsi >= 30 && rsi <= 50) cen = 'queda';
  else if (Math.abs(incl) < 0.4 && Math.abs(preco - m21) < a) cen = 'lateral';
  else cen = 'observar';
  return { cen, preco, m21, m50, a, incl, rsi };
}

async function analisa([t, nome, setor]) {
  const { rows, fonte } = await historico(t);
  if (rows.length < 50 + STREAK_MAX + 2) throw new Error('histórico curto');
  const c = rows.map((r) => r[3]);
  const k = classifica(rows);
  const vh = volHist(c);
  const ult20 = c.slice(-20), max20 = Math.max(...ult20), min20 = Math.min(...ult20);
  const seq = [];
  for (let back = STREAK_MAX; back > 0; back--) {
    const sub = rows.slice(0, rows.length - back + 1);
    seq.push([dia(sub[sub.length - 1][0]), classifica(sub).cen]);
  }
  let streak = 0;
  for (let i = seq.length - 1; i >= 0 && seq[i][1] === k.cen; i--) streak++;
  const anterior = (seq.slice().reverse().find((s) => s[1] !== k.cen) || [null, null])[1];
  let leitura;
  if (k.cen === 'observar' && k.rsi > 70) leitura = 'IFR acima de 70: o preço subiu rápido demais e o movimento está esticado. O método espera uma acomodação antes de uma leitura nova.';
  else if (k.cen === 'observar' && k.rsi < 30) leitura = 'IFR abaixo de 30: queda muito forte e rápida. Repiques são comuns; o método espera o preço se estabilizar.';
  else if (k.cen === 'alta') leitura = 'Preço acima das médias de 21 e 50 dias, com a média de 21 apontando para cima. Tendência de alta presente.';
  else if (k.cen === 'queda') leitura = 'Preço abaixo das médias de 21 e 50 dias, com a média de 21 apontando para baixo. Tendência de queda presente.';
  else if (k.cen === 'lateral') leitura = `Média de 21 dias quase plana e preço perto dela. O ativo oscila entre R$ ${br(min20)} e R$ ${br(max20)} nas últimas 20 sessões.`;
  else leitura = 'Sinais misturados: preço, médias e força não concordam entre si. Quando o método não vê clareza, a postura é não fazer nada.';
  const volTxt = vh >= 35 ? 'Volatilidade alta: prêmios das opções tendem a estar caros. Isso favorece quem vende prêmio e encarece quem compra.'
    : vh <= 22 ? 'Volatilidade baixa: prêmios tendem a estar baratos. Isso favorece quem compra opção e reduz a renda de quem vende.'
    : 'Volatilidade moderada: prêmios em faixa normal para o ativo.';
  const n = c.length;
  const graf = { c: [], m21: [], m50: [] };
  for (let i = n - GRAF_N; i < n; i++) {
    graf.c.push(+c[i].toFixed(2));
    graf.m21.push(+(c.slice(i - 20, i + 1).reduce((a, b) => a + b, 0) / 21).toFixed(2));
    graf.m50.push(+(c.slice(i - 49, i + 1).reduce((a, b) => a + b, 0) / 50).toFixed(2));
  }
  const varp = (k.preco / c[n - 2] - 1) * 100;
  return {
    ticker: t, nome, setor, fonte, cenario: k.cen, precoNum: k.preco,
    preco: 'R$ ' + br(k.preco), var: (varp >= 0 ? '+' : '') + br(varp) + '%', varPos: varp >= 0,
    mm21: 'R$ ' + br(k.m21), mm50: 'R$ ' + br(k.m50), ifr: br(k.rsi, 0), vol: br(vh, 0) + '% a.a.', volNum: vh,
    leitura, volTxt, suporte: 'R$ ' + br(min20), resistencia: 'R$ ' + br(max20),
    pregoes: streak, anterior, hist: seq.slice(-HIST_N).map(([d, s]) => ({ d: ddmm(d), c: s })),
    graf, data: dia(rows[n - 1][0])
  };
}

async function radar() {
  const res = await Promise.allSettled(ATIVOS.map(analisa));
  const ativos = res.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  const falhas = res.map((r, i) => r.status === 'rejected' ? ATIVOS[i][0] : null).filter(Boolean);
  const agora = new Date(Date.now() - 3 * 3600 * 1000);
  return { atualizado: agora.toISOString().slice(8, 10) + '/' + agora.toISOString().slice(5, 7) + '/' + agora.toISOString().slice(0, 4) + ' às ' + agora.toISOString().slice(11, 16), ativos, falhas };
}

// Taxas do Banco Central (API SGS): 432 Selic meta, 4389 CDI anual, 13522 IPCA 12m, 195 poupança no mês
const SGS = { selic: 432, cdi: 4389, ipca12: 13522, poupMes: 195 };
const FAIXA = { selic: [1, 40], cdi: [1, 40], ipca12: [-5, 40], poupMes: [0.1, 2] };
async function taxas() {
  const out = {};
  await Promise.all(Object.entries(SGS).map(async ([k, cod]) => {
    try {
      const d = await getJSON(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${cod}/dados/ultimos/1?formato=json`);
      const v = parseFloat(String(d[d.length - 1].valor).replace(',', '.'));
      if (v >= FAIXA[k][0] && v <= FAIXA[k][1]) out[k] = v;
    } catch (e) { /* mantém ausente; o app usa a última taxa conhecida */ }
  }));
  const agora = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
  out.data = agora.slice(8, 10) + '/' + agora.slice(5, 7) + '/' + agora.slice(0, 4);
  return out;
}

// Proventos (dividendos e JCP) dos últimos 12 meses, pelo Yahoo Finance
const PAGADORAS = [
  ['PETR4', 'Petrobras PN', 'Energia'], ['VALE3', 'Vale ON', 'Mineração'],
  ['ITUB4', 'Itaú Unibanco PN', 'Banco'], ['BBDC4', 'Bradesco PN', 'Banco'], ['BBAS3', 'Banco do Brasil ON', 'Banco'],
  ['ITSA4', 'Itaúsa PN', 'Holding'], ['BBSE3', 'BB Seguridade ON', 'Seguros'], ['TAEE11', 'Taesa Unit', 'Energia elétrica']
];
async function proventos([t, nome, setor]) {
  const d = await getJSON(`https://query2.finance.yahoo.com/v8/finance/chart/${t}.SA?range=2y&interval=1mo&events=div`);
  const r = d.chart.result[0];
  const preco = r.meta.regularMarketPrice;
  const agora = Date.now() / 1000;
  const lista = Object.values((r.events && r.events.dividends) || {}).sort((a, b) => a.date - b.date);
  const d12 = lista.filter((v) => agora - v.date <= 365 * 86400);
  const total = d12.reduce((a, v) => a + v.amount, 0);
  return {
    ticker: t, nome, setor, preco: +preco.toFixed(2), total12: +total.toFixed(4), n12: d12.length,
    dy: +(total / preco * 100).toFixed(2),
    ultimos: lista.slice(-4).reverse().map((v) => ({ data: dia(v.date).split('-').reverse().join('/'), valor: +v.amount.toFixed(4) }))
  };
}
async function dividendos() {
  const res = [];
  for (const p of PAGADORAS) { try { res.push(await proventos(p)); } catch (e) { /* segue sem esse ativo */ } }
  const agora = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
  return { atualizado: agora.slice(8, 10) + '/' + agora.slice(5, 7) + '/' + agora.slice(0, 4), ativos: res };
}

// Morning Call: Brasil, exterior, commodities, cripto e ADRs (Yahoo Finance)
const MERCADOS = [
  ['^BVSP', 'Ibovespa', 'brasil', 'pts'], ['BRL=X', 'Dólar', 'brasil', 'R$'], ['EURBRL=X', 'Euro', 'brasil', 'R$'],
  ['^GSPC', 'S&P 500 (EUA)', 'exterior', 'pts'], ['^IXIC', 'Nasdaq (EUA)', 'exterior', 'pts'], ['^DJI', 'Dow Jones (EUA)', 'exterior', 'pts'], ['^VIX', 'VIX (medo nos EUA)', 'exterior', 'pts'],
  ['BZ=F', 'Petróleo Brent', 'commodities', 'US$'], ['GC=F', 'Ouro', 'commodities', 'US$'], ['BTC-USD', 'Bitcoin', 'commodities', 'US$'],
  ['PBR', 'Petrobras em NY (PBR)', 'adr', 'US$'], ['VALE', 'Vale em NY (VALE)', 'adr', 'US$'], ['EWZ', 'Brasil em NY (EWZ)', 'adr', 'US$']
];
async function cotacao([s, nome, grupo, un]) {
  const d = await getJSON(`https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?range=5d&interval=1d`);
  const r = d.chart.result[0];
  const closes = r.indicators.quote[0].close.filter((x) => x != null);
  const preco = r.meta.regularMarketPrice;
  const ant = closes.length >= 2 ? (Math.abs(closes[closes.length - 1] - preco) / preco < 0.0001 ? closes[closes.length - 2] : closes[closes.length - 1]) : r.meta.chartPreviousClose;
  return { s, nome, grupo, un, preco: +preco.toFixed(4), var: +((preco / ant - 1) * 100).toFixed(2), hora: new Date((r.meta.regularMarketTime - 3 * 3600) * 1000).toISOString().slice(11, 16) };
}
async function morning() {
  const res = await Promise.allSettled(MERCADOS.map(cotacao));
  const itens = res.filter((x) => x.status === 'fulfilled').map((x) => x.value);
  const agora = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
  return { atualizado: agora.slice(8, 10) + '/' + agora.slice(5, 7) + '/' + agora.slice(0, 4) + ' às ' + agora.slice(11, 16), itens };
}

// Mundo: bolsas, moedas contra o real, ETFs globais e BDRs na B3 (Yahoo Finance)
const BOLSAS = [
  ['^BVSP', 'Ibovespa', 'Brasil', 'São Paulo', 'BRL'], ['^GSPC', 'S&P 500', 'Estados Unidos', 'Nova York', 'USD'], ['^IXIC', 'Nasdaq', 'Estados Unidos', 'Nova York', 'USD'],
  ['^MXX', 'IPC', 'México', 'Cidade do México', 'MXN'], ['^FTSE', 'FTSE 100', 'Reino Unido', 'Londres', 'GBP'], ['^GDAXI', 'DAX', 'Alemanha', 'Frankfurt', 'EUR'],
  ['^FCHI', 'CAC 40', 'França', 'Paris', 'EUR'], ['^STOXX50E', 'Euro Stoxx 50', 'Zona do euro', 'Europa', 'EUR'], ['^N225', 'Nikkei 225', 'Japão', 'Tóquio', 'JPY'],
  ['^HSI', 'Hang Seng', 'Hong Kong', 'Hong Kong', 'HKD'], ['000001.SS', 'Xangai', 'China', 'Xangai', 'CNY'], ['^NSEI', 'Nifty 50', 'Índia', 'Mumbai', 'INR']
];
const MOEDAS = [['BRL=X', 'Dólar americano', 'USD', 1], ['EURBRL=X', 'Euro', 'EUR', 1], ['GBPBRL=X', 'Libra esterlina', 'GBP', 1], ['JPYBRL=X', 'Iene japonês (100)', 'JPY', 100], ['CNYBRL=X', 'Yuan chinês', 'CNY', 1], ['ARSBRL=X', 'Peso argentino (100)', 'ARS', 100]];
const ETFS = [['IVVB11', 'S&P 500 em reais', 'As 500 maiores empresas dos EUA'], ['NASD11', 'Nasdaq-100', 'Tecnologia e inovação dos EUA'], ['WRLD11', 'Mundo desenvolvido', 'EUA, Europa, Japão e outros'], ['ACWI11', 'Mundo todo', 'Desenvolvidos e emergentes'], ['XINA11', 'China', 'Grandes empresas chinesas'], ['GOLD11', 'Ouro', 'Preço do ouro em reais'], ['HASH11', 'Cripto', 'Cesta de criptoativos']];
const BDRS = [['AAPL34', 'Apple'], ['MSFT34', 'Microsoft'], ['NVDC34', 'Nvidia'], ['AMZO34', 'Amazon'], ['GOGL34', 'Alphabet (Google)'], ['M1TA34', 'Meta'], ['TSLA34', 'Tesla'], ['BERK34', 'Berkshire Hathaway']];
async function serie(s) {
  const d = await getJSON(`https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?range=1y&interval=1d`);
  const r = d.chart.result[0], m = r.meta;
  const c = r.indicators.quote[0].close.filter((x) => x != null);
  const preco = m.regularMarketPrice;
  const ant = c.length >= 2 ? (Math.abs(c[c.length - 1] - preco) / preco < 0.0001 ? c[c.length - 2] : c[c.length - 1]) : preco;
  const p = m.currentTradingPeriod && m.currentTradingPeriod.regular;
  return { preco: +preco.toFixed(4), dia: +((preco / ant - 1) * 100).toFixed(2), ano: c.length > 200 ? +((preco / c[0] - 1) * 100).toFixed(1) : null,
    tz: m.exchangeTimezoneName, abre: p ? p.start : null, fecha: p ? p.end : null, quando: m.regularMarketTime };
}
async function global() {
  const tudo = [...BOLSAS.map((b) => b[0]), ...MOEDAS.map((x) => x[0]), ...ETFS.map((e) => e[0] + '.SA'), ...BDRS.map((b) => b[0] + '.SA')];
  const res = await Promise.allSettled(tudo.map(serie));
  const v = {}; tudo.forEach((s, i) => { if (res[i].status === 'fulfilled') v[s] = res[i].value; });
  const fx = {}; MOEDAS.forEach(([s, , cod]) => { if (v[s]) fx[cod] = v[s].ano; }); fx.BRL = 0;
  const emReais = (ano, moeda) => ano == null || fx[moeda] == null ? null : +(((1 + ano / 100) * (1 + fx[moeda] / 100) - 1) * 100).toFixed(1);
  const agora = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
  return {
    atualizado: agora.slice(8, 10) + '/' + agora.slice(5, 7) + '/' + agora.slice(0, 4) + ' às ' + agora.slice(11, 16),
    bolsas: BOLSAS.filter((b) => v[b[0]]).map(([s, nome, pais, cidade, moeda]) => Object.assign({ s, nome, pais, cidade, moeda, anoReais: emReais(v[s].ano, moeda) }, v[s])),
    moedas: MOEDAS.filter((x) => v[x[0]]).map(([s, nome, cod, mult]) => ({ s, nome, cod, mult, preco: +(v[s].preco * mult).toFixed(4), dia: v[s].dia, ano: v[s].ano })),
    etfs: ETFS.filter((e) => v[e[0] + '.SA']).map(([t, nome, desc]) => ({ t, nome, desc, preco: v[t + '.SA'].preco, dia: v[t + '.SA'].dia, ano: v[t + '.SA'].ano })),
    bdrs: BDRS.filter((b) => v[b[0] + '.SA']).map(([t, nome]) => ({ t, nome, preco: v[t + '.SA'].preco, dia: v[t + '.SA'].dia, ano: v[t + '.SA'].ano }))
  };
}

// FIIs acompanhados (rendimentos dos últimos 12 meses, Yahoo Finance)
const FIIS = [['HGLG11', 'CSHG Logística', 'Galpões logísticos'], ['KNRI11', 'Kinea Renda Imobiliária', 'Escritórios e galpões'], ['XPML11', 'XP Malls', 'Shopping centers'],
  ['VISC11', 'Vinci Shopping Centers', 'Shopping centers'], ['KNCR11', 'Kinea Rendimentos', 'Papel (CRI pós-fixado)'], ['MXRF11', 'Maxi Renda', 'Papel e desenvolvimento']];
async function fiis() {
  const res = [];
  for (const [t, nome, tipo] of FIIS) {
    try { const p = await proventos([t, nome, tipo]); res.push(Object.assign(p, { dyMes: +(p.dy / 12).toFixed(2) })); } catch (e) { /* segue */ }
  }
  return res;
}

// R$ 1.000 por mês nos últimos 5 anos: S&P 500 em reais (IVVB11), Ibovespa (BOVA11) e CDI
async function comparativo() {
  const mens = async (t) => {
    const d = await getJSON(`https://query2.finance.yahoo.com/v8/finance/chart/${t}.SA?range=5y&interval=1mo`);
    const r = d.chart.result[0];
    return r.timestamp.map((ts, i) => [dia(ts).slice(0, 7), r.indicators.quote[0].close[i]]).filter((x) => x[1]);
  };
  const [ivv, bova] = await Promise.all([mens('IVVB11'), mens('BOVA11')]);
  const ini = new Date(Date.now() - 5 * 365 * 86400000);
  const d0 = String(ini.getDate()).padStart(2, '0') + '/' + String(ini.getMonth() + 1).padStart(2, '0') + '/' + ini.getFullYear();
  const cdiRaw = await getJSON(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.4391/dados?formato=json&dataInicial=${d0}`);
  const cdi = {}; cdiRaw.forEach((x) => { const [, m, a] = x.data.split('/'); cdi[a + '-' + m] = parseFloat(String(x.valor).replace(',', '.')) / 100; });
  const meses = ivv.map((x) => x[0]).filter((m) => bova.find((b) => b[0] === m));
  const preco = (arr, m) => (arr.find((x) => x[0] === m) || [])[1];
  let qI = 0, qB = 0, vC = 0, ap = 0; const pts = [];
  meses.forEach((m, i) => {
    if (i > 0) vC *= 1 + (cdi[m] != null ? cdi[m] : 0);
    qI += 1000 / preco(ivv, m); qB += 1000 / preco(bova, m); vC += 1000; ap += 1000;
    pts.push({ m, ap, ivvb: Math.round(qI * preco(ivv, m)), bova: Math.round(qB * preco(bova, m)), cdi: Math.round(vC) });
  });
  return { de: meses[0], ate: meses[meses.length - 1], pts };
}

module.exports = { radar, taxas, dividendos, morning, global, fiis, comparativo };
