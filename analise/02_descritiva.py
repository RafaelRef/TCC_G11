"""Etapa 2: caracterização descritiva da demanda e dos tempos de atendimento.

Saídas: figuras/fig_*.png e tabelas/*.csv (todas agregadas, versionadas).
"""
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from comum import (AZUL, CINZA, CORES_GRAVIDADE, FIGURAS, LARANJA, ORDEM_GRAVIDADE,
                   TABELAS, TEXTO_2, estilo, ler_limpa)

DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]


def por_chamado(df):
    """Uma linha por chamado (atributos do chamado, não da viatura)."""
    c = df.sort_values("t_acionada").groupby("chamado").agg(
        dt_chamado=("dt_chamado", "first"), queixa=("queixa", "first"),
        protocolo=("protocolo", "first"), gravidade=("gravidade", "first"),
        hora=("hora", "first"), dia_semana=("dia_semana", "first"),
        mes=("mes", "first"), n_vtr=("vtr", "size"),
        teve_usa=("tipo_vtr", lambda s: (s == "USA").any()),
        levou_hospital=("levou_hospital", lambda s: (s == "Sim").any()),
    )
    return c


def fig_demanda_temporal(c):
    fig, axes = plt.subplots(1, 2, figsize=(10, 3.4), gridspec_kw={"width_ratios": [2.2, 1]})
    h = c["hora"].value_counts().reindex(range(24), fill_value=0)
    axes[0].bar(h.index, h.values, color=AZUL, width=0.8)
    axes[0].set_xlabel("Hora do chamado")
    axes[0].set_ylabel("Nº de chamados")
    axes[0].set_xticks(range(0, 24, 3))
    axes[0].set_title("(a) Por hora do dia", loc="left")
    d = c["dia_semana"].value_counts().reindex(range(7), fill_value=0)
    axes[1].bar(DIAS, d.values, color=AZUL, width=0.7)
    axes[1].set_title("(b) Por dia da semana", loc="left")
    for ax in axes:
        ax.grid(axis="x", visible=False)
    fig.tight_layout()
    fig.savefig(FIGURAS / "fig_demanda_temporal.png")
    plt.close(fig)


def fig_gravidade(c):
    g = c["gravidade"].value_counts().reindex(ORDEM_GRAVIDADE)
    fig, ax = plt.subplots(figsize=(6.5, 2.6))
    y = np.arange(len(g))[::-1]
    ax.barh(y, g.values, color=[CORES_GRAVIDADE[k] for k in g.index], height=0.6)
    ax.set_yticks(y, g.index)
    tot = g.sum()
    for yi, v in zip(y, g.values):
        ax.text(v + 3, yi, f"{v} ({v / tot:.0%})", va="center", color=TEXTO_2, fontsize=9)
    ax.set_xlabel("Nº de chamados")
    ax.set_xlim(0, g.max() * 1.25)
    ax.grid(axis="y", visible=False)
    fig.tight_layout()
    fig.savefig(FIGURAS / "fig_gravidade.png")
    plt.close(fig)


def fig_tempo_resposta(df):
    v = df[df["ok_resposta"]]
    fig, ax = plt.subplots(figsize=(6.5, 3.6))
    for tipo, cor, nome in [("USB", AZUL, "USB (suporte básico)"), ("USA", LARANJA, "USA (suporte avançado)")]:
        x = np.sort(v.loc[v["tipo_vtr"] == tipo, "min_resposta"].values)
        yv = np.arange(1, len(x) + 1) / len(x)
        ax.step(x, yv, where="post", color=cor, lw=2, label=f"{nome}, n = {len(x)}")
    for ref, ypos in ((8, 0.03), (10, 0.11), (15, 0.03)):
        ax.axvline(ref, color=CINZA, lw=0.8, ls="--")
        ax.text(ref + 0.3, ypos, f"{ref} min", color=TEXTO_2, fontsize=8)
    ax.set_xlim(0, 40)
    ax.set_ylim(0, 1.02)
    ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda p, _: f"{p:.0%}"))
    ax.set_xlabel("Tempo de resposta: acionamento até chegada à cena (min)")
    ax.set_ylabel("Proporção acumulada de acionamentos")
    ax.legend(loc="lower right")
    fig.tight_layout()
    fig.savefig(FIGURAS / "fig_tempo_resposta_ecdf.png")
    plt.close(fig)


def fig_componentes(df):
    """Mediana das etapas do ciclo de atendimento por tipo de viatura."""
    etapas = [("min_preparo", "Preparo"), ("min_deslocamento", "Deslocamento"),
              ("min_em_cena", "Em cena"), ("min_trajeto_hosp", "Trajeto ao hospital")]
    v = df[df["ok_resposta"] & df["ok_ocupacao"]]
    med = v.groupby("tipo_vtr")[[e for e, _ in etapas]].median().reindex(["USB", "USA"])
    fig, ax = plt.subplots(figsize=(6.5, 2.4))
    cores = [AZUL, LARANJA, "#1baf7a", "#eda100"]
    for i, tipo in enumerate(med.index):
        esq = 0
        for (col, nome), cor in zip(etapas, cores):
            w = med.loc[tipo, col]
            ax.barh(i, w, left=esq, color=cor, height=0.55, edgecolor="white", linewidth=2,
                    label=nome if i == 0 else None)
            if w >= 3:
                ax.text(esq + w / 2, i, f"{w:.0f}", ha="center", va="center", color="white", fontsize=8)
            esq += w
    ax.set_yticks(range(len(med)), med.index)
    ax.invert_yaxis()
    ax.set_xlabel("Minutos (mediana de cada etapa)")
    ax.legend(ncol=4, loc="upper center", bbox_to_anchor=(0.5, -0.38), fontsize=8)
    ax.grid(axis="y", visible=False)
    fig.tight_layout()
    fig.savefig(FIGURAS / "fig_etapas_atendimento.png")
    plt.close(fig)


def tabelas(df, c):
    def resumo(s):
        s = s.dropna()
        return pd.Series({"n": len(s), "media": s.mean(), "p25": s.quantile(.25),
                          "mediana": s.median(), "p75": s.quantile(.75), "p90": s.quantile(.9)})

    v = df[df["ok_resposta"]]
    t1 = pd.concat({
        "Preparo (acionamento-saída)": v.groupby("tipo_vtr")["min_preparo"].apply(resumo).unstack(),
        "Deslocamento (saída-cena)": v.groupby("tipo_vtr")["min_deslocamento"].apply(resumo).unstack(),
        "Resposta (acionamento-cena)": v.groupby("tipo_vtr")["min_resposta"].apply(resumo).unstack(),
        "Ocupação (acionamento-liberação)": df[df["ok_ocupacao"]].groupby("tipo_vtr")["min_ocupacao"].apply(resumo).unstack(),
    }).round(1)
    t1.to_csv(TABELAS / "tempos_por_tipo_vtr.csv")

    t2 = c.groupby("gravidade").agg(chamados=("n_vtr", "size"),
                                    pct_com_usa=("teve_usa", "mean"),
                                    pct_hospital=("levou_hospital", "mean"),
                                    vtr_por_chamado=("n_vtr", "mean")).reindex(ORDEM_GRAVIDADE)
    t2[["pct_com_usa", "pct_hospital"]] *= 100
    t2.round(1).to_csv(TABELAS / "perfil_por_gravidade.csv")

    t3 = df.groupby(["base", "vtr", "tipo_vtr"]).agg(
        acionamentos=("chamado", "size"),
        resposta_mediana=("min_resposta", lambda s: s[df.loc[s.index, "ok_resposta"]].median()),
        km_mediano_base_ocorr=("km_base_ocorr", lambda s: s[~df.loc[s.index, "fora_area"]].median()),
    ).round(2)
    t3.to_csv(TABELAS / "resumo_por_viatura.csv")

    t4 = c["queixa"].value_counts().rename("chamados").to_frame()
    t4["gravidade"] = [df.loc[df["queixa"] == q, "gravidade"].iloc[0] for q in t4.index]
    t4.to_csv(TABELAS / "queixas_classificadas.csv")

    print(t1.to_string(), "\n")
    print(t2.round(1).to_string(), "\n")
    print(t3.to_string())
    dias = (c["dt_chamado"].max() - c["dt_chamado"].min()).days + 1
    print(f"\nChamados: {len(c)} em {dias} dias = {len(c) / dias:.2f} chamados/dia")


def main():
    estilo()
    df = ler_limpa()
    c = por_chamado(df)
    fig_demanda_temporal(c)
    fig_gravidade(c)
    fig_tempo_resposta(df)
    fig_componentes(df)
    tabelas(df, c)


if __name__ == "__main__":
    main()
