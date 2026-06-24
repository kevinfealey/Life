# Guardrails

Guardrails is a lightweight mobile-friendly browser game about growing agency, protective systems, adult responsibility, and parenting. The player moves forward on a shifting road, trades freedom against stability, builds support systems, and eventually influences children who cannot be directly controlled.

## Play Locally

```bash
npm install
npm run dev
```

Open the local Vite URL printed by the command.

## Controls

- Touch: hold the left/right buttons to steer, `+` to speed up, `-` to slow down.
- Keyboard: arrow keys or WASD steer and change speed.
- `G`: build a guardrail.
- `K`: add a kid when adulthood unlocks it.
- `Space` or `P`: pause.

## Gameplay

- Early life has weak controls and strong, imperfect parent guardrails.
- Adolescence increases control while rewards sometimes appear outside the safe path.
- Adulthood removes most external guardrails and introduces delayed consequences.
- Building guardrails costs resources and freedom now, but reduces future damage.
- Parenthood adds children after a delay. Children follow their own paths and can only be influenced.

Meters track stability, resources, freedom, purpose, guardrails, and child stability when children are present.

## Deploy To Cloudflare Workers

This repo is configured for a Cloudflare Worker named `life` using Workers static assets. The deployed domain is expected to be `life.fealz.net`.

If the Worker is connected to GitHub, deployment happens after changes are pushed to the connected branch. Local edits do not deploy until they are committed and pushed.

Use these build settings in Cloudflare Workers Builds:

- Build command: `npm run build`
- Deploy command: `npm run deploy` or `npx wrangler deploy`

You can also deploy from this machine with Wrangler:

```bash
npm install
npm run deploy
```

## Structure

```text
/
  index.html
  src/
    main.js
    game.js
    systems/
      stages.js
      influences.js
      children.js
      events.js
      scoring.js
    styles.css
  package.json
  wrangler.toml
  README.md
```
