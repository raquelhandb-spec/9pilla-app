const { morning } = require('./_motor');

module.exports = async (req, res) => {
  try {
    const data = await morning();
    if (!data.itens.length) throw new Error('fonte indisponível');
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
    res.status(200).json(data);
  } catch (e) {
    res.status(503).json({ erro: 'Morning Call indisponível agora' });
  }
};
