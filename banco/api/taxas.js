const { taxas } = require('./_motor');

module.exports = async (req, res) => {
  try {
    const data = await taxas();
    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');
    res.status(200).json(data);
  } catch (e) {
    res.status(503).json({ erro: 'Taxas indisponíveis agora' });
  }
};
