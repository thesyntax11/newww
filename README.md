# Aether Agent

Çoklu LLM sağlayıcılı, dosyaları sohbette değil **arka plandaki sanal
diske** yazan bir AI Agent stüdyosu. İş bitince tüm proje tek bir ZIP
olarak indirilir.

## Öne çıkanlar

- **Çoklu API desteği**: OpenAI, Anthropic, Google Gemini, Groq, Mistral
  — tek ortak arayüz (`lib/providers.ts`) üzerinden, tek dosya
  değişikliğiyle yeni sağlayıcı eklenebilir.
- **Dosya / ZIP / PDF / DOCX / görsel yükleme**: Sohbetteki ataç
  butonuyla `.zip`, `.pdf`, `.docx`, kod/metin dosyası ya da görsel
  (png/jpg/webp/gif) yükleyebilirsin.
  - Zip otomatik açılır, tüm içeriği `_uploads/` altına yazılır.
  - PDF/DOCX'in düz metni otomatik çıkarılıp `.extracted.md` olarak
    kaydedilir, model bunu gerçek referans olarak okur.
  - Görseller, vision destekleyen sağlayıcılara (OpenAI, Anthropic,
    Gemini) isteğiyle birlikte **gerçekten görsel olarak** gönderilir —
    bir mockup/ekran görüntüsü yükleyip "bunu birebir uygula" diyebilirsin.
- **Geniş bağlamlı agent**: Her istekte `lib/context.ts`, sanal diskteki
  mevcut dosyaları ve yüklenen referansları modele "okutur"
  (`<existing-file>` / `<uploaded-file>` blokları). Agent, projenin
  tamamını görerek karar verir; aynı işi yapan dosyayı tekrar üretmez,
  yüklediğin tasarım/şema/marka dosyalarına sadık kalır.
- **Skills sistemi** (`skills/*.md`): Her istekte otomatik olarak sistem
  promptuna eklenir. Bağlanan model hangisi olursa olsun, tasarım
  (Framer estetiği, glassmorphism; **3D yalnızca açıkça istendiğinde**),
  backend (güvenlik, hata yönetimi, path traversal koruması), derin
  muhakeme (kenar durumları, ölçeklenebilirlik, öz-eleştiri) ve üretim
  kalitesi (placeholder yasak, erişilebilirlik, tutarlı isimlendirme)
  disiplinini korur.
- **Kod asla sohbette görünmez — istisnasız**: Model `<file>` etiketini
  unutup ham \`\`\`kod\`\`\` bloğu üretse bile, `lib/agent.ts` bunu
  otomatik yakalar ve `misc/agent-output-*` altına diske yazar. Sohbette
  kalan tek şey kısa bir "dosyaya yazıldı" notudur.
- **Sanal disk + Agent** (`lib/agent.ts`, `lib/virtualDisk.ts`): Model
  cevabındaki `<file path="...">` blokları ayrıştırılır, sohbette ham
  kod göstermek yerine dosyalar doğrudan oturuma özel diske yazılır.
- **ZIP indirme** (`app/api/disk/zip/route.ts`): Sanal diskteki tüm proje
  `archiver` ile arşivlenip tek tıkla indirilir.

## Kurulum

```bash
npm install
cp .env.example .env
npm run dev
```

`http://localhost:3000` adresine gidin, `/chat` sayfasında sağlayıcı
seçin, API anahtarınızı girin (yalnızca tarayıcınızda saklanır, istekle
birlikte sunucuya gönderilir) ve sohbete başlayın.

## Nasıl çalışır

1. Kullanıcı bir sağlayıcı seçer ve isteğini yazar. İsterse önce ataç
   butonuyla dosya/zip yükler.
2. Yüklenen her şey `_uploads/` altına yazılır; zip'ler otomatik açılır.
3. `/api/chat` route'u, `skills/` klasöründeki kuralları **ve** o anki
   sanal disk + yüklenen dosya içeriğini sistem promptuna ekleyerek
   ilgili sağlayıcıyı çağırır — yani model, konuşmadan önce projenin ve
   yüklediğin dosyaların tamamını görür.
4. Model, ürettiği her dosyayı `<file path="...">içerik</file>` formatında
   döndürür.
5. `lib/agent.ts` bu blokları ayrıştırıp `storage/<sessionId>/...`
   altına yazar; sohbette yalnızca kısa bir "dosya yazıldı" notu kalır.
6. Sağ paneldeki **Sanal Disk** ağacı gerçek zamanlı güncellenir.
7. **ZIP indir** butonu, o oturuma ait tüm dosyaları tek arşiv halinde
   indirir.

## Klasör yapısı

```
app/            Next.js App Router sayfaları ve API route'ları
components/     UI bileşenleri (sohbet, disk gezgini, sağlayıcı paneli)
lib/            Sağlayıcı soyutlaması, sanal disk, agent, store
skills/         Agent'ın her zaman uyduğu tasarım/backend kuralları
storage/        Oturum bazlı sanal disk (gitignore'lu, çalışma zamanında oluşur)
```

## Güvenlik notları

- API anahtarları sunucu koduna hardcode edilmez; `.env` veya kullanıcı
  girişiyle sağlanır.
- Sanal disk yazımları `path traversal` saldırılarına karşı normalize
  edilip kök dizin dışına çıkışa izin verilmez.
- Her oturum kendi `storage/<sessionId>` dizininde izole tutulur.
