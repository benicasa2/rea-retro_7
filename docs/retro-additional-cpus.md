# 65C02, 65816, Intel 8080 and Motorola 6800 — local extension

These additions preserve the existing 6502, Z80 and 6809 lanes.

| CLI/MCP architecture | Ghidra language        | Default space | Mapping width |
| -------------------- | ---------------------- | ------------- | ------------- |
| `65c02`              | `65C02:LE:16:default`  | `RAM`         | 16 bits       |
| `65816`              | `65816:LE:16:default`  | `bus`         | 24 bits       |
| `8080`               | `8080:LE:16:default`   | `ram`         | 16 bits       |
| `6800`               | `MC6800:BE:16:default` | `RAM`         | 16 bits       |

The 65816 module's historical language ID says 16, but its `bus` address space
is 24-bit. REA enforces the actual 24-bit extent, including banked load addresses.
6800 uses big-endian words; the other three use little-endian words.

## Modules and setup

65C02 is included in Ghidra 12.1.4. The other modules are stored as licensed
sources under `third_party/retro-processors`, with pinned provenance in ORIGIN.md:

- 65816: kaayzouee/ghidra-65816, MIT. A cspec compatibility fix removes a
  prototype attribute rejected by Ghidra 12.1.4. SLEIGH semantics are unchanged.
- MC6800: sigurasg/GhidraMC6800, Apache-2.0, selecting the MC6800 language only.
- 8080: derived from Ghidra 12.1.4's 8085 specification (Apache-2.0). RIM/SIM,
  their userops and 8085-specific interrupt vectors are excluded. It has a
  separate language ID; inputs are not analyzed as Z80 or unmodified 8085.

Install into an existing Ghidra distribution, using an existing compatible JDK:

```powershell
python scripts/install-local-retro-processors.py --ghidra C:\tools\ghidra_12.1.4_PUBLIC --java-home C:\tools\jdk-25
$env:GHIDRA_INSTALL_DIR = 'C:\tools\ghidra_12.1.4_PUBLIC'
$env:JAVA_HOME = 'C:\tools\jdk-25'
$env:REA_ANALYSIS_PROVIDER = 'ghidra'
npm run build:cached
node scripts/rea.mjs function program.raw 0x8001 --target-format raw-binary --architecture 65c02 --entry-point 0x8001 --provider ghidra --json
```

For each CPU, replace the architecture and load/entry addresses. 65816 can use
an address such as `0x128001`. REA's existing raw contract maps file offset zero
at `entry-point`. A separate function entry can be declared with the existing
REA_GHIDRA_SEED_FILE setting. CAS/ROM headers and platform-specific banks must
be mapped/extracted separately.

## 65816 initial state and limits

The raw preparation script explicitly sets `ctx_EF=0`, `ctx_MF=0`, `ctx_XF=0`
(native mode, 16-bit accumulator and index registers) and PBR from the load bank.
The analysis profile records that assumption. Load-image observations report
these values plus any observed DBR/DP state. The attestation checks the four
required entry values and marks incorrect or missing observations as mismatches.

REP/SEP can change decoding to 8-bit and back through the community module.
Programs entering in emulation mode or another unknown state are not inferred
correctly by this fixed-entry preset. PLP/RTI/XCE, instruction-bank wrapping and
runtime data-bank/direct-page choices need independent review. The community
P-code is experimental, not a fully validated 65816 emulator. 8080 P-code
inherits the Ghidra 8085 model; undocumented opcodes and exact flag semantics
are not validated. No additional computer or console emulation is provided.

## Real-provider verification

```powershell
node scripts/verify-local-retro-cpus.mjs C:\analysis\proof
```

The verifier uses the real REA MCP server and Ghidra, with self-owned fixtures.
It checks mapping identity, language, assembly, pseudocode delivery and unchanged
source hashes. 65816 verifies a bank above 64 KiB, 16-bit immediates, REP/SEP,
8-bit immediates and a 24-bit long operand. 65C02 uses STZ/PHX/PLX/BRA; 8080
uses MVI/CALL/ADI/RET; 6800 uses LDAA/JSR/ADDA/RTS.
An optional third argument selects a comma-separated subset of CPU names.
Passing fixtures does not imply complete ISA or emulator correctness.

Verified locally with Ghidra 12.1.4, JDK 25.0.4.1 and Node 24.22.0. Node remains
below upstream's declared ^24.22.1 minimum in that major; package engine ranges
were not modified. Use an accepted Node version for new installations.

Sources:
https://github.com/kaayzouee/ghidra-65816
https://github.com/sigurasg/GhidraMC6800
https://github.com/NationalSecurityAgency/ghidra/tree/Ghidra_12.1.4_build/Ghidra/Processors/8085
