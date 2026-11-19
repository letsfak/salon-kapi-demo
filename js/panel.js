// Sahip paneli: içeridekiler, kapıda engellenenler, süresi bitenler, üye işlemleri. Kapı ekranıyla canlı eşitlenir.
import { uyeDurumu, iceridekiler } from './kural.js';
import {
  durumYukle, degisiklikDinle, uyeEkle, uzat, dondurDegistir, suresiniBitir, cikisYap, sifirla,
  salonAdi, salonAdiKaydet, PAKETLER,
} from './veri.js';
import { k, saatTR, tarihTR, basHarfler, kalanMetni, DURUM, RED_ETIKET, qrSvg, uyeLinki } from './ui.js';
import { PANEL_SABLONU } from './panel-sablon.js';

const HATIRLATMA_GECMIS_GUN = 30;
const LISTE_HAREKET = 30;

const gunBasi = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const trSirala = (a, b) => a.ad.localeCompare(b.ad, 'tr');

function hatirlatmaMetni(uye, salon) {
  const d = uyeDurumu(uye);
  const ne = d.kalanGun < 0 ? `${tarihTR(uye.bitis)} tarihinde bitti` : `${tarihTR(uye.bitis)} tarihinde bitiyor`;
  return `Merhaba ${uye.ad.split(' ')[0]}, ${salon} üyeliğiniz ${ne}. Yenilemek için resepsiyona uğrayabilir ya da bu mesaja yazabilirsiniz.`;
}

function kpiCiz($, durum, simdi) {
  const bugun = durum.hareketler.filter((h) => h.zaman >= gunBasi(simdi));
  const iceride = iceridekiler(durum.hareketler, simdi);
  const adlar = new Map(durum.uyeler.map((u) => [u.id, u.ad]));
  const redler = bugun.filter((h) => h.sonuc === 'red');
  const kirilim = Object.entries(redler.reduce((m, h) => ({ ...m, [h.sebep]: (m[h.sebep] || 0) + 1 }), {}))
    .sort((a, b) => b[1] - a[1]);

  $('[data-iceride-sayi]').textContent = iceride.size;
  $('[data-iceride-liste]').innerHTML = [...iceride.keys()].slice(0, 12)
    .map((id) => `<li title="${k(adlar.get(id) || id)}">${k(basHarfler(adlar.get(id)))}</li>`).join('');
  $('[data-engel-sayi]').textContent = redler.length;
  $('[data-engel-kirilim]').innerHTML = kirilim.length
    ? kirilim.map(([s, n]) => `<li><span>${k(RED_ETIKET[s] || s)}</span><b class="sayi">${n}</b></li>`).join('')
    : '<li><span>Bugün engellenen yok</span></li>';
  $('[data-giris-sayi]').textContent = bugun.filter((h) => h.tip === 'giris' && h.sonuc === 'gecti').length;
  $('[data-bitiyor-sayi]').textContent = durum.uyeler.filter((u) => uyeDurumu(u, simdi).durum === 'bitiyor').length;
}

function hareketCiz($, durum) {
  const adlar = new Map(durum.uyeler.map((u) => [u.id, u.ad]));
  const KAYNAK = { kamera: 'kamera', okuyucu: 'okuyucu', 'yedek-kod': 'yedek kod', panel: 'panel' };
  $('[data-hareketler]').innerHTML = durum.hareketler.slice(-LISTE_HAREKET).reverse().map((h) => {
    const etiket = h.sonuc === 'red' ? `<span class="cip cip-red">${k(RED_ETIKET[h.sebep] || 'Red')}</span>`
      : h.tip === 'cikis' ? '<span class="cip cip-notr">Çıkış</span>' : '<span class="cip cip-ok">Giriş</span>';
    return `<li class="${h.sonuc === 'red' ? 'red' : ''}"><span class="sayi">${saatTR(h.zaman)}</span>
      <span class="hareket-ad">${k(adlar.get(h.uyeId) || 'Bilinmeyen')}${KAYNAK[h.kaynak] ? ` <small>${KAYNAK[h.kaynak]}</small>` : ''}</span>${etiket}</li>`;
  }).join('') || '<li class="bos">Henüz hareket yok.</li>';
}

function hatirlatCiz($, durum, salon, simdi) {
  const liste = durum.uyeler
    .map((u) => ({ u, d: uyeDurumu(u, simdi) }))
    .filter(({ d }) => d.durum === 'bitiyor' || (d.durum === 'bitti' && d.kalanGun >= -HATIRLATMA_GECMIS_GUN))
    .sort((a, b) => a.d.kalanGun - b.d.kalanGun);
  $('[data-hatirlat]').innerHTML = liste.map(({ u, d }) => `<li>
      <div><b>${k(u.ad)}</b><span class="cip ${DURUM[d.durum].sinif}">${k(kalanMetni(d.kalanGun))}</span></div>
      <div class="satir-islem">
        <a class="btn btn-kucuk" href="https://wa.me/?text=${encodeURIComponent(hatirlatmaMetni(u, salon))}" target="_blank" rel="noopener">WhatsApp'tan hatırlat</a>
        <button type="button" class="btn btn-kucuk" data-islem="uzat" data-id="${k(u.id)}">+1 ay</button>
      </div></li>`).join('') || '<li class="bos">Süresi biten ya da bitmek üzere olan üye yok.</li>';
}

function uyelerCiz($, durum, arama, simdi) {
  const iceride = iceridekiler(durum.hareketler, simdi);
  const terim = arama.trim().toLocaleLowerCase('tr-TR');
  const liste = [...durum.uyeler].sort(trSirala).filter((u) => !terim || u.ad.toLocaleLowerCase('tr-TR').includes(terim));
  $('[data-uye-sayi]').textContent = `(${durum.uyeler.length})`;
  $('[data-uyeler]').innerHTML = liste.map((u) => {
    const d = uyeDurumu(u, simdi);
    const ic = iceride.has(u.id);
    return `<tr>
      <td data-baslik="Üye"><b>${k(u.ad)}</b>${ic ? ' <span class="cip cip-ok">içeride</span>' : ''}<small>${k(u.tel || '')}</small></td>
      <td data-baslik="Paket">${k(u.paketAy)} ay</td>
      <td data-baslik="Bitiş">${k(tarihTR(u.bitis))}</td>
      <td data-baslik="Durum"><span class="cip ${DURUM[d.durum].sinif}">${DURUM[d.durum].etiket}</span><small>${k(kalanMetni(d.kalanGun))}</small></td>
      <td class="islemler"><div class="islem-grup">
        <button type="button" class="btn btn-kucuk" data-islem="uzat" data-id="${k(u.id)}">+1 ay</button>
        <button type="button" class="btn btn-kucuk" data-islem="dondur" data-id="${k(u.id)}">${u.donduruldu ? 'Çöz' : 'Dondur'}</button>
        <button type="button" class="btn btn-kucuk" data-islem="bitir" data-id="${k(u.id)}" title="Demo: süreyi dün bitmiş yap">Bitir</button>
        ${ic ? `<button type="button" class="btn btn-kucuk" data-islem="cikis" data-id="${k(u.id)}">Çıkış</button>` : ''}
        <button type="button" class="btn btn-kucuk btn-koyu" data-islem="telefon" data-id="${k(u.id)}">Telefona aç</button>
      </div></td></tr>`;
  }).join('') || '<tr><td colspan="5" class="bos">Aramayla eşleşen üye yok.</td></tr>';
}

export function panelAc(kok) {
  kok.innerHTML = PANEL_SABLONU(PAKETLER);
  const $ = (s) => kok.querySelector(s);
  let arama = '';
  const zamanlar = [];

  function ciz(durum = durumYukle()) {
    const simdi = Date.now();
    const salon = salonAdi();
    $('[data-salon-ad]').textContent = salon;
    $('[data-saat]').textContent = saatTR(simdi);
    kpiCiz($, durum, simdi);
    hareketCiz($, durum);
    hatirlatCiz($, durum, salon, simdi);
    uyelerCiz($, durum, arama, simdi);
  }

  function bildir(metin) {
    const b = document.createElement('div');
    b.className = 'bildirim';
    b.setAttribute('role', 'status');
    b.textContent = metin;
    document.body.append(b);
    zamanlar.push(setTimeout(() => b.remove(), 2400));
  }

  function telefonaAc(id) {
    const uye = durumYukle().uyeler.find((u) => u.id === id);
    if (!uye) return;
    const link = uyeLinki(uye, salonAdi());
    $('[data-dialog-ad]').textContent = uye.ad;
    $('[data-dialog-qr]').innerHTML = qrSvg(link, { ecc: 'L', hucre: 6, baslik: `${uye.ad} için üye ekranı bağlantısı` });
    $('[data-dialog-link]').href = link;
    $('[data-dialog]').showModal();
  }

  const ISLEM = {
    uzat: (id) => { uzat(id, 1); bildir('Üyelik 1 ay uzatıldı'); },
    dondur: (id) => { dondurDegistir(id); bildir('Dondurma durumu değişti'); },
    bitir: (id) => { suresiniBitir(id); bildir('Üyelik bitti olarak işaretlendi. Bu üyenin QR\'ı artık kapıda reddedilir.'); },
    cikis: (id) => { cikisYap(id); bildir('Çıkış kaydedildi'); },
    telefon: telefonaAc,
  };

  // Dinleyici sayfayla birlikte silinen .panel öğesine bağlı; kök öğeye bağlansaydı her açılışta birikirdi.
  $('.panel').addEventListener('click', (e) => {
    const b = e.target.closest('[data-islem]');
    if (!b) return;
    ISLEM[b.dataset.islem]?.(b.dataset.id);
    if (b.dataset.islem !== 'telefon') ciz();
  });

  $('[data-ara]').addEventListener('input', (e) => { arama = e.target.value; ciz(); });
  $('[data-ekle-ac]').addEventListener('click', () => {
    const f = $('[data-ekle]');
    f.hidden = !f.hidden;
    if (!f.hidden) f.querySelector('input').focus();
  });
  $('[data-ekle]').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const ad = String(f.get('ad') || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    const tel = String(f.get('tel') || '').replace(/[^\d +]/g, '').slice(0, 20);
    const paketAy = Number(f.get('paket'));
    if (ad.length < 2 || !PAKETLER.includes(paketAy)) { bildir('Ad en az 2 harf olmalı'); return; }
    const id = uyeEkle({ ad, tel, paketAy });
    e.target.reset();
    e.target.hidden = true;
    ciz();
    telefonaAc(id);
  });
  $('[data-dialog-kapat]').addEventListener('click', () => $('[data-dialog]').close());
  $('[data-dialog-kopyala]').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('[data-dialog-link]').href); bildir('Bağlantı kopyalandı'); } catch { bildir('Kopyalanamadı; bağlantıya uzun basın'); }
  });
  $('[data-sifirla]').addEventListener('click', () => {
    if (window.confirm('Demo verisi bugünün başlangıç haline dönsün mü? Eklenen üyeler ve okutmalar silinir.')) { sifirla(); ciz(); bildir('Demo sıfırlandı'); }
  });
  $('[data-ayar]').addEventListener('click', () => {
    const yeni = window.prompt('Salonun adı (ekranlarda görünür):', salonAdi());
    const temiz = String(yeni ?? '').trim().slice(0, 40);
    if (temiz) { salonAdiKaydet(temiz); ciz(); }
  });

  const dinlemeyiBirak = degisiklikDinle(ciz);
  ciz();
  zamanlar.push(setInterval(() => ciz(), 30_000));

  return () => {
    dinlemeyiBirak();
    zamanlar.forEach((z) => { clearInterval(z); clearTimeout(z); });
  };
}
