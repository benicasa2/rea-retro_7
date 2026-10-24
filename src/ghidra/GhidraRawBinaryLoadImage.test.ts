import { describe, expect, it } from "vitest";

import { attestGhidraRawBinaryLoadImage } from "./GhidraLoadImageValues.js";
import { fixtureRawBinaryLoadImage } from "./GhidraRawBinaryLoadImage.fixture.js";
import { ghidraRawBinaryLanguage } from "./GhidraRawBinaryLanguage.js";

describe("raw-binary Ghidra language binding", () => {
  it("maps the big-endian m68k family to the default 68000 language", () => {
    expect(ghidraRawBinaryLanguage("m68k")).toEqual({
      languageId: "68000:BE:32:default",
      compilerSpecId: "default",
      defaultAddressSpace: "ram",
    });
  });
  it("maps the big-endian 6809 family to the default 6809 language", () => {
    expect(ghidraRawBinaryLanguage("6809")).toEqual({
      languageId: "6809:BE:16:default",
      compilerSpecId: "default",
      defaultAddressSpace: "RAM",
    });
  });
  it("maps the little-endian Z80 family to the default Z80 language", () => {
    expect(ghidraRawBinaryLanguage("z80")).toEqual({
      languageId: "z80:LE:16:default",
      compilerSpecId: "default",
      defaultAddressSpace: "ram",
    });
  });
  it("maps the four admitted families to little-endian generic languages", () => {
    expect(ghidraRawBinaryLanguage("x86")).toEqual({
      languageId: "x86:LE:32:default",
      compilerSpecId: "gcc",
      defaultAddressSpace: "ram",
    });
    expect(ghidraRawBinaryLanguage("x86_64")).toEqual({
      languageId: "x86:LE:64:default",
      compilerSpecId: "gcc",
      defaultAddressSpace: "ram",
    });
    expect(ghidraRawBinaryLanguage("arm")).toEqual({
      languageId: "ARM:LE:32:v7",
      compilerSpecId: "default",
      defaultAddressSpace: "ram",
    });
    expect(ghidraRawBinaryLanguage("arm64")).toEqual({
      languageId: "AARCH64:LE:64:v8A",
      compilerSpecId: "default",
      defaultAddressSpace: "ram",
    });
  });
});

describe("raw-binary mapped-block state", () => {
  it.each([
    ["6502", "6502:LE:16:default", "RAM"],
    ["6809", "6809:BE:16:default", "RAM"],
    ["z80", "z80:LE:16:default", "ram"],
  ] as const)(
    "requires the bound %s address space",
    (architecture, language, expectedSpace) => {
      for (const space of ["RAM", "ram"]) {
        const f = fixtureRawBinaryLoadImage();
        const target = {
          ...f.target,
          architecture,
          availableArchitectures: [architecture],
          entryPoint: "0x8001",
          entryPointSource: "0x8001",
        };
        f.observation.language_id = language;
        f.observation.default_address_space = space;
        f.observation.entry_points = [target.entryPoint];
        const mapping = f.observation.mappings[0];
        if (mapping === undefined)
          throw new Error("Missing source mapping fixture");
        mapping.start = target.entryPoint;
        mapping.end = "0x8004";
        mapping.address_space = space;
        expect(
          attestGhidraRawBinaryLoadImage(f.snapshot, target, f.observation),
        ).toMatchObject({
          ok: true,
          value: {
            status: space === expectedSpace ? "verified" : "mismatch",
            checks: expect.arrayContaining([
              expect.objectContaining({
                name: "default_address_space",
                expected: expectedSpace,
                observed: space,
                matched: space === expectedSpace,
              }),
            ]),
          },
        });
      }
    },
  );
  it.each(["ram", "RAM"])(
    "requires the bound m68k address space for %s observations",
    (space) => {
      const f = fixtureRawBinaryLoadImage();
      const target = {
        ...f.target,
        architecture: "m68k" as const,
        availableArchitectures: ["m68k" as const],
        entryPoint: "0x1000",
        entryPointSource: "0x1000",
      };
      f.observation.language_id = "68000:BE:32:default";
      f.observation.default_address_space = space;
      f.observation.entry_points = [target.entryPoint];
      const mapping = f.observation.mappings[0];
      if (mapping === undefined)
        throw new Error("Missing source mapping fixture");
      mapping.start = target.entryPoint;
      mapping.end = "0x1003";
      mapping.address_space = space;
      expect(
        attestGhidraRawBinaryLoadImage(f.snapshot, target, f.observation),
      ).toMatchObject({
        ok: true,
        value: {
          status: space === "ram" ? "verified" : "mismatch",
          language_id: "68000:BE:32:default",
          checks: expect.arrayContaining([
            expect.objectContaining({
              name: "default_address_space",
              expected: "ram",
              observed: space,
              matched: space === "ram",
            }),
          ]),
        },
      });
    },
  );
  it.each([
    ["initialized", false],
    ["loaded", false],
    ["overlay", true],
    ["address_space", "overlay"],
  ] as const)(
    "retains a mismatch when the file mapping declares %s=%s",
    (property, value) => {
      const f = fixtureRawBinaryLoadImage();
      const mapping = f.observation.mappings[0];
      if (mapping === undefined)
        throw new Error("Missing source mapping fixture");
      Object.assign(mapping, { [property]: value });
      expect(
        attestGhidraRawBinaryLoadImage(f.snapshot, f.target, f.observation),
      ).toMatchObject({
        ok: true,
        value: {
          status: "mismatch",
          observations: f.observation,
          checks: expect.arrayContaining([
            expect.objectContaining({
              name: `mapping.${property}`,
              matched: false,
              observed: value,
            }),
          ]),
        },
      });
    },
  );
  it("does not verify a foreign default address space even when its mapping agrees", () => {
    const f = fixtureRawBinaryLoadImage();
    f.observation.default_address_space = "foreign";
    const mapping = f.observation.mappings[0];
    if (mapping === undefined)
      throw new Error("Missing source mapping fixture");
    mapping.address_space = "foreign";
    expect(
      attestGhidraRawBinaryLoadImage(f.snapshot, f.target, f.observation),
    ).toMatchObject({
      ok: true,
      value: {
        status: "mismatch",
        observations: f.observation,
        checks: expect.arrayContaining([
          expect.objectContaining({
            name: "default_address_space",
            matched: false,
            observed: "foreign",
          }),
        ]),
      },
    });
  });
});

describe("raw-binary independent load-image checks", () => {
  it("retains uninitialized language memory without treating it as file-backed bytes", () => {
    const f = fixtureRawBinaryLoadImage();
    const zeroPage = {
      block: "ZERO_PAGE",
      start: "0x0",
      end: "0xff",
      address_space: "ram",
      initialized: false,
      loaded: true,
      overlay: false,
      length: 256,
      source_file_index: null,
      file_offset: null,
      sha256: null,
    };
    f.observation.mappings.unshift(zeroPage);
    expect(
      attestGhidraRawBinaryLoadImage(f.snapshot, f.target, f.observation),
    ).toMatchObject({
      ok: true,
      value: { status: "verified", observations: f.observation },
    });
    zeroPage.initialized = true;
    expect(
      attestGhidraRawBinaryLoadImage(f.snapshot, f.target, f.observation),
    ).toMatchObject({
      ok: true,
      value: {
        status: "mismatch",
        checks: expect.arrayContaining([
          expect.objectContaining({
            name: "initialized_unbacked_mappings",
            matched: false,
          }),
        ]),
      },
    });
  });
  it("verifies mapped bytes at the caller-supplied entry", () => {
    const f = fixtureRawBinaryLoadImage();
    const result = attestGhidraRawBinaryLoadImage(
      f.snapshot,
      f.target,
      f.observation,
    );
    expect(result).toMatchObject({
      ok: true,
      value: {
        status: "verified",
        format: "raw-binary",
        architecture: "arm",
        language_id: "ARM:LE:32:v7",
        base_address: "0x8000000",
        file_bytes: 4,
        entry: { address: "0x8000000", file_offset: 0 },
      },
    });
  });
  it("retains mismatch evidence for a drifted language", () => {
    const f = fixtureRawBinaryLoadImage();
    f.observation.language_id = "x86:LE:32:default";
    const result = attestGhidraRawBinaryLoadImage(
      f.snapshot,
      f.target,
      f.observation,
    );
    expect(result).toMatchObject({
      ok: true,
      value: { status: "mismatch", observations: f.observation },
    });
  });
  it("preserves additional language entries while requiring the caller entry", () => {
    const f = fixtureRawBinaryLoadImage();
    f.observation.entry_points = ["0x0", f.target.entryPoint, "0xffff0000"];
    expect(
      attestGhidraRawBinaryLoadImage(f.snapshot, f.target, f.observation),
    ).toMatchObject({
      ok: true,
      value: { status: "verified", observations: f.observation },
    });
    f.observation.entry_points = ["0x0", "0xffff0000"];
    expect(
      attestGhidraRawBinaryLoadImage(f.snapshot, f.target, f.observation),
    ).toMatchObject({
      ok: true,
      value: {
        status: "mismatch",
        checks: expect.arrayContaining([
          expect.objectContaining({
            name: "entry_point",
            matched: false,
            observed: null,
          }),
        ]),
      },
    });
  });
  it("rejects stale snapshot identity", () => {
    const f = fixtureRawBinaryLoadImage();
    expect(
      attestGhidraRawBinaryLoadImage(
        f.snapshot,
        { ...f.target, sha256: "f".repeat(64) },
        f.observation,
      ).ok,
    ).toBe(false);
  });
});

describe("additional retro language and mapping verification", () => {
  it.each([
    ["65c02", "65C02:LE:16:default", "RAM", "0x8001", "0x8004"],
    ["65816", "65816:LE:16:default", "bus", "0x128001", "0x128004"],
    ["8080", "8080:LE:16:default", "ram", "0x8001", "0x8004"],
    ["6800", "MC6800:BE:16:default", "RAM", "0x8001", "0x8004"],
  ] as const)(
    "binds %s and rejects the wrong address space",
    (architecture, language, space, start, end) => {
      expect(ghidraRawBinaryLanguage(architecture)).toMatchObject({
        languageId: language,
        compilerSpecId: "default",
        defaultAddressSpace: space,
      });
      for (const observedSpace of [space, "wrong-space"]) {
        const f = fixtureRawBinaryLoadImage();
        const target = {
          ...f.target,
          architecture,
          availableArchitectures: [architecture],
          entryPoint: start,
          entryPointSource: start,
        };
        f.observation.language_id = language;
        f.observation.default_address_space = observedSpace;
        f.observation.entry_points = [start];
        if (architecture === "65816")
          f.observation.entry_context = [
            {
              address: start,
              registers: [
                { name: "ctx_MF", value_hex: "0x0" },
                { name: "ctx_XF", value_hex: "0x0" },
                { name: "ctx_EF", value_hex: "0x0" },
                { name: "PBR", value_hex: "0x12" },
              ],
            },
          ];
        const mapping = f.observation.mappings[0];
        if (!mapping) throw new Error("Missing source mapping fixture");
        Object.assign(mapping, { start, end, address_space: observedSpace });
        expect(
          attestGhidraRawBinaryLoadImage(f.snapshot, target, f.observation),
        ).toMatchObject({
          ok: true,
          value: { status: observedSpace === space ? "verified" : "mismatch" },
        });
      }
    },
  );
});

describe("65816 initial CPU state attestation", () => {
  it.each(["ctx_MF", "ctx_XF", "ctx_EF", "PBR"])(
    "retains mismatching %s context",
    (badRegister) => {
      const f = fixtureRawBinaryLoadImage();
      const target = {
        ...f.target,
        architecture: "65816" as const,
        availableArchitectures: ["65816" as const],
        entryPoint: "0x128001",
        entryPointSource: "0x128001",
      };
      f.observation.language_id = "65816:LE:16:default";
      f.observation.default_address_space = "bus";
      f.observation.entry_points = [target.entryPoint];
      f.observation.entry_context = [
        {
          address: target.entryPoint,
          registers: ["ctx_MF", "ctx_XF", "ctx_EF", "PBR"].map((name) => ({
            name,
            value_hex:
              name === badRegister ? "0x1" : name === "PBR" ? "0x12" : "0x0",
          })),
        },
      ];
      const mapping = f.observation.mappings[0];
      if (!mapping) throw new Error("Missing mapping");
      Object.assign(mapping, {
        start: target.entryPoint,
        end: "0x128004",
        address_space: "bus",
      });
      expect(
        attestGhidraRawBinaryLoadImage(f.snapshot, target, f.observation),
      ).toMatchObject({
        ok: true,
        value: {
          status: "mismatch",
          checks: expect.arrayContaining([
            expect.objectContaining({
              name: `entry_context.${badRegister}`,
              matched: false,
            }),
          ]),
        },
      });
    },
  );
});
