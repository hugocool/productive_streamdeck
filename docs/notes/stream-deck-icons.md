# Stream Deck icon specs

The controller renders keys at runtime with `sharp`, so these numbers matter when generating static icon assets later.

- Keys want 1:1 square images; larger images are auto-resized. Elgato's minimum is 72×72 px; 144×144 (or 288×288) masters look best.
- Generate at 288 or 512 with a transparent background, centred subject, thick strokes, no text, then downscale:

```bash
magick input.png -resize 288x288 -background none -gravity center -extent 288x288 out_288.png
magick input.png -resize 144x144 -background none -gravity center -extent 144x144 out_144.png
```

Sources: Elgato "Customizing Key Icons" (help.elgato.com, article 360028237271) and the Makers icon-pack spec (docs.elgato.com/makers/stream-deck/icon-packs).
