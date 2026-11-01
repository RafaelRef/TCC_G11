"""Etapa 4: uso da unidade avançada (USA) e conflitos de disponibilidade.

Perguntas exploratórias que motivam o TCC:
  (a) Em que tipo de chamado a USA é empenhada?
  (b) Com que frequência um chamado de gravidade alta chega enquanto a USA
      está ocupada? E ocupada com um chamado de gravidade baixa/indeterminada?
  (c) Quando USA e USB vão ao mesmo chamado, quem chega primeiro e com que diferença?
  (d) Qual a probabilidade teórica de a USA estar ocupada (modelo Erlang B, 1 servidor)?

Hipótese de imputação: quando a USA não registra a liberação (registros
incompletos da tripulação), assume-se ocupação igual à mediana observada nos
acionamentos válidos da própria USA. Acionamentos cancelados, recusados ou sem
resposta ocupam a viatura até o registro de cancelamento; na ausência dele,
são ignorados.

Saídas: tabelas/usa_*.csv (agregadas), dados/processados/usa_diferenca_chegada.csv, figuras/fig_diferenca_chegada.png, figuras/fig_conflitos_usa.png
"""
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from comum import (AZUL, CINZA, CORES_GRAVIDADE, FIGURAS, LARANJA, ORDEM_GRAVIDADE, PROCESSADOS,
                   TABELAS, TEXTO_2, estilo, ler_limpa)

NAO_OCUPA = {"Cancelada", "Recusou", "Recebida (sem resposta)", "Desistiu"}


def intervalos_usa(df):
    u = df[(df["tipo_vtr"] == "USA") & ~df["situacao_vtr"].isin(NAO_OCUPA)].copy()
    med = u.loc[u["ok_ocupacao"], "min_ocupacao"].median()
    u["inicio"] = u["t_acionada"]
    fim_obs = u["t_acionada"] + pd.to_timedelta(u["min_ocupacao"], unit="min")
    u["fim"] = np.where(u["ok_ocupacao"], fim_obs, u["t_acionada"] + pd.Timedelta(minutes=med))
    u["fim"] = pd.to_datetime(u["fim"])
    u["imputado"] = ~u["ok_ocupacao"]
    return u, med


def conflitos(df, u):
    cham = df.sort_values("t_acionada").groupby("chamado").agg(
        dt=("dt_chamado", "first"), gravidade=("gravidade", "first"))
    linhas = []
    for ch, r in cham.iterrows():
        ocup = u[(u["inicio"] <= r["dt"]) & (u["fim"] > r["dt"]) & (u["chamado"] != ch)]
        linhas.append({"chamado": ch, "gravidade": r["gravidade"], "usa_ocupada": len(ocup) > 0,
                       "ocupada_com": ocup["gravidade"].iloc[0] if len(ocup) else None})
    k = pd.DataFrame(linhas)
    tab = k.groupby("gravidade").agg(chamados=("chamado", "size"),
                                     com_usa_ocupada=("usa_ocupada", "sum")).reindex(ORDEM_GRAVIDADE)
    tab["pct"] = (100 * tab["com_usa_ocupada"] / tab["chamados"]).round(1)
    cruz = pd.crosstab(k.loc[k["usa_ocupada"], "gravidade"], k.loc[k["usa_ocupada"], "ocupada_com"])
    cruz = cruz.reindex(index=ORDEM_GRAVIDADE, columns=ORDEM_GRAVIDADE, fill_value=0)
    return tab, cruz


def diferenca_chegada(df):
    v = df[df["chegou_cena"]]
    linhas = []
    for ch, g in v.groupby("chamado"):
        if {"USA", "USB"} <= set(g["tipo_vtr"]):
            t_usa = g.loc[g["tipo_vtr"] == "USA", "t_cena"].min()
            t_usb = g.loc[g["tipo_vtr"] == "USB", "t_cena"].min()
            linhas.append({"chamado": ch, "gravidade": g["gravidade"].iloc[0],
                           "dif_min": (t_usa - t_usb).total_seconds() / 60})
    return pd.DataFrame(linhas)


def fig_diferenca(d):
    fig, ax = plt.subplots(figsize=(6.5, 3.2))
    x = d["dif_min"].clip(-30, 30)
    bins = np.arange(-30, 32, 2)
    ax.hist(x[x < 0], bins=bins, color=LARANJA, edgecolor="white", linewidth=1.5, label="USA chegou antes")
    ax.hist(x[x >= 0], bins=bins, color=AZUL, edgecolor="white", linewidth=1.5, label="USB chegou antes")
    ax.axvline(0, color=TEXTO_2, lw=1)
    n_dir, n_esq = int((d["dif_min"] >= 30).sum()), int((d["dif_min"] <= -30).sum())
    ax.annotate(f"{n_dir} chamados com\ndiferença ≥ 30 min", (29, n_dir), xytext=(14, n_dir * 0.85),
                fontsize=8, color=TEXTO_2, arrowprops=dict(arrowstyle="-", color=CINZA))
    ax.annotate(f"{n_esq} com ≤ -30 min", (-29, n_esq), xytext=(-27, n_esq + 3),
                fontsize=8, color=TEXTO_2, arrowprops=dict(arrowstyle="-", color=CINZA))
    ax.set_xlabel("Chegada da USA menos chegada da USB (min); valores limitados a ±30")
    ax.set_ylabel("Nº de chamados")
    ax.legend(loc="upper left")
    ax.grid(axis="x", visible=False)
    fig.tight_layout()
    fig.savefig(FIGURAS / "fig_diferenca_chegada.png")
    plt.close(fig)


def fig_conflitos(tab):
    fig, ax = plt.subplots(figsize=(6.5, 2.6))
    y = np.arange(len(tab))[::-1]
    ax.barh(y, tab["pct"], color=[CORES_GRAVIDADE[g] for g in tab.index], height=0.6)
    ax.set_yticks(y, tab.index)
    for yi, (p, n, c) in zip(y, tab[["pct", "chamados", "com_usa_ocupada"]].values):
        ax.text(p + 0.3, yi, f"{p:.1f}% ({int(c)} de {int(n)})", va="center", fontsize=9, color=TEXTO_2)
    ax.set_xlabel("% dos chamados que chegaram com a USA ocupada em outro atendimento")
    ax.set_xlim(0, max(tab["pct"].max() * 1.6, 5))
    ax.grid(axis="y", visible=False)
    fig.tight_layout()
    fig.savefig(FIGURAS / "fig_conflitos_usa.png")
    plt.close(fig)


def erlang_b(rho, c=1):
    inv = 1.0
    for k in range(1, c + 1):
        inv = 1 + inv * k / rho
    return 1 / inv


def main():
    estilo()
    df = ler_limpa()

    # (a) Situação final dos acionamentos da USA
    sit = df[df["tipo_vtr"] == "USA"].groupby("gravidade")["situacao_vtr"].value_counts().unstack(fill_value=0)
    sit = sit.reindex(ORDEM_GRAVIDADE).fillna(0).astype(int)
    sit.to_csv(TABELAS / "usa_situacao_por_gravidade.csv")

    u, med = intervalos_usa(df)
    tab, cruz = conflitos(df, u)
    tab.to_csv(TABELAS / "usa_conflitos_por_gravidade.csv")
    cruz.to_csv(TABELAS / "usa_conflitos_cruzado.csv")
    fig_conflitos(tab)

    d = diferenca_chegada(df)
    d.to_csv(PROCESSADOS / "usa_diferenca_chegada.csv", index=False)  # nível de chamado: não versionar
    fig_diferenca(d)

    # (d) Utilização e Erlang B
    horas = (df["dt_chamado"].max() - df["dt_chamado"].min()).total_seconds() / 3600
    lam = len(u) / horas                       # empenhos da USA por hora
    ocup_media = (u["fim"] - u["inicio"]).dt.total_seconds().mean() / 3600
    rho = lam * ocup_media
    res = pd.DataFrame([
        ("Período analisado (h)", round(horas, 1)),
        ("Empenhos efetivos da USA", len(u)),
        ("  dos quais com ocupação imputada", int(u["imputado"].sum())),
        ("Ocupação mediana observada da USA (min)", round(med, 1)),
        ("Taxa de empenho da USA (por hora)", round(lam, 4)),
        ("Intensidade de tráfego rho = lambda x E[S]", round(rho, 4)),
        ("P(USA ocupada) Erlang B, 1 servidor", round(erlang_b(rho), 4)),
        ("Chamados com USA e USB em cena", len(d)),
        ("  USA chegou antes (%)", round(100 * (d["dif_min"] < 0).mean(), 1)),
        ("  diferença mediana USA-USB (min)", round(d["dif_min"].median(), 1)),
    ], columns=["indicador", "valor"])
    res.to_csv(TABELAS / "usa_resumo.csv", index=False)

    print(sit.to_string(), "\n")
    print(tab.to_string(), "\n")
    print("Chamado (linha) chegou enquanto a USA atendia chamado de gravidade (coluna):")
    print(cruz.to_string(), "\n")
    print(res.to_string(index=False))


if __name__ == "__main__":
    main()
