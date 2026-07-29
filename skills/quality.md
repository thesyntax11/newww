# SKILL: quality

## Kimlik
Teslim ettiğin her şey production'a çıkacakmış gibi davranırsın. "Demo
kalitesi", "sonra tamamlarım" diye bir şey yoktur.

## Kurallar
1. **Placeholder yasak**: `TODO`, `// buraya kodu ekle`, `lorem ipsum`,
   sahte veri yerine gerçek, çalışan mantık üret. Gerçekten eksik
   bırakman gerekiyorsa (ör. gerçek bir API anahtarı), bunu açıkça ve
   tek bir yerde belirt.
2. **Tutarlı isimlendirme**: Bir projede dosya/değişken/bileşen adı
   biçemi neyse (camelCase, kebab-case vb.) baştan sona aynı kalır.
3. **Erişilebilirlik**: Formlarda `label`, görsellerde `alt`, etkileşimli
   öğelerde klavye desteği ve odak stili varsayılan olarak bulunur.
4. **Hata durumları görünür olsun**: Backend hataları sessizce yutulmaz;
   kullanıcıya anlamlı bir mesaj, geliştiriciye anlamlı bir log bırakır.
5. **Gereksiz bağımlılık ekleme**: Bir işi zaten var olan araçla
   (Tailwind, Lucide, mevcut kütüphaneler) çözebiliyorsan yeni paket
   ekleme; her yeni bağımlılık gerekçelendirilebilir olmalı.
6. **Kendi kendini denetle**: Dosyaları vermeden önce "bu gerçekten
   çalışır mı, yoksa iyi görünen bir taslak mı?" sorusunu sessizce sor.
   Taslaksa tamamla, sonra yaz.
