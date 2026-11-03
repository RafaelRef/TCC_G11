# TCC G11: reserva de ambulâncias em áreas de alta densidade de ocorrências

Trabalho de Formatura em Engenharia Civil, Escola Politécnica da USP (2026).

**Pergunta de pesquisa.** Em um sistema urbano de atendimento pré-hospitalar com bases em áreas de
densidade de ocorrências distinta, a partir de que densidade de ocorrências de prioridade alta
(chamados por km² por hora) vale a pena preservar a viatura da área densa e atender os chamados não
graves dessa área com uma viatura de uma área menos densa?

Os dados operacionais da Hatzalá São Paulo (jul a out/2026) são usados para **calibrar** um modelo
genérico de simulação, não para avaliar a operação da Hatzalá.

## Estrutura

```
analise/           scripts Python (rodar na ordem numérica)
  comum.py         caminhos, paleta, classificação de prioridade (alta/média/baixa)
  01_limpeza.py    padronização e regras de qualidade (R1 a R5)
  02_descritiva.py demanda, gravidade e tempos de atendimento
  03_mapa.py       trilateração das bases e mapa das ocorrências
  04_usa_conflitos.py  uso da USA, conflitos e Erlang B
dados/brutos/      planilha original (NÃO versionada)
dados/processados/ base limpa (NÃO versionada)
figuras/           figuras do relatório (PNG, 300 dpi)
tabelas/           tabelas agregadas (CSV)
relatorio/         texto preliminar (.docx) e script que o gera
referencias/       lista de referências verificadas
```

## Como reproduzir

```bash
pip install -r requirements.txt
# coloque a planilha em dados/brutos/deslocamentos-vtr-hatzala-sp.xlsx
python analise/01_limpeza.py
python analise/02_descritiva.py
python analise/03_mapa.py
python analise/04_usa_conflitos.py
```

## Sobre os dados

A planilha da Hatzalá **não está neste repositório** (o repositório é público). Ela já vem
sanitizada (sem nomes, telefones nem número da residência; coordenadas arredondadas a ~100 m),
mas continua sendo dado operacional de um parceiro e só deve ser compartilhada com autorização.
As tabelas e figuras versionadas são apenas agregados.

## Grupo

Erik Su, Gustavo Blasbalg, Rafael Fernandez e Roni Fogelman.
