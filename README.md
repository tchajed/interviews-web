# Faculty interview web tools

[![Build and test](https://github.com/tchajed/interviews-web/actions/workflows/build.yml/badge.svg)](https://github.com/tchajed/interviews-web/actions/workflows/build.yml)

[Schedule to ICS](https://www.chajed.io/interviews/)

[Interview participation](https://www.chajed.io/interviews/participation.html)

## Developing

- `pnpm install` for first-time setup
- `pnpm dev` to start a dev server
- `pnpm run lint`
- `pnpm run test`

## Deploying

```sh
pnpm run build
rsync -a --delete build/ ~/code/personal-website/docs/interviews/
```
