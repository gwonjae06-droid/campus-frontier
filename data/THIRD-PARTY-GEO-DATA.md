# OpenStreetMap-derived campus data (ODbL 1.0)

This project generates its own original Three.js 3D campus renderer. Only the OpenStreetMap-derived building footprints, road paths, campus boundary and sampled tree locations were transformed from third-party campus JSON datasets.

## Source datasets

- **Yonsei University Sinchon Campus**: https://github.com/Hong-Iron/SMASH-YONSEI/blob/main/data/campus.json
  - Output: `data/yonsei-sinchon.json` (232 OSM-derived building shapes).
- **Korea University Seoul/Anam Campus**: https://github.com/Hong-Iron/SMASH-KU/blob/main/data/campus.json
  - Output: `data/korea-anam.json` (172 OSM-derived building shapes).
- **Sungkyunkwan University Humanities & Social Sciences Campus**: https://github.com/Hong-Iron/SMASH-SKKU
  - Existing output: `data/skku-campus.json` (56 buildings).

Source attribution: **© OpenStreetMap contributors** · Open Database License (ODbL) 1.0.
https://www.openstreetmap.org/copyright
https://opendatacommons.org/licenses/odbl/1-0/

These transformed datasets remain available to download and reuse under the Open Database License. Files retain original building coordinates/footprints and metadata useful for attribution. For render performance, the derivation samples a subset of OSM-based road/tree points, drops unused fields, and replaces the elevation grid with a flat synthetic terrain. This is **not** a precise reconstruction of building elevations. Game scaling places the real geographic building arrangements inside compact 4×4 board cells.

The upstream repository game code, graphics, UI, sounds, and other proprietary creative assets were NOT copied. Upstream's LICENSE explicitly reserves those rights, while permitting re-use of the independently licensed OSM-derived datasets. Original SMASH links are retained as data sources.
