Moon and Mars surface textures for the globe (all local — no external tile servers).

Files used by js/globe.js:
  moon_color.jpg      4096x2048  Moon colour map, equirectangular (2:1)
  moon_color_2k.jpg   2048x1024  lighter version for mobile / weak GPUs
  moon_bump.jpg       4096x2048  Moon relief (bump) map, derived from the colour map
  moon_bump_2k.jpg    2048x1024  lighter relief version
  mars_color.jpg      4096x2048  Mars colour map, equirectangular (2:1)
  mars_color_2k.jpg   2048x1024  lighter version for mobile / weak GPUs
  mars_bump.jpg       4096x2048  Mars relief (bump) map, derived from the colour map
  mars_bump_2k.jpg    2048x1024  lighter relief version

The globe picks the 4K pair on capable desktops and the 2K pair on narrow screens
or weak GPUs. Maps are equirectangular with 0° longitude at the horizontal centre;
artifact dots use east-positive longitude (-180..180).

CREDITS: record each map's source, author, licence and URL in data/credits.json
(the About & Sources page reads it). These are currently "TODO" and MUST be filled
in with the correct attribution before the site is published, because the texture
files are third-party imagery and their licences require credit.