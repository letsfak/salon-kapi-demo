# Salon Kapı · demo

Spor salonu turnikesine QR ile giriş için tıklanabilir demo. **Sahte verilerle çalışır**, sunucu yoktur; veriler yalnız tarayıcıda (localStorage) durur.

- `#/kapi` Kapı ekranı: laptop kamerası ya da USB QR okuyucu (klavye gibi yazar) ile okur, yeşil/kırmızı karar verir.
- `#/uye` Üye ekranı: 30 saniyede bir değişen imzalı QR ve 6 haneli yedek kod.
- `#/panel` Sahip paneli: içeridekiler, kapıda engellenenler, süresi bitenler, üye işlemleri.
- `#/teklif` Pilot teklifi (yazdırılabilir).

Demo anahtarı `js/kod.js` içinde bilerek açıktır; gerçek kurulumda kullanılmaz.
Üçüncü taraf lisanslar: `vendor/LISANSLAR.md`.
