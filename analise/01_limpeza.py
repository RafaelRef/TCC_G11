"""Etapa 1: leitura, padronização e diagnóstico de qualidade da base Hatzalá.

Entrada : dados/brutos/deslocamentos-vtr-hatzala-sp.xlsx (não versionado)
Saídas  : dados/processados/acionamentos_limpos.pkl (não versionado)
          tabelas/qualidade_dados.csv (agregado, versionado)

Regras de limpeza (provisórias, a discutir com o orientador):
  R1  Excluir chamados de teste (queixa ou protocolo "TESTE DISPARO").
  R2  Marcar como fora da área ocorrências fora do município de São Paulo
      ou a mais de 30 km da base (mantidas na contagem, excluídas da análise espacial).
  R3  Tempo de deslocamento (saída -> cena) válido entre 0,5 e 60 min.
      Valores abaixo de 0,5 min indicam registro tardio do botão "a caminho";
      acima de 60 min, esquecimento do registro "em cena".
  R4  Tempo de preparo (acionamento -> saída) válido até 30 min.
  R5  Tempo de ocupação (acionamento -> liberada) válido entre 1 e 240 min.
"""
import pandas as pd

from comum import ARQUIVO_BRUTO, BASES_CONHECIDAS, PROCESSADOS, TABELAS, gravidade, haversine

RENOMEAR = {
    "Nº chamado": "chamado", "Data/hora do chamado": "dt_chamado",
    "Situação do chamado": "situacao_chamado", "Queixa principal": "queixa",
    "Protocolo": "protocolo", "VTR": "vtr", "Tipo de VTR": "tipo_vtr",
    "Situação da VTR": "situacao_vtr", "Base da VTR": "base",
    "Bairro da ocorrência": "bairro", "Cidade": "cidade",
    "Lat. aprox. (~100 m)": "lat", "Lng. aprox. (~100 m)": "lng",
    "Levou ao hospital?": "levou_hospital", "Hospital": "hospital",
    "VTR acionada": "t_acionada", "VTR aceitou": "t_aceitou",
    "VTR saiu (a caminho)": "t_saiu", "VTR em cena": "t_cena",
    "Saiu p/ hospital": "t_saiu_hosp", "Chegou ao hospital": "t_chegou_hosp",
    "VTR liberada": "t_liberada",
    "Acionamento → saída (min)": "min_preparo",
    "Saída → cena (min)": "min_deslocamento",
    "Acionamento → cena (min)": "min_resposta",
    "Tempo em cena (min)": "min_em_cena",
    "Trajeto ao hospital (min)": "min_trajeto_hosp",
    "Acionamento → liberada (min)": "min_ocupacao",
    "Distância inicial VTR→ocorrência, por rota (km)": "km_rota_inicial",
    "ETA inicial (min)": "eta_inicial",
    "Distância base→ocorrência, linha reta (km)": "km_base_ocorr",
    "Distância ocorrência→hospital, linha reta (km)": "km_ocorr_hosp",
}


def main():
    bruto = pd.read_excel(ARQUIVO_BRUTO, sheet_name="Deslocamentos")
    df = bruto.rename(columns=RENOMEAR)[list(RENOMEAR.values())].copy()
    n0, c0 = len(df), df["chamado"].nunique()

    # R1
    teste = (df["queixa"] == "TESTE DISPARO") | (df["protocolo"] == "TESTE DISPARO")
    df = df[~teste].copy()

    df["gravidade"] = df["queixa"].map(gravidade)
    df["hora"] = df["dt_chamado"].dt.hour
    df["dia_semana"] = df["dt_chamado"].dt.dayofweek  # 0 = segunda
    df["mes"] = df["dt_chamado"].dt.to_period("M").astype(str)

    # Distância à base: recalculada para as bases com posição conhecida (comum.py)
    df["km_base_ocorr_sistema"] = df["km_base_ocorr"]
    corrigida = df["base"].isin(BASES_CONHECIDAS.keys()) & df["lat"].notna()
    for b, pos in BASES_CONHECIDAS.items():
        m = corrigida & (df["base"] == b)
        df.loc[m, "km_base_ocorr"] = haversine(pos["lat"], pos["lng"], df.loc[m, "lat"], df.loc[m, "lng"]).round(2)

    # R2
    df["fora_area"] = (df["cidade"] != "São Paulo") | (df["km_base_ocorr"] > 30)

    # R3 a R5
    df["ok_deslocamento"] = df["min_deslocamento"].between(0.5, 60)
    df["ok_preparo"] = df["min_preparo"].between(0, 30)
    df["ok_resposta"] = df["ok_deslocamento"] & df["ok_preparo"] & ~df["fora_area"]
    df["ok_ocupacao"] = df["min_ocupacao"].between(1, 240)
    df["chegou_cena"] = df["t_cena"].notna()

    df.to_pickle(PROCESSADOS / "acionamentos_limpos.pkl")

    linhas = [
        ("Acionamentos na base original", n0),
        ("Chamados na base original", c0),
        ("Acionamentos de teste removidos (R1)", int(teste.sum())),
        ("Acionamentos após R1", len(df)),
        ("Chamados após R1", df["chamado"].nunique()),
        ("Acionamentos fora da área de estudo (R2)", int(df["fora_area"].sum())),
        ("Acionamentos com chegada à cena registrada", int(df["chegou_cena"].sum())),
        ("Deslocamento < 0,5 min (registro tardio, R3)", int((df["min_deslocamento"] < 0.5).sum())),
        ("Deslocamento > 60 min (R3)", int((df["min_deslocamento"] > 60).sum())),
        ("Preparo > 30 min (R4)", int((df["min_preparo"] > 30).sum())),
        ("Acionamentos com tempo de resposta válido", int(df["ok_resposta"].sum())),
        ("Acionamentos com tempo de ocupação válido (R5)", int(df["ok_ocupacao"].sum())),
        ("Acionamentos com distância à base recalculada (base Itaim no Clube Hebraica)", int(corrigida.sum())),
        ("Acionamentos com distância por rota (GPS, a partir de set/2026)", int(df["km_rota_inicial"].notna().sum())),
    ]
    q = pd.DataFrame(linhas, columns=["indicador", "valor"])
    q.to_csv(TABELAS / "qualidade_dados.csv", index=False)
    print(q.to_string(index=False))


if __name__ == "__main__":
    main()
