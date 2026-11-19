// Kapı kuralları: üyelik durumu, içerideki üyeler, kapı kararı. Saf fonksiyonlar, yan etki yok.

export const GIRIS_KILIDI_MS = 2 * 60 * 60 * 1000; // çıkış okutulmazsa 2 saat sonra çıkmış sayılır
export const BITIYOR_GUN = 7;
const GUN_MS = 86_400_000;

const iki = (n) => String(n).padStart(2, '0');

/** Yerel saate göre YYYY-AA-GG. */
export function bugunISO(ms = Date.now()) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${iki(d.getMonth() + 1)}-${iki(d.getDate())}`;
}

const utc = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

export const gunEkle = (iso, n) => new Date(utc(iso) + n * GUN_MS).toISOString().slice(0, 10);
export const gunFarki = (aIso, bIso) => Math.round((utc(bIso) - utc(aIso)) / GUN_MS);

export function uyeDurumu(uye, simdi = Date.now()) {
  const kalanGun = gunFarki(bugunISO(simdi), uye.bitis);
  if (uye.donduruldu) return { durum: 'donduruldu', kalanGun };
  if (kalanGun < 0) return { durum: 'bitti', kalanGun };
  if (kalanGun <= BITIYOR_GUN) return { durum: 'bitiyor', kalanGun };
  return { durum: 'aktif', kalanGun };
}

/** uyeId → giriş zamanı; son geçerli hareketi giriş olan ve kilidi dolmamış üyeler. */
export function iceridekiler(hareketler, simdi = Date.now()) {
  const son = new Map();
  for (const h of hareketler) {
    if (h.sonuc !== 'gecti') continue;
    const once = son.get(h.uyeId);
    if (!once || h.zaman >= once.zaman) son.set(h.uyeId, h);
  }
  const sonuc = new Map();
  for (const [id, h] of son) {
    if (h.tip === 'giris' && simdi - h.zaman < GIRIS_KILIDI_MS) sonuc.set(id, h.zaman);
  }
  return sonuc;
}

const ilkAd = (ad) => String(ad || '').split(' ')[0];

const RED = {
  bicim: ['Bu kod tanınmadı', 'Salon uygulamasındaki QR\'ı okutun.'],
  imza: ['Geçersiz QR', 'Kod değiştirilmiş ya da sahte. Resepsiyona uğrayın.'],
  eski: ['Bu QR\'ın süresi geçmiş', 'Ekran görüntüsü çalışmaz. Uygulamadaki canlı QR\'ı okutun.'],
  bilinmeyen: ['Üye bulunamadı', 'Resepsiyona uğrayın.'],
  donduruldu: ['Üyelik donduruldu', 'Açtırmak için resepsiyona uğrayın.'],
  iceride: ['Bu üye zaten içeride', 'Aynı QR çıkış yapılmadan ikinci kez kullanılamaz. Paylaşılmış olabilir.'],
};

const red = (sebep, uye, baslik = RED[sebep][0], alt = RED[sebep][1]) =>
  ({ gecti: false, sebep, baslik, alt, uyeId: uye?.id ?? null });

/**
 * Kapı kararı.
 * @param {{uye: object|null, dogrulama: {gecerli:boolean, sebep?:string}, mod:'giris'|'cikis',
 *          hareketler: object[], simdi: number}} g
 */
export function kapiKarari({ uye, dogrulama, mod, hareketler, simdi }) {
  if (!dogrulama.gecerli) return red(dogrulama.sebep in RED ? dogrulama.sebep : 'bicim', uye);
  if (!uye) return red('bilinmeyen', null);

  if (mod === 'cikis') {
    return { gecti: true, sebep: 'cikis', baslik: `Güle güle, ${ilkAd(uye.ad)}`, alt: 'Çıkışın kaydedildi.', uyeId: uye.id };
  }

  const { durum, kalanGun } = uyeDurumu(uye, simdi);
  if (durum === 'donduruldu') return red('donduruldu', uye);
  if (durum === 'bitti') {
    return red('bitti', uye, `Üyelik ${-kalanGun} gün önce bitti`, 'Yenilemek için resepsiyona uğrayın.');
  }
  if (iceridekiler(hareketler, simdi).has(uye.id)) return red('iceride', uye);

  const alt = kalanGun === 0 ? 'Üyeliğin bugün bitiyor.'
    : durum === 'bitiyor' ? `Üyeliğin ${kalanGun} gün sonra bitiyor.`
      : `${kalanGun} gün kaldı.`;
  return { gecti: true, sebep: 'ok', baslik: `Hoş geldin, ${ilkAd(uye.ad)}`, alt, uyeId: uye.id };
}
