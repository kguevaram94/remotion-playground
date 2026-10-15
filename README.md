# Remotion Playground

Repo de prueba para experimentar con [Remotion](https://www.remotion.dev/) y generar videos animados con React.

## Requisitos

- Node.js 18+ (probado con Node 26)
- macOS 15+ recomendado por Remotion

## Empezar

```bash
npm install
npm run dev
```

Eso abre **Remotion Studio** en el navegador: ahí previsualizas la composición, ajustas el timeline y renders.

## Renderizar un MP4

```bash
npx remotion render HelloRemotion out/hello.mp4
```

El vídeo queda en `out/hello.mp4` (esa carpeta está en `.gitignore`).

## Estructura

- `src/Root.tsx` — registro de composiciones
- `src/Composition.tsx` — composición demo `HelloRemotion` (texto + spring + órbita)
- `public/` — assets estáticos (imágenes, audio, etc.)

## Ideas para probar

1. Cambiar colores / tipografía en `HelloRemotion`
2. Añadir `Sequence` para escenas en serie
3. Importar una imagen en `public/` y usarla con `<Img>`
4. Renderizar a GIF o WebM con el CLI de Remotion

## Docs útiles

- [Fundamentos](https://www.remotion.dev/docs/the-fundamentals)
- [Animar con `spring` / `interpolate`](https://www.remotion.dev/docs/animating-properties)
- [CLI render](https://www.remotion.dev/docs/cli/render)
