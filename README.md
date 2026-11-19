# orfe-site

Landing page for <https://www.orfe.princeton.edu>, published to GitHub Pages by
`.github/workflows/pages.yml` on every push to `main`.

- `site/` – static files that are published (`index.html`, `CNAME`)
- `tests/test_site.sh` – checks the page (HTML validity via tidy, required content, CNAME)

## Run tests locally

```sh
docker-compose run --rm --build test
```

Pull requests run the tests only; pushes to `main` run the tests and then deploy.
