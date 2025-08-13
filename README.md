# WhatsApp Helper

Helper untuk mengirim pesan WhatsApp menggunakan whatsapp-web.js dengan fitur lengkap dan mudah digunakan.

## Fitur

- ✅ Kirim pesan teks
- ✅ Kirim pesan media (gambar, dokumen, audio, video)
- ✅ Kirim pesan bulk ke multiple nomor
- ✅ Autentikasi dengan QR code
- ✅ Event handling untuk status koneksi
- ✅ Error handling yang robust
- ✅ Format nomor telepon otomatis
- ✅ **Refresh QR code otomatis**
- ✅ **Force re-inisialisasi client**

## Instalasi

1. Install dependensi:
```bash
npm install
```

2. Pastikan Node.js versi 16 atau lebih tinggi sudah terinstall.

## Penggunaan

### 1. Inisialisasi WhatsApp Client

```javascript
const { whatsappService } = require('./wweb.js');

async function initWhatsApp() {
    try {
        await whatsappService.initialize();
        
        // Tunggu sampai client siap
        while (!whatsappService.isReady) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('WhatsApp siap digunakan!');
    } catch (error) {
        console.error('Error:', error);
    }
}

initWhatsApp();
```

### 2. Kirim Pesan Teks

```javascript
const result = await whatsappService.sendTextMessage(
    '6281234567890', 
    'Halo! Ini adalah pesan test dari WhatsApp bot.'
);

if (result.success) {
    console.log('Pesan berhasil dikirim!');
    console.log('Message ID:', result.messageId);
} else {
    console.error('Gagal mengirim pesan:', result.error);
}
```

### 3. Kirim Pesan Media

```javascript
// Kirim gambar
const imageResult = await whatsappService.sendMediaMessage(
    '6281234567890',
    './path/to/image.jpg',
    'Ini adalah gambar test',
    'image'
);

// Kirim dokumen
const docResult = await whatsappService.sendMediaMessage(
    '6281234567890',
    './path/to/document.pdf',
    'Ini adalah dokumen test',
    'document'
);
```

### 4. Kirim Pesan Bulk

```javascript
const phoneNumbers = ['6281234567890', '6289876543210', '6281111111111'];
const message = 'Halo! Ini adalah pesan broadcast.';

const results = await whatsappService.sendBulkMessage(phoneNumbers, message);

results.forEach(result => {
    if (result.success) {
        console.log(`Pesan berhasil dikirim ke ${result.phoneNumber}`);
    } else {
        console.error(`Gagal mengirim ke ${result.phoneNumber}:`, result.error);
    }
});
```

### 5. Cek Status Koneksi

```javascript
const status = whatsappService.getConnectionStatus();
console.log('Status koneksi:', status);

// Output:
// {
//   isReady: true,
//   isConnected: true,
//   hasQRCode: false
// }
```

### 6. Logout

```javascript
await whatsappService.logout();
```

## API Endpoints

Service ini menyediakan REST API dengan endpoint berikut:

### Health Check
- `GET /health` - Status kesehatan service

### Status & QR Code
- `GET /status` - Cek status koneksi WhatsApp
- `GET /qr` - Lihat QR code (jika tersedia)
- `POST /refresh-qr` - **Refresh QR code (logout + re-init)**
- `POST /force-init` - **Force re-inisialisasi WhatsApp client**

### Kirim Pesan
- `POST /send-text` - Kirim pesan teks
- `POST /send-media` - Kirim pesan media

### Manajemen Session
- `POST /logout` - Logout dari WhatsApp

## Cara Memunculkan QR Code

### 1. **Refresh QR Code (Recommended)**
```bash
curl -X POST http://localhost:3001/refresh-qr
```
Endpoint ini akan:
- Logout dari session sebelumnya (jika ada)
- Re-inisialisasi WhatsApp client
- Menunggu QR code muncul (timeout 30 detik)
- Return status QR code baru

### 2. **Force Re-inisialisasi**
```bash
curl -X POST http://localhost:3001/force-init
```
Endpoint ini untuk kasus yang lebih ekstrem:
- Force logout
- Re-inisialisasi dari awal
- Berguna jika ada masalah dengan browser process

### 3. **Cek Status Setelah Refresh**
```bash
curl http://localhost:3001/status
```

### 4. **Lihat QR Code**
```bash
# QR sebagai text (untuk terminal)
curl http://localhost:3001/qr

# QR sebagai data URL (untuk web)
curl "http://localhost:3001/qr?type=dataurl"

# QR sebagai SVG
curl "http://localhost:3001/qr?type=svg"
```

## Format Nomor Telepon

Helper ini secara otomatis memformat nomor telepon:

- `081234567890` → `6281234567890@c.us`
- `6281234567890` → `6281234567890@c.us`
- `+6281234567890` → `6281234567890@c.us`

## Event Handling

WhatsApp client memiliki beberapa event yang bisa dimonitor:

- `qr` - QR code tersedia untuk scan
- `ready` - Client siap digunakan
- `authenticated` - Berhasil terautentikasi
- `auth_failure` - Autentikasi gagal
- `disconnected` - Client terputus
- `message` - Pesan masuk

## Error Handling

Semua fungsi mengembalikan object dengan format:

```javascript
// Success
{
    success: true,
    messageId: "message_id",
    timestamp: 1234567890,
    to: "6281234567890@c.us"
}

// Error
{
    success: false,
    error: "Error message"
}
```

## Contoh Lengkap

```javascript
const { whatsappService } = require('./wweb.js');

async function main() {
    try {
        // 1. Inisialisasi
        console.log('Memulai WhatsApp client...');
        await whatsappService.initialize();
        
        // 2. Tunggu sampai siap
        console.log('Menunggu autentikasi...');
        while (!whatsappService.isReady) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // 3. Kirim pesan test
        console.log('Mengirim pesan test...');
        const result = await whatsappService.sendTextMessage(
            '6281234567890', 
            'Halo! Ini adalah pesan test dari WhatsApp bot.'
        );
        
        if (result.success) {
            console.log('✅ Pesan berhasil dikirim!');
            console.log('📱 Ke:', result.to);
            console.log('🆔 Message ID:', result.messageId);
        } else {
            console.error('❌ Gagal mengirim pesan:', result.error);
        }
        
        // 4. Cek status
        const status = whatsappService.getConnectionStatus();
        console.log('📊 Status koneksi:', status);
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Jalankan jika file ini dijalankan langsung
if (require.main === module) {
    main();
}
```

## Troubleshooting

### QR Code tidak muncul
- **Gunakan endpoint `/refresh-qr`** untuk memunculkan QR baru
- Pastikan browser Chrome/Chromium terinstall
- Cek koneksi internet
- Restart aplikasi

### Autentikasi gagal
- Pastikan QR code di-scan dengan benar
- **Gunakan `/refresh-qr` untuk scan ulang**
- Coba logout dan login ulang
- Hapus folder `.wwebjs_auth` dan coba lagi

### Pesan tidak terkirim
- Cek status koneksi dengan `getConnectionStatus()`
- Pastikan nomor telepon valid
- Cek apakah ada error di console
- **Gunakan `/force-init` jika ada masalah browser process**

### Browser process error
- **Gunakan `/force-init`** untuk restart browser process
- Pastikan tidak ada multiple instance yang berjalan
- Cek memory dan CPU usage

## Lisensi

MIT License - silakan gunakan untuk keperluan komersial maupun non-komersial.

## Support

Untuk bantuan dan pertanyaan, silakan buat issue di repository ini.


