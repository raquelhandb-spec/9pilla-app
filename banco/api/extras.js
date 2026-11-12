// FIIs e comparativo de 5 anos: mudam pouco ao longo do dia, ficam guardados por 6 horas
const { fiis, comparativo } = require('./_motor');

module.exports = async (req, res) => {
  const [f, c] = await Promise.allSettled([fiis(), comparativo()]);
  const data = { fiis: f.status === 'fulfilled' ? f.value : [], comparativo: c.status === 'fulfilled' ? c.value : null };
  if (!data.fiis.length && !data.comparativo) return res.status(503).json({ erro: 'Dados indisponíveis agora' });
  res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');
  res.status(200).json(data);
};
