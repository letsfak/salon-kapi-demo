// Basit yönlendirici: #/ (giriş), #/kapi, #/uye, #/panel, #/teklif.
import { girisAc } from './giris.js';
import { kapiAc } from './kapi.js';
import { uyeAc } from './uye.js';
import { panelAc } from './panel.js';
import { teklifAc } from './teklif.js';

const SAYFALAR = {
  '': { ac: girisAc, baslik: 'Salon Kapı · Demo' },
  kapi: { ac: kapiAc, baslik: 'Kapı · Salon Kapı' },
  uye: { ac: uyeAc, baslik: 'Üye · Salon Kapı' },
  panel: { ac: panelAc, baslik: 'Panel · Salon Kapı' },
  teklif: { ac: teklifAc, baslik: 'Pilot teklifi · Salon Kapı' },
};

const kok = document.getElementById('uygulama');
let kapat = null;

function serit() {
  if (document.querySelector('.demo-serit')) return;
  const s = document.createElement('div');
  s.className = 'demo-serit';
  s.textContent = 'Demo · sahte veri';
  document.body.append(s);
}

function git() {
  const ad = location.hash.replace(/^#\/?/, '').split(/[?/]/)[0];
  const sayfa = SAYFALAR[ad] || SAYFALAR[''];
  if (typeof kapat === 'function') kapat();
  kok.replaceChildren();
  document.body.className = `sayfa-${ad || 'giris'}`;
  document.title = sayfa.baslik;
  try {
    kapat = sayfa.ac(kok);
  } catch (hata) {
    kapat = null;
    kok.innerHTML = '<div class="hata-kutu"><h2>Bir şey ters gitti</h2><p>Sayfayı yenileyin. Sorun sürerse farklı bir tarayıcı deneyin.</p></div>';
    console.error(hata);
  }
  window.scrollTo(0, 0);
}

serit();
window.addEventListener('hashchange', git);
git();
