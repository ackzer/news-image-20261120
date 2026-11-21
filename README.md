# news-image-20261120

[![make.fun · news-image-20261120](https://make.fun/badge/news-image-20261120.svg)](https://make.fun/bounty/news-image-20261120?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261120)
[![rank](https://make.fun/badge/news-image-20261120/ackzer/news-image-20261120/rank.svg)](https://make.fun/bounty/news-image-20261120/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261120)
[![reward](https://make.fun/badge/news-image-20261120/ackzer/news-image-20261120/reward.svg)](https://make.fun/bounty/news-image-20261120?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261120)

## Final image — Friday 20 November 2026

![Deterministic newspaper image](out/entry.png)

Original procedural newspaper drawing: 16 stories, six KPI values, seven
region colors, 16 numbered map pins, a date-exclusion box and a complete
footer. The font gate was approved before this full build began.

## Generate and verify

Tested with **Node.js v22.23.5**. No installation step or external package is
required. The generator uses only Node.js built-ins and this repository's
newly authored source files; it does not use network access, font files,
image atlases, base64 assets, randomness or clock-based image content.

```sh
node main.ts
node verify.ts
```

`main.ts` writes `/output/entry.png` (`C:\output\entry.png` on Windows), then
copies those exact bytes to `out/entry.png`. It also writes a deterministic
layout and content audit to `out/render-report.json`.

`verify.ts` runs the generator twice **sequentially**, compares actual PNG
bytes and SHA-256 values, checks the output copy, validates the PNG, and
audits every headline, source, selected sentence, text bound and map pin.
The observed runtimes are saved in `out/verification-report.json`.

## Verified result

| Check | Result |
| --- | --- |
| Dimensions | 1024 × 1024 |
| PNG encoding | 8-bit RGB, color type 2, no alpha |
| Scanline filters | All 1024 rows use filter 0 |
| Chunks | IHDR, IDAT, IEND; every CRC verified independently |
| Size | 54,815 bytes; below 1 MiB |
| Run 1 | 405.93 ms generator; 595.24 ms including Node startup |
| Run 2 | 425.94 ms generator; 609.90 ms including Node startup |
| Determinism | Both PNG files and both render audits are byte-identical |
| Repository copy | Byte-identical to the primary output |
| Content | All 16 original headlines and all complete source attributions |
| Geometry | No text-box overlaps or text outside page/card bounds |

Both final PNG runs have SHA-256:

```text
8ad2fb2d13b641bd88d1e39a5585764113af9e5223d3f09edfa3eb8049190cf2
```

The first full render was opened for visual inspection. One subsequent
whole-file rewrite of `main.ts` balanced headline line breaks, removing the
single-word `coast` orphan without changing any title or font size. The final
PNG was regenerated twice and opened again for visual inspection.

## Sentence-boundary fitting — every omission disclosed

`news-data.json` contains the complete locked content: both original
sentences, the original headline, full source attribution and exact pin
coordinates for every story. Nothing in that data is shortened.

In the rendered image, a complete two-sentence summary is used whenever it
fits its allocated box at **9 px cap height / 11.5 px leading**. Otherwise,
the first complete sentence is used if it fits; if not, the second complete
sentence is used. No sentence is paraphrased, reordered or cut internally.
Every story retains at least one intact sentence and its complete source.

| Pin | Original headline | Sentences shown | Sentence omitted |
| --- | --- | --- | --- |
| 1 | Russian missiles hit three Kyiv bridges | 1 | 2 |
| 2 | Cyclone Akvan slams eastern India coast | 1, 2 | None |
| 3 | AI stock sell-off sinks Asian markets | 1, 2 | None |
| 4 | UK and EU seal Brussels reset summit deal | 1 | 2 |
| 5 | COP31 stalls on final day over fossil fuels | 2 | 1 |
| 6 | Russian missile crashes in southern Poland | 1 | 2 |
| 7 | Iraqi forces enter Jurf al-Sakhar stronghold | 2 | 1 |
| 8 | Workers and students strike across Europe | 2 | 1 |
| 9 | Japan headline inflation rises to 2.3% | 2 | 1 |
| 10 | Kenya starts drilling first Turkana oil well | 1 | 2 |
| 11 | El Salvador's Bukele files for third term | 1 | 2 |
| 12 | Second federal judge blocks Trump arch plan | 1 | 2 |
| 13 | Saudi coalition intercepts drones over Riyadh | 1 | 2 |
| 14 | ATP backs plan to lift player pay past $350m | 1 | 2 |
| 15 | SpaceX Dragon undocks from space station | 1 | 2 |
| 16 | NASA finds clues to ancient ice past Neptune | 1 | 2 |

The **exact full text of every omitted sentence**, the retained sentences,
and measured line counts/heights are recorded per pin in
`out/render-report.json` and `out/verification-report.json`.

Story #4's full source is placed in its kicker row so its first sentence can
fit intact at 9 px. Some summary boxes fit five lines within their specified
pixel height. No summary font was shrunk to force a fit. Font measurement uses
actual rounded filled-cell edges, with at least one blank pixel between
characters; the approved glyph shapes are unchanged.

## Layout and original source

- `main.ts`: exact A–G zone placement, content checks and output handling.
- `typeface.ts`: the original approved proportional filled-cell alphabet.
- `raster.ts`: RGB drawing, PNG encoding and independent bitwise CRC checking.
- `illustrations.ts`: all 16 original geometric news illustrations.
- `world-map.ts`: hand-authored schematic coastlines and collision-free pins.
- `news-data.json`: the complete locked 16-story data and six KPI values.
- `verify.ts`: repeat-run, byte, PNG, content and layout verification.

The font-gate source is preserved as `font-gate.ts`; `node font-gate.ts`
regenerates `test-font.png`. Its historical approval commit is
`9870d02209ef0e3a9eb01c0c112d2a01c9a4e6c5`, with its original
`font-gate-report.json` retained as Stage 1 evidence.

`.makefun/owner.json` and the existing ownership/freshness metadata are
unchanged. No make.fun initialization, wallet, or submission commands were run.
