// Kapı ekranı: laptop kamerası QR'ı okur (jsQR) ya da USB okuyucu klavye gibi yazar; karar verir, kaydeder.
import { qrDogrula, qrCoz, yedekKodBul } from './kod.js';
import { kapiKarari } from './kural.js';
import { durumYukle, hareketEkle, degisiklikDinle, salonAdi } from './veri.js';
import { k, saatTR, sesiAc, bip, RED_ETIKET } from './ui.js';
import { satirToplayici } from './okuyucu.js';
import { SERI_SABLONU, seriBolumuKur } from './kapi-seri.js';

const TARAMA_ARALIGI_MS = 120;
const SONUC_SURESI_MS = 2600;
const AYNI_KOD_BEKLEME_MS = 8000; // kamerada bekleyen aynı metin tekrar tekrar işlenmesin
// Geçen üyenin QR'ı bu süre boyunca sessizce yok sayılır: telefon kamerada bekletilince
// "geçti"nin hemen ardından "zaten içeride" kırmızısı çıkmasın. Yalnız geçişte kurulur;
// red sonrası (ör. ekran görüntüsü) gösterilen canlı QR hemen okunur.
const UYE_SESSIZ_MS = 10_000;
const OKUYUCU_TUS_ARASI_MS = 300; // USB okuyucu bundan hızlı yazar; insan yazarsa tampon sıfırlanır
const TARAMA_GENISLIGI = 720;

const SABLON = `
<section class="kapi">
  <header class="kapi-ust">
    <div class="kapi-marka"><span class="etiket">Kapı · Turnike 1</span><strong data-salon></strong></div>
    <div class="mod-secici" role="group" aria-label="Okutma yönü">
      <button type="button" data-mod="giris" aria-pressed="true">Giriş</button>
      <button type="button" data-mod="cikis" aria-pressed="false">Çıkış</button>
    </div>
    <p class="kapi-saat sayi" data-saat aria-label="Saat"></p>
    <a class="btn btn-kucuk kapi-link" href="#/panel" target="_blank" rel="noopener">Panel ↗</a>
  </header>
  <div class="kapi-govde">
    <div class="kamera">
      <video playsinline muted aria-label="Kamera görüntüsü"></video>
      <div class="kamera-cerceve" aria-hidden="true"><i></i><i></i><i></i><i></i><b class="tarama-cizgi"></b></div>
      <div class="kamera-baslat" data-baslat>
        <p class="etiket">Bu bilgisayar kapı olacak</p>
        <h2>QR okumak için kamerayı açın</h2>
        <button type="button" class="btn btn-ana" data-kamera>Kamerayı başlat</button>
        <p class="ipucu" data-kamera-hata></p>
        <p class="ipucu">USB QR okuyucu takılıysa kameraya gerek yok, doğrudan okutun.</p>
      </div>
      <select class="kamera-sec girdi" data-kamera-sec hidden aria-label="Kamera seç"></select>
    </div>
    <aside class="kapi-yan">
      <div class="bekleme">
        <p class="etiket" data-mod-etiket>Giriş · hazır</p>
        <h1>QR'ınızı kameraya gösterin</h1>
        <p class="kapi-alt">Telefonun parlaklığını açın, ekranı kameraya 20–30 cm uzaktan tutun.</p>
      </div>
      <form class="yedek" data-yedek>
        <label for="yedek-kod" class="etiket">QR okunmazsa · 6 haneli yedek kod</label>
        <div class="yedek-satir">
          <input id="yedek-kod" class="girdi" inputmode="numeric" autocomplete="off" maxlength="6" placeholder="000000">
          <button class="btn btn-ana" type="submit">Onayla</button>
        </div>
      </form>${SERI_SABLONU}
      <div class="son-gecisler"><p class="etiket">Son okutmalar</p><ol data-son></ol></div>
    </aside>
  </div>
  <div class="sonuc" data-sonuc aria-hidden="true">
    <div class="sonuc-ic">
      <div class="sonuc-ikon" aria-hidden="true"></div>
      <p class="sonuc-baslik" data-sonuc-baslik></p>
      <p class="sonuc-alt" data-sonuc-alt></p>
      <p class="sonuc-turnike" data-sonuc-turnike></p>
    </div>
  </div>
  <p class="sr" role="status" aria-live="assertive" data-duyuru></p>
</section>`;

export function kapiAc(kok) {
  kok.innerHTML = SABLON;
  const $ = (s) => kok.querySelector(s);
  const video = $('video');
  const tuval = document.createElement('canvas');
  const ctx = tuval.getContext('2d', { willReadFrequently: true });
  const s = {
    mod: 'giris', akis: null, tarama: null, mesgul: false, sonMetin: '', sonZaman: 0,
    tusSon: 0, kilit: null, zamanlar: [], sessiz: new Map(),
  };
  // USB okuyucu: klavye gibi yazan (HID) ve sanal COM portu olan türler aynı toplayıcı mantığıyla;
  // okuyucu Enter göndermese de geçerli QR kısa bir sessizlikten sonra işlenir.
  const gecerliMi = (t) => qrCoz(t) !== null;
  const okuyucudan = (metin) => isle(metin, 'okuyucu');
  const klavye = satirToplayici(okuyucudan, { gecerliMi });

  const salonuYaz = () => { $('[data-salon]').textContent = salonAdi(); };
  const saatiYaz = () => { $('[data-saat]').textContent = saatTR(Date.now()); };
  salonuYaz();
  saatiYaz();
  s.zamanlar.push(setInterval(saatiYaz, 10_000));

  function sonListesi(durum = durumYukle()) {
    const adlar = new Map(durum.uyeler.map((u) => [u.id, u.ad]));
    const son = durum.hareketler.filter((h) => h.kaynak !== 'tohum').slice(-6).reverse();
    $('[data-son]').innerHTML = son.length
      ? son.map((h) => `<li class="${h.sonuc === 'gecti' ? 'iyi' : 'kotu'}"><span class="sayi">${saatTR(h.zaman)}</span>
          <span>${k(adlar.get(h.uyeId) || 'Bilinmeyen')}</span>
          <span>${h.sonuc === 'gecti' ? (h.tip === 'cikis' ? 'Çıkış' : 'Geçti') : k(RED_ETIKET[h.sebep] || 'Red')}</span></li>`).join('')
      : '<li class="bos">Henüz okutma yok. İlk QR\'ı gösterin.</li>';
  }
  sonListesi();
  const dinlemeyiBirak = degisiklikDinle((d) => { salonuYaz(); sonListesi(d); });

  function sonucGoster(karar) {
    const kutu = $('[data-sonuc]');
    kutu.className = `sonuc ${karar.gecti ? 'sonuc-ok' : 'sonuc-red'} acik`;
    kutu.setAttribute('aria-hidden', 'false');
    $('[data-sonuc-baslik]').textContent = karar.baslik;
    $('[data-sonuc-alt]').textContent = karar.alt;
    $('[data-sonuc-turnike]').textContent = karar.gecti ? 'Turnike açıldı · 1 tur' : 'Turnike kilitli';
    $('[data-duyuru]').textContent = `${karar.baslik}. ${karar.alt}`;
    bip(karar.gecti);
    sonListesi();
    s.zamanlar.push(setTimeout(() => {
      kutu.classList.remove('acik');
      kutu.setAttribute('aria-hidden', 'true');
      s.mesgul = false;
    }, SONUC_SURESI_MS));
  }

  async function isle(ham, kaynak) {
    const metin = String(ham).trim();
    const simdi = Date.now();
    if (!metin || s.mesgul) return;
    if (metin === s.sonMetin && simdi - s.sonZaman < AYNI_KOD_BEKLEME_MS) return;
    s.sonMetin = metin;
    s.sonZaman = simdi;
    s.mesgul = true;
    try {
      const durum = durumYukle(simdi);
      let dogrulama;
      if (/^\d{6}$/.test(metin)) {
        const id = await yedekKodBul(metin, durum.uyeler.map((u) => u.id), simdi);
        dogrulama = id ? { gecerli: true, uyeId: id } : { gecerli: false, sebep: 'bicim' };
      } else {
        dogrulama = await qrDogrula(metin, simdi);
      }
      if (kaynak === 'kamera' && dogrulama.uyeId && (s.sessiz.get(dogrulama.uyeId) || 0) > simdi) {
        s.mesgul = false;
        return;
      }
      const uye = durum.uyeler.find((u) => u.id === dogrulama.uyeId) || null;
      const karar = kapiKarari({ uye, dogrulama, mod: s.mod, hareketler: durum.hareketler, simdi });
      // Kameraya giren yabancı bir QR (ürün etiketi vb.) üye hareketi değildir: ekranda gösterilir, kayda girmez.
      if (!(kaynak === 'kamera' && karar.sebep === 'bicim')) {
        hareketEkle({
          uyeId: karar.uyeId ?? dogrulama.uyeId ?? null, tip: s.mod, sonuc: karar.gecti ? 'gecti' : 'red',
          sebep: karar.sebep, zaman: simdi, kaynak,
        });
      }
      if (karar.gecti && dogrulama.uyeId) s.sessiz.set(dogrulama.uyeId, simdi + UYE_SESSIZ_MS);
      sonucGoster(karar);
    } catch (hata) {
      sonucGoster({ gecti: false, baslik: 'Doğrulama yapılamadı', alt: hata.message });
    }
  }

  function tara() {
    if (!s.akis) return;
    if (!s.mesgul && video.readyState >= 2 && video.videoWidth) {
      const olcek = Math.min(1, TARAMA_GENISLIGI / video.videoWidth);
      const w = Math.round(video.videoWidth * olcek);
      const h = Math.round(video.videoHeight * olcek);
      if (tuval.width !== w) { tuval.width = w; tuval.height = h; }
      ctx.drawImage(video, 0, 0, w, h);
      const kare = ctx.getImageData(0, 0, w, h);
      const bulunan = globalThis.jsQR(kare.data, w, h, { inversionAttempts: 'dontInvert' });
      if (bulunan?.data) isle(bulunan.data, 'kamera');
    }
    s.tarama = setTimeout(tara, TARAMA_ARALIGI_MS);
  }

  function akisiDurdur() {
    clearTimeout(s.tarama);
    s.akis?.getTracks().forEach((t) => t.stop());
    s.akis = null;
  }

  async function kameralariListele(seciliId) {
    const secim = $('[data-kamera-sec]');
    const cihazlar = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
    secim.hidden = cihazlar.length < 2;
    secim.innerHTML = cihazlar.map((d, i) => `<option value="${k(d.deviceId)}" ${d.deviceId === seciliId ? 'selected' : ''}>${k(d.label || `Kamera ${i + 1}`)}</option>`).join('');
  }

  let kapandi = false;

  async function kameraBaslat(cihazId) {
    sesiAc();
    const hataYeri = $('[data-kamera-hata]');
    if (!navigator.mediaDevices?.getUserMedia) {
      hataYeri.textContent = 'Bu tarayıcı kameraya erişemiyor. Chrome ya da Edge kullanın.';
      return;
    }
    try {
      akisiDurdur();
      const kisit = cihazId ? { deviceId: { exact: cihazId } } : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } };
      const akis = await navigator.mediaDevices.getUserMedia({ video: kisit, audio: false });
      // İzin beklenirken sayfadan çıkıldıysa kamerayı açık bırakma.
      if (kapandi) { akis.getTracks().forEach((t) => t.stop()); return; }
      s.akis = akis;
      video.srcObject = s.akis;
      await video.play();
      $('[data-baslat]').hidden = true;
      kok.querySelector('.kamera').classList.add('acik');
      await kameralariListele(s.akis.getVideoTracks()[0]?.getSettings().deviceId);
      ekranAcikTut();
      tara();
    } catch (hata) {
      hataYeri.textContent = hata.name === 'NotAllowedError'
        ? 'Kamera izni verilmedi. Adres çubuğundaki kamera simgesinden izin verip tekrar deneyin.'
        : 'Kamera açılamadı. Başka bir uygulama kullanıyor olabilir.';
    }
  }

  async function ekranAcikTut() {
    try { s.kilit = await navigator.wakeLock?.request('screen'); } catch { s.kilit = null; }
  }

  function modSec(mod) {
    s.mod = mod;
    s.sessiz.clear();
    s.sonMetin = '';
    kok.querySelectorAll('[data-mod]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mod === mod)));
    $('[data-mod-etiket]').textContent = mod === 'giris' ? 'Giriş · hazır' : 'Çıkış · hazır';
    kok.querySelector('.kapi').classList.toggle('mod-cikis', mod === 'cikis');
  }

  function tus(e) {
    if (e.target instanceof Element && e.target.closest('input, select, textarea')) return;
    const simdi = performance.now();
    if (simdi - s.tusSon > OKUYUCU_TUS_ARASI_MS) klavye.sifirla();
    s.tusSon = simdi;
    if (e.key === 'Enter') {
      // Okuyucunun Enter'ı, odaktaki düğmeyi ya da bağlantıyı da tetiklemesin.
      if (klavye.ekle('\n') > 0) e.preventDefault();
    } else if (e.key.length === 1) {
      klavye.ekle(e.key);
    }
  }

  $('[data-kamera]').addEventListener('click', () => kameraBaslat());
  $('[data-kamera-sec]').addEventListener('change', (e) => kameraBaslat(e.target.value));
  kok.querySelectorAll('[data-mod]').forEach((b) => b.addEventListener('click', () => modSec(b.dataset.mod)));
  $('[data-yedek]').addEventListener('submit', (e) => {
    e.preventDefault();
    sesiAc();
    const girdi = $('#yedek-kod');
    isle(girdi.value.replace(/\D/g, ''), 'yedek-kod');
    girdi.value = '';
  });
  document.addEventListener('keydown', tus);
  const seriyiKapat = seriBolumuKur(kok, { teslim: okuyucudan, gecerliMi });
  const gorunurluk = () => { if (document.visibilityState === 'visible' && s.akis) ekranAcikTut(); };
  document.addEventListener('visibilitychange', gorunurluk);

  return () => {
    kapandi = true;
    klavye.sifirla();
    seriyiKapat();
    dinlemeyiBirak();
    akisiDurdur();
    s.zamanlar.forEach((z) => { clearInterval(z); clearTimeout(z); });
    s.kilit?.release?.();
    document.removeEventListener('keydown', tus);
    document.removeEventListener('visibilitychange', gorunurluk);
  };
}
