#!/bin/bash
# Build the material pages' social sharing cards (assets/img/og/<slug>.jpg) from scripts/og-card.html
# with headless Chrome. Run from the repo root while it is served on port 8084:
#   python3 -m http.server 8084 &   then   bash scripts/build-og-cards.sh
set -euo pipefail
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
mkdir -p assets/img/og
while IFS='|' read -r slug photo title; do
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --window-size=1200,630 --virtual-time-budget=5000 --screenshot="assets/img/og/$slug.png" \
    "http://localhost:8084/scripts/og-card.html?photo=$photo&title=$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$title")" 2>/dev/null
  sips -s format jpeg -s formatOptions 85 "assets/img/og/$slug.png" --out "assets/img/og/$slug.jpg" >/dev/null
  rm "assets/img/og/$slug.png"
  echo "wrote assets/img/og/$slug.jpg"
done <<'EOF'
aluminum-foil|foil-coil.jpg|Aluminum foil rolls
paper|paper-rolls.jpg|Paper rolls
nonwoven-fabric|nonwoven-rolls.jpg|Non-woven fabric rolls
plastic-film|film-rolls.jpg|Plastic film rolls
psa-materials|psa-rolls.jpg|PSA tape & label rolls
EOF
