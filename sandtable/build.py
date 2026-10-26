#!/usr/bin/env python3
"""Assemble the single-file app.

    python3 build.py            # -> dist/kamloops-risk.html (artifact body) and dist/_preview.html (standalone page)

src/ui.html   : <title>, CSS, HTML (Google-Maps-style floating UI)
src/libs.html : Three.js + OrbitControls <script> tags (CDN)
src/engine.js : terrain, painting, FBP-style spread model, worker, camera
src/ui.js     : mode cards, place card, layers, timeline, search, drawer, loop
data/         : processed data snapshots produced by scripts/
"""
import os, sys
ROOT = os.path.dirname(os.path.abspath(__file__))
S = lambda *p: os.path.join(ROOT, *p)
rd = lambda p: open(S(p), encoding='utf-8').read()

head = rd('src/ui.html')
libs = rd('src/libs.html')
engine = rd('src/engine.js')
ui = rd('src/ui.js') + '\n' + rd('src/live.js') + '\n' + rd('src/init.js')

data_block = ('<script>const CITY_INFO=' + rd('data/demdata/dem.json').strip() +
              ';const CITY_DEM="' + rd('data/demdata/dem.b64').strip() +
              '";const CITY_FUEL="' + rd('data/city_fuel.b64').strip() +
              '";const AS=' + rd('data/all_assets.json').strip() +
              ';const POI=' + rd('data/poi.json').strip() + ';</script>')

# libs.html from the template carries a data <script> with placeholders; replace it with the real one
import re
libs = re.sub(r'<script>const CITY_INFO=.*?</script>', '', libs, flags=re.S).strip()

out = (head + '\n' + libs + '\n' + data_block + '\n<script>\n(function(){\n' + engine + '\n' + ui + '\n})();\n</script>\n')
out = out.replace('__IMAGERY__', rd('data/imagery.json').strip())

os.makedirs(S('dist'), exist_ok=True)
open(S('dist/kamloops-risk.html'), 'w', encoding='utf-8').write(out)
open(S('dist/_preview.html'), 'w', encoding='utf-8').write(
    '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    '<style>body{margin:0}[hidden]{display:none!important}</style></head><body>' + out + '</body></html>')
print('built dist/kamloops-risk.html', len(out) // 1024, 'KB')
