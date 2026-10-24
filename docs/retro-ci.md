# Verificação das versões Retro

As versões 7 e 9 mantêm as verificações de formato, tipos, documentação e testes.
Os links adicionais da variante também aparecem nos READMEs traduzidos.

## Duplicação herdada

A referência upstream `5d6b8a0ab` já excedia o limite de 3,5%:
o jscpd 5.0.12 mediu 39.558 linhas duplicadas em 1.106.482 linhas
(3,5751146426241007%). A referência foi medida por `git archive HEAD src tests`
na cópia original, usando a mesma configuração e versão do detector.
O limite da variante é 3,575%, ligeiramente inferior ao valor herdado.
Os testes de CPUs usam tabelas para reduzir as cópias, mantendo os casos
de admissão, limites de endereço, seleção de linguagem e autoridade.
Não aumente esse limite para acomodar novas duplicações.

## Releases

O workflow de proposta de release do upstream tenta abrir PRs e preparar
o pacote `rea-agents`. Nas variantes, propostas automáticas ficam desativadas
por padrão. Para adotá-las deliberadamente, configure a variável de repositório
`REA_ENABLE_RELEASE_PROPOSALS=true`, permita a criação de PRs por Actions e
revise antes os destinos de publicação. O CI continua ativo.

## Testes corrigidos

- PTX: `.ptr .global` é válido; o caso de declaração desconhecida usa uma
  extensão desconhecida, preservando as verificações de fatos parciais.
- Diretórios: o simulador devolve nomes em bytes, como o leitor solicita.
- GDB: o simulador responde à consulta de conclusão `-gdb-show mi-async`.
- HAR: a captura do teste CLI comporta os diagnósticos de memória, sem alterar
  os limites do decodificador nem aceitar falha por buffer como sucesso.

## Verificação com Ghidra real

`npm run verify:ghidra:retro` executa os exemplos das CPUs adicionais.
Configure `GHIDRA_INSTALL_DIR` e instale os módulos descritos no guia
`retro-additional-cpus.md` antes de executar esse comando.
