// Ortak yardımcılar: güvenli metin, biçimler, QR çizimi, ses, bağlantılar.

const KACIS = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Kullanıcıdan ya da adresten gelen her metin HTML'e bununla girer. */
export const k = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => KACIS[c]);

export const saatTR = (ms) => new Date(ms).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
export const tarihTR = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
export const basHarfler = (ad) => String(ad || '?').split(' ').map((p) => p[0] || '').join('').slice(0, 2).toLocaleUpperCase('tr-TR');

export const DURUM = {
  aktif: { etiket: 'Aktif', sinif: 'cip-ok' },
  bitiyor: { etiket: 'Bitiyor', sinif: 'cip-uyari' },
  bitti: { etiket: 'Bitti', sinif: 'cip-red' },
  donduruldu: { etiket: 'Donduruldu', sinif: 'cip-donuk' },
};

export const RED_ETIKET = {
  bitti: 'Süresi bitmiş', eski: 'Eski QR (ekran görüntüsü)', imza: 'Sahte QR', bicim: 'Tanınmayan kod',
  bilinmeyen: 'Bilinmeyen üye', donduruldu: 'Dondurulmuş', iceride: 'Zaten içeride (paylaşım?)',
};

export function kalanMetni(kalanGun) {
  if (kalanGun < 0) return `${-kalanGun} gün önce bitti`;
  if (kalanGun === 0) return 'Bugün bitiyor';
  return `${kalanGun} gün kaldı`;
}

/** QR'ı SVG olarak üretir (qrcode-generator, vendor/qrcode.js). */
export function qrSvg(metin, { ecc = 'M', hucre = 10, baslik = '' } = {}) {
  const q = globalThis.qrcode(0, ecc);
  q.addData(metin);
  q.make();
  return q.createSvgTag({ cellSize: hucre, margin: hucre * 2, scalable: true, title: baslik || undefined });
}

/** Sayfanın yayın adresi (GitHub Pages alt klasöründe de doğru çalışır). */
export const tabanAdres = () => `${location.origin}${location.pathname}`;

export function uyeLinki(uye, salon) {
  const p = new URLSearchParams({ salon, uye: uye.id, ad: uye.ad, bitis: uye.bitis });
  return `${tabanAdres()}?${p}#/uye`;
}

let sesBaglami = null;
/** Tarayıcılar sesi ancak bir tıklamadan sonra açar; kapı ekranındaki "Başlat" bunu çağırır. */
export function sesiAc() {
  try {
    sesBaglami = sesBaglami || new (window.AudioContext || window.webkitAudioContext)();
    if (sesBaglami.state === 'suspended') sesBaglami.resume();
  } catch { sesBaglami = null; }
}

function ton(frekans, baslangic, sure, tur = 'sine') {
  const o = sesBaglami.createOscillator();
  const g = sesBaglami.createGain();
  o.type = tur;
  o.frequency.value = frekans;
  g.gain.setValueAtTime(0.0001, baslangic);
  g.gain.exponentialRampToValueAtTime(0.25, baslangic + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, baslangic + sure);
  o.connect(g).connect(sesBaglami.destination);
  o.start(baslangic);
  o.stop(baslangic + sure + 0.02);
}

export function bip(gecti) {
  if (!sesBaglami) return;
  const t = sesBaglami.currentTime;
  if (gecti) { ton(988, t, 0.09); ton(1319, t + 0.1, 0.14); } else { ton(196, t, 0.42, 'square'); }
}

export const azHareket = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
