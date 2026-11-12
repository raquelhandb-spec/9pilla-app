# Roteiro de melhorias diárias do app 9Pilla (no ar)

App: https://9pilla-banco.vercel.app · código: pasta `banco/` deste repositório.

## Regras fixas (valem para toda melhoria)
- O app é EDUCATIVO e está em modo demonstração. Nunca escrever "compre", "venda", "entre agora" nem preço-alvo. Manter o aviso de que não é recomendação (Resolução CVM 20) e o aviso de modo demonstração.
- Nunca usar a palavra "aposta" e variações. Nunca usar travessão em texto corrido. Preferir "entender" a "aprender".
- PETR4, VALE3 e bancos aparecem como ativos acompanhados e exemplos educativos, nunca como carteira obrigatória (Resolução CVM 30).
- Cores da marca: menta #09C797, marinho #122B4A, verde logo #2FCD7F, creme #EFEFE4, floresta #0B2A1B, lima #7DF14E, menta claro #CEFBDA.
- Chaves de API só como variável secreta na Vercel (ex.: BRAPI_TOKEN), nunca no código.
- O app nunca pode quebrar: testar no tamanho de celular (390 px) antes de publicar, sem erros no console e sem rolagem lateral.
- Uma melhoria por dia, pequena e completa. Marcar [x] aqui com a data.

## Fila (fazer na ordem)
- [ ] Trilha "Entenda opções em 7 dias": um cartão educativo por dia, com quiz curto
- [ ] Explicação do dia no radar: frase simples sobre o que mudou desde o pregão anterior
- [ ] Glossário com busca
- [ ] Comparativo de bancos: ITUB4 x BBDC4 x BBAS3 com rendimento em dividendos e preço, em tom educativo
- [ ] Jogo da família: escolher o nome da família e o nome de cada integrante
- [ ] Extrato com filtro por tipo (Pix, caixinha, rendimento)

## Feitas
- [x] 12/11/2026 · App publicado: conta de demonstração com R$ 1,00, Pix, caixinha, renda fixa, metas, perfil, ações, opções (radar, estratégias, simulador, vencimentos, glossário), dividendos
- [x] 12/11/2026 · Morning Call ao vivo, Dinheiro que paga todo mês e Jogo da família
- [x] 12/11/2026 · Suporte à chave da BRAPI pela variável BRAPI_TOKEN
- [x] 12/11/2026 · Botão Atualizar respeita o cache de 15 minutos (consumo fixo da BRAPI)
- [x] 12/11/2026 · Tela Mundo: bolsas abertas agora (12 índices), moedas contra o real, efeito do dólar, conversor com IOF e spread, três caminhos para investir fora (ETFs, BDRs, conta no exterior) com impostos, ETFs globais e BDRs; Mundo entrou no menu no lugar do Pix (Pix segue no Início)
- [x] 12/11/2026 · R$ 1.000 por mês em 5 anos: IVVB11 x CDI x BOVA11 com gráfico (tela Mundo, api/extras)
- [x] 12/11/2026 · Agenda do mercado no Morning Call: Copom (datas do BC até dez/2027), vencimentos de opções e feriados da B3
- [x] 12/11/2026 · 6 FIIs reais com rendimento de 12 meses na tela Dinheiro que paga todo mês, com a média real como opção
- [x] 12/11/2026 · Tela Regras e transparência (BC, CVM 20 e 30, LGPD, CDC, impostos, fontes) e botão para apagar os dados do aparelho
