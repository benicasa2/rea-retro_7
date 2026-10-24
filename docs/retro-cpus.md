> Documento histórico da primeira extensão. Para a versão com sete CPUs, consulte [a documentação atual](retro-additional-cpus.md), que substitui os limites antigos descritos abaixo.

# REA Retro: suporte a 6502, 6809 e Z80

Esta versão deriva de morluto/rea, commit base
`5d6b8a0ab693c03ab85cf0807d40bedf021e76d8` (6.7.0).
O 6502 já era suportado; esta extensão adiciona Motorola 6809 e Zilog Z80.

| CPU           | Arquitetura REA | Linguagem Ghidra     | Espaço |
| ------------- | --------------- | -------------------- | ------ |
| MOS 6502      | `6502`          | `6502:LE:16:default` | `RAM`  |
| Motorola 6809 | `6809`          | `6809:BE:16:default` | `RAM`  |
| Zilog Z80     | `z80`           | `z80:LE:16:default`  | `ram`  |

Todas usam o compiler spec `default` e um espaço de endereços de 16 bits.
O arquivo bruto completo deve caber no intervalo $0000–$FFFF. Endereços
ímpares são válidos para essas três CPUs. A escolha da CPU é explícita.
Os contratos CLI e MCP compartilham essa seleção. O adaptador Windows admite
as três famílias raw sem remover os controles nativos de isolamento.

## Configuração e uso

Use uma versão do Node aceita por package.json e instale as dependências:

```powershell
npm ci
npm run build:cached
```

No Windows, os controles nativos exigem os artefatos correspondentes à versão
REA 6.7.0, conforme [native/windows/README.md](../native/windows/README.md).
`dist`, node_modules, Ghidra e JDK não são fontes versionados deste projeto.

Instale separadamente uma distribuição oficial Ghidra 12.1.x e um JDK 64-bit
compatível. Configure os caminhos locais na sessão do terminal:

```powershell
$env:GHIDRA_INSTALL_DIR = 'C:\tools\ghidra_12.1.4_PUBLIC'
$env:JAVA_HOME = 'C:\tools\jdk-25'
$env:REA_ANALYSIS_PROVIDER = 'ghidra'
node scripts/rea.mjs doctor --json
node scripts/rea.mjs function programa.raw 0x8000 --target-format raw-binary --architecture z80 --entry-point 0x8000 --provider ghidra --json
```

Para outro processador, troque `z80` por `6502` ou `6809`, além do endereço.
`entry-point` conserva o contrato REA: mapeia o offset zero do arquivo e semeia
análise nesse endereço. Quando carga e execução diferem, declare uma função
via `REA_GHIDRA_SEED_FILE` e solicite o endereço de execução separadamente.
A extensão não faz essa escolha automaticamente.

## Validação realizada

Em Windows x64, Ghidra oficial 12.1.4 e JDK Temurin 25.0.4.1:

- Compilação e typecheck passaram.
- 40 testes de domínio raw passaram.
- 22 testes de linguagem/atestado de mapeamento passaram.
- 5 testes selecionados do perfil raw Ghidra passaram.
- 7 testes da fronteira CLI raw passaram.
- 12 testes selecionados da fronteira MCP passaram (3 fora do filtro).
- Descoberta encontrou todos os 2.130 arquivos de teste exatamente uma vez.
- Teste real 6809: importação de um payload CoCo com função semeada no endereço
  de execução produziu Assembly e pseudocódigo; mapeamento verificado.
- Teste real Z80: fixture própria de 50 bytes em $8001, mapeamento verificado,
  chamada $8003->$8011 e prefixos CB, ED, DD e FD reconhecidos pelo Ghidra.
- Os exemplos 6809 do jogo analisado não são distribuídos com estes fontes.

Os testes locais usaram Node 24.22.0, abaixo da faixa upstream ^24.22.1.
O requisito do pacote não foi relaxado. Para instalar, use uma versão aceita
por package.json. A validação descrita corresponde a essas execuções locais;
não implica cobertura completa de instruções ou resultados de CI remoto.

## Limites

Análise estática não emula o computador, suas ROMs, vídeo, teclado ou I/O.
Suporte a CPU não equivale a suporte automático a arquivos CAS, imagens de
disco, snapshots, cabeçalhos de cartucho, bancos de memória ou formatos MSX,
ZX Spectrum e TRS-80. Use bytes extraídos e um mapa de carga conhecido.

A extensão não seleciona 65C02/65816, Hitachi 6309, Z180 ou eZ80. Pseudocódigo
é uma interpretação automática que precisa de revisão; não recupera nomes e
comentários originais nem realiza uma conversão pronta para outra máquina.
