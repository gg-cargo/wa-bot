const { whatsappService } = require('./wweb.js');

/**
 * Contoh penggunaan WhatsApp Helper
 * File ini menunjukkan cara menggunakan semua fitur yang tersedia
 */

async function contohPenggunaan() {
    try {
        console.log('🚀 Memulai WhatsApp Helper...');
        
        // 1. Inisialisasi WhatsApp client
        await whatsappService.initialize();
        
        // 2. Tunggu sampai client siap (setelah scan QR code)
        console.log('⏳ Menunggu autentikasi WhatsApp...');
        while (!whatsappService.isReady) {
            const status = whatsappService.getConnectionStatus();
            if (status.hasQRCode) {
                console.log('📱 Silakan scan QR code yang muncul di terminal');
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        console.log('✅ WhatsApp berhasil terautentikasi!');
        
        // 3. Contoh kirim pesan teks
        console.log('\n📤 Mengirim pesan teks...');
        const textResult = await whatsappService.sendTextMessage(
            '6281244283690', // Ganti dengan nomor yang valid
            'Halo! Ini adalah pesan test dari WhatsApp bot GG Kargo. 🚚'
        );
        
        if (textResult.success) {
            console.log('✅ Pesan teks berhasil dikirim!');
            console.log(`📱 Ke: ${textResult.to}`);
            console.log(`🆔 Message ID: ${textResult.messageId}`);
        } else {
            console.error('❌ Gagal mengirim pesan teks:', textResult.error);
        }
        
        // 4. Contoh kirim pesan media (gambar)
        // console.log('\n📤 Mengirim pesan media...');
        // const mediaResult = await whatsappService.sendMediaMessage(
        //     '6281244283690', // Ganti dengan nomor yang valid
        //     './logo-gg.png', // Ganti dengan path file yang valid
        //     'Logo GG Kargo 🚚',
        //     'image'
        // );
        
        // if (mediaResult.success) {
        //     console.log('✅ Media berhasil dikirim!');
        //     console.log(`📱 Ke: ${mediaResult.to}`);
        //     console.log(`🖼️ Tipe: ${mediaResult.mediaType}`);
        // } else {
        //     console.error('❌ Gagal mengirim media:', mediaResult.error);
        // }
        
        // // 5. Contoh kirim pesan bulk
        // console.log('\n📤 Mengirim pesan bulk...');
        // const phoneNumbers = [
        //     '6281234567890', // Ganti dengan nomor yang valid
        //     '6289876543210', // Ganti dengan nomor yang valid
        //     '6281111111111'  // Ganti dengan nomor yang valid
        // ];
        
        // const bulkMessage = 'Halo! Ini adalah pesan broadcast dari GG Kargo. 🚚\n\nKami menyediakan layanan pengiriman yang cepat dan aman!';
        
        // const bulkResults = await whatsappService.sendBulkMessage(phoneNumbers, bulkMessage);
        
        // console.log('📊 Hasil pengiriman bulk:');
        // bulkResults.forEach((result, index) => {
        //     if (result.success) {
        //         console.log(`✅ ${index + 1}. ${result.phoneNumber}: Berhasil`);
        //     } else {
        //         console.error(`❌ ${index + 1}. ${result.phoneNumber}: ${result.error}`);
        //     }
        // });
        
        // 6. Cek status koneksi
        console.log('\n📊 Status koneksi WhatsApp:');
        const status = whatsappService.getConnectionStatus();
        console.log(`🟢 Siap: ${status.isReady}`);
        console.log(`🔗 Terhubung: ${status.isConnected}`);
        console.log(`📱 QR Code: ${status.hasQRCode ? 'Tersedia' : 'Tidak tersedia'}`);
        
        // // 7. Tunggu sebentar sebelum logout
        // console.log('\n⏳ Menunggu 5 detik sebelum logout...');
        // await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 8. Logout
        // console.log('\n👋 Logout dari WhatsApp...');
        // await whatsappService.logout();
        // console.log('✅ Berhasil logout!');
        
    } catch (error) {
        console.error('❌ Error dalam contoh penggunaan:', error);
    }
}

/**
 * Fungsi untuk test fitur tertentu saja
 */
async function testFiturTertentu() {
    try {
        console.log('🧪 Testing fitur tertentu...');
        
        // Inisialisasi
        await whatsappService.initialize();
        
        // Tunggu siap
        while (!whatsappService.isReady) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Test kirim pesan ke nomor tertentu
        const testNumber = '6281234567890'; // Ganti dengan nomor test
        const testMessage = 'Test pesan dari GG Kargo bot! 🚚';
        
        console.log(`📤 Testing kirim pesan ke ${testNumber}...`);
        const result = await whatsappService.sendTextMessage(testNumber, testMessage);
        
        if (result.success) {
            console.log('✅ Test berhasil!');
            console.log(`📱 Pesan terkirim ke: ${result.to}`);
            console.log(`🆔 ID: ${result.messageId}`);
        } else {
            console.error('❌ Test gagal:', result.error);
        }
        
        // Logout
        await whatsappService.logout();
        
    } catch (error) {
        console.error('❌ Error dalam test:', error);
    }
}

/**
 * Fungsi untuk monitoring status real-time
 */
async function monitorStatus() {
    try {
        console.log('📊 Monitoring status WhatsApp...');
        
        await whatsappService.initialize();
        
        // Monitor status setiap 5 detik
        const interval = setInterval(() => {
            const status = whatsappService.getConnectionStatus();
            const timestamp = new Date().toLocaleTimeString();
            
            console.log(`[${timestamp}] Status:`, {
                siap: status.isReady ? '✅' : '❌',
                terhubung: status.isConnected ? '✅' : '❌',
                qrCode: status.hasQRCode ? '📱' : '❌'
            });
            
            // Jika sudah siap, stop monitoring
            if (status.isReady) {
                clearInterval(interval);
                console.log('🎉 WhatsApp siap digunakan!');
            }
        }, 5000);
        
        // Monitor selama 2 menit
        setTimeout(() => {
            clearInterval(interval);
            console.log('⏰ Monitoring selesai');
            whatsappService.logout();
        }, 120000);
        
    } catch (error) {
        console.error('❌ Error dalam monitoring:', error);
    }
}

// Jalankan contoh penggunaan
// if (require.main === module) {
//     const args = process.argv.slice(2);
    
//     switch (args[0]) {
//         case 'test':
//             testFiturTertentu();
//             break;
//         case 'monitor':
//             monitorStatus();
//             break;
//         default:
//             contohPenggunaan();
//             break;
//     }
// }

contohPenggunaan();

module.exports = {
    contohPenggunaan,
    testFiturTertentu,
    monitorStatus
};
