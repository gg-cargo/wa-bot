const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const axios = require('axios');
const QRCode = require('qrcode');
const { whatsappService } = require('./wweb');

const PORT = process.env.PORT || 3001;
const API_KEY = process.env.WWEB_API_KEY || null; // opsional proteksi sederhana

const app = express();
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(bodyParser.json({ limit: '2mb' }));

function requireApiKey(req, res, next) {
  if (!API_KEY) return next();
  const key = req.headers['x-api-key'] || req.query.api_key;
  if (key === API_KEY) return next();
  return res.status(401).json({ success: false, error: 'Unauthorized' });
}

// Inisialisasi di background saat server start
(async () => {
  try {
    console.log('Memulai WhatsApp client...');
    await whatsappService.initialize();
  } catch (err) {
    console.error('Gagal inisialisasi WhatsApp (akan tetap melanjutkan server):', err?.message || err);
  }
})();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'wweb', uptime: process.uptime() });
});

app.get('/status', requireApiKey, (req, res) => {
  const status = whatsappService.getConnectionStatus();
  res.json({ success: true, ...status });
});

app.get('/qr', requireApiKey, async (req, res) => {
  try {
    const qr = whatsappService.getQRCode();
    if (!qr) {
      return res.status(404).json({ 
        success: false, 
        error: 'QR belum tersedia. Gunakan /refresh-qr untuk memunculkan QR baru.',
        status: whatsappService.getConnectionStatus()
      });
    }

    const type = (req.query.type || 'dataurl').toString();
    if (type === 'dataurl') {
      const dataUrl = await QRCode.toDataURL(qr);
      return res.json({ success: true, dataUrl });
    }
    if (type === 'svg') {
      const svg = await QRCode.toString(qr, { type: 'svg' });
      res.set('Content-Type', 'image/svg+xml');
      return res.send(svg);
    }
    // default: text
    return res.type('text/plain').send(qr);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint untuk refresh QR code
app.post('/refresh-qr', requireApiKey, async (req, res) => {
  try {
    console.log('Memaksa refresh QR code...');
    
    // Logout dulu jika sudah terautentikasi
    const currentStatus = whatsappService.getConnectionStatus();
    if (currentStatus.isReady) {
      console.log('Logout dari session sebelumnya...');
      await whatsappService.logout();
    }
    
    // Tunggu sebentar
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Bersihkan folder session dan cache
    console.log('Membersihkan folder session...');
    const fs = require('fs');
    const path = require('path');
    
    try {
      // Hapus folder .wwebjs_auth dan .wwebjs_cache
      const authPath = path.join(__dirname, '.wwebjs_auth');
      const cachePath = path.join(__dirname, '.wwebjs_cache');
      
      if (fs.existsSync(authPath)) {
        fs.rmSync(authPath, { recursive: true, force: true });
        console.log('Folder .wwebjs_auth berhasil dihapus');
      }
      
      if (fs.existsSync(cachePath)) {
        fs.rmSync(cachePath, { recursive: true, force: true });
        console.log('Folder .wwebjs_cache berhasil dihapus');
      }
      
      // Tunggu sebentar setelah cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (cleanupError) {
      console.warn('Warning saat cleanup folder:', cleanupError.message);
    }
    
    // Re-inisialisasi WhatsApp client
    console.log('Re-inisialisasi WhatsApp client...');
    await whatsappService.initialize();
    
    // Tunggu QR code muncul
    let attempts = 0;
    const maxAttempts = 30; // 30 detik
    
    while (attempts < maxAttempts) {
      const status = whatsappService.getConnectionStatus();
      if (status.hasQRCode) {
        console.log('QR code baru tersedia!');
        return res.json({ 
          success: true, 
          message: 'QR code baru tersedia. Gunakan GET /qr untuk melihat QR code.',
          status: status
        });
      }
      
      console.log(`Menunggu QR code... (${attempts + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    return res.status(408).json({ 
      success: false, 
      error: 'Timeout menunggu QR code. Coba lagi.',
      status: whatsappService.getConnectionStatus()
    });
    
  } catch (error) {
    console.error('Error saat refresh QR:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint untuk force re-inisialisasi
app.post('/force-init', requireApiKey, async (req, res) => {
  try {
    console.log('Force re-inisialisasi WhatsApp client...');
    
    // Logout dulu
    await whatsappService.logout();
    
    // Tunggu sebentar
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Bersihkan folder session dan cache
    console.log('Membersihkan folder session...');
    const fs = require('fs');
    const path = require('path');
    
    try {
      // Hapus folder .wwebjs_auth dan .wwebjs_cache
      const authPath = path.join(__dirname, '.wwebjs_auth');
      const cachePath = path.join(__dirname, '.wwebjs_cache');
      
      if (fs.existsSync(authPath)) {
        fs.rmSync(authPath, { recursive: true, force: true });
        console.log('Folder .wwebjs_auth berhasil dihapus');
      }
      
      if (fs.existsSync(cachePath)) {
        fs.rmSync(cachePath, { recursive: true, force: true });
        console.log('Folder .wwebjs_cache berhasil dihapus');
      }
      
      // Tunggu sebentar setelah cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (cleanupError) {
      console.warn('Warning saat cleanup folder:', cleanupError.message);
    }
    
    // Re-inisialisasi
    await whatsappService.initialize();
    
    return res.json({ 
      success: true, 
      message: 'WhatsApp client berhasil di-reinisialisasi',
      status: whatsappService.getConnectionStatus()
    });
    
  } catch (error) {
    console.error('Error saat force init:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/send-text', requireApiKey, async (req, res) => {
  try {
    const { phoneNumber, message } = req.body || {};
    if (!phoneNumber || !message) {
      return res.status(400).json({ success: false, error: 'phoneNumber dan message wajib diisi' });
    }
    const status = whatsappService.getConnectionStatus();
    if (!status.isReady) {
      return res.status(409).json({ success: false, error: 'WhatsApp belum siap. Scan QR terlebih dahulu.' });
    }
    const result = await whatsappService.sendTextMessage(phoneNumber, message);
    const statusAfter = whatsappService.getConnectionStatus();
    return res.json({ ...result, status: statusAfter });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/send-media', requireApiKey, async (req, res) => {
  try {
    const { phoneNumber, caption, fileUrl, filePath } = req.body || {};
    if (!phoneNumber || (!fileUrl && !filePath)) {
      return res.status(400).json({ success: false, error: 'phoneNumber dan salah satu dari fileUrl atau filePath wajib diisi' });
    }
    const status = whatsappService.getConnectionStatus();
    if (!status.isReady) {
      return res.status(409).json({ success: false, error: 'WhatsApp belum siap. Scan QR terlebih dahulu.' });
    }

    let pathToSend = filePath;
    if (!pathToSend && fileUrl) {
      // download ke /tmp
      const tmpPath = `/tmp/wweb_${Date.now()}`;
      const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
      const fs = require('fs');
      fs.writeFileSync(tmpPath, Buffer.from(response.data));
      pathToSend = tmpPath;
    }

    const result = await whatsappService.sendMediaMessage(phoneNumber, pathToSend, caption || '');
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/logout', requireApiKey, async (req, res) => {
  try {
    await whatsappService.logout();
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint untuk manual cleanup folder session
app.post('/cleanup', requireApiKey, async (req, res) => {
  try {
    console.log('Manual cleanup folder session...');
    
    // Logout dulu jika sedang terautentikasi
    const currentStatus = whatsappService.getConnectionStatus();
    if (currentStatus.isReady) {
      console.log('Logout dari session...');
      await whatsappService.logout();
    }
    
    // Tunggu sebentar
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Bersihkan folder session dan cache
    const fs = require('fs');
    const path = require('path');
    
    try {
      // Hapus folder .wwebjs_auth dan .wwebjs_cache
      const authPath = path.join(__dirname, '.wwebjs_auth');
      const cachePath = path.join(__dirname, '.wwebjs_cache');
      
      if (fs.existsSync(authPath)) {
        fs.rmSync(authPath, { recursive: true, force: true });
        console.log('Folder .wwebjs_auth berhasil dihapus');
      }
      
      if (fs.existsSync(cachePath)) {
        fs.rmSync(cachePath, { recursive: true, force: true });
        console.log('Folder .wwebjs_cache berhasil dihapus');
      }
      
      return res.json({ 
        success: true, 
        message: 'Folder session berhasil dibersihkan. Gunakan /force-init untuk restart WhatsApp client.',
        cleanedFolders: ['.wwebjs_auth', '.wwebjs_cache']
      });
      
    } catch (cleanupError) {
      console.error('Error saat cleanup folder:', cleanupError);
      return res.status(500).json({ 
        success: false, 
        error: 'Gagal membersihkan folder session',
        details: cleanupError.message
      });
    }
    
  } catch (error) {
    console.error('Error saat cleanup:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM diterima, menutup WhatsApp client...');
  try { await whatsappService.logout(); } catch {}
  process.exit(0);
});
process.on('SIGINT', async () => {
  console.log('SIGINT diterima, menutup WhatsApp client...');
  try { await whatsappService.logout(); } catch {}
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`wweb service berjalan di port ${PORT}`);
});
