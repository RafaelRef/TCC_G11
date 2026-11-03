// Gera relatorio/TF1_Texto_Preliminar_G11.docx (formato Diretrizes USP / ABNT NBR 14724)
// Uso: node relatorio/gerar_relatorio.js   (a partir da raiz do repositório)
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, AlignmentType,
  HeadingLevel, PageBreak, Header, PageNumber, TableOfContents, StyleLevel,
  WidthType, BorderStyle, ShadingType, LevelFormat, HighlightColor, VerticalAlign,
} = require("docx");

const RAIZ = path.resolve(__dirname, "..");
const FIG = (f) => path.join(RAIZ, "figuras", f);
const FONT = "Arial";
const TXT_W = 9071; // largura útil (A4, margens 3/2 cm) em DXA
const FONTE_DADOS = "Fonte: elaborado pelos autores com dados da Hatzalá São Paulo (2026).";

// ---------- helpers de texto ----------
function runs(texto0, base = {}) {
  const texto = texto0.replace(/X\*/g, "X\u00a7");
  const T = (t) => t.replace(/\u00a7/g, "*");
  const partes = texto.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[\[[^\]]+\]\])/g).filter(Boolean);
  return partes.map((p) => {
    if (p.startsWith("**")) return new TextRun({ text: T(p.slice(2, -2)), bold: true, font: FONT, ...base });
    if (p.startsWith("[[")) return new TextRun({ text: T(p.slice(2, -2)), highlight: HighlightColor.YELLOW, font: FONT, ...base });
    if (p.startsWith("*")) return new TextRun({ text: T(p.slice(1, -1)), italics: true, font: FONT, ...base });
    return new TextRun({ text: T(p), font: FONT, ...base });
  });
}
const P = (t, o = {}) => new Paragraph({
  children: runs(t), alignment: AlignmentType.JUSTIFIED,
  indent: { firstLine: 709 }, spacing: { line: 360, after: 120 }, ...o,
});
const PC = (t, o = {}) => new Paragraph({ children: runs(t, o.run || {}), alignment: AlignmentType.CENTER, spacing: { line: 360, ...(o.spacing || {}) } });
const VAZIO = (n = 1) => Array.from({ length: n }, () => new Paragraph({ children: [], spacing: { line: 360 } }));
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: t.toUpperCase(), font: FONT })], pageBreakBefore: true });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t.toUpperCase(), font: FONT })] });
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: t, font: FONT })] });
const BUL = (t) => new Paragraph({ children: runs(t), numbering: { reference: "bullets", level: 0 }, alignment: AlignmentType.JUSTIFIED, spacing: { line: 360, after: 60 } });
let alineaRef = 0;
function ALINEAS(itens) {
  const ref = `alinea${alineaRef++}`;
  numeracoes.push({ reference: ref, levels: [{ level: 0, format: LevelFormat.LOWER_LETTER, text: "%1)", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1134, hanging: 425 } } } }] });
  return itens.map((t) => new Paragraph({ children: runs(t), numbering: { reference: ref, level: 0 }, alignment: AlignmentType.JUSTIFIED, spacing: { line: 360, after: 60 } }));
}
const numeracoes = [
  { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1134, hanging: 425 } } } }] },
];

// ---------- figuras e tabelas ----------
function dimPNG(arq) {
  const b = fs.readFileSync(arq);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
const contador = { Figura: 0, Tabela: 0 };
function legenda(rotulo, texto) {
  const n = ++contador[rotulo];
  return new Paragraph({
    style: rotulo === "Figura" ? "LegendaFigura" : "LegendaTabela",
    keepNext: true, alignment: AlignmentType.CENTER, spacing: { before: 240, after: 80 },
    children: [new TextRun({ text: `${rotulo} ${n}`, font: FONT, size: 20, bold: true }),
      new TextRun({ text: ` - ${texto}`, font: FONT, size: 20 })],
  });
}
const FONTE = (t) => new Paragraph({ children: runs(t, { size: 20 }), alignment: AlignmentType.CENTER, spacing: { after: 240 } });
function FIGURA(arq, texto, larguraPx = 580, fonte = FONTE_DADOS) {
  const { w, h } = dimPNG(FIG(arq));
  return [legenda("Figura", texto),
    new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, children: [new ImageRun({ type: "png", data: fs.readFileSync(FIG(arq)), transformation: { width: larguraPx, height: Math.round(larguraPx * h / w) } })] }),
    FONTE(fonte)];
}
const borda = { style: BorderStyle.SINGLE, size: 4, color: "808080" };
const bordas = { top: borda, bottom: borda, left: borda, right: borda };
function TABELA(texto, cabecalho, linhas, larguras, fonte = FONTE_DADOS, junta = true) {
  const total = larguras.reduce((a, b) => a + b, 0);
  const cel = (t, i, head, ultima) => new TableCell({
    borders: bordas, width: { size: larguras[i], type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
    shading: head ? { fill: "E8EEF7", type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 50, bottom: 50, left: 90, right: 90 },
    children: [new Paragraph({ keepNext: junta || head || ultima, keepLines: true, alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER, children: runs(String(t), { size: 18, bold: head }) })],
  });
  return [legenda("Tabela", texto),
    new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: larguras, rows: [
      new TableRow({ tableHeader: true, children: cabecalho.map((t, i) => cel(t, i, true)) }),
      ...linhas.map((l, k) => new TableRow({ cantSplit: true, children: l.map((t, i) => cel(t, i, false, k >= linhas.length - 2)) })),
    ] }),
    FONTE(fonte)];
}

// ---------- conteúdo ----------
const AUTORES = ["Erik Su", "Gustavo Blasbalg", "Rafael Eduardo Yosano Barros Fernandez", "Roni Fogelman"];
const TITULO = "Reserva de ambulâncias em áreas de alta densidade de ocorrências: a partir de que densidade vale a pena preservar a unidade local?";
const SUBTITULO = "um estudo por simulação calibrado com dados operacionais de São Paulo";

const capa = [
  PC("**UNIVERSIDADE DE SÃO PAULO (USP)**"), PC("**ESCOLA POLITÉCNICA (EP)**"), ...VAZIO(4),
  ...AUTORES.map((a) => PC(a)), ...VAZIO(4),
  PC(`**${TITULO}**`), PC(SUBTITULO), ...VAZIO(6),
  PC("São Paulo"), PC("2026"),
];
const rosto = [
  new Paragraph({ children: [new PageBreak()] }),
  PC("**UNIVERSIDADE DE SÃO PAULO (USP)**"), PC("**ESCOLA POLITÉCNICA (EP)**"), ...VAZIO(3),
  ...AUTORES.map((a) => PC(a)), ...VAZIO(3),
  PC(`**${TITULO}**`), PC(SUBTITULO), ...VAZIO(1), PC("**Versão Preliminar**"), ...VAZIO(3),
  new Paragraph({ indent: { left: 4535 }, alignment: AlignmentType.JUSTIFIED, spacing: { line: 240 }, children: runs("Trabalho de Formatura do Curso de Engenharia Civil apresentado à Escola Politécnica da Universidade de São Paulo para obtenção do título de Bacharel em Engenharia Civil.") }),
  ...VAZIO(1),
  new Paragraph({ indent: { left: 4535 }, spacing: { line: 240 }, children: runs("Orientador: Prof. Dr. Cláudio Barbieri da Cunha") }),
  ...VAZIO(5), PC("São Paulo"), PC("2026"),
];

const resumoTxt = "Em um serviço de atendimento pré-hospitalar (APH) com várias bases, a demanda não se distribui de modo uniforme: algumas áreas concentram muito mais ocorrências do que outras. A regra predominante na prática, enviar a viatura disponível mais próxima, faz com que a ambulância de uma área densa seja empenhada também em chamados não graves, deixando a área descoberta caso surja em seguida um chamado grave. A alternativa é preservar essa ambulância e atender o chamado não grave com uma viatura de uma área menos densa, aceitando um tempo de resposta maior nesse chamado. Este trabalho investiga a partir de que densidade de ocorrências de prioridade alta, medida em chamados por quilômetro quadrado por hora, essa reserva passa a compensar. A abordagem combina uma formulação analítica simples, que relaciona a densidade-limiar ao tempo de ocupação da viatura e ao peso relativo dos chamados graves, e simulação de eventos discretos. Os dados, cedidos pela Hatzalá São Paulo (401 chamados e 533 acionamentos de viaturas entre julho e outubro de 2026), são usados para calibrar um modelo genérico, e não para avaliar a operação desse serviço. A análise exploratória preliminar indica demanda média de cerca de quatro chamados por dia, dos quais 23% de prioridade alta, concentração espacial em torno de uma das três bases e tempo de resposta mediano de 7,8 minutos. Na zona mais densa, 16% dos chamados de prioridade alta encontraram a viatura local ocupada, na maioria das vezes com chamados não graves. Ainda assim, a probabilidade de surgir um chamado de prioridade alta durante a ocupação de uma viatura é de 3,4% nessa zona e de 6,1% no horário de pico, abaixo do limiar estimado, o que sugere que a reserva só compensa em densidades maiores que a observada ou com tempos de ocupação mais longos. No Trabalho de Formatura II será desenvolvido um simulador multizona que compare a regra do mais próximo com políticas de reserva em cenários de densidade crescente; os resultados esperados são curvas de desempenho em função da densidade e a densidade-limiar para cada cenário.";
const abstractTxt = "In a prehospital emergency medical service (EMS) with several stations, demand is not spatially uniform: some areas concentrate far more calls than others. The prevailing closest-idle rule commits the ambulance of a dense area to non-urgent calls as well, leaving the area uncovered if an urgent call arrives next. The alternative is to preserve that ambulance and serve the non-urgent call with a unit from a less dense area, accepting a longer response time for that call. This work investigates above which density of high-priority calls, measured in calls per square kilometre per hour, such a reservation pays off. The approach combines a simple analytical formulation, which links the threshold density to the unit busy time and to the relative weight of urgent calls, with discrete-event simulation. Data provided by Hatzalah São Paulo (401 calls and 533 vehicle dispatches between July and October 2026) are used to calibrate a generic model, not to evaluate that service. The preliminary exploratory analysis shows an average demand of about four calls per day, 23% of them high-priority, spatial concentration around one of the three stations and a median response time of 7.8 minutes. In the densest zone, 16% of high-priority calls found the local unit busy, mostly with non-urgent calls. Still, the probability that a high-priority call arrives while a unit is busy is 3.4% in that zone and 6.1% at peak hours, below the estimated threshold, which suggests that reservation only pays off at higher densities or longer busy times. In the second semester, a multi-zone simulator will compare the closest-idle rule with reservation policies under increasing density scenarios; the expected results are performance curves as a function of density and the threshold density for each scenario.";
const ref_resumo = "FERNANDEZ, R. E. Y. B. et al. **Reserva de ambulâncias em áreas de alta densidade de ocorrências: a partir de que densidade vale a pena preservar a unidade local?** 2026. Trabalho de Formatura (Bacharelado em Engenharia Civil) - Escola Politécnica, Universidade de São Paulo, São Paulo, 2026.";

const pre = [
  new Paragraph({ children: [new PageBreak()] }),
  PC("**RESUMO**", { spacing: { after: 240 } }),
  new Paragraph({ children: runs(ref_resumo), alignment: AlignmentType.JUSTIFIED, spacing: { line: 240, after: 240 } }),
  new Paragraph({ children: runs(resumoTxt), alignment: AlignmentType.JUSTIFIED, spacing: { line: 240, after: 240 } }),
  new Paragraph({ children: runs("**Palavras-chave:** Atendimento pré-hospitalar. Despacho de ambulâncias. Simulação de eventos discretos. Densidade de demanda. Pesquisa operacional."), spacing: { line: 240 } }),
  new Paragraph({ children: [new PageBreak()] }),
  PC("**ABSTRACT**", { spacing: { after: 240 } }),
  new Paragraph({ children: runs("FERNANDEZ, R. E. Y. B. et al. **Reserving ambulances in high call-density areas: above which density is it worth preserving the local unit?** 2026. Undergraduate Thesis (Bachelor in Civil Engineering) - Polytechnic School, University of São Paulo, São Paulo, 2026."), alignment: AlignmentType.JUSTIFIED, spacing: { line: 240, after: 240 } }),
  new Paragraph({ children: runs(abstractTxt), alignment: AlignmentType.JUSTIFIED, spacing: { line: 240, after: 240 } }),
  new Paragraph({ children: runs("**Keywords:** Prehospital care. Ambulance dispatching. Discrete-event simulation. Demand density. Operations research."), spacing: { line: 240 } }),
  new Paragraph({ children: [new PageBreak()] }),
  PC("**LISTA DE FIGURAS**", { spacing: { after: 240 } }),
  new TableOfContents("Lista de figuras", { hyperlink: true, stylesWithLevels: [new StyleLevel("LegendaFigura", 1)] }),
  new Paragraph({ children: [new PageBreak()] }),
  PC("**LISTA DE TABELAS**", { spacing: { after: 240 } }),
  new TableOfContents("Lista de tabelas", { hyperlink: true, stylesWithLevels: [new StyleLevel("LegendaTabela", 1)] }),
  new Paragraph({ children: [new PageBreak()] }),
  PC("**LISTA DE ABREVIATURAS E SIGLAS**", { spacing: { after: 240 } }),
  ...[["APH", "Atendimento pré-hospitalar"], ["DEA", "Desfibrilador externo automático"], ["MCLP", "Maximal Covering Location Problem"], ["MDP", "Markov Decision Process (processo de decisão markoviano)"], ["MEXCLP", "Maximum Expected Covering Location Problem"], ["OSRM", "Open Source Routing Machine"], ["PCR", "Parada cardiorrespiratória"], ["SAMU", "Serviço de Atendimento Móvel de Urgência"], ["SED", "Simulação de eventos discretos"], ["TF1, TF2", "Trabalho de Formatura I e II"], ["USA", "Unidade de suporte avançado de vida"], ["USB", "Unidade de suporte básico de vida"], ["VIR", "Veículo de intervenção rápida (denominação da unidade avançada na base de dados)"], ["VTR", "Viatura"]]
    .map(([s, d]) => new Paragraph({ spacing: { line: 360 }, tabStops: [{ type: "left", position: 1700 }], children: [new TextRun({ text: s, font: FONT, bold: true }), new TextRun({ text: `\t${d}`, font: FONT })] })),
  new Paragraph({ children: [new PageBreak()] }),
  PC("**SUMÁRIO**", { spacing: { after: 240 } }),
  new TableOfContents("Sumário", { hyperlink: true, headingStyleRange: "1-3" }),
];

// ===== 1 INTRODUÇÃO =====
const cap1 = [
  H1("1 Introdução"),
  H2("1.1 Contextualização"),
  P("O atendimento pré-hospitalar (APH) móvel é a etapa do cuidado de urgência em que o tempo pesa mais sobre o desfecho do paciente. Em uma parada cardiorrespiratória, por exemplo, De Maio et al. (2003) mostraram, com dados de 9.273 casos em Ontário, que a probabilidade de sobrevivência cai acentuadamente nos primeiros cinco minutos do intervalo até a desfibrilação, com redução das chances de sobrevida a cada minuto adicional de resposta. Por isso, decisões logísticas aparentemente simples, como qual viatura enviar a cada chamado, têm consequências clínicas diretas."),
  P("No Brasil, o Regulamento Técnico dos Sistemas Estaduais de Urgência e Emergência (BRASIL, 2002) organiza o APH móvel em tipos de viatura com níveis distintos de recurso. A unidade de suporte básico (USB) é tripulada por um condutor e um técnico ou auxiliar de enfermagem; a unidade de suporte avançado (USA) conta também com médico e enfermeiro e pode realizar procedimentos invasivos e administrar medicamentos. As USA são mais caras e, por isso, mais escassas: em São Paulo, das 77 bases do SAMU existentes em 2008, apenas quatro abrigavam os dois tipos de viatura (ANDRADE; CUNHA, 2015)."),
  P("Na cidade de São Paulo, o SAMU contava com cerca de 140 ambulâncias e enviava resposta a aproximadamente 1.500 pacientes por dia no período estudado por Andrade e Cunha (2015). Os autores registram ainda que o protocolo de despacho do serviço não especificava o tipo de ambulância em função da gravidade do chamado: essa decisão era tomada caso a caso pelos médicos reguladores. É esse tipo de decisão, descrita pelos autores como dependente do julgamento individual do regulador, que este trabalho pretende apoiar com um modelo quantitativo."),
  P("A dissertação que deu origem a esse artigo explicita a lacuna. Segundo Andrade (2012, p. 163), o procedimento de triagem do SAMU-SP não distinguia chamados que necessitam de viatura básica dos que necessitam de viatura avançada; por isso, embora o modelo proposto comportasse dois tipos de veículo, o estudo de caso foi simplificado para um único tipo. No artigo, os autores registram que o SAMU-SP planejava passar a registrar a necessidade de ambulâncias avançadas nos chamados (ANDRADE; CUNHA, 2015). A política estudada neste trabalho depende justamente de a triagem distinguir prioridades, e por isso a classificação de prioridade dos chamados é uma das etapas do trabalho (seção 4.4)."),
  H2("1.2 Problema"),
  P("Quando um chamado chega à central, o despachante dispõe de um conjunto de viaturas livres, em bases diferentes. A prática mais comum, e também a premissa da maior parte da literatura, é enviar a viatura disponível mais próxima (*closest idle*). Essa regra minimiza o tempo de resposta do chamado atual, mas ignora o efeito sobre os chamados futuros. O efeito é maior quando a demanda se concentra em uma área: a viatura da área densa é a mais próxima da maioria dos chamados, inclusive dos não graves, e passa boa parte do tempo ocupada. Se um chamado grave surgir na área enquanto ela atende um chamado não grave, ele terá de esperar uma viatura de outra base, mais distante."),
  P("A alternativa é preservar a viatura da área densa: quando chega um chamado não grave nessa área, envia-se uma viatura de uma área de menor densidade, que chega alguns minutos depois, e a viatura local continua livre para um eventual chamado grave. O problema deste trabalho é, portanto, um *trade-off* entre o tempo de resposta do chamado não grave presente e a disponibilidade local para chamados graves futuros. Como a chance de surgir um chamado grave durante a ocupação da viatura cresce com o número de chamados graves por unidade de área e de tempo, a pergunta pode ser formulada em termos de densidade: **a partir de que densidade de ocorrências de prioridade alta vale a pena preservar a viatura local?** A hipótese de trabalho do grupo, ainda a ser testada, é que essa densidade-limiar existe e depende do tempo de ocupação das viaturas, da diferença de tempo de resposta entre as bases e do peso atribuído aos chamados graves."),
  H2("1.3 Justificativa"),
  P("A literatura de pesquisa operacional aplicada a serviços de emergência mostra, há décadas, que a regra do mais próximo nem sempre é ótima. Carter, Chaiken e Ignall (1972) demonstraram, para duas unidades, que a fronteira de atendimento que minimiza o tempo médio de resposta pode diferir da fronteira equidistante. Mais recentemente, Jagtenberg, Bhulai e van der Mei (2017) obtiveram, em simulação de uma região dos Países Baixos, redução de 18% na fração de chegadas atrasadas em relação à regra do mais próximo, embora com aumento do tempo médio de resposta. Para sistemas com dois níveis de unidade, Bandara, Mayorga e McLay (2014) e Sudtachat, Mayorga e McLay (2014) concluíram que despachar considerando a prioridade do chamado aumenta a sobrevida esperada dos pacientes."),
  P("Os trabalhos brasileiros consultados até esta etapa concentram-se, em geral, na localização de bases e no dimensionamento de frotas (TAKEDA; WIDMER; MORABITO, 2007; IANNONI; MORABITO, 2007; ANDRADE; CUNHA, 2015). A política de despacho que considera a demanda futura de cada área, por sua vez, aparece menos. Essa constatação vale para a busca feita até aqui e será reavaliada com uma revisão sistemática no TF2. Do ponto de vista da Engenharia Civil, o tema se insere na área de transportes e logística urbana: envolve tempos de viagem em rede viária congestionada, localização de instalações e operação de sistemas de serviço espacialmente distribuídos."),
  H2("1.4 Fonte de dados"),
  P("Dados operacionais de APH com registro de horário por etapa do atendimento e indicação de gravidade raramente são públicos no Brasil. Este trabalho utiliza uma base cedida pela Hatzalá São Paulo, serviço voluntário de APH que opera na região central da cidade, com o registro de cada acionamento de viatura entre 21 de julho e 30 de outubro de 2026. **Os dados são usados para calibrar um modelo genérico de sistema com várias bases e demanda espacialmente heterogênea, e não para avaliar ou propor mudanças na operação da Hatzalá.** A escolha se justifica pela granularidade dos registros (horário de acionamento, saída, chegada à cena, saída para o hospital e liberação de cada viatura) e pela disponibilidade imediata; a demanda da Hatzalá é, além disso, fortemente concentrada em torno de uma das bases, o que torna a base um caso natural para a pergunta. As limitações decorrentes dessa escolha são discutidas na seção 4.12."),
  H2("1.5 Estrutura do texto"),
  P("Além desta introdução, o capítulo 2 apresenta os objetivos, a pergunta de pesquisa e as hipóteses. O capítulo 3 reúne a revisão bibliográfica. O capítulo 4 descreve a metodologia, incluindo o tratamento dos dados e o modelo de simulação proposto. O capítulo 5 traz a análise exploratória preliminar da base, com resultados provisórios. O capítulo 6 discute os resultados esperados e o capítulo 7 apresenta o cronograma do TF2."),
];

// ===== 2 OBJETIVOS =====
const cap2 = [
  H1("2 Objetivos"),
  H2("2.1 Objetivo geral"),
  P("Determinar, por meio de uma formulação analítica de referência e de simulação de eventos discretos calibrada com dados reais, a partir de que densidade de ocorrências de prioridade alta é preferível preservar a viatura de uma área densa, atendendo os chamados não graves dessa área com uma viatura de uma área menos densa."),
  H2("2.2 Objetivos específicos"),
  ...ALINEAS([
    "caracterizar a demanda, sua distribuição no espaço e ao longo do dia, e os tempos de cada etapa do atendimento a partir da base da Hatzalá São Paulo, explicitando regras de tratamento e limitações dos dados;",
    "propor e validar, com profissionais de APH, uma classificação de prioridade presumida (alta, média e baixa) a partir da queixa registrada na triagem;",
    "definir zonas de atendimento e medir a densidade de ocorrências de cada prioridade por zona e por faixa horária;",
    "construir um modelo de simulação de eventos discretos genérico e multizona, com bases fixas e tempos de viagem em rede viária, e validá-lo reproduzindo, sob a política observada, os indicadores medidos na base;",
    "comparar a regra do mais próximo com políticas de reserva da viatura local em cenários de densidade crescente;",
    "identificar, para cada cenário, a densidade-limiar δ§ a partir da qual a reserva compensa e traduzi-la em uma regra de despacho simples, por zona e faixa horária.",
  ]),
  H2("2.3 Pergunta de pesquisa e hipóteses"),
  P("**Pergunta de pesquisa:** em um sistema urbano de APH com bases localizadas em áreas de densidade de ocorrências distinta, a partir de que densidade de ocorrências de prioridade alta (chamados por km² por hora) vale a pena preservar a viatura da área densa e atender os chamados não graves dessa área com uma viatura de uma área menos densa, ainda que com tempo de resposta maior?"),
  P("As hipóteses abaixo são proposições do grupo, formuladas a partir da literatura e da análise exploratória, e serão testadas no TF2:"),
  ...ALINEAS([
    "**H1:** com a densidade observada na base de calibração, o ganho de preservar a viatura local é pequeno ou nulo, pois a probabilidade de chegar um chamado grave durante a ocupação da viatura é baixa;",
    "**H2:** existe uma densidade-limiar δ§, que diminui com o tempo de ocupação das viaturas e com o peso atribuído aos chamados graves;",
    "**H3:** como a demanda varia ao longo do dia, a reserva pode compensar apenas nos horários de pico, o que favorece regras por faixa horária;",
    "**H4:** erros de classificação de prioridade na triagem reduzem o benefício das políticas de reserva, em linha com o observado por McLay e Mayorga (2013) e Park e Lee (2019).",
  ]),
];

// ===== 3 REVISÃO =====
const cap3 = [
  H1("3 Revisão bibliográfica"),
  P("A revisão trata, nesta ordem, da organização do APH no Brasil, dos modelos de localização e cobertura de ambulâncias, dos modelos de filas espacialmente distribuídas, das políticas de despacho que questionam a regra do mais próximo, da simulação de sistemas de atendimento sob demanda e das métricas de desempenho. Uma síntese ao final posiciona este trabalho em relação aos estudos revisados."),
  H2("3.1 Atendimento pré-hospitalar e frota mista no Brasil"),
  P("A Portaria GM/MS nº 2.048/2002 aprova o Regulamento Técnico dos Sistemas Estaduais de Urgência e Emergência e estabelece os tipos de viatura do APH móvel, entre eles a USB e a USA (BRASIL, 2002). No modelo brasileiro, a central de regulação médica classifica a gravidade do chamado e decide o tipo de resposta. Andrade e Cunha (2015) descrevem que, no SAMU-SP, essa decisão não seguia uma regra formal por gravidade, cabendo ao médico regulador; descrevem também tempos de ocupação longos, de duas a quatro horas, em parte porque a equipe frequentemente precisa permanecer com o paciente no hospital até ser liberada. Esse ponto é relevante para o presente trabalho: quanto maior o tempo de ocupação, mais tempo a área fica descoberta quando sua viatura é empenhada em um chamado não grave."),
  P("Andrade (2012, p. 79-80) descreve o fluxo genérico de um sistema de ambulâncias: o operador da triagem registra a queixa e a gravidade e decide se há necessidade de viatura; os chamados que exigem viatura entram em uma fila de despachos com disciplina de prioridade, na qual os mais críticos são atendidos primeiro; e a equipe de despacho busca, para cada chamado, o veículo disponível mais próximo. A regra do mais próximo, portanto, é a prática descrita para o caso paulistano, e é ela que serve de referência (política P0) neste trabalho."),
  H2("3.2 Localização e cobertura"),
  P("Os modelos clássicos de localização definem onde posicionar bases e viaturas. O problema de cobertura de conjuntos (TOREGAS et al., 1971) busca o menor número de bases que cubra toda a demanda dentro de um tempo-limite, e o problema de máxima cobertura (CHURCH; REVELLE, 1974) maximiza a demanda coberta com uma frota fixa. Daskin (1983) introduziu no MEXCLP a probabilidade de a viatura estar ocupada, que cresce com a demanda da área que ela cobre, e Marianov e ReVelle (1996) trataram cada vizinhança como uma fila para garantir confiabilidade mínima de cobertura. Revisões abrangentes estão em Brotcorne, Laporte e Semet (2003) e Bélanger, Ruiz e Soriano (2019); estes últimos destacam a interação entre as decisões táticas de localização e as operacionais de despacho."),
  P("Para São Paulo, Andrade e Cunha (2015) formularam um modelo de localização de bases móveis e realocação de viaturas com dois tipos de veículo e períodos múltiplos, resolvido por uma heurística de colônia de abelhas. A aplicação ao SAMU-SP indicou que reposicionar seis bases móveis já existentes reduziria o tempo mínimo de cobertura viável de 27 para 16 minutos, cerca de 41% de melhoria, sem aumento de recursos. O trabalho é a principal referência nacional para este TCC e fornece parâmetros de contexto (tempos de ocupação, fatores de ajuste de velocidade por período do dia) que poderão ser usados na análise de sensibilidade."),
  H2("3.3 Filas espacialmente distribuídas"),
  P("O modelo hipercubo de filas (LARSON, 1974) representa cada viatura individualmente como servidor que pode estar livre ou ocupado, permitindo calcular cargas de trabalho e frações de despacho entre regiões. No Brasil, Takeda, Widmer e Morabito (2007) o aplicaram ao SAMU de Campinas para avaliar a descentralização das ambulâncias, concluindo que descentralizar melhora o tempo médio de resposta, mas que a descentralização total sugerida pelos operadores poderia não produzir resultados satisfatórios. Iannoni e Morabito (2007) estenderam o modelo para despachos múltiplos em rodovias, e Iannoni e Morabito (2008) o combinaram com algoritmos genéticos para decidir a localização das bases e o dimensionamento das regiões de cobertura em rodovias brasileiras, minimizando o tempo médio de resposta e o desbalanceamento das cargas de trabalho. Nesses sistemas, os autores destacam políticas de despacho particulares, como o *backup* parcial (apenas algumas viaturas podem atender cada trecho) e o despacho de mais de uma ambulância conforme o tipo de chamado, características que também aparecem na base usada neste trabalho. A limitação conhecida da abordagem é o crescimento exponencial do número de estados com o número de viaturas, o que favorece a simulação para sistemas maiores ou com regras de despacho mais complexas."),
  H2("3.4 Políticas de despacho além do mais próximo"),
  P("Carter, Chaiken e Ignall (1972) são a referência pioneira: para duas unidades que cooperam, a fronteira entre as áreas de resposta que minimiza o tempo médio pode diferir dos pontos equidistantes, isto é, nem sempre a unidade mais próxima deve atender. O resultado é o mais próximo da pergunta deste trabalho: quando uma das áreas é mais carregada, a fronteira se desloca de modo que a unidade da área menos carregada assuma parte dos chamados da área densa, preservando a disponibilidade da unidade mais demandada. Jagtenberg, Bhulai e van der Mei (2017) formularam o despacho como processo de decisão markoviano (MDP) e propuseram uma heurística que reduziu em 18% a fração de chegadas atrasadas, ao custo de aumentar o tempo médio de resposta; os próprios autores ressaltam que isso não torna a heurística preferível na prática, mas contesta a crença de que a regra do mais próximo seria quase ótima."),
  P("O grupo de McLay e Mayorga produziu a linha mais próxima da pergunta deste trabalho. Bandara, Mayorga e McLay (2012) formularam o despacho como MDP incorporando a urgência do chamado e medindo desempenho pela sobrevida, não por limites de tempo. Bandara, Mayorga e McLay (2014) avaliaram políticas por simulação e concluíram que despachar considerando a prioridade aumenta a sobrevida média. McLay e Mayorga (2013) incorporaram erros de classificação da triagem, e Sudtachat, Mayorga e McLay (2014) trataram explicitamente sistemas com duas camadas de unidade (básica e avançada). Estes últimos observam que enviar uma unidade próxima a um chamado de baixa prioridade pode torná-la indisponível para chamados graves futuros nas proximidades, que é precisamente o mecanismo estudado aqui. Park e Lee (2019) combinaram programação dinâmica aproximada e simulação para despacho e realocação em sistemas de dois níveis com erros de classificação, encontrando que a subtriagem prejudica mais o paciente do que a supertriagem."),
  H2("3.5 Simulação de sistemas de atendimento sob demanda"),
  P("Fora do contexto de emergência, Costa, Cunha e Arbex (2021) desenvolveram um modelo de simulação-otimização para avaliar um serviço de transporte sob demanda como alimentador de uma estação de metrô em São Paulo. A estrutura do modelo, adaptada de Häll, Högberg e Lundgren (2012 apud COSTA; CUNHA; ARBEX, 2021), tem quatro componentes: um gestor de entradas (demanda, frota, rede viária e parâmetros de nível de serviço), um controle da simulação (relógio, eventos e posição dos veículos), um gestor de solicitações, acionado a cada novo pedido para escolher o veículo que o atenderá, e um gestor de saídas. A analogia com o despacho de ambulâncias é direta: cada chamado chega de forma imprevisível, precisa ser atribuído imediatamente a um veículo e essa atribuição altera a disponibilidade da frota para os pedidos seguintes. Os autores avaliaram cenários de oferta e demanda medindo nível de serviço e uso da frota, o mesmo desenho experimental proposto aqui."),
  H2("3.6 Métricas de desempenho"),
  P("A métrica mais usada na prática é a fração de chamados atendidos dentro de um tempo-limite (por exemplo, 8 ou 10 minutos). McLay e Mayorga (2010) mostraram que a escolha da métrica altera a política ótima e defenderam medidas baseadas em sobrevida. Para PCR, De Maio et al. (2003) ajustaram por regressão logística uma função de sobrevida em relação ao intervalo até a desfibrilação, que pode ser usada para converter tempos de resposta simulados em sobrevida esperada. Essa curva mede o tempo até a desfibrilação, e todas as viaturas, inclusive as USB, dispõem de desfibrilador externo automático; na PCR, portanto, o fator decisivo é a chegada da primeira viatura, qualquer que seja o seu tipo. Esse é exatamente o efeito que a reserva da viatura local busca melhorar, de modo que a função de De Maio et al. (2003) pode ser usada neste trabalho como métrica complementar para os chamados de PCR. O mesmo raciocínio justifica tratar as viaturas de modo genérico: o estudo OPALS, que acrescentou suporte avançado a um sistema de desfibrilação rápida em 17 cidades canadenses, não encontrou aumento da sobrevida até a alta hospitalar (5,0% contra 5,1%), embora tenha observado mais retorno da circulação espontânea e mais internações (STIELL et al., 2004). A métrica principal, porém, será de tempo de resposta por prioridade, mais fácil de comunicar a gestores e aplicável a todos os chamados graves, e não só à PCR."),
  H2("3.7 Síntese e lacuna"),
  P("A Tabela 1 resume os trabalhos centrais. Em conjunto, eles sustentam que a regra do mais próximo pode ser melhorada quando há prioridades e tipos de unidade distintos, mas as políticas ótimas de MDP são difíceis de comunicar e de calibrar sem dados detalhados. A contribuição pretendida por este TCC é mais modesta e aplicada: estimar, para um sistema urbano brasileiro calibrado com dados reais, um limiar de decisão interpretável, expresso como densidade de ocorrências de prioridade alta (δ§), e mostrar como ele varia com o tempo de ocupação, com a distância entre as bases e com o peso dado aos chamados graves. Uma densidade-limiar tem a vantagem de poder ser comparada entre cidades e regiões, ao contrário de uma política ótima calculada para uma configuração específica."),
  ...TABELA("Síntese dos trabalhos centrais da revisão", ["Trabalho", "Problema", "Método", "Métrica principal"], [
    ["Carter, Chaiken e Ignall (1972)", "Áreas de resposta de 2 unidades", "Modelo analítico", "Tempo médio de resposta"],
    ["Larson (1974)", "Desempenho de frotas espacialmente distribuídas", "Hipercubo de filas", "Carga, tempo de resposta"],
    ["Takeda, Widmer e Morabito (2007)", "Descentralização no SAMU-Campinas", "Hipercubo de filas", "Tempo de resposta, carga"],
    ["Bandara, Mayorga e McLay (2012)", "Despacho com prioridade", "MDP", "Sobrevida"],
    ["McLay e Mayorga (2013)", "Despacho com erro de triagem", "MDP", "Cobertura de alto risco"],
    ["Bandara, Mayorga e McLay (2014)", "Despacho com prioridade", "Simulação + heurística", "Sobrevida"],
    ["Sudtachat, Mayorga e McLay (2014)", "Despacho com 2 tipos de unidade", "Simulação", "Sobrevida"],
    ["Iannoni e Morabito (2008)", "Bases e regiões de cobertura em rodovias", "Hipercubo + algoritmo genético", "Tempo de resposta, carga"],
    ["Andrade e Cunha (2015)", "Bases móveis do SAMU-SP", "PLI + heurística ABC", "Cobertura esperada"],
    ["Jagtenberg, Bhulai e van der Mei (2017)", "Despacho dinâmico", "MDP + heurística", "Fração de atrasos"],
    ["Park e Lee (2019)", "Despacho em 2 níveis com erro de triagem", "ADP + simulação", "Risco ao paciente"],
    ["Costa, Cunha e Arbex (2021)", "Transporte sob demanda em São Paulo", "Simulação-otimização", "Nível de serviço, frota"],
    ["**Este trabalho**", "**Reserva por densidade**", "**Analítico + simulação (SED)**", "**Resposta por prioridade**"],
  ], [2700, 2500, 2000, 1871], "Fonte: elaborado pelos autores."),
];

// ===== 4 METODOLOGIA =====
const cap4 = [
  H1("4 Metodologia"),
  H2("4.1 Visão geral"),
  P("O trabalho segue oito etapas, das quais as três primeiras foram realizadas no TF1 (Figura 1). A abordagem central é a simulação de eventos discretos (SED), escolhida em lugar de um MDP por três razões: permite representar tempos de viagem em rede real e distribuições empíricas sem hipóteses markovianas; produz como resultado um limiar interpretável, e não uma política em forma de tabela; e é viável no prazo de um TCC. O MDP e o hipercubo permanecem como referências teóricas e, se houver tempo, como verificação em instâncias pequenas."),
  P("O enquadramento da pergunta, que busca as condições em que uma alternativa supera outra, segue o desenho adotado por Masteguim e Cunha (2022), que usaram otimização e uma bateria de cenários para investigar em que condições uma rede de pontos de retirada é mais eficiente do que a entrega domiciliar na distribuição urbana de São Paulo. Aqui, a comparação é entre a regra do mais próximo e políticas de reserva da viatura local, e os cenários variam a densidade de ocorrências, o tempo de ocupação, a distância entre as bases e o erro de triagem."),
  ...FIGURA("fig_fluxograma.png", "Etapas do trabalho e sua divisão entre TF1 e TF2", 600, "Fonte: elaborado pelos autores."),
  H2("4.2 Base de dados"),
  P("A base foi extraída do sistema de despacho da Hatzalá São Paulo em 30/10/2026 e cobre o período de 21/07/2026 a 30/10/2026. Cada linha corresponde a um acionamento de viatura; um chamado atendido por duas viaturas aparece em duas linhas. São 539 acionamentos em 404 chamados (81 chamados sem viatura acionada ficaram fora da extração). Excluídos os 6 acionamentos de teste, de 3 chamados (regra R1, seção 4.3), restam 533 acionamentos em 401 chamados, que são os números usados nas análises. Para cada acionamento há: queixa principal e protocolo, viatura e tipo (USB ou USA), base, bairro e coordenadas aproximadas da ocorrência (arredondadas a cerca de 100 m), hospital de destino e os horários de acionamento, aceite, saída, chegada à cena, saída para o hospital, chegada ao hospital e liberação. A base já vem sanitizada, sem nome de paciente, telefone ou número da residência. Por se tratar de dado operacional de terceiros, ela não é publicada no repositório do trabalho; apenas os agregados o são."),
  P("A frota observada tem quatro viaturas: três USB, uma em cada base (Higienópolis, Jardins e Itaim), e uma unidade avançada, registrada como VIR, sediada em Higienópolis. Os horários são registrados pela própria tripulação no aplicativo, o que gera os problemas de qualidade tratados a seguir."),
  H2("4.3 Tratamento e qualidade dos dados"),
  P("As regras de limpeza estão na Tabela 2. Elas são provisórias e serão discutidas com o orientador. A regra mais impactante é a R3: 90 acionamentos têm deslocamento inferior a 30 segundos, o que indica que a tripulação registrou a saída e a chegada em sequência, depois do fato. A própria nota técnica da base alerta para esse comportamento."),
  ...TABELA("Regras de tratamento e quantidade de registros afetados", ["Regra", "Descrição", "Registros"], [
    ["R1", "Excluir chamados de teste do sistema", "6 acionamentos"],
    ["R2", "Marcar ocorrências fora do município ou a mais de 30 km da base", "5 acionamentos"],
    ["R3", "Deslocamento (saída-cena) válido entre 0,5 e 60 min", "90 abaixo; 4 acima"],
    ["R4", "Preparo (acionamento-saída) válido até 30 min", "33 acima"],
    ["R5", "Ocupação (acionamento-liberação) válida entre 1 e 240 min", "389 válidos"],
    ["Resultado", "Acionamentos com tempo de resposta válido (R2 a R4)", "334 de 533"],
  ], [1300, 5671, 2100]),
  H2("4.4 Classificação de prioridade presumida"),
  P("A base não traz uma classificação de prioridade, apenas a queixa principal e o protocolo de atendimento. O grupo definiu três classes (Tabela 3). São de prioridade alta as queixas com risco imediato à vida e dependentes da chegada rápida da primeira viatura: PCR, hemorragia, rebaixamento do nível de consciência, desmaio e síncope. São de prioridade média queixas potencialmente graves, mas em que o desfecho depende mais do transporte ao hospital do que de alguns minutos na chegada da viatura: AVC, dispneia, dor torácica, mal súbito, crise hipertensiva e queda da própria altura. São de prioridade baixa as queixas inespecíficas ou de baixo risco: mal-estar, desidratação e as categorias genéricas \"outros\" e \"outros Shabat\". As demais queixas foram encaixadas por analogia; a lista completa está no Apêndice A. [[As queixas não listadas pelo grupo (convulsão, engasgo, traumas, intoxicações, fraturas etc.) estão marcadas no Apêndice A e precisam de confirmação.]] **Essa classificação é um proxy elaborado pelo grupo e precisa ser validada com médicos reguladores ou profissionais de APH**, o que está previsto para o início do TF2."),
  ...TABELA("Classes de prioridade presumida e número de chamados", ["Classe", "Exemplos de queixas", "Chamados", "%"], [
    ["Alta", "PCR, hemorragia, rebaixamento do nível de consciência, desmaio, síncope", "92", "23"],
    ["Média", "AVC, dispneia, dor torácica, mal súbito, crise hipertensiva, queda da própria altura", "152", "38"],
    ["Baixa", "Mal-estar, desidratação, \"outros\", \"outros Shabat\"", "157", "39"],
  ], [1600, 5271, 1200, 1000]),
  H2("4.5 Localização das bases"),
  P("A planilha informa o endereço das bases, mas não suas coordenadas; informa, porém, a distância em linha reta entre a base e cada ocorrência. As coordenadas de cada base foram estimadas por trilateração, minimizando por mínimos quadrados robustos a diferença entre a distância informada e a distância calculada até as coordenadas das ocorrências. O erro mediano resultante foi de cerca de 20 m nas três bases, compatível com o arredondamento das coordenadas das ocorrências."),
  H2("4.6 Densidade de ocorrências: definição e unidade"),
  P("A densidade precisa de uma área e de um intervalo de tempo de referência. Como área, adota-se a **zona de atendimento** de cada base, isto é, a região em que ela é a base mais próxima em tempo de viagem pela rede viária; a área da zona j é A*j* (km²). Para mapas e para a análise de sensibilidade, a mesma contagem é feita em uma malha regular (nesta etapa, quadrados de 1 km², seção 5.6; no TF2, hexágonos), o que permite identificar áreas densas sem depender da posição atual das bases."),
  P("A densidade de ocorrências de prioridade alta da zona j na faixa horária h é δ*j*(h) = N*j*(h) / (A*j* · T*h*), em que N*j*(h) é o número de chamados de prioridade alta observados na zona e na faixa e T*h* é o total de horas daquela faixa no período. **A unidade adotada no modelo é chamados por km² por hora**, por duas razões: as chegadas de chamados e os tempos de ocupação são modelados em horas, e a demanda varia muito ao longo do dia (seção 5.1), de modo que uma média diária esconderia justamente os horários em que a reserva pode compensar. Para apresentação, os valores também serão expressos em chamados por km² por dia (multiplicando por 24), que são números mais legíveis com a demanda observada."),
  P("A densidade, sozinha, não decide a política: o que importa é o número esperado de chamados graves na zona durante a ocupação da viatura, m*j* = δ*j* · A*j* · S, em que S é o tempo médio de ocupação, e esse número é adimensional. Para uma configuração de bases fixa, A*j* é constante e δ*j* e m*j* são proporcionais; a densidade é preferida por permitir comparar zonas de tamanhos diferentes e outras cidades."),
  H2("4.7 Formulação analítica de referência"),
  P("Antes da simulação, a decisão pode ser aproximada por um balanço simples, proposto pelo grupo como referência e verificação do simulador. Considere um chamado não grave na zona densa, servida pela viatura L, e uma viatura F de uma zona menos densa. Enviar L dá ao chamado não grave o menor tempo de resposta; enviar F aumenta esse tempo em Δ*n* minutos. Se L for enviada, ela fica ocupada por S horas; se nesse intervalo surgir um chamado grave na zona, o que ocorre com probabilidade p = 1 − exp(−λ*j* · S), ele será atendido por F, com Δ*g* minutos a mais. Atribuindo peso w a cada minuto de espera de um chamado grave em relação a um minuto de um chamado não grave, a reserva compensa quando w · p · Δ*g* > Δ*n*."),
  P("Com Δ*g* ≈ Δ*n*, o que vale quando as duas zonas são vizinhas, a condição se reduz a p > 1/w, e a densidade-limiar é δ§ = −ln(1 − 1/w) / (S · A*j*). Com S = 73 min (ocupação média das USB, seção 5.3) e w = 10, a taxa-limiar de chamados graves na zona é de 0,087 por hora, ou cerca de 2,1 por dia. A formulação ignora que F também pode estar ocupada, que podem surgir vários chamados graves no mesmo intervalo e que os tempos de viagem variam; essas simplificações são precisamente o que a simulação resolve. Ela tem, porém, duas utilidades: mostra que δ§ depende de S, de w e da área da zona, e fornece uma ordem de grandeza para verificar os resultados do simulador. A seção 5.6 estima Δ*g* e Δ*n* com os dados da base de calibração e encontra valores próximos, de 8 a 9 minutos, o que sustenta a aproximação Δ*g* ≈ Δ*n*."),
  H2("4.8 Modelo de simulação"),
  P("O simulador, a ser implementado em Python com a biblioteca SimPy, representa um sistema genérico com N viaturas distribuídas em bases fixas, cada uma associada a uma zona de atendimento. O tipo da viatura (USB ou USA) é mantido como atributo, mas a decisão estudada é de qual base enviar. Sua arquitetura seguirá os quatro módulos de Costa, Cunha e Arbex (2021): gestor de entradas, controle da simulação, gestor de chamados (onde a política de despacho é aplicada a cada novo chamado) e gestor de saídas. Os componentes e a fonte de cada parâmetro são:"),
  ...ALINEAS([
    "**chegada de chamados:** processo de Poisson não homogêneo por zona, com taxa por hora do dia estimada da base e multiplicada por um fator de carga k*d* na zona densa, o que permite variar a densidade dessa zona mantendo as demais;",
    "**local da ocorrência:** reamostragem (*bootstrap*) das coordenadas observadas em cada zona, preservando a distribuição espacial;",
    "**prioridade:** sorteio segundo as proporções observadas por classe, com uma probabilidade e de erro de classificação na triagem;",
    "**tempo de viagem:** matriz de tempos em rede viária obtida com o OSRM sobre o OpenStreetMap, corrigida por um fator calibrado com os deslocamentos observados; a seção 5.4 mostra por que a distância em linha reta não é suficiente;",
    "**tempo de preparo e de ocupação:** distribuições empíricas por tipo de viatura, separando atendimentos com e sem transporte ao hospital;",
    "**retorno à base:** após a liberação, a viatura volta à sua base e só então passa a cobrir novamente a sua zona.",
  ]),
  H2("4.9 Políticas de despacho"),
  P("Serão comparadas quatro políticas. Em todas, chamados de prioridade alta recebem a viatura disponível mais próxima."),
  ...ALINEAS([
    "**P0 (mais próxima):** todo chamado recebe a viatura disponível mais próxima;",
    "**P1 (prática observada):** reproduz a composição de resposta observada na base, para fins de validação;",
    "**P2 (reserva por densidade):** nas zonas e faixas horárias com densidade de prioridade alta igual ou superior a um valor de referência, a viatura local é reservada; os chamados de prioridade baixa dessa zona são atendidos pela viatura disponível mais próxima de outra zona, desde que ela chegue até Δ*máx* minutos depois da local; se nenhuma outra estiver livre ou o acréscimo for maior, envia-se a local. Uma variante (P2b) estende a reserva aos chamados de prioridade média;",
    "**P3 (reserva total):** como P2, mas sem o limite Δ*máx*.",
  ]),
  P("Para cada cenário, a densidade da zona densa será aumentada progressivamente (fator k*d*), e a densidade-limiar δ§ será aquela a partir da qual P2 supera P0 na métrica M3. O limite Δ*máx* será varrido de 0 a 20 minutos em passos de 2 minutos; P0 corresponde a Δ*máx* = 0 e P3 a Δ*máx* tendendo a infinito. Os dados da seção 5.6 sugerem que a variante P2b tende a ser a mais relevante: dos 11 chamados de prioridade alta que encontraram a viatura local ocupada, reservá-la só contra chamados de prioridade baixa teria evitado no máximo 4, e incluir a prioridade média, até 9."),
  H2("4.10 Métricas"),
  ...ALINEAS([
    "**M1:** tempo de resposta dos chamados de prioridade alta (média, percentil 90 e fração atendida em até 10 min, com sensibilidade para 8 e 15 min), na zona densa e no sistema;",
    "**M2:** tempo de resposta dos chamados de prioridade média e baixa, que mede o custo da reserva;",
    "**M3:** tempo de resposta ponderado pela prioridade, com peso w para os chamados de prioridade alta e 1 para os de prioridade baixa (peso intermediário para a média), usado para definir δ§; como w é um juízo de valor, os resultados serão apresentados para vários valores (por exemplo, 5, 10 e 20);",
    "**M4:** sobrevida esperada nos chamados de PCR, pela função de De Maio et al. (2003), como métrica complementar (seção 3.6);",
    "**M5:** utilização de cada viatura e equilíbrio de carga entre as bases.",
  ]),
  H2("4.11 Cenários, experimentos e validação"),
  P("Os experimentos cruzarão as políticas com fatores de carga k*d* na zona densa (1, 2, 5, 10 e 20 vezes a demanda observada), tempos de ocupação (o observado e valores de duas a quatro horas, como os relatados para o SAMU-SP por Andrade e Cunha, 2015), distâncias entre as bases (a configuração observada e afastamentos sintéticos), pesos w e taxas de erro de triagem. Cada combinação será replicada ao menos 30 vezes, com intervalos de confiança de 95% para as métricas. A validação consistirá em simular P1 com k*d* = 1 e comparar com os valores observados: distribuição dos tempos de resposta, utilização das viaturas e frequência de chamados de prioridade alta que encontram a viatura local ocupada (16% na zona de Higienópolis, seção 5.6)."),
  H2("4.12 Limitações conhecidas"),
  ...ALINEAS([
    "a área de calibração é pequena e densa; os tempos de deslocamento não representam a periferia, o que será tratado como cenário de sensibilidade;",
    "a densidade depende da definição das zonas; zonas por base e malha regular serão comparadas, e o arredondamento das coordenadas (cerca de 100 m) limita a resolução da malha;",
    "a unidade avançada da base tem registros de horário muito incompletos (seção 5.5) e não transporta pacientes (seção 5.3); como o modelo trata as viaturas de modo genérico, isso afeta mais a validação do que a pergunta principal;",
    "o serviço é voluntário e tem perfil de demanda próprio (por exemplo, o padrão de chamados no Shabat), o que limita a generalização direta dos parâmetros;",
    "o período de cerca de 100 dias não captura sazonalidade anual, e com 92 chamados de prioridade alta a densidade por zona e faixa horária terá incerteza elevada.",
  ]),
];

// ===== 5 ANÁLISE EXPLORATÓRIA =====
const cap5 = [
  H1("5 Análise exploratória preliminar"),
  P("Este capítulo apresenta resultados provisórios obtidos com os scripts do repositório do trabalho (pasta analise/). Eles cumprem dois papéis: caracterizar a base que vai parametrizar o simulador e verificar, empiricamente, se o fenômeno estudado de fato ocorre."),
  H2("5.1 Demanda"),
  P("Após a exclusão dos testes, restaram 401 chamados em 101 dias, cerca de quatro chamados por dia. A demanda se concentra no período diurno, com pico entre 8 h e 10 h; o intervalo das 8 h às 14 h reúne 41% dos chamados, e a madrugada (0 h às 6 h), 11% (Figura 2). Não há diferença marcante entre os dias da semana. Espacialmente, 63% dos chamados ocorreram em quatro bairros (Santa Cecília, Higienópolis, Perdizes e Bom Retiro), próximos à base de Higienópolis (Figura 3). É essa concentração que dá sentido à pergunta deste trabalho: a viatura de Higienópolis é a mais próxima da maioria dos chamados, graves ou não."),
  ...FIGURA("fig_demanda_temporal.png", "Distribuição dos chamados por hora do dia e por dia da semana", 600),
  ...FIGURA("fig_mapa_ocorrencias.png", "Localização das ocorrências por classe de prioridade e posição estimada das bases", 470),
  H2("5.2 Prioridade e composição da resposta"),
  P("Pela classificação adotada, 23% dos chamados são de prioridade alta (92), 38% de prioridade média (152) e 39% de prioridade baixa (157) (Figura 4). A Tabela 4 mostra que a unidade avançada participou de 52% dos chamados de prioridade alta, de 20% dos de prioridade média e de 8% dos de prioridade baixa, e que os chamados de prioridade alta são os que mais mobilizam mais de uma viatura. Isso indica que a composição da resposta já acompanha a prioridade na prática, mas é decidida caso a caso, e não por uma regra fixa."),
  ...FIGURA("fig_gravidade.png", "Chamados por classe de prioridade presumida", 520),
  ...TABELA("Perfil dos chamados por classe de prioridade", ["Prioridade", "Chamados", "Com USA (%)", "Com transporte ao hospital (%)", "Viaturas por chamado"], [
    ["Alta", "92", "52,2", "76,1", "1,6"], ["Média", "152", "20,4", "88,2", "1,3"],
    ["Baixa", "157", "8,3", "86,0", "1,2"],
  ], [1900, 1500, 1700, 2271, 1700]),
  H2("5.3 Tempos de atendimento"),
  P("A Tabela 5 resume os tempos por tipo de viatura, considerando apenas os registros válidos. Para as USB, o tempo de resposta (acionamento até a chegada à cena) tem mediana de 7,8 min e percentil 90 de 15,7 min. A unidade avançada tem apenas 24 registros válidos de resposta, com mediana de 9,4 min; por isso, seus números devem ser lidos com cautela. A ocupação das USB tem média de 73 min e mediana de 65 min; a média é o valor usado nas seções 4.7 e 5.6. A Figura 5 mostra as distribuições acumuladas."),
  ...TABELA("Tempos por tipo de viatura (minutos, registros válidos)", ["Etapa", "Tipo", "n", "Média", "Mediana", "P25", "P75", "P90"], [
    ["Preparo", "USB", "310", "1,9", "1,0", "0,4", "2,9", "4,6"], ["Preparo", "USA", "24", "3,5", "0,8", "0,6", "2,0", "8,3"],
    ["Deslocamento", "USB", "310", "7,2", "6,0", "3,8", "8,9", "12,7"], ["Deslocamento", "USA", "24", "10,1", "7,6", "5,1", "10,4", "14,6"],
    ["Resposta", "USB", "310", "9,1", "7,8", "5,5", "11,1", "15,7"], ["Resposta", "USA", "24", "13,5", "9,4", "7,1", "13,0", "26,3"],
    ["Ocupação", "USB", "370", "73,0", "65,4", "49,6", "85,9", "125,8"], ["Ocupação", "USA", "19", "78,9", "68,2", "53,2", "92,2", "116,0"],
  ], [1700, 800, 700, 1100, 1100, 1100, 1100, 1471]),
  ...FIGURA("fig_tempo_resposta_ecdf.png", "Distribuição acumulada do tempo de resposta por tipo de viatura", 540),
  P("A decomposição do ciclo de atendimento (Figura 6) revela um ponto importante para o modelo: a mediana do trajeto ao hospital da unidade avançada é praticamente nula, o que é coerente com a função dessa viatura: a VIR é um veículo de intervenção rápida, que não transporta pacientes, e o transporte fica a cargo da USB. Em um ciclo típico de USB, o tempo em cena (22 min) e o trajeto ao hospital (9 min) superam o deslocamento até a ocorrência (6 min). Esse padrão reforça o argumento de Andrade e Cunha (2015) de que o tempo de ocupação, e não só o de viagem, determina a disponibilidade do sistema."),
  ...FIGURA("fig_etapas_atendimento.png", "Mediana das etapas do ciclo de atendimento por tipo de viatura", 560),
  H2("5.4 Relação entre distância e tempo de deslocamento"),
  P("Ajustou-se uma regressão linear entre a distância em linha reta da base à ocorrência e o tempo de deslocamento das USB (Figura 7). O resultado, t = 5,1 + 0,81 d (t em minutos e d em km, n = 306), tem R² de apenas 0,12. Duas razões explicam o baixo ajuste: a viatura nem sempre está na base quando é acionada, e a distância em linha reta ignora a rede viária. Para os 25 acionamentos com distância por rota calculada a partir do GPS da viatura (disponível só a partir de setembro de 2026), o R² sobe para 0,33. A conclusão metodológica é que o simulador deve usar tempos de viagem em rede, calibrados com os deslocamentos observados, e não uma função da distância euclidiana. Como referência de ordem de grandeza, a velocidade mediana medida em linha reta foi de 15 km/h, o mesmo valor que Costa, Cunha e Arbex (2021) adotaram para viagens de automóvel no pico em São Paulo; as medidas não são equivalentes (a velocidade em rede é maior que a medida em linha reta, e as viaturas de emergência têm prioridade no trânsito), mas a coincidência sugere que os dados estão em uma faixa plausível."),
  ...FIGURA("fig_tempo_viagem.png", "Tempo de deslocamento das USB em função da distância em linha reta da base", 520),
  H2("5.5 Disponibilidade da unidade avançada"),
  P("A unidade avançada foi acionada 92 vezes. Apenas 29 desses acionamentos terminaram com o status \"finalizada\"; os demais ficaram parados em estados intermediários (27 em \"aceitou\", 18 em \"em cena\"), sinal de que a tripulação não registrou as etapas seguintes. Para estimar quando a USA esteve ocupada, considerou-se, nos 60 empenhos sem horário de liberação, uma ocupação igual à mediana observada nos registros completos (68 min). Essa imputação é a principal fragilidade desta análise."),
  P("Com essa hipótese, verificou-se, para cada chamado, se a USA estava ocupada em outro atendimento no momento em que ele chegou. A Figura 8 mostra que isso ocorreu em 4 dos 92 chamados de prioridade alta (4,3%), com frequência parecida nas três classes. A Tabela 6 detalha com quem a USA estava ocupada: nos 4 casos de prioridade alta, ela atendia 1 chamado de prioridade alta, 2 de média e 1 de baixa."),
  ...FIGURA("fig_conflitos_usa.png", "Chamados que chegaram com a unidade avançada ocupada, por classe de prioridade", 540),
  ...TABELA("Chamados que chegaram com a USA ocupada, pela prioridade do chamado que a ocupava", ["Chamado que chegou", "USA ocupada com: Alta", "Média", "Baixa"], [
    ["Alta (4)", "1", "2", "1"], ["Média (7)", "1", "4", "2"], ["Baixa (6)", "5", "0", "1"],
  ], [2671, 2400, 2000, 2000]),
  P("Como verificação, a probabilidade de a USA estar ocupada foi estimada também por um modelo de perda de Erlang com um servidor: com 79 empenhos efetivos em 2.414 horas e ocupação média de cerca de 70 minutos, a intensidade de tráfego é de 0,039 e a probabilidade de bloqueio, de 3,7%. O valor observado para chamados de prioridade alta (4,3%) é próximo desse valor teórico. Esses números sustentam provisoriamente a hipótese H1: com a carga atual, o conflito existe, mas é pouco frequente."),
  P("Por fim, nos 44 chamados em que a USA e uma USB chegaram à cena, a USB chegou primeiro em 68% dos casos (Figura 9). Há, porém, 18 casos com diferença superior a 30 minutos em módulo, muito provavelmente por registro tardio. Excluídos esses extremos (n = 26), a diferença mediana cai para 1,2 minuto, e a USA chega antes em 42% dos casos. Ou seja, quando ambas são acionadas para o mesmo chamado, a USA e a USB costumam chegar em tempos próximos. A diferença de tempo entre a viatura local e a de uma base vizinha, que corresponde a Δ*n* e Δ*g* na formulação da seção 4.7, é estimada na seção 5.6."),
  ...FIGURA("fig_diferenca_chegada.png", "Diferença entre os horários de chegada da USA e da USB nos chamados atendidos por ambas", 540),
  H2("5.6 Densidade de ocorrências de prioridade alta"),
  P("Com a nova classificação, houve 92 chamados de prioridade alta em 2.414 horas, uma taxa de 0,038 chamado por hora (0,91 por dia) em toda a área atendida. Com a ocupação média das USB (73 min), o número esperado de chamados de prioridade alta durante uma ocupação é de 0,046, e a probabilidade de surgir pelo menos um é de 4,5%. Como a taxa de qualquer zona é menor ou igual à do sistema, 4,5% é um limite superior para p em cada zona. Pela formulação da seção 4.7, a reserva só compensaria hoje se um minuto de espera em um chamado grave valesse mais de 22 minutos em um chamado não grave (w > 1/p). Com w = 10, a taxa de chamados de prioridade alta na zona precisaria ser cerca de 2,3 vezes a de toda a área observada. Esse resultado é coerente com a hipótese H1 e reforça a necessidade de cenários de densidade maior. O detalhamento por zona confirma e qualifica esse quadro."),
  P("A Figura 10 e a Tabela 7 detalham a densidade por zona de atendimento. Como a matriz de tempos em rede ainda não foi gerada, as zonas foram aproximadas pela base mais próxima em linha reta, dentro da área efetivamente atendida (envoltória convexa das ocorrências, sem os 2% mais afastadas). A zona de Higienópolis concentra cerca de três quartos dos chamados e 68 dos 92 de prioridade alta, e tem a maior densidade: 0,0016 chamado de prioridade alta por km² por hora (0,038 por km² por dia), cerca de quatro vezes a das outras duas zonas. Nessa zona, a probabilidade de surgir um chamado de prioridade alta durante uma ocupação de 73 min é de 3,4%, um terço do limiar calculado na seção 4.7 com w = 10."),
  P("A variação ao longo do dia é grande. Das 8 h às 14 h, a densidade de prioridade alta na zona de Higienópolis sobe para 0,0029 por km² por hora, e a probabilidade de um chamado grave durante a ocupação chega a 6,1%, cerca de 60% do limiar com w = 10. Com o tempo de ocupação observado, a densidade nesse horário precisaria crescer cerca de 1,7 vez para a reserva compensar; com ocupações a partir de cerca de 2 h, como as relatadas para o SAMU-SP, o limiar seria atingido nesse horário. Esse resultado sustenta a hipótese H3 e mostra por que a unidade de densidade deve ser por hora. Em uma malha de 1 km², a célula mais densa, em torno da base de Higienópolis, reúne 113 chamados (28% do total), 21 deles de prioridade alta; como a viatura atende uma zona muito maior que 1 km², é a densidade da zona, e não a da célula, que entra na decisão."),
  ...FIGURA("fig_densidade.png", "Zonas de atendimento e densidade de chamados de prioridade alta por faixa horária", 600),
  ...TABELA("Densidade de chamados de prioridade alta por zona de atendimento", ["Zona", "Área (km²)", "Chamados", "Prioridade alta", "Por km² por hora", "Por km² por dia", "p (%)"], [
    ["Higienópolis", "17,8", "305", "68", "0,0016", "0,038", "3,4"],
    ["Jardins", "14,8", "62", "16", "0,0004", "0,011", "0,8"],
    ["Itaim", "9,3", "31", "8", "0,0004", "0,009", "0,4"],
  ], [1700, 1200, 1200, 1300, 1400, 1300, 971], "Fonte: elaborado pelos autores com dados da Hatzalá São Paulo (2026). p: probabilidade de surgir um chamado de prioridade alta na zona durante uma ocupação de 73 min."),
  P("Por fim, verificou-se o fenômeno diretamente: dos 68 chamados de prioridade alta na zona de Higienópolis, 11 (16%) chegaram com a USB local (VTR 01) ocupada em outro chamado, 9 deles de prioridade média ou baixa (5 e 4, respectivamente). Para os 22 acionamentos da VTR 01 sem horário de liberação, adotou-se a ocupação mediana (60 min). A frequência é maior que a probabilidade p porque a VTR 01 fica ocupada também com chamados de outras zonas: sua utilização média é de 11%, e o uso se concentra nas horas de pico. Uma política que reservasse a VTR 01 só contra chamados de prioridade baixa teria evitado no máximo 4 desses 11 casos; estendida à prioridade média, até 9. **É exatamente a situação que motiva este trabalho, e ela aparece nos dados reais**, ainda que com baixa frequência. O custo desses conflitos, e o que a reserva imporia aos chamados não graves, são estimados a seguir."),
  P("Para estimar Δ*g* e Δ*n* da seção 4.7, comparou-se o tempo de resposta, contado a partir do chamado, nas situações com e sem a viatura local (Tabela 8 e Figura 11). Nos chamados de prioridade alta da zona de Higienópolis, a primeira USB chegou com mediana de 7,6 min quando a VTR 01 estava livre e de 16,0 min quando ela estava ocupada (9 dos 11 casos têm horário válido), quase sempre com viaturas de Itaim ou Jardins; Δ*g* é, portanto, da ordem de 8 a 9 min. Nos chamados de prioridade média e baixa da zona, a USB levou 6,3 min quando era a VTR 01 e 9,7 min quando veio de outra base, uma diferença de 3,4 min. Esse valor tende a subestimar Δ*n*, porque a central envia outra base sobretudo quando a ocorrência fica mais perto dela, na borda da zona. Como referência, a diferença entre a distância em linha reta da ocorrência à base vizinha mais próxima e à base de Higienópolis, convertida pela velocidade mediana de 15 km/h (seção 5.4), é de 8,7 min para uma ocorrência típica da zona, praticamente igual a Δ*g*."),
  P("Os dados sustentam, assim, a aproximação Δ*g* ≈ Δ*n* da seção 4.7. Se o Δ*n* efetivo fosse de fato 3,4 min, a condição w · p · Δ*g* > Δ*n* com w = 10 seria satisfeita a partir de p ≈ 4%, e a reserva já compensaria no horário de pico da zona (p = 6,1%). Por causa do viés apontado, essa leitura não é conclusiva e deverá ser verificada no simulador, com tempos de viagem em rede viária."),
  ...FIGURA("fig_custo_reserva.png", "Tempo de resposta na zona de Higienópolis com e sem a viatura local", 600),
  ...TABELA("Tempo de resposta na zona de Higienópolis com e sem a viatura local (minutos desde o chamado)", ["Chamados", "Situação", "Total", "Válidos", "Mediana", "P25", "P75"], [
    ["Prioridade alta", "VTR 01 livre", "57", "36", "7,6", "5,9", "9,7"],
    ["Prioridade alta", "VTR 01 ocupada", "11", "9", "16,0", "15,3", "17,7"],
    ["Média e baixa", "USB local (VTR 01)", "139", "139", "6,3", "4,5", "8,3"],
    ["Média e baixa", "USB de outra base", "55", "55", "9,7", "6,1", "15,7"],
    ["Referência", "Base vizinha − local (linha reta, 15 km/h)", "305", "305", "8,7", "5,5", "10,3"],
  ], [1500, 2771, 900, 900, 1000, 1000, 1000], "Fonte: elaborado pelos autores com dados da Hatzalá São Paulo (2026). Prioridade alta: primeira chegada de uma USB; média e baixa: resposta da USB que atendeu."),
  P("Na base estudada, a falta da viatura local é parcialmente compensada pela unidade avançada. A VIR, sediada em Higienópolis, não transporta pacientes, mas leva cardioversor, medicamentos e material de acesso que as USB não têm: ao chegar à cena, ela transforma o atendimento da USB em suporte avançado e pode seguir para outro chamado grave enquanto a USB leva o paciente ao hospital. Em 10 dos 11 conflitos a VIR estava livre, e ela foi acionada em 7. Nos 3 casos com horário de chegada plausível, ela chegou em 6,8, 8,0 e 10,5 min, tempos comparáveis aos da viatura local, enquanto a USB que transportaria o paciente levou cerca de 16 min. Para o atendimento avançado, o custo do conflito foi menor que Δ*g*; o que se atrasou foi sobretudo o transporte. Esse arranjo é próprio da base de calibração e não entra no modelo genérico, e os registros incompletos da VIR (seção 5.5) impedem medir seu efeito com precisão."),
  H2("5.7 Implicações para o modelo"),
  ...ALINEAS([
    "a demanda observada é baixa (cerca de 4 chamados por dia, 0,9 de prioridade alta); para estudar o efeito da reserva, o simulador precisará de cenários de densidade maior;",
    "a demanda é concentrada no espaço e no tempo (a zona de Higienópolis no pico tem densidade de prioridade alta cerca de sete vezes a das outras zonas na média), o que justifica medir a densidade por zona e por faixa horária, e não como média diária da área;",
    "os tempos das USB são confiáveis o suficiente para calibração; os da USA não, e serão complementados por hipóteses explícitas e análise de sensibilidade;",
    "os tempos de viagem devem vir de uma matriz em rede viária, não da distância em linha reta;",
    "os dados indicam Δ*g* de 8 a 9 min e uma diferença geométrica semelhante entre as bases, o que sustenta a formulação da seção 4.7; o Δ*n* observado (3,4 min) é provavelmente subestimado e será verificado com a matriz em rede;",
    "a formulação analítica indica que, com a densidade e o tempo de ocupação observados, a reserva dificilmente compensa; o simulador deve, portanto, localizar a densidade-limiar em cenários mais carregados.",
  ]),
];

// ===== 6 RESULTADOS ESPERADOS =====
const cap6 = [
  H1("6 Resultados esperados"),
  P("Ao final do TF2, espera-se obter:"),
  ...ALINEAS([
    "**curvas de desempenho em função da densidade:** para cada cenário, as métricas M1 a M3 de P0 e de P2 em função da densidade de prioridade alta da zona densa, com intervalos de confiança, evidenciando o *trade-off* entre a resposta aos chamados não graves (que piora com a reserva) e a resposta aos graves (que melhora);",
    "**densidade-limiar δ§ por cenário:** o ponto em que as curvas de P0 e P2 se cruzam em M3, para cada combinação de tempo de ocupação, distância entre bases e peso w, comparado com o valor previsto pela formulação analítica da seção 4.7;",
    "**mapa de decisão:** uma tabela simples, legível por gestores, indicando, por zona e faixa horária, se a densidade observada supera δ§ e, portanto, se vale a pena reservar a viatura local, e com qual Δ*máx*;",
    "**teste das hipóteses H1 a H4**, em especial a dependência de δ§ em relação ao tempo de ocupação e ao peso w, o efeito da variação ao longo do dia e o efeito do erro de triagem;",
    "**simulador documentado e reprodutível**, disponível no repositório do trabalho, que possa ser reaplicado a outros serviços, como o SAMU, caso dados semelhantes sejam obtidos.",
  ]),
  P("Um resultado possível, e igualmente válido, é que, com a densidade observada na base de calibração, a reserva traga ganho desprezível, como a seção 5.6 já sugere, e que o benefício só apareça em áreas ou horários mais carregados. Nesse caso, a contribuição do trabalho será justamente quantificar a densidade a partir da qual a regra do mais próximo deixa de ser adequada."),
];

// ===== 7 CRONOGRAMA =====
const X = "X";
const cap7 = [
  H1("7 Cronograma para o Trabalho de Formatura II"),
  P("A Tabela 9 apresenta o cronograma proposto para o TF2. Os meses serão ajustados ao calendário acadêmico do semestre em que o TF2 for cursado [[(confirmar)]]."),
  ...TABELA("Cronograma de atividades do TF2", ["Atividade", "Mês 1", "Mês 2", "Mês 3", "Mês 4", "Mês 5"], [
    ["Validar a classificação de prioridade com profissionais de APH", X, "", "", "", ""],
    ["Definir as zonas de atendimento e calcular a densidade por zona e faixa horária", X, "", "", "", ""],
    ["Gerar a matriz de tempos em rede (OSRM) e calibrar com os deslocamentos observados", X, X, "", "", ""],
    ["Implementar o simulador multizona (SimPy) e as políticas P0 a P3", "", X, X, "", ""],
    ["Validar o modelo com a política observada (P1)", "", "", X, "", ""],
    ["Executar os experimentos (políticas x densidade x cenários)", "", "", X, X, ""],
    ["Analisar resultados, sensibilidade e hipóteses H1 a H4", "", "", "", X, X],
    ["Redação final, revisão e preparação da defesa", "", "", "", X, X],
  ], [4571, 900, 900, 900, 900, 900], "Fonte: elaborado pelos autores."),
];

// ===== REFERÊNCIAS =====
const REFS = [
  "ANDRADE, L. A. C. G. **Heurística baseada em colônia artificial de abelhas para o problema de localização de bases, alocação e realocação de ambulâncias.** 2012. Dissertação (Mestrado) - Escola Politécnica, Universidade de São Paulo, São Paulo, 2012.",
  "ANDRADE, L. A. C. G.; CUNHA, C. B. An ABC heuristic for optimizing moveable ambulance station location and vehicle repositioning for the city of São Paulo. **International Transactions in Operational Research**, v. 22, p. 473-501, 2015. DOI: 10.1111/itor.12160.",
  "BANDARA, D.; MAYORGA, M. E.; MCLAY, L. A. Optimal dispatching strategies for emergency vehicles to increase patient survivability. **International Journal of Operational Research**, v. 15, n. 2, p. 195-214, 2012. DOI: 10.1504/IJOR.2012.048867.",
  "BANDARA, D.; MAYORGA, M. E.; MCLAY, L. A. Priority dispatching strategies for EMS systems. **Journal of the Operational Research Society**, v. 65, n. 4, p. 572-587, 2014. DOI: 10.1057/jors.2013.95.",
  "BÉLANGER, V.; RUIZ, A.; SORIANO, P. Recent optimization models and trends in location, relocation, and dispatching of emergency medical vehicles. **European Journal of Operational Research**, v. 272, n. 1, p. 1-23, 2019.",
  "BRASIL. Ministério da Saúde. **Portaria GM/MS nº 2.048, de 5 de novembro de 2002.** Aprova o Regulamento Técnico dos Sistemas Estaduais de Urgência e Emergência. Brasília, DF, 2002.",
  "BROTCORNE, L.; LAPORTE, G.; SEMET, F. Ambulance location and relocation models. **European Journal of Operational Research**, v. 147, p. 451-463, 2003. DOI: 10.1016/S0377-2217(02)00364-8.",
  "CARTER, G. M.; CHAIKEN, J. M.; IGNALL, E. Response areas for two emergency units. **Operations Research**, v. 20, n. 3, p. 571-594, 1972. DOI: 10.1287/opre.20.3.571.",
  "CHURCH, R.; REVELLE, C. The maximal covering location problem. **Papers of the Regional Science Association**, v. 32, p. 101-118, 1974.",
  "COSTA, P. C.; CUNHA, C. B.; ARBEX, R. O. A simulation-optimization model for analyzing a demand responsive transit system for last-mile transportation: a case study in São Paulo, Brazil. **Case Studies on Transport Policy**, v. 9, p. 1707-1714, 2021. DOI: 10.1016/j.cstp.2021.06.019.",
  "DASKIN, M. S. A maximum expected covering location model: formulation, properties and heuristic solution. **Transportation Science**, v. 17, n. 1, p. 48-70, 1983.",
  "DE MAIO, V. J.; STIELL, I. G.; WELLS, G. A.; SPAITE, D. W. Optimal defibrillation response intervals for maximum out-of-hospital cardiac arrest survival rates. **Annals of Emergency Medicine**, v. 42, n. 2, p. 242-250, 2003. DOI: 10.1067/mem.2003.266.",
  "IANNONI, A. P.; MORABITO, R. A multiple dispatch and partial backup hypercube queuing model to analyze emergency medical systems on highways. **Transportation Research Part E**, v. 43, n. 6, p. 755-771, 2007.",
  "IANNONI, A. P.; MORABITO, R. Otimização da localização das bases de ambulâncias e do dimensionamento das suas regiões de cobertura em rodovias. **Produção**, v. 18, n. 1, p. 47-63, 2008.",
  "JAGTENBERG, C. J.; BHULAI, S.; VAN DER MEI, R. D. Dynamic ambulance dispatching: is the closest-idle policy always optimal? **Health Care Management Science**, v. 20, n. 4, p. 517-531, 2017. DOI: 10.1007/s10729-016-9368-0.",
  "LARSON, R. C. A hypercube queuing model for facility location and redistricting in urban emergency services. **Computers & Operations Research**, v. 1, n. 1, p. 67-95, 1974. DOI: 10.1016/0305-0548(74)90076-8.",
  "MARIANOV, V.; REVELLE, C. The queueing maximal availability location problem: a model for the siting of emergency vehicles. **European Journal of Operational Research**, v. 93, p. 110-120, 1996. DOI: 10.1016/0377-2217(95)00182-4.",
  "MASTEGUIM, R.; CUNHA, C. B. An optimization-based approach to evaluate the operational and environmental impacts of pick-up points on e-commerce urban last-mile distribution: a case study in São Paulo, Brazil. **Sustainability**, v. 14, 8521, 2022. DOI: 10.3390/su14148521.",
  "MCLAY, L. A.; MAYORGA, M. E. Evaluating emergency medical service performance measures. **Health Care Management Science**, v. 13, n. 2, p. 124-136, 2010. DOI: 10.1007/s10729-009-9115-x.",
  "MCLAY, L. A.; MAYORGA, M. E. A model for optimally dispatching ambulances to emergency calls with classification errors in patient priorities. **IIE Transactions**, v. 45, n. 1, p. 1-24, 2013. DOI: 10.1080/0740817X.2012.665200.",
  "PARK, S. H.; LEE, Y. H. Two-tiered ambulance dispatch and redeployment considering patient severity classification errors. **Journal of Healthcare Engineering**, v. 2019, 6031789, 2019. DOI: 10.1155/2019/6031789.",
  "STIELL, I. G. et al. Advanced cardiac life support in out-of-hospital cardiac arrest. **New England Journal of Medicine**, v. 351, n. 7, p. 647-656, 2004.",
  "SUDTACHAT, K.; MAYORGA, M. E.; MCLAY, L. A. Recommendations for dispatching emergency vehicles under multitiered response via simulation. **International Transactions in Operational Research**, v. 21, n. 4, p. 581-617, 2014. DOI: 10.1111/itor.12083.",
  "TAKEDA, R. A.; WIDMER, J. A.; MORABITO, R. Analysis of ambulance decentralization in an urban emergency medical service using the hypercube queueing model. **Computers & Operations Research**, v. 34, n. 3, p. 727-741, 2007.",
  "TOREGAS, C.; SWAIN, R.; REVELLE, C.; BERGMAN, L. The location of emergency service facilities. **Operations Research**, v. 19, n. 6, p. 1363-1373, 1971. DOI: 10.1287/opre.19.6.1363.",
];
const refs = [
  new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "REFERÊNCIAS", font: FONT })] }),
  ...REFS.map((r) => new Paragraph({ children: runs(r), alignment: AlignmentType.LEFT, spacing: { line: 240, after: 240 } })),
];

// ===== APÊNDICE =====
const GRUPO = new Set(["PARADA CARDIO RESPIRATÓRIA (PCR)", "HEMORRAGIA", "REBAIXAMENTO DO NIVEL DE CONSCIENCIA", "DESMAIO", "SÍNCOPE", "AVC", "DISPNEIA", "DOR TORACICA", "MAL SUBITO", "CRISE HIPERTENSIVA", "QUEDA DA PRÓPRIA ALTURA", "OUTROS", "OUTROS SHABAT", "MAL ESTAR", "DESIDRATAÇAO"]);
const queixas = fs.readFileSync(path.join(RAIZ, "tabelas", "queixas_classificadas.csv"), "utf8").trim().split("\n").slice(1)
  .map((l) => { const m = l.match(/^(.*),(\d+),([^,]+)$/); const q = m[1].replace(/^"|"$/g, ""); return [GRUPO.has(q) ? q : `${q} (\u00a7)`, m[3], m[2]]; });
const apendice = [
  new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "APÊNDICE A - CLASSIFICAÇÃO DAS QUEIXAS POR PRIORIDADE PRESUMIDA", font: FONT })] }),
  P("Classificação adotada nas análises, a ser validada com profissionais de APH. Contagem por chamado, após a exclusão dos testes. As queixas marcadas com asterisco (*) não constavam da lista definida pelo grupo e foram encaixadas por analogia; [[precisam de confirmação]]."),
  ...TABELA("Queixas registradas e classe de prioridade atribuída", ["Queixa principal (como registrada)", "Prioridade", "Chamados"], queixas, [5471, 2000, 1600], FONTE_DADOS, false),
];

// ---------- documento ----------
const estilos = {
  default: { document: { run: { font: FONT, size: 24 } } },
  paragraphStyles: [
    { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 24, bold: true, font: FONT }, paragraph: { spacing: { before: 0, after: 360 }, outlineLevel: 0 } },
    { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 24, bold: true, font: FONT }, paragraph: { spacing: { before: 360, after: 240 }, outlineLevel: 1, keepNext: true } },
    { id: "LegendaFigura", name: "LegendaFigura", basedOn: "Normal", run: { size: 20, font: FONT } },
    { id: "LegendaTabela", name: "LegendaTabela", basedOn: "Normal", run: { size: 20, font: FONT } },
    { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 24, bold: true, italics: true, font: FONT }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 2, keepNext: true } },
  ],
};
const pagina = { size: { width: 11906, height: 16838 }, margin: { top: 1701, left: 1701, bottom: 1134, right: 1134 } };
const cabecalho = new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 20 })] })] });

const doc = new Document({
  creator: "Grupo G11", title: TITULO, features: { updateFields: true },
  styles: estilos, numbering: { config: numeracoes },
  sections: [
    { properties: { page: pagina }, headers: { default: new Header({ children: [new Paragraph({ children: [] })] }) }, children: [...capa, ...rosto, ...pre] },
    { properties: { page: pagina }, headers: { default: cabecalho }, children: [...cap1, ...cap2, ...cap3, ...cap4, ...cap5, ...cap6, ...cap7, ...refs, ...apendice] },
  ],
});
Packer.toBuffer(doc).then((buf) => {
  const out = path.join(RAIZ, "relatorio", "TF1_Texto_Preliminar_G11.docx");
  fs.writeFileSync(out, buf);
  console.log("ok", out);
});
