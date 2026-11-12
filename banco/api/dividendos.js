const { dividendos } = require('./_motor');

module.exports = async (req, res) => {
  try {
    const data = await dividendos();
    if (!data.ativos.length) throw new Error('fonte indisponível');
    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');
    res.status(200).json(data);
  } catch (e) {
    res.status(503).json({ erro: 'Proventos indisponíveis agora' });
  }
};
