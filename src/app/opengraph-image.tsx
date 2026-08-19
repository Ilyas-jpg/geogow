/**
 * /opengraph-image.png — WhatsApp, LinkedIn, Facebook, Slack, Telegram.
 *
 * Kök segmentte durur: kendi `opengraph-image` tanımlamayan HER sayfa
 * (`/dusuk/istanbul/kadikoy` dahil) bu kartı miras alır.
 */
export { KART_ALT as alt, KART_BOYUTU as size, KART_TIPI as contentType } from "./_og/kart";

import { kartUret } from "./_og/kart";

export default function OnizlemeGorseli() {
  return kartUret();
}
