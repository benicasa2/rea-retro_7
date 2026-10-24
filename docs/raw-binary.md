# Headerless raw-binary analysis with Ghidra

REA admits a headerless executable when the caller supplies the CPU family and
the address where file offset 0 should be mapped. That interpretation is not
inferred from a `.bin` suffix or from unrecognized bytes.

## Open and inspect

```bash
rea inspect /absolute/path/to/ecu.bin --target-format raw-binary --architecture arm --entry-point 0x8000000 --provider ghidra --json
rea function /absolute/path/to/ecu.bin 0x8000000 --target-format raw-binary --architecture arm --entry-point 0x8000000 --provider ghidra --json
rea inspect-native-load-image /absolute/path/to/ecu.bin --target-format raw-binary --architecture arm --entry-point 0x8000000 --provider ghidra --json
```

```json
{
  "name": "open_binary",
  "arguments": {
    "path": "/absolute/path/to/ecu.bin",
    "format": "raw-binary",
    "architecture": "arm",
    "entry_point": "0x8000000",
    "provider_id": "ghidra"
  }
}
```

`architecture` is one of `x86`, `x86_64`, `arm`, `arm64`, `6502`, `65c02`, `65816`, `8080`, `6800`, `6809`, `z80`, or `m68k`. `entry_point` is a
hexadecimal address of the form `0x…`. The complete file is mapped starting at
that address, and Ghidra seeds an `entry` function there before auto-analysis.
ARM and AArch64 entries must be 4-byte aligned; m68k entries must be 2-byte
aligned; x86 and retro CPU entries may be byte-aligned.
For 6502, 65c02, 8080, 6800, 6809, and z80, the entry and complete mapped file must fit within `0x0000..0xffff`;
images that cross the 16-bit boundary are rejected before provider startup.
For 65816, the complete mapping must fit within `0x0..0xffffff`.
For m68k, the mapping must fit within `0x0..0xffffffff`.
`open_binary` and an open `binary_session` return the canonical `entry_point`
for raw targets so callers can verify the selected mapping directly.
Omitted `format` keeps header-based detection; architecture and entry without
`format=raw-binary` are rejected.

Ghidra imports a private snapshot with `BinaryLoader` and these generic
languages and compiler specifications. Each family has one fixed byte order:
m68k, 6800 and 6809 are big-endian; the others are little-endian.

| architecture | language_id            | compiler_spec_id |
| ------------ | ---------------------- | ---------------- |
| x86          | `x86:LE:32:default`    | `gcc`            |
| x86_64       | `x86:LE:64:default`    | `gcc`            |
| arm          | `ARM:LE:32:v7`         | `default`        |
| arm64        | `AARCH64:LE:64:v8A`    | `default`        |
| 65c02        | `65C02:LE:16:default`  | `default`        |
| 65816        | `65816:LE:16:default`  | `default`        |
| 8080         | `8080:LE:16:default`   | `default`        |
| 6800         | `MC6800:BE:16:default` | `default`        |
| z80          | `z80:LE:16:default`    | `default`        |
| 6809         | `6809:BE:16:default`   | `default`        |
| 6502         | `6502:LE:16:default`   | `default`        |
| m68k         | `68000:BE:32:default`  | `default`        |

Compiler specifications select analysis conventions; they do not identify the
original compiler or ABI of a headerless target. Ghidra's x86 languages do not
provide a compiler specification named `default`.

Those settings, the caller-supplied entry, and `language_selection:
caller-supplied-v1` are committed in the analysis profile. A different entry
or architecture is a different profile; snapshots from header-detected targets
do not replay.

The mapped start is independent of Ghidra's program image base, which remains
`0x0` for BinaryLoader. Ghidra may report additional language-defined entry
points, including unmapped ARM vectors. Load-image verification requires the
caller-supplied entry and preserves those other entries as observations.
For 6502, BinaryLoader maps the file before adding its language-defined zero-page
and stack blocks. Conflicting default blocks are skipped; low-address files stay
in the default address space rather than an overlay. Non-conflicting uninitialized
blocks remain observations, not file-backed bytes.
Independent raw verification streams the complete private snapshot digest and
extent with bounded memory and supports cancellation during the read.
It also requires the source-backed block to be initialized, loaded, and
non-overlay in the bound language's default address space. Contradictory mapping
observations are retained with `mismatch`, even when the source hashes agree.

Hopper and IDA refuse raw-binary targets. Windows Ghidra P0 admits native PE
applications/DLLs and explicitly selected raw 6502, 65c02, 65816, 8080, 6800, 6809 or z80 images. Other raw CPU families
remain outside the Windows boundary. Native path admission, private DACLs, Job
Object ownership, immutable snapshots, and the no-mutation policy still apply.

## NMOS 6502

```bash
rea function /absolute/path/to/image.bin 0x8001 --target-format raw-binary --architecture 6502 --entry-point 0x8001 --provider ghidra --json
rea inspect-native-load-image /absolute/path/to/image.bin --target-format raw-binary --architecture 6502 --entry-point 0x8001 --provider ghidra --json
```

Select only headerless NMOS 6502 code with a known entry at file offset 0.
The built-in Ghidra processor supplies static instructions, functions,
pseudocode, and references. Evidence preserves `architecture: "6502"`, the
selected language, entry, file digest, and verified source mapping. Register and
calling conventions are analysis conventions, not a recovered source ABI.

This lane does not interpret iNES headers, cartridge mappers, bank switching,
or other console-specific memory layouts. 65C02 and 65816 programs need different
processor semantics and are not admitted as those variants. REA does not infer
the CPU from the file suffix, guess the reset vector, or emulate the target.

`npm run verify:ghidra:6502` assembles and links the source-owned fixture with
`ca65` and `ld65` (tested from cc65 tag `V2.19`, whose tools report `V2.18`).
Set `REA_CA65` and `REA_LD65` to explicit executable paths if needed. The lane
checks real CLI/MCP load-image parity, mapped bytes, decoded calls, decompilation,
invalid mappings, unchanged source bytes and runtime cleanup.
Low-memory checks include a file spanning the zero-page/stack boundary at `0xff`
and a complete 64-KiB image at `0x0`, with verified default-space mappings through
both CLI and MCP. On Windows, the lane also checks that a caller-selected
junction path is rejected at snapshot admission through CLI and MCP, with
unchanged source bytes and complete runtime cleanup. Windows requires the
matching native addon; the POSIX provider path has not been exercised by the
Windows run.

## Motorola 68000

```bash
rea function /absolute/path/to/image.bin 0x1000 --target-format raw-binary --architecture m68k --entry-point 0x1000 --provider ghidra --json
rea inspect-native-load-image /absolute/path/to/image.bin --target-format raw-binary --architecture m68k --entry-point 0x1000 --provider ghidra --json
```

Select only headerless big-endian 68000-family code with a known, even entry at
file offset 0. Ghidra's `68000:BE:32:default` language decodes the 68040
superset in the 32-bit `ram` address space. Instructions that a real MC68000
would not execute are therefore not rejected, and 68020, 68030, CPU32, and
ColdFire programs are not admitted as those variants. Addresses are not masked
to the MC68000 24-bit bus. Evidence preserves `architecture: "m68k"`, the
selected language, entry, file digest, and verified source mapping. Register and
calling conventions are analysis conventions, not a recovered source ABI.

This lane does not interpret Amiga hunks, Atari ST, or other container headers,
cartridge or console memory maps, or bank switching. REA does not read the
initial stack pointer and reset vector from the first eight bytes; select the
entry explicitly. Windows Ghidra P0 does not admit m68k.

`npm run verify:ghidra:m68k` uses a source-owned 22-byte fixture written as
annotated hex in the verifier, so it needs no assembler. The lane checks real
CLI/MCP load-image parity, mapped bytes, a decoded call, decompilation by address
and file offset, misaligned and out-of-range mappings, unchanged source bytes and
runtime cleanup. It has been run with Ghidra 12.1.4 on macOS; Linux has not been
exercised.

## Limitations

- Headers are not discovered from file bytes. This increment does not guess
  load addresses, vector tables, or memory maps.
- Big-endian ARM, Thumb-only, Cortex-M, and other Ghidra processor variants are
  unsupported. m68k is the only big-endian family.
- Reset vectors, memory-mapped I/O, and firmware boot sequences are not
  emulated.
- Independent load-image verification covers source identity, mapped file
  bytes, the bound language, and the caller-supplied entry. Original bytes
  stay unchanged.

## Motorola 6809 (local extension)

This local version accepts `--architecture 6809` on Windows, Linux and macOS.
Ghidra binding: `6809:BE:16:default`, compiler `default`, address space `RAM`.
The complete raw payload must fit in 64 KiB. Odd addresses are valid.
The Hitachi 6309 extension is not selected. This does not emulate a CoCo.

`entry_point` retains the existing REA contract: it maps file offset zero AND
seeds analysis there. If the real execution address differs, request a function
at that address after import. Do not shift the payload to its execution address.

CoCo DECB `.BIN` has a record envelope; it is not a headerless image. Remove
the envelope, preserve each record's load address, and analyze a suitable raw
image. CAS/DECB parsing and automatic relocation are not added by this extension.
For the single-segment MISTAR payload: map `MISTAR.raw` at `0x2460` and request
function `0x2540`. The bootstrap copies bytes into low RAM; static import alone
does not reproduce those runtime changes.

```powershell
node scripts/rea.mjs inspect MISTAR.raw --target-format raw-binary --architecture 6809 --entry-point 0x2460 --provider ghidra --json
node scripts/rea.mjs function MISTAR.raw 0x2540 --target-format raw-binary --architecture 6809 --entry-point 0x2460 --provider ghidra --json
```

Ghidra and its supported JDK must be installed separately. Unit/provider-contract
tests do not establish real Ghidra decoding or decompilation.

## Zilog Z80 (local extension)

Select `--architecture z80` for a headerless classic Z80 image on Windows,
Linux or macOS. Binding: `z80:LE:16:default`, compiler `default`, space `ram`.
The full mapping must fit in 64 KiB; byte-aligned entries are accepted.
This does not select Z180/eZ80, implement bank switching, parse MSX/Spectrum
containers, or emulate a computer's ROM, display, keyboard or I/O.

```powershell
node scripts/rea.mjs function program.raw 0x8001 --target-format raw-binary --architecture z80 --entry-point 0x8001 --provider ghidra --json
```

As with other raw families, `entry-point` maps file offset zero. Use an explicit
REA_GHIDRA_SEED_FILE when a separate execution entry is not found automatically.

## Additional local retro families

The `65c02`, `65816`, `8080`, and `6800` lanes are documented in
[additional retro CPUs](retro-additional-cpus.md). 65816 has a 24-bit bus despite
the third-party module's historical 16-bit language ID. It starts in native
16-bit accumulator/index mode; the entry program bank follows the load address.
The three additional modules must be explicitly installed into Ghidra.
