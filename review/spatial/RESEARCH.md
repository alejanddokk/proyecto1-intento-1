# Referencias: observación y aplicación

Consulta del 5 de noviembre de 2026. No se copiaron implementaciones de las webs.

| Referencia | Evidencia observada | Aplicación propia y límite |
| --- | --- | --- |
| [Apple iPhone Pro](https://www.apple.com/iphone-18-pro/) | Página oficial actual: escenario negro, luz sobre producto y copia enfocada. DOM observado: 0 canvas, 14 videos, 185 imágenes; un MP4 cargado. | Jerarquía, luz y separación entre momentos. No se atribuye 3D en tiempo real a esa página. La técnica exacta de sus secuencias no quedó verificada. |
| [Bruno Simon](https://bruno-simon.com/) | Su página describe experiencia Three.js WebGPU/TSL; DOM con un canvas y sin video. | Referencia de interacción espacial comprensible. El canvas quedó en carga en este navegador: no se completó el recorrido interactivo ni se afirma haberlo conducido. |
| [GTA VI oficial](https://www.rockstargames.com/VI) | DOM con tres canvas, dos videos y 34 imágenes. Recursos oficiales y contenido público. | Escala editorial, atmósfera y transiciones entre medios. El recorrido animado quedó en carga en la captura automatizada; no se da por probado que todos sus canvas sean 3D. |

Capturas `reference-*.png` documentan también esos límites de carga. El análisis
combina la composición observable con la descripción oficial; no convierte
inferencias de implementación en hechos.

## Documentación técnica y herramientas

- [Three.js MeshPhysicalMaterial](https://threejs.org/docs/#api/en/materials/MeshPhysicalMaterial): metal, clearcoat y entorno.
- [Reflector](https://threejs.org/docs/#examples/en/objects/Reflector): reflejo planar. El suavizado y la niebla propios están en world.js.
- [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/): progreso, refresh y responsive.
- [Scrollcraft](https://github.com/nateherkai/scroll-craft): se leyeron la skill y el motor `engine/scrollcraft.js`. Puede integrarse en vanilla, pero gestiona RAF y scroll; no se instaló para evitar duplicación con GSAP. Se tomó el criterio de variar ritmo y planos, no su runtime.
- [Supabase Storage](https://supabase.com/docs/guides/storage): opción futura de medios. No se conectó ni se migró la base.
- [Strix](https://github.com/usestrix/strix): evaluación documental; no ejecución. Ver SECURITY_SCOPE.md.

Context7 no figuraba entre las herramientas conectadas. Se trabajó con documentación
oficial y las skills locales Three.js, GSAP y principios de accesibilidad y motion.
No se instaló una supuesta «Skill UI» sin poder identificar su origen.
