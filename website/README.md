# Walltopia Preliminary Loads — Applicability Check

A web reproduction of the `Walltopia_Preliminary_Loads_2026` Excel workbook. Clients pick
their parameters and instantly read the preliminary loads their existing structure must
carry — the same lookup the Excel does with its slicers, plus an optional pass/fail check.

## Run it

No build, no server needed — **open `index.html` in any browser** (double-click it).
All data is bundled in `data.js` and loaded as a plain script, so it works from `file://`.

To serve it instead (e.g. for hosting):

```
cd website
python -m http.server 8777
# open http://127.0.0.1:8777/index.html
```

## How to use (mirrors the manual)

1. **Units** — Metric (kN·m, EN 12572, ×1.35 DL / ×1.50 LL) or Imperial (lb·ft, CWA 2009, ×1.20 / ×1.60).
2. **Structure type** — Climbing wall (with protection points) or Boulder wall (without).
3. **Climbing-surface height** — and, where more than one exists, the **attachment scheme**
   (number of attachment levels by height).
4. **Column span A** and **Overhang X**.
5. **Force level** — which attachment level is taken at its maximum live load; other levels
   show their concurrent values (per the standard, climbers cannot fall simultaneously).
6. Read the loads: **R** = load on one ACS axis (base / single-axis points), **L** = load on
   a building column/frame (span-adjusted). **DL** = dead load, **LL** = live load.

### Optional applicability check

Enter the horizontal load one existing column/frame can carry. The tool computes the
**governing factored column load** (worst case across every force level) and shows
**Applicable / Exceeds capacity**. Tick *Show factored design values* to see every cell
multiplied by the code factors.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure |
| `styles.css` | Styling |
| `app.js` | Lookup logic + rendering (reads `window.WALLTOPIA_LOADS`) |
| `data.js` | All wall + boulder load tables (EU + US), extracted verbatim from the xlsm |

## Data provenance & caveats

- Values are extracted verbatim from `DataBase(stena)` (walls) and `Database (bouldyr)`
  (boulders) in the source workbook and verified cell-for-cell against it.
- **Preliminary loads — not for construction.** Characteristic values that MUST be factored
  per the acting national standard. The manual for use is an inseparable part of these tables.
- Known source quirk: the workbook's **US boulder** vertical live-load column (`RZ0LL`) is
  inconsistent with its metric counterpart (reads 0 / equals `RX1LL` instead of the converted
  value). Reproduced as-is; it does not affect the horizontal column (L) loads used by the
  applicability check. Worth raising with Walltopia.
