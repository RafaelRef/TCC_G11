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
const AUTORES = ["[[Erik Su]]", "[[Gustavo Blasbalg]]", "Rafael Eduardo Yosano Barros Fernandez", "[[Roni Fogelman]]"];
const TITULO = "Despacho de unidades de suporte básico e avançado no atendimento pré-hospitalar: quando preservar a unidade avançada?";
const SUBTITULO = "um estudo por simulação calibrado com dados operacionais de São Paulo";

const capa = [
  PC("**UNIVERSIDADE DE SÃO PAULO**"), PC("**ESCOLA POLITÉCNICA**"), ...VAZIO(4),
  ...AUTORES.map((a) => PC(a)), ...VAZIO(4),
  PC(`**${TITULO}**`), PC(SUBTITULO), ...VAZIO(6),
  PC("São Paulo"), PC("2026"),
];
const rosto = [
  new Paragraph({ children: [new PageBreak()] }),
  ...AUTORES.map((a) => PC(a)), ...VAZIO(4),
  PC(`**${TITULO}**`), PC(SUBTITULO), ...VAZIO(1), PC("**Versão Preliminar**"), ...VAZIO(3),
  new Paragraph({ indent: { left: 4535 }, alignment: AlignmentType.JUSTIFIED, spacing: { line: 240 }, children: runs("Trabalho de Formatura do Curso de Engenharia Civil apresentado à Escola Politécnica da Universidade de São Paulo para obtenção do título de Bacharel em Engenharia Civil.") }),
  ...VAZIO(1),
  new Paragraph({ indent: { left: 4535 }, spacing: { line: 240 }, children: runs("Orientador(a): [[Prof(a). Dr(a). NOME DO(A) ORIENTADOR(A)]]") }),
  ...VAZIO(5), PC("São Paulo"), PC("2026"),
];

const resumoTxt = "Serviços de atendimento pré-hospitalar (APH) que operam com frota mista de unidades de suporte básico (USB) e de suporte avançado (USA) enfrentam uma decisão recorrente de despacho: enviar a unidade mais próxima ou preservar a unidade avançada, mais escassa, para ocorrências graves que possam surgir em seguida. A regra do veículo disponível mais próximo, predominante na prática, não considera esse custo de oportunidade. Este trabalho propõe investigar em que condições, definidas pela gravidade presumida da ocorrência e pela diferença de tempo de resposta entre as unidades disponíveis, é preferível despachar uma USB e manter a USA disponível. A abordagem combina análise de dados operacionais e simulação de eventos discretos. Os dados, cedidos pela Hatzalá São Paulo (401 chamados e 533 acionamentos de viaturas entre julho e outubro de 2026), são usados para calibrar um modelo genérico, e não para avaliar a operação desse serviço. A análise exploratória preliminar indica demanda média de cerca de quatro chamados por dia, tempo de resposta mediano de 7,8 minutos para as USB e que 6,4% dos chamados de gravidade alta chegaram com a USA ocupada em outro atendimento, metade deles enquanto ela atendia ocorrências de gravidade baixa. A análise também revelou limitações relevantes dos dados, como o registro incompleto dos horários da USA e o baixo poder explicativo da distância em linha reta sobre o tempo de deslocamento. No Trabalho de Formatura II será desenvolvido um simulador que compare políticas de despacho parametrizadas por um limiar de tempo X em cenários de carga crescente; os resultados esperados são curvas de desempenho em função de X e limiares recomendados para cada cenário.";
const abstractTxt = "Prehospital emergency medical services (EMS) operating mixed fleets of basic life support (BLS) and advanced life support (ALS) units face a recurring dispatch decision: send the closest unit or preserve the scarcer advanced unit for severe calls that may arrive next. The closest-idle rule, prevalent in practice, ignores this opportunity cost. This work investigates under which conditions, defined by the presumed severity of the call and by the response time difference between available units, it is preferable to dispatch a BLS unit and keep the ALS unit available. The approach combines operational data analysis and discrete-event simulation. Data provided by Hatzalah São Paulo (401 calls and 533 vehicle dispatches between July and October 2026) are used to calibrate a generic model, not to evaluate that service. The preliminary exploratory analysis shows an average demand of about four calls per day, a median BLS response time of 7.8 minutes, and that 6.4% of high-severity calls arrived while the ALS unit was busy, half of them while it served low-severity calls. The analysis also revealed relevant data limitations, such as incomplete ALS timestamps and the low explanatory power of straight-line distance over travel time. In the second semester, a simulator will compare dispatch policies parameterized by a time threshold X under increasing load scenarios; the expected results are performance curves as a function of X and recommended thresholds for each scenario.";
const ref_resumo = "FERNANDEZ, R. E. Y. B. et al. **Despacho de unidades de suporte básico e avançado no atendimento pré-hospitalar: quando preservar a unidade avançada?** 2026. Trabalho de Formatura (Bacharelado em Engenharia Civil) - Escola Politécnica, Universidade de São Paulo, São Paulo, 2026.";

const pre = [
  new Paragraph({ children: [new PageBreak()] }),
  PC("**RESUMO**", { spacing: { after: 240 } }),
  new Paragraph({ children: runs(ref_resumo), alignment: AlignmentType.JUSTIFIED, spacing: { line: 240, after: 240 } }),
  new Paragraph({ children: runs(resumoTxt), alignment: AlignmentType.JUSTIFIED, spacing: { line: 240, after: 240 } }),
  new Paragraph({ children: runs("**Palavras-chave:** Atendimento pré-hospitalar. Despacho de ambulâncias. Simulação de eventos discretos. Unidade de suporte avançado. Pesquisa operacional."), spacing: { line: 240 } }),
  new Paragraph({ children: [new PageBreak()] }),
  PC("**ABSTRACT**", { spacing: { after: 240 } }),
  new Paragraph({ children: runs("FERNANDEZ, R. E. Y. B. et al. **Dispatching basic and advanced life support units in prehospital care: when should the advanced unit be preserved?** 2026. Undergraduate Thesis (Bachelor in Civil Engineering) - Polytechnic School, University of São Paulo, São Paulo, 2026."), alignment: AlignmentType.JUSTIFIED, spacing: { line: 240, after: 240 } }),
  new Paragraph({ children: runs(abstractTxt), alignment: AlignmentType.JUSTIFIED, spacing: { line: 240, after: 240 } }),
  new Paragraph({ children: runs("**Keywords:** Prehospital care. Ambulance dispatching. Discrete-event simulation. Advanced life support. Operations research."), spacing: { line: 240 } }),
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
  H2("1.2 Problema"),
  P("Quando um chamado chega à central, o despachante dispõe de um conjunto de viaturas livres, de tipos e localizações diferentes. A prática mais comum, e também a premissa da maior parte da literatura, é enviar a viatura disponível mais próxima (*closest idle*). Essa regra minimiza o tempo de resposta do chamado atual, mas ignora o efeito sobre os chamados futuros: se a única USA da região for empenhada em uma ocorrência leve que uma USB poderia atender, um chamado grave que chegue em seguida terá de esperar uma USA mais distante ou ser atendido apenas com suporte básico."),
  P("O problema deste trabalho é, portanto, um *trade-off* entre o tempo de resposta do chamado presente e a disponibilidade da unidade avançada para chamados futuros. A hipótese de trabalho do grupo, ainda a ser testada, é que existe um limiar de tempo X tal que, para chamados de gravidade baixa, vale a pena aceitar uma resposta até X minutos mais lenta com uma USB para manter a USA livre, e que esse limiar depende da carga do sistema e da proporção de chamados graves."),
  H2("1.3 Justificativa"),
  P("A literatura de pesquisa operacional aplicada a serviços de emergência mostra, há décadas, que a regra do mais próximo nem sempre é ótima. Carter, Chaiken e Ignall (1972) demonstraram, para duas unidades, que a fronteira de atendimento que minimiza o tempo médio de resposta pode diferir da fronteira equidistante. Mais recentemente, Jagtenberg, Bhulai e van der Mei (2017) obtiveram, em simulação de uma região dos Países Baixos, redução de 18% na fração de chegadas atrasadas em relação à regra do mais próximo, embora com aumento do tempo médio de resposta. Para sistemas com dois níveis de unidade, Bandara, Mayorga e McLay (2014) e Sudtachat, Mayorga e McLay (2014) concluíram que despachar considerando a prioridade do chamado aumenta a sobrevida esperada dos pacientes."),
  P("Os trabalhos brasileiros consultados até esta etapa concentram-se, em geral, na localização de bases e no dimensionamento de frotas (TAKEDA; WIDMER; MORABITO, 2007; IANNONI; MORABITO, 2007; ANDRADE; CUNHA, 2015). A política de despacho entre tipos de viatura, por sua vez, aparece menos. Essa constatação vale para a busca feita até aqui e será reavaliada com uma revisão sistemática no TF2. Do ponto de vista da Engenharia Civil, o tema se insere na área de transportes e logística urbana: envolve tempos de viagem em rede viária congestionada, localização de instalações e operação de sistemas de serviço espacialmente distribuídos."),
  H2("1.4 Fonte de dados"),
  P("Dados operacionais de APH com registro de horário por etapa do atendimento e indicação de gravidade raramente são públicos no Brasil. Este trabalho utiliza uma base cedida pela Hatzalá São Paulo, serviço voluntário de APH que opera na região central da cidade, com o registro de cada acionamento de viatura entre 21 de julho e 30 de outubro de 2026. **Os dados são usados para calibrar um modelo genérico de sistema com USB e USA, e não para avaliar ou propor mudanças na operação da Hatzalá.** A escolha se justifica pela granularidade dos registros (horário de acionamento, saída, chegada à cena, saída para o hospital e liberação de cada viatura) e pela disponibilidade imediata; as limitações decorrentes dessa escolha são discutidas na seção 4.10."),
  H2("1.5 Estrutura do texto"),
  P("Além desta introdução, o capítulo 2 apresenta os objetivos, a pergunta de pesquisa e as hipóteses. O capítulo 3 reúne a revisão bibliográfica, organizada em quatro eixos. O capítulo 4 descreve a metodologia, incluindo o tratamento dos dados e o modelo de simulação proposto. O capítulo 5 traz a análise exploratória preliminar da base, com resultados provisórios. O capítulo 6 discute os resultados esperados e o capítulo 7 apresenta o cronograma do TF2."),
];

// ===== 2 OBJETIVOS =====
const cap2 = [
  H1("2 Objetivos"),
  H2("2.1 Objetivo geral"),
  P("Determinar, por meio de simulação de eventos discretos calibrada com dados reais, em que condições de gravidade da ocorrência, diferença de tempo de resposta entre unidades e carga do sistema é preferível despachar uma unidade de suporte básico e preservar a unidade de suporte avançado para ocorrências graves subsequentes."),
  H2("2.2 Objetivos específicos"),
  ...ALINEAS([
    "caracterizar a demanda e os tempos de cada etapa do atendimento a partir da base da Hatzalá São Paulo, explicitando regras de tratamento e limitações dos dados;",
    "propor e validar, com profissionais de APH, uma classificação de gravidade presumida a partir da queixa registrada na triagem;",
    "construir um modelo de simulação de eventos discretos genérico, com viaturas de dois tipos, bases fixas e tempos de viagem em rede viária;",
    "validar o modelo reproduzindo, sob a política de despacho observada, os indicadores medidos na base de dados;",
    "comparar políticas de despacho, entre elas uma família de políticas de limiar parametrizada por X, em cenários de carga e de composição de frota;",
    "identificar, para cada cenário, o limiar X* que melhor equilibra o tempo de resposta geral e a disponibilidade da USA para chamados graves, e traduzi-lo em regras de despacho simples.",
  ]),
  H2("2.3 Pergunta de pesquisa e hipóteses"),
  P("**Pergunta de pesquisa:** em sistemas de APH com frota mista de USB e USA, em que condições, definidas pela gravidade presumida da ocorrência e pela diferença de tempo de resposta entre as unidades disponíveis, é preferível despachar uma USB e preservar a USA para ocorrências graves subsequentes?"),
  P("As hipóteses abaixo são proposições do grupo, formuladas a partir da literatura e da análise exploratória, e serão testadas no TF2:"),
  ...ALINEAS([
    "**H1:** com a carga observada na base de calibração, o ganho de preservar a USA é pequeno, pois a probabilidade de ela estar ocupada quando chega um chamado grave é baixa;",
    "**H2:** o ganho de preservar a USA cresce com a carga do sistema e com a proporção de chamados graves, de modo que o limiar X* ótimo aumenta com a utilização;",
    "**H3:** erros de classificação de gravidade na triagem reduzem o benefício das políticas de reserva, em linha com o observado por McLay e Mayorga (2013) e Park e Lee (2019).",
  ]),
];

// ===== 3 REVISÃO =====
const cap3 = [
  H1("3 Revisão bibliográfica"),
  P("A revisão está organizada em quatro eixos: (i) a organização do APH e da frota mista no Brasil; (ii) os modelos de localização e cobertura de ambulâncias; (iii) os modelos de despacho, em especial os que questionam a regra do mais próximo; e (iv) as métricas de desempenho. Uma síntese ao final posiciona este trabalho em relação aos estudos revisados."),
  H2("3.1 Atendimento pré-hospitalar e frota mista no Brasil"),
  P("A Portaria GM/MS nº 2.048/2002 aprova o Regulamento Técnico dos Sistemas Estaduais de Urgência e Emergência e estabelece os tipos de viatura do APH móvel, entre eles a USB e a USA (BRASIL, 2002). No modelo brasileiro, a central de regulação médica classifica a gravidade do chamado e decide o tipo de resposta. Andrade e Cunha (2015) descrevem que, no SAMU-SP, essa decisão não seguia uma regra formal por gravidade, cabendo ao médico regulador; descrevem também tempos de ocupação longos, de duas a quatro horas, em parte porque a equipe frequentemente precisa permanecer com o paciente no hospital até ser liberada. Esse ponto é relevante para o presente trabalho: quanto maior o tempo de ocupação, maior o custo de empenhar a USA em um chamado que não a exige."),
  H2("3.2 Localização e cobertura"),
  P("Os modelos clássicos de localização definem onde posicionar bases e viaturas. O problema de cobertura de conjuntos (TOREGAS et al., 1971) busca o menor número de bases que cubra toda a demanda dentro de um tempo-limite, e o problema de máxima cobertura (CHURCH; REVELLE, 1974) maximiza a demanda coberta com uma frota fixa. Daskin (1983) introduziu no MEXCLP a probabilidade de a viatura estar ocupada, e Marianov e ReVelle (1996) trataram cada vizinhança como uma fila para garantir confiabilidade mínima de cobertura. Revisões abrangentes estão em Brotcorne, Laporte e Semet (2003) e Bélanger, Ruiz e Soriano (2019); estes últimos destacam a interação entre as decisões táticas de localização e as operacionais de despacho."),
  P("Para São Paulo, Andrade e Cunha (2015) formularam um modelo de localização de bases móveis e realocação de viaturas com dois tipos de veículo e períodos múltiplos, resolvido por uma heurística de colônia de abelhas. A aplicação ao SAMU-SP indicou que reposicionar seis bases móveis já existentes reduziria o tempo mínimo de cobertura viável de 27 para 16 minutos, cerca de 41% de melhoria, sem aumento de recursos. O trabalho é a principal referência nacional para este TCC e fornece parâmetros de contexto (tempos de ocupação, fatores de ajuste de velocidade por período do dia) que poderão ser usados na análise de sensibilidade."),
  H2("3.3 Filas espacialmente distribuídas"),
  P("O modelo hipercubo de filas (LARSON, 1974) representa cada viatura individualmente como servidor que pode estar livre ou ocupado, permitindo calcular cargas de trabalho e frações de despacho entre regiões. No Brasil, Takeda, Widmer e Morabito (2007) o aplicaram ao SAMU de Campinas para avaliar a descentralização das ambulâncias, concluindo que descentralizar melhora o tempo médio de resposta, mas que a descentralização total sugerida pelos operadores poderia não produzir resultados satisfatórios. Iannoni e Morabito (2007) estenderam o modelo para despachos múltiplos em rodovias. A limitação conhecida da abordagem é o crescimento exponencial do número de estados com o número de viaturas, o que favorece a simulação para sistemas maiores ou com regras de despacho mais complexas."),
  H2("3.4 Políticas de despacho além do mais próximo"),
  P("Carter, Chaiken e Ignall (1972) são a referência pioneira: para duas unidades que cooperam, a fronteira entre as áreas de resposta que minimiza o tempo médio pode diferir dos pontos equidistantes, isto é, nem sempre a unidade mais próxima deve atender. Jagtenberg, Bhulai e van der Mei (2017) formularam o despacho como processo de decisão markoviano (MDP) e propuseram uma heurística que reduziu em 18% a fração de chegadas atrasadas, ao custo de aumentar o tempo médio de resposta; os próprios autores ressaltam que isso não torna a heurística preferível na prática, mas contesta a crença de que a regra do mais próximo seria quase ótima."),
  P("O grupo de McLay e Mayorga produziu a linha mais próxima da pergunta deste trabalho. Bandara, Mayorga e McLay (2012) formularam o despacho como MDP incorporando a urgência do chamado e medindo desempenho pela sobrevida, não por limites de tempo. Bandara, Mayorga e McLay (2014) avaliaram políticas por simulação e concluíram que despachar considerando a prioridade aumenta a sobrevida média. McLay e Mayorga (2013) incorporaram erros de classificação da triagem, e Sudtachat, Mayorga e McLay (2014) trataram explicitamente sistemas com duas camadas de unidade (básica e avançada). Estes últimos observam que enviar uma unidade próxima a um chamado de baixa prioridade pode torná-la indisponível para chamados graves futuros nas proximidades, que é precisamente o mecanismo estudado aqui. Park e Lee (2019) combinaram programação dinâmica aproximada e simulação para despacho e realocação em sistemas de dois níveis com erros de classificação, encontrando que a subtriagem prejudica mais o paciente do que a supertriagem."),
  H2("3.5 Métricas de desempenho"),
  P("A métrica mais usada na prática é a fração de chamados atendidos dentro de um tempo-limite (por exemplo, 8 ou 10 minutos). McLay e Mayorga (2010) mostraram que a escolha da métrica altera a política ótima e defenderam medidas baseadas em sobrevida. Para PCR, De Maio et al. (2003) ajustaram por regressão logística uma função de sobrevida em relação ao intervalo até a desfibrilação, que pode ser usada para converter tempos de resposta simulados em sobrevida esperada. Neste trabalho, adotaremos tanto métricas de tempo, mais fáceis de comunicar a gestores, quanto uma métrica de sobrevida para o subconjunto de chamados de PCR."),
  H2("3.6 Síntese e lacuna"),
  P("A Tabela 1 resume os trabalhos centrais. Em conjunto, eles sustentam que a regra do mais próximo pode ser melhorada quando há prioridades e tipos de unidade distintos, mas as políticas ótimas de MDP são difíceis de comunicar e de calibrar sem dados detalhados. A contribuição pretendida por este TCC é mais modesta e aplicada: estimar, para um sistema urbano brasileiro calibrado com dados reais, um limiar de decisão interpretável (X*) e mostrar como ele varia com a carga e com a composição da frota."),
  ...TABELA("Síntese dos trabalhos centrais da revisão", ["Trabalho", "Problema", "Método", "Métrica principal"], [
    ["Carter, Chaiken e Ignall (1972)", "Áreas de resposta de 2 unidades", "Modelo analítico", "Tempo médio de resposta"],
    ["Larson (1974)", "Desempenho de frotas espacialmente distribuídas", "Hipercubo de filas", "Carga, tempo de resposta"],
    ["Takeda, Widmer e Morabito (2007)", "Descentralização no SAMU-Campinas", "Hipercubo de filas", "Tempo de resposta, carga"],
    ["Bandara, Mayorga e McLay (2012)", "Despacho com prioridade", "MDP", "Sobrevida"],
    ["McLay e Mayorga (2013)", "Despacho com erro de triagem", "MDP", "Cobertura de alto risco"],
    ["Bandara, Mayorga e McLay (2014)", "Despacho com prioridade", "Simulação + heurística", "Sobrevida"],
    ["Sudtachat, Mayorga e McLay (2014)", "Despacho com 2 tipos de unidade", "Simulação", "Sobrevida"],
    ["Andrade e Cunha (2015)", "Bases móveis do SAMU-SP", "PLI + heurística ABC", "Cobertura esperada"],
    ["Jagtenberg, Bhulai e van der Mei (2017)", "Despacho dinâmico", "MDP + heurística", "Fração de atrasos"],
    ["Park e Lee (2019)", "Despacho em 2 níveis com erro de triagem", "ADP + simulação", "Risco ao paciente"],
    ["**Este trabalho**", "**Limiar USB x USA**", "**Simulação (SED)**", "**Tempo e sobrevida**"],
  ], [2700, 2500, 2000, 1871], "Fonte: elaborado pelos autores."),
];

// ===== 4 METODOLOGIA =====
const cap4 = [
  H1("4 Metodologia"),
  H2("4.1 Visão geral"),
  P("O trabalho segue oito etapas, das quais as três primeiras foram realizadas no TF1 (Figura 1). A abordagem central é a simulação de eventos discretos (SED), escolhida em lugar de um MDP por três razões: permite representar tempos de viagem em rede real e distribuições empíricas sem hipóteses markovianas; produz como resultado um limiar interpretável, e não uma política em forma de tabela; e é viável no prazo de um TCC. O MDP e o hipercubo permanecem como referências teóricas e, se houver tempo, como verificação em instâncias pequenas."),
  ...FIGURA("fig_fluxograma.png", "Etapas do trabalho e sua divisão entre TF1 e TF2", 600, "Fonte: elaborado pelos autores."),
  H2("4.2 Base de dados"),
  P("A base foi extraída do sistema de despacho da Hatzalá São Paulo em 30/10/2026 e cobre o período de 21/07/2026 a 30/10/2026. Cada linha corresponde a um acionamento de viatura; um chamado atendido por duas viaturas aparece em duas linhas. São 539 acionamentos em 404 chamados (81 chamados sem viatura acionada ficaram fora da extração). Para cada acionamento há: queixa principal e protocolo, viatura e tipo (USB ou USA), base, bairro e coordenadas aproximadas da ocorrência (arredondadas a cerca de 100 m), hospital de destino e os horários de acionamento, aceite, saída, chegada à cena, saída para o hospital, chegada ao hospital e liberação. A base já vem sanitizada, sem nome de paciente, telefone ou número da residência. Por se tratar de dado operacional de terceiros, ela não é publicada no repositório do trabalho; apenas os agregados o são."),
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
  H2("4.4 Classificação de gravidade presumida"),
  P("A base não traz uma classificação de gravidade, apenas a queixa principal e o protocolo de atendimento. Foi construída uma classificação provisória em quatro classes (Tabela 3). São consideradas de gravidade alta as queixas tempo-dependentes com risco imediato à vida (PCR, AVC, engasgo, dor torácica, dispneia, rebaixamento do nível de consciência, hemorragia, trauma grave, entre outras); de gravidade baixa, as queixas inespecíficas ou de baixo risco (mal-estar, queda da própria altura, desidratação). As categorias genéricas \"outros\" e \"outros Shabat\" ficam como indeterminadas. A lista completa está no Apêndice A. **Essa classificação é um proxy elaborado pelo grupo e precisa ser validada com médicos reguladores ou profissionais de APH**, o que está previsto para o início do TF2."),
  ...TABELA("Classes de gravidade presumida e número de chamados", ["Classe", "Exemplos de queixas", "Chamados", "%"], [
    ["Alta", "PCR, AVC, dispneia, dor torácica, rebaixamento de consciência, hemorragia", "125", "31"],
    ["Moderada", "Desmaio, síncope, mal súbito, crise hipertensiva, fraturas", "50", "12"],
    ["Baixa", "Mal-estar, queda da própria altura, desidratação", "144", "36"],
    ["Indeterminada", "\"Outros\", \"outros Shabat\"", "82", "20"],
  ], [1600, 5271, 1200, 1000]),
  H2("4.5 Localização das bases"),
  P("A planilha informa o endereço das bases, mas não suas coordenadas; informa, porém, a distância em linha reta entre a base e cada ocorrência. As coordenadas de cada base foram estimadas por trilateração, minimizando por mínimos quadrados robustos a diferença entre a distância informada e a distância calculada até as coordenadas das ocorrências. O erro mediano resultante foi de cerca de 20 m nas três bases, compatível com o arredondamento das coordenadas das ocorrências."),
  H2("4.6 Modelo de simulação"),
  P("O simulador, a ser implementado em Python com a biblioteca SimPy, representa um sistema genérico com nA unidades avançadas e nB unidades básicas distribuídas em bases fixas. Seus componentes e a fonte de cada parâmetro são:"),
  ...ALINEAS([
    "**chegada de chamados:** processo de Poisson não homogêneo, com taxa por hora do dia estimada da base e multiplicada por um fator de carga k;",
    "**local da ocorrência:** reamostragem (*bootstrap*) das coordenadas observadas, preservando a distribuição espacial;",
    "**gravidade:** sorteio segundo as proporções observadas por classe, com uma probabilidade e de erro de classificação na triagem;",
    "**tempo de viagem:** matriz de tempos em rede viária obtida com o OSRM sobre o OpenStreetMap, corrigida por um fator calibrado com os deslocamentos observados; a seção 5.4 mostra por que a distância em linha reta não é suficiente;",
    "**tempo de preparo e de ocupação:** distribuições empíricas por tipo de viatura, separando atendimentos com e sem transporte ao hospital;",
    "**regra de composição da resposta:** número e tipo de viaturas por classe de gravidade, conforme a política simulada.",
  ]),
  H2("4.7 Políticas de despacho"),
  P("Serão comparadas quatro políticas. Em todas, chamados de gravidade alta recebem a USA disponível mais próxima, acompanhada de uma USB para transporte quando a USA não transportar paciente."),
  ...ALINEAS([
    "**P0 (mais próxima):** envia a viatura disponível mais próxima, de qualquer tipo;",
    "**P1 (prática observada):** reproduz a composição de resposta observada na base, por classe de gravidade, para fins de validação;",
    "**P2(X) (limiar):** em chamados de gravidade baixa ou indeterminada, a USA só é enviada se a USB disponível mais próxima chegar mais de X minutos depois dela; caso contrário, envia-se a USB e a USA é preservada;",
    "**P3 (reserva total):** a USA nunca é enviada a chamados de gravidade baixa ou indeterminada.",
  ]),
  P("P0 e P3 são casos-limite de P2(X), correspondendo a X = 0 e X tendendo a infinito. O parâmetro X será varrido de 0 a 20 minutos em passos de 2 minutos."),
  H2("4.8 Métricas"),
  ...ALINEAS([
    "**M1:** fração dos chamados de gravidade alta com chegada da USA em até T minutos (T = 10 min, com sensibilidade para 8 e 15 min);",
    "**M2:** tempo médio de resposta da primeira viatura, considerando todos os chamados;",
    "**M3:** tempo de resposta da USA em chamados graves (média e percentil 90);",
    "**M4:** sobrevida esperada nos chamados de PCR, a partir de uma função de sobrevida da literatura (DE MAIO et al., 2003);",
    "**M5:** utilização de cada tipo de viatura.",
  ]),
  H2("4.9 Cenários, experimentos e validação"),
  P("Os experimentos cruzarão as políticas com fatores de carga k (1, 2, 5 e 10 vezes a demanda observada), composições de frota (por exemplo, 1 USA e 3 USB, como na base, e configurações proporcionais maiores) e taxas de erro de triagem. Cada combinação será replicada ao menos 30 vezes, com intervalos de confiança de 95% para as métricas. A validação consistirá em simular P1 com k = 1 e comparar com os valores observados: distribuição dos tempos de resposta das USB, utilização das viaturas e frequência de chamados graves que encontram a USA ocupada (6,4% na base, seção 5.5)."),
  H2("4.10 Limitações conhecidas"),
  ...ALINEAS([
    "a área de calibração é pequena e densa; os tempos de deslocamento não representam a periferia, o que será tratado como cenário de sensibilidade;",
    "a unidade avançada da base tem registros de horário muito incompletos (seção 5.5); seus tempos de serviço poderão ser complementados com a literatura;",
    "a análise da seção 5.3 indica que a unidade avançada da base aparentemente não transporta pacientes, diferentemente da USA do SAMU; isso será confirmado com a Hatzalá e tratado como parâmetro do modelo;",
    "o serviço é voluntário e tem perfil de demanda próprio (por exemplo, o padrão de chamados no Shabat), o que limita a generalização direta dos parâmetros;",
    "o período de cerca de 100 dias não captura sazonalidade anual.",
  ]),
];

// ===== 5 ANÁLISE EXPLORATÓRIA =====
const cap5 = [
  H1("5 Análise exploratória preliminar"),
  P("Este capítulo apresenta resultados provisórios obtidos com os scripts do repositório do trabalho (pasta analise/). Eles cumprem dois papéis: caracterizar a base que vai parametrizar o simulador e verificar, empiricamente, se o fenômeno estudado de fato ocorre."),
  H2("5.1 Demanda"),
  P("Após a exclusão dos testes, restaram 401 chamados em 101 dias, cerca de quatro chamados por dia. A demanda se concentra no período diurno, com pico entre 8 h e 10 h; o intervalo das 8 h às 14 h reúne 41% dos chamados, e a madrugada (0 h às 6 h), 11% (Figura 2). Não há diferença marcante entre os dias da semana. Espacialmente, 63% dos chamados ocorreram em quatro bairros (Santa Cecília, Higienópolis, Perdizes e Bom Retiro), próximos à base de Higienópolis (Figura 3)."),
  ...FIGURA("fig_demanda_temporal.png", "Distribuição dos chamados por hora do dia e por dia da semana", 600),
  ...FIGURA("fig_mapa_ocorrencias.png", "Localização das ocorrências por classe de gravidade e posição estimada das bases", 470),
  H2("5.2 Gravidade e composição da resposta"),
  P("Pela classificação provisória, 31% dos chamados são de gravidade alta, 12% moderada, 36% baixa e 20% indeterminada (Figura 4). A Tabela 4 mostra que a unidade avançada participou de 39% dos chamados graves e de 52% dos moderados, mas também de 7% dos chamados de gravidade baixa. Isso indica que a decisão de enviar ou não a USA já é tomada caso a caso na prática, e não por uma regra fixa."),
  ...FIGURA("fig_gravidade.png", "Chamados por classe de gravidade presumida", 520),
  ...TABELA("Perfil dos chamados por classe de gravidade", ["Gravidade", "Chamados", "Com USA (%)", "Com transporte ao hospital (%)", "Viaturas por chamado"], [
    ["Alta", "125", "39,2", "83,2", "1,5"], ["Moderada", "50", "52,0", "80,0", "1,6"],
    ["Baixa", "144", "6,9", "86,1", "1,2"], ["Indeterminada", "82", "8,5", "86,6", "1,2"],
  ], [1900, 1500, 1700, 2271, 1700]),
  H2("5.3 Tempos de atendimento"),
  P("A Tabela 5 resume os tempos por tipo de viatura, considerando apenas os registros válidos. Para as USB, o tempo de resposta (acionamento até a chegada à cena) tem mediana de 7,8 min e percentil 90 de 15,7 min. A unidade avançada tem apenas 24 registros válidos de resposta, com mediana de 9,4 min; por isso, seus números devem ser lidos com cautela. A Figura 5 mostra as distribuições acumuladas."),
  ...TABELA("Tempos por tipo de viatura (minutos, registros válidos)", ["Etapa", "Tipo", "n", "Mediana", "P25", "P75", "P90"], [
    ["Preparo", "USB", "310", "1,0", "0,4", "2,9", "4,6"], ["Preparo", "USA", "24", "0,8", "0,6", "2,0", "8,3"],
    ["Deslocamento", "USB", "310", "6,0", "3,8", "8,9", "12,7"], ["Deslocamento", "USA", "24", "7,6", "5,1", "10,4", "14,6"],
    ["Resposta", "USB", "310", "7,8", "5,5", "11,1", "15,7"], ["Resposta", "USA", "24", "9,4", "7,1", "13,0", "26,3"],
    ["Ocupação", "USB", "370", "65,4", "49,6", "85,9", "125,8"], ["Ocupação", "USA", "19", "68,2", "53,2", "92,2", "116,0"],
  ], [1900, 900, 900, 1300, 1300, 1300, 1471]),
  ...FIGURA("fig_tempo_resposta_ecdf.png", "Distribuição acumulada do tempo de resposta por tipo de viatura", 540),
  P("A decomposição do ciclo de atendimento (Figura 6) revela um ponto importante para o modelo: a mediana do trajeto ao hospital da unidade avançada é praticamente nula, o que sugere que ela não transporta pacientes e que o transporte fica a cargo da USB. Em um ciclo típico de USB, o tempo em cena (22 min) e o trajeto ao hospital (9 min) superam o deslocamento até a ocorrência (6 min). Esse padrão reforça o argumento de Andrade e Cunha (2015) de que o tempo de ocupação, e não só o de viagem, determina a disponibilidade do sistema."),
  ...FIGURA("fig_etapas_atendimento.png", "Mediana das etapas do ciclo de atendimento por tipo de viatura", 560),
  H2("5.4 Relação entre distância e tempo de deslocamento"),
  P("Ajustou-se uma regressão linear entre a distância em linha reta da base à ocorrência e o tempo de deslocamento das USB (Figura 7). O resultado, t = 5,1 + 0,81 d (t em minutos e d em km, n = 306), tem R² de apenas 0,12. Duas razões explicam o baixo ajuste: a viatura nem sempre está na base quando é acionada, e a distância em linha reta ignora a rede viária. Para os 25 acionamentos com distância por rota calculada a partir do GPS da viatura (disponível só a partir de setembro de 2026), o R² sobe para 0,33. A conclusão metodológica é que o simulador deve usar tempos de viagem em rede, calibrados com os deslocamentos observados, e não uma função da distância euclidiana."),
  ...FIGURA("fig_tempo_viagem.png", "Tempo de deslocamento das USB em função da distância em linha reta da base", 520),
  H2("5.5 Disponibilidade da unidade avançada"),
  P("A unidade avançada foi acionada 92 vezes. Apenas 29 desses acionamentos terminaram com o status \"finalizada\"; os demais ficaram parados em estados intermediários (27 em \"aceitou\", 18 em \"em cena\"), sinal de que a tripulação não registrou as etapas seguintes. Para estimar quando a USA esteve ocupada, considerou-se, nos 60 empenhos sem horário de liberação, uma ocupação igual à mediana observada nos registros completos (68 min). Essa imputação é a principal fragilidade desta análise."),
  P("Com essa hipótese, verificou-se, para cada chamado, se a USA estava ocupada em outro atendimento no momento em que ele chegou. A Figura 8 mostra que isso ocorreu em 8 dos 125 chamados graves (6,4%). A Tabela 6 detalha com quem a USA estava ocupada: em 4 desses 8 casos, ela atendia um chamado de gravidade baixa. **É exatamente a situação que motiva este trabalho, e ela aparece nos dados reais**, ainda que com baixa frequência."),
  ...FIGURA("fig_conflitos_usa.png", "Chamados que chegaram com a unidade avançada ocupada, por classe de gravidade", 540),
  ...TABELA("Chamados que chegaram com a USA ocupada, pela gravidade do chamado que a ocupava", ["Chamado que chegou", "USA ocupada com: Alta", "Moderada", "Baixa", "Indeterminada"], [
    ["Alta (8)", "2", "2", "4", "0"], ["Moderada (3)", "0", "0", "1", "2"],
    ["Baixa (5)", "2", "2", "0", "1"], ["Indeterminada (1)", "1", "0", "0", "0"],
  ], [2271, 2000, 1600, 1600, 1600]),
  P("Como verificação, a probabilidade de a USA estar ocupada foi estimada também por um modelo de perda de Erlang com um servidor: com 79 empenhos efetivos em 2.414 horas e ocupação média de cerca de 70 minutos, a intensidade de tráfego é de 0,039 e a probabilidade de bloqueio, de 3,7%. O valor observado para chamados graves (6,4%) é um pouco superior, o que pode indicar agrupamento temporal dos chamados ou efeito da imputação; ambos os pontos serão investigados no TF2. Esses números sustentam provisoriamente a hipótese H1: com a carga atual, o conflito existe, mas é pouco frequente."),
  P("Por fim, nos 44 chamados em que a USA e uma USB chegaram à cena, a USB chegou primeiro em 68% dos casos (Figura 9). Há, porém, 18 casos com diferença superior a 30 minutos em módulo, muito provavelmente por registro tardio. Excluídos esses extremos (n = 26), a diferença mediana cai para 1,2 minuto, e a USA chega antes em 42% dos casos. Ou seja, na configuração observada, a USA e a USB costumam chegar em tempos próximos, o que torna a escolha entre elas sensível a poucos minutos de diferença, a ordem de grandeza do limiar X que se pretende estimar."),
  ...FIGURA("fig_diferenca_chegada.png", "Diferença entre os horários de chegada da USA e da USB nos chamados atendidos por ambas", 540),
  H2("5.6 Implicações para o modelo"),
  ...ALINEAS([
    "a demanda observada é baixa (cerca de 4 chamados por dia); para estudar o efeito da política, o simulador precisará de cenários de carga maior;",
    "os tempos das USB são confiáveis o suficiente para calibração; os da USA não, e serão complementados por hipóteses explícitas e análise de sensibilidade;",
    "os tempos de viagem devem vir de uma matriz em rede viária, não da distância em linha reta;",
    "o fenômeno de interesse (chamado grave com a USA ocupada em chamado leve) foi observado nos dados, o que dá base empírica à pergunta de pesquisa.",
  ]),
];

// ===== 6 RESULTADOS ESPERADOS =====
const cap6 = [
  H1("6 Resultados esperados"),
  P("Ao final do TF2, espera-se obter:"),
  ...ALINEAS([
    "**curvas de desempenho em função de X:** para cada cenário de carga e frota, as métricas M1 a M4 em função do limiar X, com intervalos de confiança, evidenciando o *trade-off* entre o tempo de resposta geral (que piora com X maior) e a disponibilidade da USA para chamados graves (que melhora);",
    "**limiar recomendado X* por cenário:** o valor de X que maximiza a sobrevida esperada (M4) ou que atinge uma meta de M1 com a menor perda em M2;",
    "**mapa de decisão:** uma tabela simples, legível por gestores, indicando a partir de que nível de utilização vale a pena adotar a política de limiar e com qual X;",
    "**teste das hipóteses H1 a H3**, em especial a relação entre carga do sistema e valor de X*, e o efeito do erro de triagem;",
    "**simulador documentado e reprodutível**, disponível no repositório do trabalho, que possa ser reaplicado a outros serviços, como o SAMU, caso dados semelhantes sejam obtidos.",
  ]),
  P("Um resultado possível, e igualmente válido, é que, com a carga observada na base de calibração, a política de reserva traga ganho desprezível, e que o benefício só apareça em sistemas mais carregados. Nesse caso, a contribuição do trabalho será quantificar a partir de que ponto de utilização a regra do mais próximo deixa de ser adequada."),
];

// ===== 7 CRONOGRAMA =====
const X = "X";
const cap7 = [
  H1("7 Cronograma para o Trabalho de Formatura II"),
  P("A Tabela 7 apresenta o cronograma proposto para o TF2. Os meses serão ajustados ao calendário acadêmico do semestre em que o TF2 for cursado [[(confirmar)]]."),
  ...TABELA("Cronograma de atividades do TF2", ["Atividade", "Mês 1", "Mês 2", "Mês 3", "Mês 4", "Mês 5"], [
    ["Validar a classificação de gravidade e o papel da unidade avançada com profissionais de APH", X, "", "", "", ""],
    ["Gerar a matriz de tempos em rede (OSRM) e calibrar com os deslocamentos observados", X, X, "", "", ""],
    ["Implementar o simulador (SimPy) e as políticas P0 a P3", "", X, X, "", ""],
    ["Validar o modelo com a política observada (P1)", "", "", X, "", ""],
    ["Executar os experimentos (políticas x X x cenários)", "", "", X, X, ""],
    ["Analisar resultados, sensibilidade e hipóteses H1 a H3", "", "", "", X, X],
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
  "BROTCORNE, L.; LAPORTE, G.; SEMET, F. Ambulance location and relocation models. **European Journal of Operational Research**, v. 147, p. 451-463, 2003.",
  "CARTER, G. M.; CHAIKEN, J. M.; IGNALL, E. Response areas for two emergency units. **Operations Research**, v. 20, n. 3, p. 571-594, 1972. DOI: 10.1287/opre.20.3.571.",
  "CHURCH, R.; REVELLE, C. The maximal covering location problem. **Papers of the Regional Science Association**, v. 32, p. 101-118, 1974.",
  "DASKIN, M. S. A maximum expected covering location model: formulation, properties and heuristic solution. **Transportation Science**, v. 17, n. 1, p. 48-70, 1983.",
  "DE MAIO, V. J.; STIELL, I. G.; WELLS, G. A.; SPAITE, D. W. Optimal defibrillation response intervals for maximum out-of-hospital cardiac arrest survival rates. **Annals of Emergency Medicine**, v. 42, n. 2, p. 242-250, 2003. DOI: 10.1067/mem.2003.266.",
  "IANNONI, A. P.; MORABITO, R. A multiple dispatch and partial backup hypercube queuing model to analyze emergency medical systems on highways. **Transportation Research Part E**, v. 43, n. 6, p. 755-771, 2007.",
  "JAGTENBERG, C. J.; BHULAI, S.; VAN DER MEI, R. D. Dynamic ambulance dispatching: is the closest-idle policy always optimal? **Health Care Management Science**, v. 20, n. 4, p. 517-531, 2017. DOI: 10.1007/s10729-016-9368-0.",
  "LARSON, R. C. A hypercube queuing model for facility location and redistricting in urban emergency services. **Computers & Operations Research**, v. 1, n. 1, p. 67-95, 1974.",
  "MARIANOV, V.; REVELLE, C. The queueing maximal availability location problem: a model for the siting of emergency vehicles. **European Journal of Operational Research**, v. 93, p. 110-120, 1996.",
  "MCLAY, L. A.; MAYORGA, M. E. Evaluating emergency medical service performance measures. **Health Care Management Science**, v. 13, n. 2, p. 124-136, 2010. DOI: 10.1007/s10729-009-9115-x.",
  "MCLAY, L. A.; MAYORGA, M. E. A model for optimally dispatching ambulances to emergency calls with classification errors in patient priorities. **IIE Transactions**, v. 45, n. 1, p. 1-24, 2013. DOI: 10.1080/0740817X.2012.665200.",
  "PARK, S. H.; LEE, Y. H. Two-tiered ambulance dispatch and redeployment considering patient severity classification errors. **Journal of Healthcare Engineering**, v. 2019, 6031789, 2019. DOI: 10.1155/2019/6031789.",
  "SUDTACHAT, K.; MAYORGA, M. E.; MCLAY, L. A. Recommendations for dispatching emergency vehicles under multitiered response via simulation. **International Transactions in Operational Research**, v. 21, n. 4, p. 581-617, 2014. DOI: 10.1111/itor.12083.",
  "TAKEDA, R. A.; WIDMER, J. A.; MORABITO, R. Analysis of ambulance decentralization in an urban emergency medical service using the hypercube queueing model. **Computers & Operations Research**, v. 34, n. 3, p. 727-741, 2007.",
  "TOREGAS, C.; SWAIN, R.; REVELLE, C.; BERGMAN, L. The location of emergency service facilities. **Operations Research**, v. 19, n. 6, p. 1363-1373, 1971.",
];
const refs = [
  new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "REFERÊNCIAS", font: FONT })] }),
  ...REFS.map((r) => new Paragraph({ children: runs(r), alignment: AlignmentType.LEFT, spacing: { line: 240, after: 240 } })),
];

// ===== APÊNDICE =====
const queixas = fs.readFileSync(path.join(RAIZ, "tabelas", "queixas_classificadas.csv"), "utf8").trim().split("\n").slice(1)
  .map((l) => { const m = l.match(/^(.*),(\d+),(\w+)$/); return [m[1].replace(/^"|"$/g, ""), m[3], m[2]]; });
const apendice = [
  new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "APÊNDICE A - CLASSIFICAÇÃO DAS QUEIXAS POR GRAVIDADE PRESUMIDA", font: FONT })] }),
  P("Classificação provisória adotada nas análises, a ser validada com profissionais de APH. Contagem por chamado, após a exclusão dos testes."),
  ...TABELA("Queixas registradas e classe de gravidade atribuída", ["Queixa principal (como registrada)", "Gravidade", "Chamados"], queixas, [5471, 2000, 1600], FONTE_DADOS, false),
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
