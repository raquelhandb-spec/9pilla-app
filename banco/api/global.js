const { global } = require('./_motor');

module.exports = async (req, res) => {
  try {
    const data = await global();
    if (!data.bolsas.length) throw new Error('fonte indisponível');
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
    res.status(200).json(data);
  } catch (e) {
    res.status(503).json({ erro: 'Dados globais indisponíveis agora' });
  }
};
