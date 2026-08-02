Airborne Aces — Netlify deploy notes
====================================
Asset URLs are now RELATIVE (same origin as the site).

Because GitHub was unreliable, all
  https://raw.githubusercontent.com/trevdiggadee/airborne-aces/main/...
paths were rewritten to local filenames, e.g.:
  boss3_01.webp?cb=3
  hangar_bg.jpg

Deploy:
1. Upload these JS/CSS/HTML files to your Netlify site root
   (alongside the image/audio assets already hosted there).
2. Boss 3 uses the updated frames already on Netlify
   (boss3_01.webp … boss3_36.webp) with ?cb=3 cache-bust.
3. Hard-refresh after deploy (or purge Netlify cache once).

Missing on Netlify last check (optional to upload if needed):
  boss.webp, boss5.webp, mini_blimp.webp
