# Terminal launch card

The Terminal has a dedicated 1200 × 630 social preview for its October 2026
launch. Its charcoal background, lavender accents and orbital wordmark match
the live trading workspace and the existing PARALLAX community share cards.

## Share destinations

- Canonical Terminal: https://parallaxlaunch.live/terminal
- Dedicated launch link: https://parallaxlaunch.live/share/terminal-20261029
- Preview image: `/assets/terminal/terminal-launch-20261029.png`
- Editable vector layout: `/assets/terminal/terminal-launch-20261029.svg`

The dedicated link serves the complete Terminal experience directly. It supplies
its own canonical and Open Graph URL so a social platform can discover the new
card separately from an older cached Terminal preview. Open Graph and Twitter
metadata specify the large PNG card and descriptive alternative text. External
platforms control when they fetch, cache and display that metadata.

## Image provenance

`terminal-interface-20261029.jpg` is an unchanged public browser capture from
29 October 2026, taken after the v220 market-data recovery. It shows a disconnected
wallet, a public DUBBLE market, native candlesticks, discovery and the quote-review
panel. It contains no private account data, authentication material or wallet
transaction. Its market figures belong to that captured observation and are not
live data. The launch card labels the image as an interface snapshot.

The surrounding brand layout is code-generated SVG. Rendering preserves the
capture as a single embedded image; it does not fabricate chart points or alter
the captured values. `scripts/render-terminal-launch.mjs` writes the SVG and PNG
using Sharp, available directly or through the existing Wrangler dependency.
Run it from the native project with:

```sh
node scripts/render-terminal-launch.mjs
```

## Launch caption

Solana trenches, this one’s for you.

The new PARALLAX Terminal is live. Native charts, token discovery, market activity
and Jupiter quote review.

Find it in Trenches. Read it in Terminal.

Step inside:
https://parallaxlaunch.live/share/terminal-20261029

This is a prepared caption. Publishing the Site metadata does not publish a post
to a social account.
