// Üye ekranı (telefon): 30 sn'de bir değişen QR, yedek kod, kalan gün, program ve beslenme sekmeleri.
import { qrMetni, yedekKod, pencereKalanMs, PENCERE_MS } from './kod.js';
import { uyeDurumu } from './kural.js';
import { tohumUyeler, DEMO_UYELERI, salonAdi } from './veri.js';
import { k, qrSvg, tarihTR, kalanMetni, DURUM, azHareket } from './ui.js';

const UYE_ANAHTARI = 'salonkapi.uye';
const ID_RE = /^U\d{2,6}$/;
const TARIH_RE = /^\d{4}-\d{2}-\d{2}$/;
/** 2026-13-45 gibi biçimi tutan ama olmayan tarihleri de eler. */
function gercekTarih(s) {
  if (!TARIH_RE.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Adresten gelen üye bilgisini doğrular; uymayan alan varsa hiç kabul etmez. */
function adrestenUye() {
  const p = new URLSearchParams(location.search);
  const id = p.get('uye');
  const ad = (p.get('ad') || '').trim().slice(0, 60);
  const bitis = p.get('bitis') || '';
  if (!id) return null;
  if (!ID_RE.test(id) || !ad || !gercekTarih(bitis)) return null;
  return { id, ad, bitis, donduruldu: false };
}

function kayitliUye() {
  try { return JSON.parse(localStorage.getItem(UYE_ANAHTARI) || 'null'); } catch { return null; }
}
function uyeKaydet(uye) {
  try { localStorage.setItem(UYE_ANAHTARI, JSON.stringify(uye)); } catch { /* yok say */ }
}
function uyeUnut() {
  try { localStorage.removeItem(UYE_ANAHTARI); } catch { /* yok say */ }
}

/** Tohum üyeleri her gün bugüne göre yeniden hesaplanır. */
function tazeUye(uye) {
  return tohumUyeler().find((t) => t.id === uye.id && t.ad === uye.ad) || uye;
}

const PROGRAM = [
  ['Bench press', '4 × 8'], ['Lat pulldown', '4 × 10'], ['Dumbbell omuz press', '3 × 10'],
  ['Kablo row', '3 × 12'], ['Plank', '3 × 45 sn'],
];
const BESLENME = [
  ['Kahvaltı', '2 yumurta, beyaz peynir, tam buğday ekmeği, domates-salatalık'],
  ['Ara öğün', '1 meyve, bir avuç çiğ ceviz'],
  ['Öğle', 'Izgara tavuk, bulgur pilavı, mevsim salata'],
  ['Akşam', 'Zeytinyağlı sebze yemeği, yoğurt'],
];

function secimSablonu(salon) {
  const uyeler = tohumUyeler().filter((u) => DEMO_UYELERI.includes(u.id));
  return `<section class="uye uye-secim">
    <p class="etiket">${k(salon)}</p>
    <h1>Demo üyesi seçin</h1>
    <p class="uye-aciklama">Gerçekte her üye kendi telefonunda kendi hesabıyla açar. Demoda farklı durumları denemek için birini seçin.</p>
    <ul class="secim-liste">${uyeler.map((u) => {
      const d = uyeDurumu(u);
      return `<li><button type="button" class="secim-btn" data-sec="${k(u.id)}">
        <span class="secim-ad">${k(u.ad)}</span>
        <span class="cip ${DURUM[d.durum].sinif}">${DURUM[d.durum].etiket}</span>
        <span class="secim-alt">${k(kalanMetni(d.kalanGun))}</span></button></li>`;
    }).join('')}</ul>
    <p class="uye-aciklama kucuk">Panelden yeni üye eklediyseniz panelde çıkan QR'ı bu telefonun kamerasıyla okutun.</p>
  </section>`;
}

function uyeSablonu(uye, salon) {
  const d = uyeDurumu(uye);
  const uyari = d.durum === 'bitti' ? 'Üyeliğiniz bitti. Bu QR kapıda kabul edilmez; yenilemek için resepsiyona uğrayın.'
    : d.durum === 'donduruldu' ? 'Üyeliğiniz donduruldu. Kapı açılmaz; açtırmak için resepsiyona uğrayın.' : '';
  return `<section class="uye">
    <header class="uye-ust">
      <p class="etiket">${k(salon)}</p>
      <button type="button" class="btn btn-kucuk btn-hayalet" data-degistir>Üyeyi değiştir</button>
    </header>
    <div class="uye-kimlik">
      <h1>${k(uye.ad)}</h1>
      <p class="uye-durum"><span class="cip ${DURUM[d.durum].sinif}">${DURUM[d.durum].etiket}</span>
        <span>${k(kalanMetni(d.kalanGun))} · bitiş ${k(tarihTR(uye.bitis))}</span></p>
    </div>
    ${uyari ? `<p class="uye-uyari">${k(uyari)}</p>` : ''}
    <div class="sekmeler" role="tablist" aria-label="Bölümler">
      <button type="button" role="tab" id="t-giris" aria-controls="p-giris" aria-selected="true">Giriş</button>
      <button type="button" role="tab" id="t-program" aria-controls="p-program" aria-selected="false" tabindex="-1">Programım</button>
      <button type="button" role="tab" id="t-beslenme" aria-controls="p-beslenme" aria-selected="false" tabindex="-1">Beslenme</button>
    </div>
    <div class="sekme" role="tabpanel" id="p-giris" aria-labelledby="t-giris">
      <div class="qr-kart">
        <div class="qr-alan" data-qr aria-label="Giriş QR kodu"></div>
        <div class="geri-sayim" aria-hidden="true"><span data-bar></span></div>
        <p class="qr-not"><b data-sn>30</b> sn sonra yeni kod · ekran görüntüsü çalışmaz</p>
      </div>
      <div class="yedek-kutu">
        <span class="etiket">QR okunmazsa yedek kod</span>
        <span class="sayi yedek-sayi" data-yedek>······</span>
      </div>
      <p class="uye-aciklama kucuk">Ekran parlaklığını açın ve telefonu turnikedeki okuyucuya 20–30 cm uzaktan gösterin.</p>
    </div>
    <div class="sekme" role="tabpanel" id="p-program" aria-labelledby="t-program" hidden>
      <div class="icerik-kart">
        <p class="etiket">Bugün · Gün A · Üst vücut</p>
        <ol class="program">${PROGRAM.map(([h, s]) => `<li><span>${h}</span><span class="sayi">${s}</span></li>`).join('')}</ol>
        <p class="uye-aciklama kucuk">Programı antrenörünüz panelden yükler. Bu örnek içeriktir.</p>
      </div>
    </div>
    <div class="sekme" role="tabpanel" id="p-beslenme" aria-labelledby="t-beslenme" hidden>
      <div class="icerik-kart">
        <p class="etiket">Sonraki aşama</p>
        <ul class="beslenme">${BESLENME.map(([o, i]) => `<li><b>${o}</b><span>${i}</span></li>`).join('')}</ul>
        <p class="uye-aciklama kucuk">Bu bölümü antrenörünüz ya da diyetisyeniniz doldurur, uygulama yalnız gösterir. Örnek içeriktir; sağlık verisi ayrı izinle tutulur.</p>
      </div>
    </div>
  </section>`;
}

function sekmeleriBagla(kok) {
  const sekmeler = [...kok.querySelectorAll('[role="tab"]')];
  const sec = (hedef) => {
    sekmeler.forEach((t) => {
      const secili = t === hedef;
      t.setAttribute('aria-selected', String(secili));
      t.tabIndex = secili ? 0 : -1;
      kok.querySelector(`#${t.getAttribute('aria-controls')}`).hidden = !secili;
    });
    hedef.focus();
  };
  sekmeler.forEach((t, i) => {
    t.addEventListener('click', () => sec(t));
    t.addEventListener('keydown', (e) => {
      const yon = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (yon) sec(sekmeler[(i + yon + sekmeler.length) % sekmeler.length]);
    });
  });
}

export function uyeAc(kok) {
  const salon = salonAdi();
  let kilit = null;

  const adresUye = adrestenUye();
  if (adresUye) {
    uyeKaydet(adresUye);
    history.replaceState(null, '', `${location.pathname}?${new URLSearchParams({ salon })}#/uye`);
  }
  const kayitli = kayitliUye();
  const uye = kayitli && ID_RE.test(kayitli.id) ? tazeUye(kayitli) : null;

  // Yeniden çizimi yönlendiriciye bırak: o, önce bu ekranın zamanlayıcılarını kapatır.
  const yenidenAc = () => window.dispatchEvent(new HashChangeEvent('hashchange'));

  if (!uye) {
    kok.innerHTML = secimSablonu(salon);
    kok.querySelectorAll('[data-sec]').forEach((b) => b.addEventListener('click', () => {
      const secilen = tohumUyeler().find((u) => u.id === b.dataset.sec);
      if (secilen) { uyeKaydet(secilen); yenidenAc(); }
    }));
    return () => {};
  }

  kok.innerHTML = uyeSablonu(uye, salon);
  sekmeleriBagla(kok);
  kok.querySelector('[data-degistir]').addEventListener('click', () => { uyeUnut(); yenidenAc(); });

  // Öğeleri bir kez yakala: ekran değişirse eski döngü yeni ekrana yazamasın.
  const qrYeri = kok.querySelector('[data-qr]');
  const yedekYeri = kok.querySelector('[data-yedek]');
  const bar = kok.querySelector('[data-bar]');
  const sn = kok.querySelector('[data-sn]');
  let kapandi = false;
  let sonraki = null;

  async function yenile() {
    clearTimeout(sonraki);
    const simdi = Date.now();
    try {
      const [metin, kod] = await Promise.all([qrMetni(uye.id, simdi), yedekKod(uye.id, simdi)]);
      if (kapandi) return;
      qrYeri.innerHTML = qrSvg(metin, { ecc: 'M', baslik: 'Giriş QR kodu' });
      yedekYeri.textContent = `${kod.slice(0, 3)} ${kod.slice(3)}`;
    } catch (hata) {
      if (kapandi) return;
      qrYeri.innerHTML = `<p class="uye-uyari">${k(hata.message)}</p>`;
    }
    const kalan = pencereKalanMs(simdi);
    bar.style.transition = 'none';
    bar.style.transform = `scaleX(${kalan / PENCERE_MS})`;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      bar.style.transition = azHareket() ? 'none' : `transform ${kalan}ms linear`;
      bar.style.transform = 'scaleX(0)';
    }));
    sonraki = setTimeout(yenile, kalan + 50);
  }

  const saniye = () => { sn.textContent = String(Math.ceil(pencereKalanMs(Date.now()) / 1000)); };
  const snZamanlayici = setInterval(saniye, 500);
  // Telefon kilitlenip açılınca zamanlayıcı gecikmiş olabilir: görünür olur olmaz tazele.
  const gorunurluk = async () => {
    if (document.visibilityState !== 'visible' || kapandi) return;
    yenile();
    try { kilit = await navigator.wakeLock?.request('screen'); } catch { kilit = null; }
  };
  document.addEventListener('visibilitychange', gorunurluk);
  saniye();
  yenile();
  gorunurluk();

  return () => {
    kapandi = true;
    clearTimeout(sonraki);
    clearInterval(snZamanlayici);
    document.removeEventListener('visibilitychange', gorunurluk);
    kilit?.release?.();
  };
}
