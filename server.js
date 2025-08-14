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
      // Hapus folder .wwebjs_auth dan .wwebjs_cache dengan retry mechanism
      const authPath = path.join(__dirname, '.wwebjs_auth');
      const cachePath = path.join(__dirname, '.wwebjs_cache');
      
      // Function untuk menghapus direktori dengan retry
      const removeDirectoryWithRetry = (dirPath, dirName) => {
        if (!fs.existsSync(dirPath)) {
          console.log(`Folder ${dirName} tidak ada`);
          return true;
        }
        
        try {
          // Coba hapus dengan force
          fs.rmSync(dirPath, { recursive: true, force: true });
          console.log(`Folder ${dirName} berhasil dihapus`);
          return true;
        } catch (error) {
          if (error.code === 'EBUSY' || error.code === 'ENOTEMPTY') {
            console.log(`Folder ${dirName} sedang digunakan, mencoba hapus file satu per satu...`);
            
            try {
              // Hapus isi direktori satu per satu
              const removeContents = (dir) => {
                const items = fs.readdirSync(dir);
                for (const item of items) {
                  const itemPath = path.join(dir, item);
                  const stat = fs.statSync(itemPath);
                  
                  if (stat.isDirectory()) {
                    removeContents(itemPath);
                    try {
                      fs.rmdirSync(itemPath);
                    } catch (e) {
                      console.log(`Tidak bisa hapus subdirektori ${itemPath}: ${e.message}`);
                    }
                  } else {
                    try {
                      fs.unlinkSync(itemPath);
                    } catch (e) {
                      console.log(`Tidak bisa hapus file ${itemPath}: ${e.message}`);
                    }
                  }
                }
              };
              
              removeContents(dirPath);
              
              // Coba hapus direktori utama
              try {
                fs.rmdirSync(dirPath);
                console.log(`Folder ${dirName} berhasil dihapus setelah cleanup manual`);
                return true;
              } catch (e) {
                console.log(`Folder ${dirName} tidak bisa dihapus sepenuhnya: ${e.message}`);
                return false;
              }
              
            } catch (manualError) {
              console.log(`Gagal cleanup manual untuk ${dirName}: ${manualError.message}`);
              return false;
            }
          } else {
            console.log(`Error saat hapus ${dirName}: ${error.message}`);
            return false;
          }
        }
      };
      
      // Hapus direktori dengan retry
      const authRemoved = removeDirectoryWithRetry(authPath, '.wwebjs_auth');
      const cacheRemoved = removeDirectoryWithRetry(cachePath, '.wwebjs_cache');
      
      const cleanedFolders = [];
      if (authRemoved) cleanedFolders.push('.wwebjs_auth');
      if (cacheRemoved) cleanedFolders.push('.wwebjs_cache');
      
      if (cleanedFolders.length > 0) {
        return res.json({ 
          success: true, 
          message: 'Folder session berhasil dibersihkan. Gunakan /force-init untuk restart WhatsApp client.',
          cleanedFolders: cleanedFolders,
          warnings: cleanedFolders.length < 2 ? ['Beberapa folder tidak bisa dihapus sepenuhnya karena sedang digunakan'] : []
        });
      } else {
        return res.status(500).json({ 
          success: false, 
          error: 'Tidak ada folder yang berhasil dibersihkan',
          details: 'Semua folder sedang digunakan atau tidak bisa dihapus'
        });
      }
      
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

// Endpoint untuk force cleanup yang lebih agresif
app.post('/force-cleanup', requireApiKey, async (req, res) => {
  try {
    console.log('Force cleanup folder session...');
    
    // Logout dulu jika sedang terautentikasi
    const currentStatus = whatsappService.getConnectionStatus();
    if (currentStatus.isReady) {
      console.log('Force logout dari session...');
      try {
        await whatsappService.logout();
      } catch (logoutError) {
        console.log('Error saat logout, lanjutkan cleanup:', logoutError.message);
      }
    }
    
    // Tunggu lebih lama untuk memastikan semua resource dibebaskan
    console.log('Menunggu resource dibebaskan...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Bersihkan folder dengan cara yang lebih agresif
    const fs = require('fs');
    const path = require('path');
    
    const cleanupFolder = (folderPath, folderName) => {
      if (!fs.existsSync(folderPath)) {
        console.log(`Folder ${folderName} tidak ada`);
        return true;
      }
      
      try {
        // Coba hapus dengan force
        fs.rmSync(folderPath, { recursive: true, force: true });
        console.log(`Folder ${folderName} berhasil dihapus`);
        return true;
      } catch (error) {
        console.log(`Error saat hapus ${folderName}: ${error.message}`);
        
        // Jika masih error, coba hapus isi direktori
        try {
          const items = fs.readdirSync(folderPath);
          for (const item of items) {
            const itemPath = path.join(folderPath, item);
            try {
              const stat = fs.statSync(itemPath);
              if (stat.isDirectory()) {
                fs.rmSync(itemPath, { recursive: true, force: true });
              } else {
                fs.unlinkSync(itemPath);
              }
            } catch (e) {
              console.log(`Tidak bisa hapus ${itemPath}: ${e.message}`);
            }
          }
          
          // Coba hapus direktori utama lagi
          try {
            fs.rmdirSync(folderPath);
            console.log(`Folder ${folderName} berhasil dihapus setelah cleanup manual`);
            return true;
          } catch (e) {
            console.log(`Folder ${folderName} tidak bisa dihapus sepenuhnya`);
            return false;
          }
        } catch (manualError) {
          console.log(`Gagal cleanup manual untuk ${folderName}`);
          return false;
        }
      }
    };
    
    const authPath = path.join(__dirname, '.wwebjs_auth');
    const cachePath = path.join(__dirname, '.wwebjs_cache');
    
    const authCleaned = cleanupFolder(authPath, '.wwebjs_auth');
    const cacheCleaned = cleanupFolder(cachePath, '.wwebjs_cache');
    
    const cleanedFolders = [];
    if (authCleaned) cleanedFolders.push('.wwebjs_auth');
    if (cacheCleaned) cleanedFolders.push('.wwebjs_cache');
    
    return res.json({
      success: true,
      message: 'Force cleanup selesai',
      cleanedFolders: cleanedFolders,
      note: 'Restart container jika folder masih tidak bisa dihapus sepenuhnya'
    });
    
  } catch (error) {
    console.error('Error saat force cleanup:', error);
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
