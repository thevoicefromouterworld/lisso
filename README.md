# Snowlit — tienda de un solo producto (dropshipping, EE. UU.)

Web estática en inglés/USD en GitHub Pages + cobro con Stripe Payment Links + fulfilment automático en CJ Dropshipping, todo orquestado con GitHub Actions. Sin servidor, sin cuotas mensuales.

```
Cliente ─▶ Web (GitHub Pages) ─▶ Stripe Payment Link ─▶ thank-you.html (píxel Purchase)
                                        │
             cada 10 min  ┌─────────────┘
             fulfill.yml  ▼
        Stripe (pedido pagado) ──▶ CJ createOrderV2 (paga con saldo CJ) ──▶ almacén CJ EE. UU.
             cada hora                                   │
             tracking.yml ◀── nº de seguimiento ─────────┘ ──▶ email "en camino" ──▶ email "¿qué tal?"
             cada 6 h     stock.yml  ──▶ site/data/stock.json (la web marca colores agotados) + alertas
             diario       report.yml ──▶ email con ventas, margen y CPA máximo rentable
```

El estado de cada pedido vive en los **metadatos del pago en Stripe** (`fulfillment_status`: `processing → ordered → shipped → delivered`, o `error` / `manual` / `skipped`). El repositorio es público, así que **nunca** se escriben datos de clientes ni cifras en él ni en los logs.

## Puesta en marcha (una vez)

### 1. Cuentas
| Servicio | Para qué | Coste |
|---|---|---|
| GitHub | Web + automatizaciones | Gratis (repo público) |
| Stripe | Cobros (tarjeta, Apple Pay, Google Pay) | ≈5,3 % + 0,30 $ por venta (tarjeta EE. UU. + conversión a EUR) |
| CJ Dropshipping | Producto, almacén UE y envío | Pagas cada pedido con saldo CJ |
| Resend (opcional) | Emails de envío, entrega e informes | Gratis hasta 3.000/mes |

### 2. Secretos y variables (Settings → Secrets and variables → Actions)
**Secrets**: `STRIPE_SECRET_KEY` (empieza en `sk_test_` para pruebas, `sk_live_` para vender), `CJ_API_KEY` (CJ → My CJ → Authorization → API), `RESEND_API_KEY` (opcional).
**Variables**: `EMAIL_FROM` (p. ej. `Snowlit <hello@tudominio.com>`, requiere dominio verificado en Resend), `OPS_EMAIL` (tu email para alertas e informes).

### 3. Producto en CJ (ya configurado)
`store.config.json` apunta al pid `2410070511391608200` / vid `2410070511391608600` (la variante con stock en el almacén de EE. UU.). Para cambiar de producto:
1. Actions → **Buscar producto en CJ**: palabras clave separadas por `;`, `@US:palabra` para ver solo stock en EE. UU., o `--pid <PID>` para variantes, stock por país, envío y fotos. El resultado se guarda en `ops/`.
2. Ajusta `fulfillment.cjProductId`, `variants[].cjVid`, `economics`, `media` y `specs`.
4. Recarga saldo en CJ (los pedidos se pagan automáticamente con saldo, `fulfillment.autoPay`).

### 4. Stripe
1. Actions → **Setup Stripe** → Run. Crea producto, precios, envío gratis y los 9 links (pack × color), los guarda en `store.config.json` y redespliega la web. Es idempotente: si cambias precios, vuelve a ejecutarlo.
2. En el dashboard de Stripe: Settings → Customer emails → activa **Successful payments** (recibo automático) y pon el nombre público y logo de la marca.

### 5. Probar de punta a punta (modo test)
Con la clave `sk_test_`: compra en la web con la tarjeta `4242 4242 4242 4242` escrita a mano (ventana privada; Apple Pay/Link usan tarjetas reales). En ≤10 min el workflow **Pedidos → CJ** crea el pedido en CJ **sin pagarlo** (los pagos de prueba usan `payType 3`) — compruébalo en CJ y bórralo. Después cambia el secreto a `sk_live_` y vuelve a ejecutar **Setup Stripe** (los links de test y live son distintos).

### 6. Legal y píxeles
- Completa `brand.legal` (titular, NIF, dirección) y `brand.supportEmail`. Los textos legales son una plantilla: que los revise tu asesor.
- Pega los IDs de píxel en `tracking` (Meta, TikTok, GA4). Solo se cargan si el visitante acepta cookies.

### 7. Dominio propio (cuando lo compres)
Añade `"customDomain": "snowlit.shop"` (o el que compres) dentro de `brand`, crea los registros DNS que indica GitHub (Settings → Pages) y vuelve a ejecutar **Setup Stripe** para que la redirección post-pago use el dominio nuevo.

## Operativa diaria
| Situación | Qué pasa | Qué haces |
|---|---|---|
| Venta | Pedido en CJ en ≤10 min, email de envío al salir | Nada |
| Saldo CJ insuficiente / vid erróneo | 3 reintentos y luego Issue + email | Corrige y borra `fulfillment_status` del pago en Stripe para reintentar |
| Reembolso antes de enviar | No se envía a CJ | Nada |
| Pedido >4 días sin salir | Issue + email | Reclama en CJ |
| Sin stock en el almacén de EE. UU. | La web muestra "Sold out" + Issue | Repón en CJ o cambia de variante |
| Coste CJ sube >15 % | Email | Revisa precio |

## Comandos locales
```bash
node scripts/build.mjs            # genera dist/
node --test tests/*.test.mjs       # 12 tests del pipeline con Stripe/CJ simulados
DRY_RUN=1 node scripts/fulfill.mjs # simular sin crear pedidos (requiere claves)
```

> GitHub desactiva los cron de repos sin actividad durante 60 días; cualquier commit (o el propio cron de stock) lo reactiva.
