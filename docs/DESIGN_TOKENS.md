# Design tokens — Kurio

Fonte de verdade: arquivo de tokens extraído do Figma e recebido em 19/10/2026.

## Cores confirmadas

| Token do Figma     | Hex       | Variável CSS           |
| ------------------ | --------- | ---------------------- |
| Color/Ink          | `#140D0A` | `--color-ink`          |
| Color/Foreground   | `#F5F1EB` | `--color-foreground`   |
| Text/Secondary     | `#CFB28C` | `--text-secondary`     |
| Text/Accent        | `#E89B55` | `--text-accent`        |
| Color/Primary      | `#D28A4C` | `--color-primary`      |
| Color/Surface Card | `#241612` | `--color-surface-card` |
| Color/Secondary    | `#B39463` | `--color-secondary`    |
| Color/Surface Dark | `#38220F` | `--color-surface-dark` |
| Color/Border Soft  | `#55321F` | `--color-border-soft`  |

`src/app/global.css` mantém esses nove valores como tokens brutos e cria apenas aliases semânticos para Tailwind/shadcn. Erro, sucesso, aviso, foco, hover e estados desabilitados reutilizam esses valores enquanto não houver tokens próprios confirmados. Não há tema claro.

## Tipografia confirmada

- Família: Roboto Mono local, subset Latin, fornecida por `@fontsource/roboto-mono`.
- Peso confirmado: 400.
- Estilo base: 14 px, line-height 24 px, letter-spacing 0%.
- Segundo estilo confirmado: 16 px, line-height 100%, peso 400.

Tamanhos de títulos, raios, espaçamentos, larguras e demais pesos foram ajustados a partir dos frames recebidos. Medidas não presentes nos frames usam uma escala responsiva consistente e mantêm texto legível.

## Assets de demonstração

Os SVGs em `public/assets` são ilustrações locais originais. Eles não representam os exports oficiais do Figma e podem ser substituídos sem alterar os contratos da aplicação.
