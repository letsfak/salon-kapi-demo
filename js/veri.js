// Demo verisi: sahte üyeler ve bugünkü kapı hareketleri. Tarayıcıda (localStorage) durur, sunucu yok.
// Her yeni günde tohum yeniden atılır; böylece kalan günler hep bugüne göre doğru görünür.
import { bugunISO, gunEkle } from './kural.js';

const ANAHTAR = 'salonkapi.demo.v1';
const SALON_ANAHTARI = 'salonkapi.salon';
const KANAL = 'salonkapi';
export const VARSAYILAN_SALON = 'Demo Spor Salonu';
export const PAKETLER = [1, 3, 6, 12];

// [id, ad, paket (ay), bugünden kalan gün, donduruldu]
const UYE_TOHUM = [
  ['U01', 'Ahmet Yılmaz', 3, 12, false], ['U02', 'Elif Kaya', 3, 45, false],
  ['U03', 'Mehmet Demir', 1, -3, false], ['U04', 'Zeynep Çelik', 1, 2, false],
  ['U05', 'Burak Şahin', 6, 87, false], ['U06', 'Ayşe Öztürk', 1, 5, false],
  ['U07', 'Emre Aydın', 6, 160, false], ['U08', 'Selin Arslan', 1, -12, false],
  ['U09', 'Murat Koç', 3, 30, false], ['U10', 'Merve Kurt', 3, 20, true],
  ['U11', 'Kaan Özdemir', 1, 6, false], ['U12', 'Büşra Yıldız', 3, 64, false],
  ['U13', 'Oğuz Polat', 1, 1, false], ['U14', 'İrem Aksoy', 6, 120, false],
  ['U15', 'Serkan Erdoğan', 1, -1, false], ['U16', 'Gizem Tunç', 3, 33, false],
  ['U17', 'Tolga Kılıç', 1, 18, false], ['U18', 'Esra Doğan', 12, 250, false],
  ['U19', 'Hakan Çetin', 1, 9, false], ['U20', 'Deniz Karaca', 3, 52, false],
];

// Telefondaki "demo üyesi seç" listesi: her durumdan bir örnek.
export const DEMO_UYELERI = ['U01', 'U04', 'U03', 'U10'];

// [saat, üye, tip, sonuç, red sebebi] — bugünün akışı; yalnız şu andan önceki satırlar yüklenir.
const HAREKET_TOHUM = [
  ['07:05', 'U05', 'giris', 'gecti'], ['07:12', 'U13', 'giris', 'gecti'],
  ['08:12', 'U03', 'giris', 'red', 'bitti'], ['08:30', 'U09', 'giris', 'gecti'],
  ['09:15', 'U02', 'giris', 'gecti'], ['09:50', 'U16', 'giris', 'gecti'],
  ['10:40', 'U14', 'giris', 'red', 'eski'], ['11:05', 'U07', 'giris', 'gecti'],
  ['11:30', 'U20', 'giris', 'gecti'], ['12:10', 'U12', 'giris', 'gecti'],
  ['12:45', 'U06', 'giris', 'gecti'], ['13:20', 'U17', 'giris', 'gecti'],
  ['14:05', 'U19', 'giris', 'gecti'], ['14:40', 'U11', 'giris', 'gecti'],
  ['15:10', 'U15', 'giris', 'red', 'bitti'], ['16:00', 'U18', 'giris', 'gecti'],
  ['16:45', 'U02', 'giris', 'gecti'], ['17:20', 'U14', 'giris', 'gecti'],
  ['17:55', 'U08', 'giris', 'red', 'bitti'], ['18:10', 'U09', 'giris', 'gecti'],
  ['18:30', 'U13', 'giris', 'gecti'], ['19:05', 'U16', 'giris', 'gecti'],
  ['19:40', 'U20', 'giris', 'gecti'], ['20:15', 'U07', 'giris', 'gecti'],
  ['20:50', 'U12', 'giris', 'gecti'], ['21:30', 'U05', 'giris', 'gecti'],
];

const tel = (i) => `0555 000 00 ${String(i + 1).padStart(2, '0')}`;

export function tohumUyeler(simdi = Date.now()) {
  const bugun = bugunISO(simdi);
  return UYE_TOHUM.map(([id, ad, paketAy, kalan, donduruldu], i) => ({
    id, ad, tel: tel(i), paketAy, bitis: gunEkle(bugun, kalan), donduruldu,
  }));
}

function tohumHareketler(simdi) {
  const gun = new Date(simdi);
  return HAREKET_TOHUM
    .map(([saat, uyeId, tip, sonuc, sebep]) => {
      const [s, d] = saat.split(':').map(Number);
      const zaman = new Date(gun.getFullYear(), gun.getMonth(), gun.getDate(), s, d).getTime();
      return { uyeId, tip, sonuc, sebep: sebep ?? (tip === 'cikis' ? 'cikis' : 'ok'), zaman, kaynak: 'tohum' };
    })
    .filter((h) => h.zaman <= simdi);
}

const yeniDurum = (simdi = Date.now()) => ({
  tohumGunu: bugunISO(simdi), uyeler: tohumUyeler(simdi), hareketler: tohumHareketler(simdi),
});

function oku() {
  try {
    const ham = localStorage.getItem(ANAHTAR);
    return ham ? JSON.parse(ham) : null;
  } catch {
    return null;
  }
}

let bellek = null;
let kanal = null;
try { kanal = new BroadcastChannel(KANAL); } catch { kanal = null; }

function yaz(durum) {
  try { localStorage.setItem(ANAHTAR, JSON.stringify(durum)); } catch { /* gizli sekme: yalnız bellekte kalır */ }
  bellek = durum;
  kanal?.postMessage('degisti');
  return durum;
}

export function durumYukle(simdi = Date.now()) {
  const kayitli = bellek || oku();
  if (kayitli && kayitli.tohumGunu === bugunISO(simdi)) return (bellek = kayitli);
  return yaz(yeniDurum(simdi));
}

/** Başka sekmede (kapı ↔ panel) değişiklik olunca çağrılır. Dinlemeyi bırakan fonksiyonu döndürür. */
export function degisiklikDinle(cb) {
  const tazele = () => { bellek = null; cb(durumYukle()); };
  const depo = (e) => { if (e.key === ANAHTAR || e.key === SALON_ANAHTARI) tazele(); };
  kanal?.addEventListener('message', tazele);
  window.addEventListener('storage', depo);
  return () => {
    kanal?.removeEventListener('message', tazele);
    window.removeEventListener('storage', depo);
  };
}

const guncelle = (fn) => yaz(fn(durumYukle()));
const uyeDegistir = (id, fn) => guncelle((d) => ({ ...d, uyeler: d.uyeler.map((u) => (u.id === id ? fn(u) : u)) }));

const HAREKET_SINIRI = 500;
export const hareketEkle = (h) => guncelle((d) => ({ ...d, hareketler: [...d.hareketler, h].slice(-HAREKET_SINIRI) }));
export const sifirla = () => yaz(yeniDurum());

export function uyeEkle({ ad, tel: telefon, paketAy }) {
  let yeniId = null;
  guncelle((d) => {
    const enBuyuk = d.uyeler.reduce((m, u) => Math.max(m, Number(u.id.slice(1)) || 0), 0);
    yeniId = `U${String(enBuyuk + 1).padStart(2, '0')}`;
    const uye = { id: yeniId, ad, tel: telefon, paketAy, bitis: gunEkle(bugunISO(), paketAy * 30), donduruldu: false };
    return { ...d, uyeler: [...d.uyeler, uye] };
  });
  return yeniId;
}

export const uzat = (id, ay = 1) => uyeDegistir(id, (u) => {
  const bugun = bugunISO();
  const taban = u.bitis > bugun ? u.bitis : bugun;
  return { ...u, bitis: gunEkle(taban, ay * 30) };
});
export const dondurDegistir = (id) => uyeDegistir(id, (u) => ({ ...u, donduruldu: !u.donduruldu }));
export const suresiniBitir = (id) => uyeDegistir(id, (u) => ({ ...u, bitis: gunEkle(bugunISO(), -1) }));
export const cikisYap = (id) => hareketEkle({ uyeId: id, tip: 'cikis', sonuc: 'gecti', sebep: 'cikis', zaman: Date.now(), kaynak: 'panel' });

export const SALON_AD_UZUNLUK = 40;
const temizSalon = (s) => String(s ?? '').trim().replace(/\s+/g, ' ').slice(0, SALON_AD_UZUNLUK);

export function salonAdi() {
  const p = temizSalon(new URLSearchParams(location.search).get('salon'));
  if (p) { try { localStorage.setItem(SALON_ANAHTARI, p); } catch { /* yok say */ } return p; }
  try { return temizSalon(localStorage.getItem(SALON_ANAHTARI)) || VARSAYILAN_SALON; } catch { return VARSAYILAN_SALON; }
}

export function salonAdiKaydet(ad) {
  const temiz = temizSalon(ad);
  if (!temiz) return;
  try { localStorage.setItem(SALON_ANAHTARI, temiz); } catch { /* yok say */ }
  kanal?.postMessage('degisti');
}
