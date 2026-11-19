// Salon Kapı — 30 saniyede bir değişen imzalı QR ve 6 haneli yedek kod.
// DEMO NOTU: Ana anahtar koda gömülü. Gerçek kurulumda her salonun anahtarı ayrı üretilir;
// üyenin anahtarı yalnız kendi telefonunda ve kapı cihazında durur, koda yazılmaz.

export const PENCERE_MS = 30_000;
export const TOLERANS = 1; // ±1 pencere: telefon ile kapı arasındaki saat farkı için

// Biçim: SK1 + üye (U01) + T + pencere + S + 12 hex imza. Örn: SK1U01T59876543Sa1b2c3d4e5f6
// Ayırıcı olarak ":" ya da "-" yok: USB okuyucular klavye gibi yazar ve ABD klavyesi varsayar;
// Türkçe Q klavyede ":" → "Ş" olur. Yalnız harf ve rakam her klavye düzeninde aynı gelir.
const ONEK = 'SK1';
const DEMO_ANA_ANAHTAR = 'salon-kapi-demo-2026';
const QR_RE = /^SK1(U\d{2,6})T(\d{1,12})S([0-9a-f]{12})$/;
const enc = new TextEncoder();
const uyeAnahtarlari = new Map();
let anaAnahtar = null;

function subtle() {
  const c = globalThis.crypto;
  if (!c || !c.subtle) {
    throw new Error('Bu tarayıcı güvenli şifrelemeyi desteklemiyor. Sayfayı https ile açın.');
  }
  return c.subtle;
}

const hmacAnahtar = (ham) =>
  subtle().importKey('raw', ham, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);

async function hmac(anahtar, metin) {
  return new Uint8Array(await subtle().sign('HMAC', anahtar, enc.encode(metin)));
}

async function uyeAnahtari(uyeId) {
  if (uyeAnahtarlari.has(uyeId)) return uyeAnahtarlari.get(uyeId);
  anaAnahtar = anaAnahtar || (await hmacAnahtar(enc.encode(DEMO_ANA_ANAHTAR)));
  const anahtar = await hmacAnahtar(await hmac(anaAnahtar, `uye:${uyeId}`));
  uyeAnahtarlari.set(uyeId, anahtar);
  return anahtar;
}

export const pencere = (ms) => Math.floor(ms / PENCERE_MS);
export const pencereKalanMs = (ms) => PENCERE_MS - (ms % PENCERE_MS);

const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

async function imza(uyeId, w) {
  const b = await hmac(await uyeAnahtari(uyeId), `${uyeId}:${w}`);
  return hex(b.subarray(0, 6));
}

function sabitZamanliEsit(a, b) {
  if (a.length !== b.length) return false;
  let fark = 0;
  for (let i = 0; i < a.length; i++) fark |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return fark === 0;
}

/** Üyenin telefonunda gösterilecek QR metni. */
export async function qrMetni(uyeId, ms = Date.now()) {
  const w = pencere(ms);
  return `${ONEK}${uyeId}T${w}S${await imza(uyeId, w)}`;
}

/** Metni parçalarına ayırır; biçim tutmazsa null. */
export function qrCoz(metin) {
  const m = QR_RE.exec(String(metin ?? '').trim());
  return m ? { uyeId: m[1], w: Number(m[2]), imza: m[3] } : null;
}

/** Kapıda doğrulama. Sırası önemli: önce imza (sahte mi), sonra süre (eski mi). */
export async function qrDogrula(metin, ms = Date.now()) {
  const c = qrCoz(metin);
  if (!c) return { gecerli: false, sebep: 'bicim' };
  if (!sabitZamanliEsit(await imza(c.uyeId, c.w), c.imza)) {
    return { gecerli: false, sebep: 'imza', uyeId: c.uyeId };
  }
  if (Math.abs(pencere(ms) - c.w) > TOLERANS) {
    return { gecerli: false, sebep: 'eski', uyeId: c.uyeId };
  }
  return { gecerli: true, uyeId: c.uyeId };
}

async function kodUret(uyeId, w) {
  const b = await hmac(await uyeAnahtari(uyeId), `kod:${w}`);
  const o = b[b.length - 1] & 0x0f;
  const sayi = (((b[o] & 0x7f) << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) % 1_000_000;
  return String(sayi).padStart(6, '0');
}

/** Telefonun QR'ı okunmazsa resepsiyonda elle girilen 6 haneli kod. */
export const yedekKod = (uyeId, ms = Date.now()) => kodUret(uyeId, pencere(ms));

/** Elle girilen kodun hangi üyeye ait olduğunu bulur; bulamazsa null. */
export async function yedekKodBul(kod, uyeIdler, ms = Date.now()) {
  if (!/^\d{6}$/.test(String(kod))) return null;
  const w0 = pencere(ms);
  for (const id of uyeIdler) {
    for (let d = -TOLERANS; d <= TOLERANS; d++) {
      if ((await kodUret(id, w0 + d)) === kod) return id;
    }
  }
  return null;
}
