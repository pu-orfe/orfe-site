# orfe-site

Landing page for <https://www.orfe.princeton.edu>, published to GitHub Pages by
`.github/workflows/pages.yml` on every push to `main`.

- `site/` – static files that are published (`index.html`, `CNAME`)
- `site/assets/downloads/presentations/<year>/<slug>/` – hosted slide decks
  (static Slidev builds, served at the same path on the site)
- `tests/test_site.sh` – checks the page (HTML validity via tidy, required content, CNAME)
  and that every asset each hosted deck references exists
- `tests/browser/` – drives each hosted deck in Chromium (Playwright) and checks the
  navigation controls described below

## Add a slide deck

Slidev decks must be built with their final folder as the base path, for example
`slidev build --base /assets/downloads/presentations/2026/oqds-open-house-b641b2b5/`.
Copy the whole `dist/` output, including `public/` images such as `apps/` and `people/`,
into that folder under `site/`. Then run the tests. They fail if any referenced file is missing.

Slidev hides its own controls until the pointer moves near the bottom-left corner, so viewers often
don't see that slides advance. Every hosted deck therefore loads `nav-hint.js` and `nav-hint.css`
from its folder. These add previous/next buttons, a slide counter, and a short hint. Under the counter,
one small mark per click animation shows the current slide's build steps. The marks fill in as builds
are shown and pulse when a press advances a build instead of the slide. Copy both files
from an existing deck, set `TOTAL` in `nav-hint.js` to the slide count, and add these lines before
`</head>` in the deck's `index.html` (the tests check for them):

```html
<link rel="stylesheet" href="/assets/downloads/presentations/<year>/<slug>/nav-hint.css">
<script defer src="/assets/downloads/presentations/<year>/<slug>/nav-hint.js"></script>
```

Current decks:

- OQDS Minor Open House (2026-11-11), mirrored with permission from the presenter's build at
  `stella.to`: <https://www.orfe.princeton.edu/assets/downloads/presentations/2026/oqds-open-house-b641b2b5/>

## Run tests locally

```sh
docker-compose run --rm --build test
docker-compose run --rm --build browser-test
```

The browser tests can also run without Docker (Node 22 or later), using a local Google Chrome:

```sh
cd tests/browser && npm ci && CHROME_CHANNEL=chrome npm test
```

Without `CHROME_CHANNEL`, run `npx playwright install chromium` first.

Pull requests run the tests only; pushes to `main` run the tests and then deploy.
