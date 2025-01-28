# Faculty interview web tools

[![build & deploy](https://github.com/tchajed/interviews-web/actions/workflows/build.yml/badge.svg)](https://github.com/tchajed/interviews-web/actions/workflows/build.yml)

This site has two tools:

[Schedule to ICS](https://tchajed.github.io/interviews-web) creates an ICS file with all of a candidate's meetings, so they can add them to their calendar if desired.

[Interview participation](https://tchajed.github.io/interviews-web/participation) aggregates all the interview schedules to show how much each faculty is doing.

## Developing

- `pnpm install` for first-time setup
- `pnpm dev` to start a dev server
- `pnpm run lint`
- `pnpm run test`

We use Svelte with fully static page rendering, the Flowbite component library, and Tailwind CSS.

## Deploying

The server is automatically deployed with GitHub Pages.
