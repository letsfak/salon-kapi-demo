// Sahip panelinin iskeleti. Dinamik içerik panel.js'te, kaçışlı olarak doldurulur.
export const PANEL_SABLONU = (paketler) => `
<section class="panel">
  <header class="panel-ust">
    <div class="panel-baslik">
      <p class="etiket">Sahip paneli</p>
      <h1 data-salon-ad></h1>
    </div>
    <div class="panel-ust-sag">
      <p class="sayi panel-saat" data-saat></p>
      <a class="btn btn-kucuk btn-koyu" href="#/kapi" target="_blank" rel="noopener">Kapı ekranı ↗</a>
      <a class="btn btn-kucuk" href="#/teklif">Pilot teklifi</a>
      <button type="button" class="btn btn-kucuk btn-hayalet" data-ayar>Salon adı</button>
      <button type="button" class="btn btn-kucuk btn-hayalet" data-sifirla>Demoyu sıfırla</button>
    </div>
  </header>

  <div class="kpi">
    <article class="kpi-kart kpi-iceride">
      <p class="etiket">İçeride şimdi</p>
      <p class="sayi kpi-buyuk" data-iceride-sayi>0</p>
      <ul class="avatarlar" data-iceride-liste aria-label="İçerideki üyeler"></ul>
      <p class="kpi-not">Çıkış okutulmazsa 2 saat sonra çıkmış sayılır.</p>
    </article>
    <article class="kpi-kart kpi-engel">
      <p class="etiket">Kapıda engellenen · bugün</p>
      <p class="sayi kpi-buyuk" data-engel-sayi>0</p>
      <ul class="kirilim" data-engel-kirilim></ul>
    </article>
    <article class="kpi-kart">
      <p class="etiket">Bugün giriş</p>
      <p class="sayi kpi-orta" data-giris-sayi>0</p>
    </article>
    <article class="kpi-kart">
      <p class="etiket">7 gün içinde bitiyor</p>
      <p class="sayi kpi-orta" data-bitiyor-sayi>0</p>
    </article>
  </div>

  <div class="panel-izgara">
    <section class="kutu" aria-labelledby="h-hareket">
      <header class="kutu-ust"><h2 id="h-hareket">Kapı hareketleri</h2><span class="canli">Canlı</span></header>
      <ol class="hareket-liste" data-hareketler></ol>
    </section>
    <section class="kutu" aria-labelledby="h-hatirlat">
      <header class="kutu-ust"><h2 id="h-hatirlat">Süresi biten ve bitmek üzere</h2></header>
      <ul class="hatirlat-liste" data-hatirlat></ul>
    </section>
  </div>

  <section class="kutu uyeler" aria-labelledby="h-uyeler">
    <header class="kutu-ust">
      <h2 id="h-uyeler">Üyeler <span class="sayac" data-uye-sayi></span></h2>
      <input type="search" class="girdi ara" placeholder="Ad ara" data-ara aria-label="Üye ara">
      <button type="button" class="btn btn-ana btn-kucuk" data-ekle-ac>+ Üye ekle</button>
    </header>
    <form class="ekle-form" data-ekle hidden>
      <div class="alan"><label for="e-ad">Ad soyad</label><input id="e-ad" name="ad" class="girdi" required minlength="2" maxlength="60" autocomplete="off"></div>
      <div class="alan"><label for="e-tel">Telefon</label><input id="e-tel" name="tel" class="girdi" inputmode="tel" maxlength="20" autocomplete="off"></div>
      <div class="alan"><label for="e-paket">Paket</label>
        <select id="e-paket" name="paket" class="girdi">${paketler.map((p) => `<option value="${p}" ${p === 1 ? 'selected' : ''}>${p} ay</option>`).join('')}</select></div>
      <button type="submit" class="btn btn-ana">Ekle ve telefona aç</button>
    </form>
    <div class="tablo-sarici">
      <table class="uye-tablo">
        <thead><tr><th scope="col">Üye</th><th scope="col">Paket</th><th scope="col">Bitiş</th><th scope="col">Durum</th><th scope="col"><span class="sr">İşlemler</span></th></tr></thead>
        <tbody data-uyeler></tbody>
      </table>
    </div>
  </section>

  <dialog class="diyalog" data-dialog aria-labelledby="d-baslik">
    <div class="diyalog-ic">
      <div><p class="etiket">Üye ekranını telefonda aç</p><h2 id="d-baslik" data-dialog-ad></h2></div>
      <div class="diyalog-qr" data-dialog-qr></div>
      <p class="uye-aciklama kucuk">Telefonun kamerasıyla okutun. Açılan sayfada üyenin değişen QR'ı çıkar; onu kapı ekranına gösterin.</p>
      <div class="satir-islem">
        <a class="btn btn-kucuk" data-dialog-link href="#" target="_blank" rel="noopener">Bağlantıyı aç</a>
        <button type="button" class="btn btn-kucuk" data-dialog-kopyala>Kopyala</button>
        <button type="button" class="btn btn-kucuk btn-koyu" data-dialog-kapat>Kapat</button>
      </div>
    </div>
  </dialog>
</section>`;
