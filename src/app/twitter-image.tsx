/**
 * /twitter-image.png — X (Twitter).
 *
 * Aynı kart: X, `twitter:image` yoksa `og:image`e düşer ama kart tipini
 * `summary_large_image` yapmak için görselin adıyla var olması güvenli yol.
 */
export { KART_ALT as alt, KART_BOYUTU as size, KART_TIPI as contentType } from "./_og/kart";

import { kartUret } from "./_og/kart";

export default function TwitterGorseli() {
  return kartUret();
}
