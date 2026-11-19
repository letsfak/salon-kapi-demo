// Giriş sayfası: demonun üç ekranı ve teklif. Üye ekranı telefonda QR okutarak açılır.
import { salonAdi } from './veri.js';
import { k, qrSvg, tabanAdres } from './ui.js';

export function girisAc(kok) {
  const salon = salonAdi();
  const uyeAdresi = `${tabanAdres()}?${new URLSearchParams({ salon })}#/uye`;
  kok.innerHTML = `
  <section class="giris">
    <header class="giris-ust">
      <p class="etiket">Salon Kapı · ${k(salon)}</p>
      <h1>Telefonu göster, geç.<br><span>Süresi biten giremez.</span></h1>
      <p class="giris-ozet">Mevcut turnikeniz değişmez. Üye telefonundaki QR'ı okutur, kapı üyeliği kontrol eder, panel kimin içeride olduğunu ve kimin süresinin bittiğini gösterir.</p>
    </header>
    <div class="roller">
      <a class="rol rol-kapi" href="#/kapi">
        <span class="rol-no">01</span>
        <span class="etiket">Bu bilgisayarda</span>
        <span class="rol-ad">Kapı ekranı</span>
        <span class="rol-alt">Kamera QR'ı okur, yeşil ya da kırmızı yanar. USB okuyucu takılınca aynı ekran çalışır.</span>
      </a>
      <div class="rol rol-uye">
        <span class="rol-no">02</span>
        <span class="etiket">Telefonda</span>
        <span class="rol-ad">Üye ekranı</span>
        <span class="rol-alt">Telefonun kamerasıyla okutun; 30 saniyede bir değişen QR açılır.</span>
        <div class="rol-qr">${qrSvg(uyeAdresi, { ecc: 'L', hucre: 5, baslik: 'Üye ekranını telefonda aç' })}</div>
        <a class="rol-link" href="#/uye">Bu cihazda aç →</a>
      </div>
      <a class="rol rol-panel" href="#/panel">
        <span class="rol-no">03</span>
        <span class="etiket">Resepsiyonda</span>
        <span class="rol-ad">Sahip paneli</span>
        <span class="rol-alt">İçeride kim var, kapıda kim engellendi, kimin süresi bitiyor. Üye ekle, uzat, dondur.</span>
      </a>
    </div>
    <a class="teklif-serit" href="#/teklif">
      <span class="etiket">Pilot</span>
      <span>Kurulum bedeli deneme bittikten sonra · turnikeye zarar gelirse masraf bizde · eski kartlar yedek</span>
      <span aria-hidden="true">→</span>
    </a>
    <p class="giris-not">Bu demo sahte üyelerle çalışır; veriler yalnız bu tarayıcıda durur, bir yere gönderilmez.</p>
  </section>`;
  return () => {};
}
