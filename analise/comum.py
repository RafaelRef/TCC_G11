"""Definições compartilhadas pelos scripts de análise do TCC G11.

Caminhos, paleta de cores, classificação de gravidade e leitura da base.
"""
from pathlib import Path

import matplotlib
import numpy as np
import matplotlib.pyplot as plt
import pandas as pd

matplotlib.use("Agg")

RAIZ = Path(__file__).resolve().parents[1]
BRUTOS = RAIZ / "dados" / "brutos"
PROCESSADOS = RAIZ / "dados" / "processados"
FIGURAS = RAIZ / "figuras"
TABELAS = RAIZ / "tabelas"
for p in (PROCESSADOS, FIGURAS, TABELAS):
    p.mkdir(parents=True, exist_ok=True)

ARQUIVO_BRUTO = BRUTOS / "deslocamentos-vtr-hatzala-sp.xlsx"

# Posição real das bases, informada pelo grupo (nov/2026). A distância base->ocorrência
# da planilha é calculada pelo sistema a partir do ponto cadastrado de cada base; para a
# base "Itaim" esse ponto é a Rua Ofélia, cerca de 1 km da base real (Clube Hebraica).
# As distâncias são recalculadas a partir das posições abaixo.
BASES_CONHECIDAS = {
    "Higienópolis": {"lat": -23.53411, "lng": -46.66143,
                     "endereco": "Rua Doutor Cândido Espinheira, 155, Perdizes"},
    "Itaim": {"lat": -23.57954, "lng": -46.69101,
              "endereco": "Rua Angelina Maffei Vita, 450 (Clube Hebraica), Pinheiros"},
    "Jardins": {"lat": -23.56373, "lng": -46.66420,
                "endereco": "Rua Padre João Manuel, 727, Cerqueira César"},
}

R_TERRA = 6371.0


def haversine(lat1, lng1, lat2, lng2):
    """Distância em linha reta (km) entre pontos dados em graus."""
    p1, p2 = np.radians(lat1), np.radians(lat2)
    dphi, dl = p2 - p1, np.radians(np.asarray(lng2) - np.asarray(lng1))
    a = np.sin(dphi / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dl / 2) ** 2
    return 2 * R_TERRA * np.arcsin(np.sqrt(a))

# Paleta categórica (ordem fixa) e tintas de texto
AZUL, LARANJA, AQUA, AMARELO = "#2a78d6", "#eb6834", "#1baf7a", "#eda100"
CINZA = "#9a9993"
TEXTO, TEXTO_2 = "#0b0b0b", "#52514e"

# ---------------------------------------------------------------------------
# Classificação de gravidade presumida (PROVISÓRIA)
# Proxy construído a partir da queixa principal registrada na triagem.
# Deve ser validada com profissionais de APH antes do TF2.
# ---------------------------------------------------------------------------
# Três classes de prioridade definidas pelo grupo (nov/2026). As queixas
# marcadas com "# grupo" foram listadas explicitamente pelo grupo; as demais
# foram encaixadas por analogia e precisam de confirmação.
ALTA = {
    "PARADA CARDIO RESPIRATÓRIA (PCR)", "HEMORRAGIA",
    "REBAIXAMENTO DO NIVEL DE CONSCIENCIA", "DESMAIO", "SÍNCOPE",  # grupo
    "PERDA DE CONSCIÊNCIA", "CONVULSÃO", "ENGASGO",
    "TCE - TRAUMATISMO CRANIOENCEFALICO", "QUEDA DE ALTURA",
    "ACIDENTE COM AUTOMÓVEL", "ATROPELAMENTO",
}
MEDIA = {
    "AVC", "DISPNEIA", "DOR TORACICA", "MAL SUBITO", "CRISE HIPERTENSIVA",
    "QUEDA DA PRÓPRIA ALTURA",  # grupo
    "DESCONFORTO RESPIRATÓRIO", "QUEDA DE SATURAÇÃO", "INTOXICAÇÃO EXÓGENA",
    "ENVENENAMENTO", "TAQUICARDIA", "HIPOTENSÃO", "HIPOGLICEMIA",
    "HIPERGLICEMIA", "DOR ABDOMINAL", "FRATURA DE BACIA/PELVE",
    "FRATURA DE MEMBRO SUPERIOR", "QUEIMADURA",
}
BAIXA = {
    "OUTROS", "OUTROS SHABAT", "MAL ESTAR", "DESIDRATAÇAO",  # grupo
    "HIPERTEMIA", "ALCOOLISMO", "INSUF RENAL",
}
ORDEM_GRAVIDADE = ["Alta", "Média", "Baixa"]
CORES_GRAVIDADE = {"Alta": LARANJA, "Média": AMARELO, "Baixa": AZUL}


def gravidade(queixa: str) -> str:
    """Classe de prioridade presumida a partir da queixa principal."""
    if queixa in ALTA:
        return "Alta"
    if queixa in MEDIA:
        return "Média"
    if queixa in BAIXA:
        return "Baixa"
    return "Baixa"  # queixas genéricas ou não listadas


def estilo():
    plt.rcParams.update({
        "font.family": "DejaVu Sans",
        "font.size": 10,
        "axes.edgecolor": CINZA,
        "axes.labelcolor": TEXTO_2,
        "axes.titlesize": 11,
        "axes.titleweight": "bold",
        "axes.titlecolor": TEXTO,
        "axes.spines.top": False,
        "axes.spines.right": False,
        "axes.grid": True,
        "axes.axisbelow": True,
        "grid.color": "#e6e5e0",
        "grid.linewidth": 0.6,
        "xtick.color": TEXTO_2,
        "ytick.color": TEXTO_2,
        "legend.frameon": False,
        "figure.dpi": 150,
        "savefig.dpi": 300,
        "savefig.bbox": "tight",
    })


def ler_limpa() -> pd.DataFrame:
    """Lê a base limpa gerada por 01_limpeza.py."""
    arq = PROCESSADOS / "acionamentos_limpos.pkl"
    if not arq.exists():
        raise FileNotFoundError("Rode antes: python analise/01_limpeza.py")
    return pd.read_pickle(arq)
