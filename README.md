# Voluntry

Voluntry; öğrencileri gönüllülük etkinlikleriyle buluşturan, organizatörlerin etkinlik ve katılımcı süreçlerini yönetmesini sağlayan web tabanlı bir platformdur. Uygulama öğrenci, organizatör ve yönetici rolleri için ayrı çalışma alanları sunar.

## Özellikler

- Gönüllülük etkinliklerini keşfetme ve etkinliklere başvurma
- Öğrenci başvurularını, puanlarını, ödüllerini ve sertifikalarını takip etme
- Organizatörler için etkinlik, katılımcı ve geri bildirim yönetimi
- Yöneticiler için kullanıcı, organizatör, etkinlik, rapor ve ödül yönetimi
- Firebase Authentication, Firestore ve Storage entegrasyonu
- QR kodlu sertifika oluşturma ve doğrulama

## Kullanılan Teknolojiler

- Next.js 16 (App Router)
- React 19
- TypeScript
- Firebase ve Firebase Admin SDK
- Tailwind CSS 4

## Kurulum

Gereksinimler:

- Node.js 20 veya üzeri
- npm
- Bir Firebase projesi

Projeyi yerel ortamda çalıştırmak için:

```bash
npm install
```

Proje kökünde `.env.local` dosyası oluşturun:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Sunucu tarafındaki yönetici işlemleri için servis hesabı JSON'unun Base64 karşılığı
FIREBASE_SERVICE_ACCOUNT_KEY=
```

Ardından geliştirme sunucusunu başlatın:

```bash
npm run dev
```

Uygulama varsayılan olarak [http://localhost:3000](http://localhost:3000) adresinde açılır.

## Komutlar

```bash
npm run dev    # Geliştirme sunucusunu başlatır
npm run build  # Üretim derlemesi oluşturur
npm run start  # Üretim sunucusunu başlatır
npm run lint   # ESLint kontrollerini çalıştırır
```

## Proje Yapısı

```text
app/          Sayfalar, yerleşimler ve API rotaları
components/   Ortak React bileşenleri
hooks/        Kimlik doğrulama ve veri hook'ları
lib/          Firebase ve yardımcı servisler
types/        TypeScript tipleri
public/       Statik dosyalar ve rozet görselleri
scripts/      Yönetim ve veri hazırlama betikleri
```

## Dağıtım

Proje Firebase App Hosting yapılandırması içerir. Dağıtımdan önce Firebase projesini ve gerekli ortam değişkenlerini yapılandırın; ardından Firebase CLI üzerinden App Hosting dağıtım akışını kullanın.

