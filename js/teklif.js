// Tek sayfalık pilot teklifi. Yazdırılabilir. Fiyat bilerek yok: görüşmede belirlenir.
import { salonAdi } from './veri.js';
import { k } from './ui.js';

const SOZLER = [
  ['Kurulum bedeli deneme bittikten sonra', 'İki hafta deneriz. Memnunsanız kurulum bedeli o zaman alınır. Memnun değilseniz bağlantıyı sökeriz, turnike eski haline döner, ücret yok.'],
  ['Turnikeye zarar gelirse masraf bizde', 'Bizim bağlantımızdan kaynaklanan bir arızada tamir ya da değişim masrafını üstleniriz; bunu yazılı veririz. Turnikeyi kuran bayinizle birlikte kurmaya da açığız.'],
  ['Eski kartlar yedek kalır', 'Mevcut kart sisteminiz çalışmaya devam eder. Kapı tek bir sisteme bağlı kalmaz; bir sorun olursa kartla geçiş sürer.'],
  ['Arızada aynı gün', 'Trabzon içinde arıza bildiriminde aynı gün gelinir.'],
  ['Veri sizin, biyometrik yok', 'Üye verileri salonunuza aittir. Parmak izi ya da yüz kullanılmaz. KVKK için veri işleyen sözleşmesi imzalanır.'],
];

const KURULAN = [
  'Turnikenin üstüne bir QR okuyucu',
  'Turnike kartının "aç" girişine paralel küçük bir röle (mevcut kablolar sökülmez)',
  'Kapı bilgisayarı: internet kesilse de çalışır',
  'Üye ekranı: telefonda link olarak açılır, mağazadan indirme yok',
  'Sahip paneli: içeridekiler, engellenen girişler, süresi bitenler, WhatsApp hatırlatma',
];

const OLCULER = ['Kapıda engellenen giriş sayısı (süresi bitmiş, paylaşılan QR)', 'Süresi biten üyelerden kaçının yenilediği', 'Başarısız okuma ve arıza sayısı'];

export function teklifAc(kok) {
  const salon = salonAdi();
  kok.innerHTML = `
  <article class="teklif">
    <header class="teklif-ust">
      <p class="etiket">Salon Kapı · pilot teklifi</p>
      <h1>${k(salon)} için iki haftalık deneme</h1>
      <p class="teklif-ozet">Turnikeniz değişmez. Üyeleriniz telefonla geçer, süresi biten üye kapıdan geçemez, kart paylaşımı biter.</p>
    </header>
    <section class="teklif-bolum">
      <h2>Sözlerimiz</h2>
      <ol class="sozler">${SOZLER.map(([b, a], i) => `<li><span class="soz-no sayi">${i + 1}</span><div><h3>${b}</h3><p>${a}</p></div></li>`).join('')}</ol>
    </section>
    <div class="teklif-iki">
      <section class="teklif-bolum">
        <h2>Ne kuruyoruz</h2>
        <ul class="nokta">${KURULAN.map((x) => `<li>${x}</li>`).join('')}</ul>
      </section>
      <section class="teklif-bolum">
        <h2>Denemede ne ölçüyoruz</h2>
        <ul class="nokta">${OLCULER.map((x) => `<li>${x}</li>`).join('')}</ul>
        <p class="teklif-not">Ücret ve kurulum bedeli görüşmede birlikte belirlenir.</p>
      </section>
    </div>
    <footer class="teklif-alt">
      <a class="btn btn-koyu" href="#/panel">Panele dön</a>
      <button type="button" class="btn" data-yazdir>Yazdır / PDF</button>
    </footer>
  </article>`;
  kok.querySelector('[data-yazdir]').addEventListener('click', () => window.print());
  return () => {};
}
