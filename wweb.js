const fs = require('fs');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

class WhatsAppService {
    constructor() {
        this.client = null;
        this.isReady = false;
        this.qrCode = null;
    }

    /**
     * Inisialisasi WhatsApp client
     */
    async initialize() {
        try {
            // Deteksi path Chrome di macOS atau gunakan env var jika tersedia
            const defaultChromePaths = [
                '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                '/Applications/Chromium.app/Contents/MacOS/Chromium',
                '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'
            ];
            const envExecutable = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH || null;
            const detectedExecutable = defaultChromePaths.find((p) => {
                try { return fs.existsSync(p); } catch { return false; }
            }) || null;
            const executablePath = envExecutable || detectedExecutable || undefined;

            const puppeteerOptions = {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ],
                // Tambah timeout untuk memberi waktu Chromium/Chrome start
                timeout: 60000,
                protocolTimeout: 120000
            };
            if (executablePath) {
                puppeteerOptions.executablePath = executablePath;
            }

            this.client = new Client({
                authStrategy: new LocalAuth(),
                puppeteer: puppeteerOptions
            });

            // Event ketika QR code tersedia
            this.client.on('qr', (qr) => {
                this.qrCode = qr;
                console.log('QR Code tersedia, silakan scan:');
                qrcode.generate(qr, { small: true });
            });

            // Event ketika client siap
            this.client.on('ready', () => {
                this.isReady = true;
                console.log('WhatsApp client siap!');
            });

            // Event ketika client terautentikasi
            this.client.on('authenticated', () => {
                console.log('WhatsApp berhasil terautentikasi!');
            });

            // Event ketika autentikasi gagal
            this.client.on('auth_failure', (msg) => {
                console.error('Autentikasi WhatsApp gagal:', msg);
                this.isReady = false;
            });

            // Event ketika client terputus
            this.client.on('disconnected', (reason) => {
                console.log('WhatsApp client terputus:', reason);
                this.isReady = false;
            });

            // Event ketika ada pesan masuk
            this.client.on('message', (message) => {
                console.log('Pesan masuk dari:', message.from);
                console.log('Isi pesan:', message.body);
            });

            // Mulai client
            await this.client.initialize();
            
        } catch (error) {
            console.error('Error saat inisialisasi WhatsApp client:', error);
            throw error;
        }
    }

    /**
     * Kirim pesan teks ke nomor tertentu
     * @param {string} phoneNumber - Nomor telepon (format: 6281234567890)
     * @param {string} message - Pesan yang akan dikirim
     * @returns {Promise<Object>} - Hasil pengiriman pesan
     */
    async sendTextMessage(phoneNumber, message) {
        try {
            if (!this.isReady || !this.client) {
                throw new Error('WhatsApp client belum siap. Silakan inisialisasi terlebih dahulu.');
            }

            // Format nomor telepon
            const formattedNumber = this.formatPhoneNumber(phoneNumber);
            
            // Kirim pesan
            const result = await this.client.sendMessage(formattedNumber, message);
            
            console.log(`Pesan berhasil dikirim ke ${formattedNumber}`);
            return {
                success: true,
                messageId: result.id._serialized,
                timestamp: result.timestamp,
                to: formattedNumber
            };

        } catch (error) {
            console.error('Error saat mengirim pesan teks:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Kirim pesan media (gambar, dokumen, dll) ke nomor tertentu
     * @param {string} phoneNumber - Nomor telepon (format: 6281234567890)
     * @param {string} mediaPath - Path file media
     * @param {string} caption - Caption untuk media (opsional)
     * @param {string} mediaType - Tipe media (image, document, audio, video) - opsional (auto-detect)
     * @returns {Promise<Object>} - Hasil pengiriman pesan
     */
    async sendMediaMessage(phoneNumber, mediaPath, caption = '', mediaType = '') {
        try {
            if (!this.isReady || !this.client) {
                throw new Error('WhatsApp client belum siap. Silakan inisialisasi terlebih dahulu.');
            }

            // Format nomor telepon
            const formattedNumber = this.formatPhoneNumber(phoneNumber);
            
            // Buat media object dari file path (auto-detect mimetype)
            const media = MessageMedia.fromFilePath(mediaPath);
            
            // Kirim pesan media
            const result = await this.client.sendMessage(formattedNumber, media, { caption });
            
            console.log(`Media berhasil dikirim ke ${formattedNumber}`);
            return {
                success: true,
                messageId: result.id._serialized,
                timestamp: result.timestamp,
                to: formattedNumber,
                mediaType: media.mimetype || mediaType || 'unknown'
            };

        } catch (error) {
            console.error('Error saat mengirim media:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Kirim pesan ke multiple nomor
     * @param {Array<string>} phoneNumbers - Array nomor telepon
     * @param {string} message - Pesan yang akan dikirim
     * @returns {Promise<Array>} - Array hasil pengiriman pesan
     */
    async sendBulkMessage(phoneNumbers, message) {
        try {
            if (!this.isReady || !this.client) {
                throw new Error('WhatsApp client belum siap. Silakan inisialisasi terlebih dahulu.');
            }

            const results = [];
            
            for (const phoneNumber of phoneNumbers) {
                const result = await this.sendTextMessage(phoneNumber, message);
                results.push({
                    phoneNumber,
                    ...result
                });
                
                // Delay antar pengiriman untuk menghindari spam
                await this.delay(1000);
            }

            return results;

        } catch (error) {
            console.error('Error saat mengirim bulk message:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Cek status koneksi WhatsApp
     * @returns {Object} - Status koneksi
     */
    getConnectionStatus() {
        return {
            isReady: this.isReady,
            isConnected: this.client ? this.client.isConnected : false,
            hasQRCode: !!this.qrCode
        };
    }

    /**
     * Dapatkan QR code untuk autentikasi
     * @returns {string|null} - QR code string atau null jika tidak tersedia
     */
    getQRCode() {
        return this.qrCode;
    }

    /**
     * Logout dan hapus sesi
     */
    async logout() {
        try {
            console.log('Logout WhatsApp client');
            if (this.client) {
                await this.client.destroy();
                this.client = null;
                this.isReady = false;
                this.qrCode = null;
                console.log('WhatsApp client berhasil logout');
            }
        } catch (error) {
            console.error('Error saat logout:', error);
        }
    }

    /**
     * Format nomor telepon ke format WhatsApp
     * @param {string} phoneNumber - Nomor telepon
     * @returns {string} - Nomor telepon yang sudah diformat
     */
    formatPhoneNumber(phoneNumber) {
        let formatted = phoneNumber.replace(/\D/g, '');
        
        // Jika dimulai dengan 0, ganti dengan 62
        if (formatted.startsWith('0')) {
            formatted = '62' + formatted.substring(1);
        }
        
        // Jika dimulai dengan 62, tambahkan @c.us
        if (formatted.startsWith('62')) {
            formatted = formatted + '@c.us';
        }
        
        return formatted;
    }

    /**
     * Delay function untuk menghindari spam
     * @param {number} ms - Milisecond untuk delay
     * @returns {Promise} - Promise yang resolve setelah delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export instance tunggal
const whatsappService = new WhatsAppService();

// Export class dan instance
module.exports = {
    WhatsAppService,
    whatsappService
};

// Contoh penggunaan:
/*
const { whatsappService } = require('./wweb.js');

async function main() {
    try {
        // Inisialisasi WhatsApp
        await whatsappService.initialize();
        
        // Tunggu sampai client siap
        while (!whatsappService.isReady) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Kirim pesan teks
        const result = await whatsappService.sendTextMessage(
            '6281234567890', 
            'Halo! Ini adalah pesan test dari WhatsApp bot.'
        );
        
        console.log('Hasil pengiriman:', result);
        
        // Kirim media
        const mediaResult = await whatsappService.sendMediaMessage(
            '6281234567890',
            './path/to/image.jpg',
            'Ini adalah gambar test',
            'image'
        );
        
        console.log('Hasil pengiriman media:', mediaResult);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// Jalankan jika file ini dijalankan langsung
if (require.main === module) {
    main();
}
*/
