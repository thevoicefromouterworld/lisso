# Playbook de lanzamiento y escalado — Lisso

## Economía unitaria (estimada, ajústala con costes reales de CJ)
| Pack | PVP | Neto sin IVA | Coste prod.+envío | Comisión Stripe | **Margen antes de ads = CPA máximo** |
|---|---|---|---|---|---|
| 1 ud | 24,95 € | 20,62 € | 8,50 € | 0,62 € | **11,50 €** |
| 2 ud | 34,95 € | 28,88 € | 14,50 € | 0,77 € | **13,61 €** |
| 3 ud | 44,95 € | 37,15 € | 20,50 € | 0,92 € | **15,72 €** |

Regla: **CPA objetivo ≤ 8 €** (deja ~40 % de margen tras ads con mix normal de packs). El informe diario te dice cuánto podías gastar sin perder dinero.

## Canal principal: TikTok Ads (Spark Ads) + Reels
El producto vive del **antes/después**: es el formato con más retención y CPM más bajo. Público amplio, sin intereses (España, 22-60, todos los géneros); deja que el algoritmo optimice a compra en cuanto el píxel tenga ~50 conversiones (antes: optimiza a "Iniciar pago").

### 10 ganchos (primeros 2 segundos)
1. "Iba a tirar este jersey…" (plano del jersey lleno de bolitas)
2. Plano cenital: mitad de la manga con bolitas, mitad lisa. Sin texto.
3. "Mi madre pensaba que le había comprado un jersey nuevo"
4. "POV: tu sofá de IKEA después de 3 años"
5. ASMR del motor + pelusa cayendo al depósito (sin voz)
6. "Lo que me ahorré en ropa este invierno"
7. "No uses una cuchilla de afeitar para esto" (comparación)
8. "El regalo de 25 € que todo el mundo usa" (noviembre-diciembre)
9. Vaciado del depósito lleno: "esto salió de UN abrigo"
10. Dueto/stitch con un vídeo de "cómo quitar bolitas" con trucos caseros

### Producción
- Graba con la muestra real: luz de ventana, móvil vertical, 9-15 s, subtítulos quemados.
- 3 creatividades nuevas por semana; cada una prueba **un** gancho distinto.
- Pide a 5-10 microcreadores (2-20 k seguidores, nicho hogar/moda) vídeos a cambio de producto gratis + 20-50 €. Usa sus vídeos como Spark Ads.

## Plan de test (primeras 2 semanas)
| Día | Acción | Presupuesto |
|---|---|---|
| 1-3 | 1 campaña, 1 grupo amplio, 5 creatividades | 30 €/día |
| 4 | Apaga creatividades con CTR < 1 % o CPA > 15 € | — |
| 4-7 | Duplica las 1-2 ganadoras, añade 3 nuevas | 40-50 €/día |
| 8-14 | Si CPA < 8 €: +20 % de presupuesto cada 48 h. Lanza Meta (Reels) con las ganadoras | 50-150 €/día |

**Kill rule**: si tras 150 € de gasto no hay ninguna creatividad con CPA < 15 €, el problema es el ángulo o el precio, no el presupuesto: cambia ganchos o prueba PVP 19,95 € / pack 2 a 29,95 €.

## Palancas de volumen ya montadas en la web
- Pack 2 preseleccionado ("El más elegido") → sube ticket medio.
- Pack regalo 3 → ángulo Navidad (noviembre-diciembre: haz creatividades de regalo).
- Enlaces directos por anuncio: `?color=grafito&pack=pack3` abre la web ya configurada.
- Códigos promo: crea uno en Stripe y enlaza con `?code=NAVIDAD10` (se aplica solo en el checkout).
- UTMs: `?utm_source=tiktok&utm_campaign=gancho3` — se guardan y viajan como `client_reference_id`.
- Apple Pay / Google Pay en el checkout → menos fricción en móvil.

## Cosas que NO hacer
- Nada de reseñas inventadas ni contadores falsos de "quedan 3": es publicidad engañosa (y Meta/TikTok penalizan). La sección de opiniones solo aparece cuando añadas reseñas reales y verificadas a `site/data/reviews.json`.
- No muestres "precio anterior" tachado sin haberlo aplicado (Directiva Ómnibus). La web compara packs contra el precio de comprar sueltos, que es legal.
