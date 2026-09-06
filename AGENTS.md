# AGENTS.md — Istruzioni per agenti IA (GitHub Copilot, Claude, MARKY, ecc.)

> Guida rapida per lavorare su questa repository. Viene letta automaticamente dagli
> agenti IA quando aprono il progetto. Per le istruzioni complete leggi **GUIDA-IA.md**
> (ricostruzione + varianti), **DEPLOY-RENDER.md** (deploy su Render) e
> **ACCESSIBILITA.md** (sezione accessibilità portabile).

## Cos'è questa app

App didattica **«Operazioni con le Frazioni»**: addizione/sottrazione e
moltiplicazione/divisione tra frazioni, con input a scrittura a mano (ONNX), passi
guidati, box "RICOPIA SUL QUADERNO" e PDF scaricabile. Pensata per studenti BES/DSA.

## Stack

Vite + React 19 + TypeScript + TailwindCSS 4 + shadcn/ui + KaTeX + ONNX Runtime (ink-on).
**Nessun backend, nessun database**: tutta la logica è lato client. Il server Express
serve solo i file statici + header COOP/COEP + CORS `/fonts`.

## Comandi

```bash
pnpm install
pnpm check     # type-check — MAI saltare prima del deploy
pnpm dev       # dev server locale
pnpm build     # build di produzione (client + server)
pnpm start     # server di produzione
```

## File critici

| File | Ruolo |
|---|---|
| `client/src/pages/FractionExercises.tsx` | **Tutta la logica** dell'esercizio (state, computed values, passi, PDF, RICOPIA) |
| `client/src/pages/WelcomePage.tsx` | Prima pagina (layout compatto, classe `lf-welcome-top`) |
| `client/src/lib/heightSync.ts` | Cornice dinamica: sincronizzazione altezza iframe |
| `client/src/main.tsx` | Chiama `initHeightSync()` PRIMA del render |
| `client/src/index.css` | Tema, accessibilità, regole `lf-embedded` / `lf-welcome-top` |
| `client/src/contexts/AccessibilityContext.tsx` | Provider accessibilità (font/interlinea/righello/contrasto) |
| `client/src/components/AccessibilityToolbar.tsx` | Barra di accessibilità |
| `client/src/hooks/useReadAloud.ts` | Lettura ad alta voce (TTS italiano) |
| `server/index.ts` | Express: statico + COOP/COEP + CORS `/fonts` |
| `cornice-dinamica/` | Embed Blogger (dedicata ⭐, lite, universale, autosufficiente) |

## Regole da rispettare (anti-regressione)

1. **MAI saltare `pnpm check`** prima del deploy.
2. **Divisione**: si invertono TUTTE le frazioni tranne la prima (non solo la seconda).
3. **Segni `×`**: usare `items-center` (NON `items-end` + margini negativi).
4. **Canale postMessage**: `labvisivo:height` — non cambiarlo.
5. **`heightSync.ts` → `currentHeight()`**: NON usare `documentElement.scrollHeight`
   come riferimento assoluto (resta gonfiato all'altezza del viewport dell'iframe e la
   cornice non si restringe MAI). Usare `body.scrollHeight`/`offsetHeight` +
   `documentElement.offsetHeight`, e aggiungere `documentElement.scrollHeight` SOLO se
   supera `window.innerHeight`.
6. **Prima pagina**: layout COMPATTO (niente `min-h-[calc(100dvh-…)]` +
   `items-center justify-center`). Dentro l'iframe i margini sono simmetrici via
   `html.lf-embedded .lf-welcome` (`padding-top: 20px` + `mb-1` barra = 24px sopra,
   `padding-bottom: 24px` sotto). In vista autonoma `html.lf-welcome-top body` è bianco.
7. **Font OpenDyslexic** su `html, body, #root` e `.font-sans/.serif/.mono`, MAI su
   `.katex` (le formule restano in KaTeX).
8. **PDF**: copia TUTTI i fogli di stile e forza OpenDyslexic (fallback Cambria Math)
   12pt con `-webkit-print-color-adjust: exact`.

## Documentazione inclusa

- **GUIDA-IA.md** — ricostruzione da GitHub + varianti (operazioni, lingua, quiz)
- **DEPLOY-RENDER.md** — trasferimento su Render via GitHub (Blueprint `render.yaml`)
- **ACCESSIBILITA.md** — ♿ SEZIONE ACCESSIBILITÀ (14 misure portabili su altre app)
- **cornice-dinamica/README.md** — cornice dinamica (embed Blogger a altezza automatica)
- **ISTRUZIONI-GITHUB.txt** — riepilogo rapido
