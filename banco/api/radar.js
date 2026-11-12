const { radar } = require('./_motor');

module.exports = async (req, res) => {
  try {
    const data = await radar();
    if (!data.ativos.length) throw new Error('fontes indisponíveis');
    // cache de 15 min na borda; serve versão anterior enquanto atualiza
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
    res.status(200).json(data);
  } catch (e) {
    res.status(503).json({ erro: 'Radar indisponível agora', detalhe: String(e.message || e) });
  }
};
