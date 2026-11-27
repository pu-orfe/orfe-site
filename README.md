# orfe-site

Landing page for <https://www.orfe.princeton.edu>, published to GitHub Pages by
`.github/workflows/pages.yml` on every push to `main`.

- `site/` – static files that are published (`index.html`, `CNAME`)
- `site/assets/downloads/presentations/<year>/<slug>/` – hosted slide decks
  (static Slidev builds, served at the same path on the site)
- `tests/test_site.sh` – checks the page (HTML validity via tidy, required content, CNAME)
  and that every asset each hosted deck references exists

## Add a slide deck

Slidev decks must be built with their final folder as the base path, for example
`slidev build --base /assets/downloads/presentations/2026/oqds-open-house-b641b2b5/`.
Copy the whole `dist/` output, including `public/` images such as `apps/` and `people/`,
into that folder under `site/`. Then run the tests. They fail if any referenced file is missing.

Current decks:

- OQDS Minor Open House (2026-11-11), mirrored with permission from the presenter's build at
  `stella.to`: <https://www.orfe.princeton.edu/assets/downloads/presentations/2026/oqds-open-house-b641b2b5/>

## Run tests locally

```sh
docker-compose run --rm --build test
```

Pull requests run the tests only; pushes to `main` run the tests and then deploy.
