const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const PUBLIC_DIR = __dirname;

const OWNER = 'cheng-chtechtw';
const REPO = 'cheng-chtechtw.github.io';
const BRANCH = 'main';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

// Helper to replace meta tags in HTML
function replaceMeta(html, property, newContent) {
  const regex1 = new RegExp(`(<meta[^>]+property="${property}"[^>]+content=")[^"]*("[^>]*>)`, 'i');
  if (regex1.test(html)) {
    return html.replace(regex1, `$1${newContent}$2`);
  }
  const regex2 = new RegExp(`(<meta[^>]+content=")[^"]*("[^>]+property="${property}"[^>]*>)`, 'i');
  if (regex2.test(html)) {
    return html.replace(regex2, `$1${newContent}$2`);
  }
  return html.replace(/<\/head>/i, `  <meta property="${property}" content="${newContent}">\n</head>`);
}

function replaceTitle(html, newTitle) {
  const regex = /<title>[\s\S]*?<\/title>/i;
  if (regex.test(html)) {
    return html.replace(regex, `<title>${newTitle}</title>`);
  }
  return html.replace(/<\/head>/i, `  <title>${newTitle}</title>\n</head>`);
}

function replaceFavicon(html, newFavicon) {
  const regex = /<link[^>]+rel="shortcut icon"[^>]*>/i;
  if (regex.test(html)) {
    return html.replace(regex, `<link rel="shortcut icon" href="${newFavicon}" type="image/png">`);
  }
  const regex2 = /<link[^>]+rel="icon"[^>]*>/i;
  if (regex2.test(html)) {
    return html.replace(regex2, `<link rel="shortcut icon" href="${newFavicon}" type="image/png">`);
  }
  return html.replace(/<\/head>/i, `  <link rel="shortcut icon" href="${newFavicon}" type="image/png">\n</head>`);
}

// GitHub API Client Helper Functions
function githubRequest(method, urlPath, token, body, callback) {
  const options = {
    hostname: 'api.github.com',
    port: 443,
    path: urlPath,
    method: method,
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Node-Static-Compiler-Sync',
      'Content-Type': 'application/json'
    }
  };

  const req = require('https').request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      callback(null, res.statusCode, data);
    });
  });

  req.on('error', (err) => { callback(err); });

  if (body) {
    req.write(JSON.stringify(body));
  }
  req.end();
}

function uploadFileToGithub(localRelPath, token, callback) {
  const localFullPath = path.join(PUBLIC_DIR, localRelPath);
  if (!fs.existsSync(localFullPath)) {
    return callback(new Error(`File not found: ${localRelPath}`));
  }
  
  const content = fs.readFileSync(localFullPath);
  const base64Content = content.toString('base64');
  const remotePath = localRelPath.replace(/\\/g, '/');
  
  // Step 1: Get SHA of existing file if it exists
  const getPath = `/repos/${OWNER}/${REPO}/contents/${remotePath}?ref=${BRANCH}`;
  githubRequest('GET', getPath, token, null, (err, statusCode, data) => {
    if (err) return callback(err);
    
    let sha = null;
    if (statusCode === 200) {
      try {
        const json = JSON.parse(data);
        sha = json.sha;
      } catch (e) {}
    }
    
    // Step 2: Upload or Update
    const putPath = `/repos/${OWNER}/${REPO}/contents/${remotePath}`;
    const body = {
      message: `Auto-update: sync ${remotePath} from admin panel`,
      content: base64Content,
      branch: BRANCH
    };
    if (sha) {
      body.sha = sha;
    }
    
    githubRequest('PUT', putPath, token, body, (err, putStatusCode, putData) => {
      if (err) return callback(err);
      if (putStatusCode === 200 || putStatusCode === 201) {
        console.log(`✓ Successfully updated ${remotePath} on GitHub`);
        callback(null);
      } else {
        callback(new Error(`Failed to upload ${remotePath}. Status: ${putStatusCode}, Body: ${putData}`));
      }
    });
  });
}

function uploadFilesSequentially(files, token, index, callback) {
  if (index >= files.length) {
    return callback(null);
  }
  const file = files[index];
  uploadFileToGithub(file, token, (err) => {
    if (err) {
      console.warn(`Error uploading ${file}: ${err.message || err}. Continuing...`);
    }
    uploadFilesSequentially(files, token, index + 1, callback);
  });
}

function findCustomImages() {
  const images = [];
  
  // Scan assets/images/
  const imgDir = path.join(PUBLIC_DIR, 'assets/images');
  if (fs.existsSync(imgDir)) {
    const files = fs.readdirSync(imgDir);
    files.forEach(f => {
      if (f.startsWith('custom-')) {
        images.push(`assets/images/${f}`);
      }
    });
  }
  
  // Scan assets/images/ihome/
  const ihomeImgDir = path.join(PUBLIC_DIR, 'assets/images/ihome');
  if (fs.existsSync(ihomeImgDir)) {
    const files = fs.readdirSync(ihomeImgDir);
    files.forEach(f => {
      if (f.startsWith('custom-')) {
        images.push(`assets/images/ihome/${f}`);
      }
    });
  }
  
  return images;
}

// Serve static files and handle API requests
const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/save') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const data = payload.data;
        const images = payload.images || {};
        
        // 1. Process base64 images and convert them to physical files
        Object.keys(images).forEach(key => {
          const val = images[key];
          if (val && typeof val === 'string' && val.startsWith('data:image/')) {
            const match = val.match(/^data:(image\/[a-zA-Z0-9+-]+);base64,(.+)$/);
            if (match) {
              const mime = match[1];
              const base64Data = match[2];
              let ext = '.png';
              if (mime === 'image/jpeg' || mime === 'image/jpg') ext = '.jpg';
              else if (mime === 'image/gif') ext = '.gif';
              else if (mime === 'image/svg+xml') ext = '.svg';
              else if (mime === 'image/webp') ext = '.webp';
              
              const buffer = Buffer.from(base64Data, 'base64');
              
              // Decide file path: place ihome files in assets/images/ihome
              let relativePath = '';
              if (key.startsWith('ihome') || key.startsWith('kitchen') || key.includes('ihome') || key.includes('Ihome')) {
                relativePath = `assets/images/ihome/custom-${key}${ext}`;
              } else {
                relativePath = `assets/images/custom-${key}${ext}`;
              }
              
              const fullPath = path.join(PUBLIC_DIR, relativePath);
              fs.writeFileSync(fullPath, buffer);
              console.log(`Saved physical image: ${relativePath}`);
              
              // Update images object path to relative URL
              images[key] = relativePath;
            }
          }
        });
        
        // 2. Write data to assets/js/data.js
        const dataJsPath = path.join(PUBLIC_DIR, 'assets/js/data.js');
        const dataJsContent = `window.DEFAULT_DATA = ${JSON.stringify(data, null, 2)};\n`;
        fs.writeFileSync(dataJsPath, dataJsContent, 'utf8');
        console.log('Saved data.js');
        
        // 3. Compile and rewrite index.html
        const indexHtmlPath = path.join(PUBLIC_DIR, 'index.html');
        if (fs.existsSync(indexHtmlPath)) {
          let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
          const siteTitle = data.siteTitle || '誠創科技｜智慧 POS 解決方案';
          const siteOgTitle = (data.appearanceConfig && data.appearanceConfig.siteOgTitle) || siteTitle;
          const siteOgDesc = (data.appearanceConfig && data.appearanceConfig.siteOgDesc) || '提供最專業 of 智慧 POS 收銀系統、電子發票加值服務、多元支付整合及客製化開發一條龍解決方案。';
          const siteFavicon = images.siteFavicon || 'assets/images/logo.png';
          const siteOgImage = images.siteOgImage || 'assets/images/hero-bg.jpg';
          
          indexHtml = replaceTitle(indexHtml, siteTitle);
          indexHtml = replaceFavicon(indexHtml, siteFavicon);
          indexHtml = replaceMeta(indexHtml, 'og:title', siteOgTitle);
          indexHtml = replaceMeta(indexHtml, 'og:description', siteOgDesc);
          indexHtml = replaceMeta(indexHtml, 'og:image', siteOgImage);
          
          fs.writeFileSync(indexHtmlPath, indexHtml, 'utf8');
          console.log('Updated index.html headers');
        }
        
        // 4. Compile and rewrite ihome.html
        const ihomeHtmlPath = path.join(PUBLIC_DIR, 'ihome.html');
        if (fs.existsSync(ihomeHtmlPath)) {
          let ihomeHtml = fs.readFileSync(ihomeHtmlPath, 'utf8');
          const ihomeConfig = data.ihomeConfig || {};
          const ihomeOgTitle = ihomeConfig.ogTitle || '愛家居系統櫥櫃｜現代智能櫥櫃與空間收納規劃專家';
          const ihomeOgDesc = ihomeConfig.ogDesc || '關係企業「愛家居」為您量身打造低甲醛防潮智能櫥櫃與空間收納規劃，以極致工藝實踐美學與環保兼具的居家與營業空間。';
          const ihomeFavicon = images.ihomeFavicon || 'assets/images/ihome/logo.png';
          const ihomeOgImage = images.ihomeOgImage || 'assets/images/ihome/空間理念.jpg';
          
          ihomeHtml = replaceTitle(ihomeHtml, ihomeOgTitle);
          ihomeHtml = replaceFavicon(ihomeHtml, ihomeFavicon);
          ihomeHtml = replaceMeta(ihomeHtml, 'og:title', ihomeOgTitle);
          ihomeHtml = replaceMeta(ihomeHtml, 'og:description', ihomeOgDesc);
          ihomeHtml = replaceMeta(ihomeHtml, 'og:image', ihomeOgImage);
          
          fs.writeFileSync(ihomeHtmlPath, ihomeHtml, 'utf8');
          console.log('Updated ihome.html headers');
        }
        
        // 5. Compile and rewrite 404.html
        const page404Path = path.join(PUBLIC_DIR, '404.html');
        if (fs.existsSync(page404Path)) {
          let html404 = fs.readFileSync(page404Path, 'utf8');
          const siteTitle = data.siteTitle || '誠創科技｜智慧 POS 解決方案';
          const siteOgTitle = (data.appearanceConfig && data.appearanceConfig.siteOgTitle) || siteTitle;
          const siteOgDesc = (data.appearanceConfig && data.appearanceConfig.siteOgDesc) || '提供最專業的智慧 POS 收銀系統、電子發票加值服務、多元支付整合及客製化開發一條龍解決方案。';
          const siteFavicon = images.siteFavicon || 'assets/images/logo.png';
          const siteOgImage = images.siteOgImage || 'assets/images/hero-bg.jpg';
          
          html404 = replaceFavicon(html404, siteFavicon);
          html404 = replaceMeta(html404, 'og:title', siteOgTitle);
          html404 = replaceMeta(html404, 'og:description', siteOgDesc);
          html404 = replaceMeta(html404, 'og:image', siteOgImage);
          
          fs.writeFileSync(page404Path, html404, 'utf8');
          console.log('Updated 404.html headers');
        }
        
        // 6. Check for GitHub Token and push changes
        const tokenPath = path.join(PUBLIC_DIR, 'github_token.txt');
        let githubToken = '';
        if (fs.existsSync(tokenPath)) {
          githubToken = fs.readFileSync(tokenPath, 'utf8').trim();
        }
        
        if (githubToken) {
          const filesToSync = [
            'assets/js/data.js',
            'index.html',
            'ihome.html',
            '404.html',
            'assets/images/CH_LINEQR.jpg',
            'assets/images/ihome/CHihome_LINEQR.png'
          ];
          
          // Add custom image paths dynamically
          const customImages = findCustomImages();
          const allSyncFiles = [...filesToSync, ...customImages];
          
          console.log(`Starting GitHub deployment sync for ${allSyncFiles.length} files...`);
          uploadFilesSequentially(allSyncFiles, githubToken, 0, (err) => {
            if (err) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                gitPushSuccess: false,
                gitError: err.message || String(err)
              }));
            } else {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                gitPushSuccess: true
              }));
            }
          });
        } else {
          console.log('No github_token.txt found, skipped GitHub deployment push.');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            gitPushSuccess: false,
            gitError: 'No GitHub token configured (please save it to github_token.txt)'
          }));
        }
      } catch (err) {
        console.error('Error saving:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }
  
  // Resolve static files
  let reqPath = req.url;
  // Clean URL query or hash
  reqPath = reqPath.split('?')[0].split('#')[0];
  
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  } else if (reqPath === '/ihome') {
    reqPath = '/ihome.html';
  } else if (reqPath === '/admin') {
    reqPath = '/admin.html';
  }
  
  // TYPO checks
  if (reqPath.endsWith('.hml')) {
    reqPath = reqPath.replace(/\.hml$/, '.html');
  }
  
  const filePath = path.join(PUBLIC_DIR, reqPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // Return 404 page
      const page404 = path.join(PUBLIC_DIR, '404.html');
      fs.access(page404, fs.constants.F_OK, (err404) => {
        if (err404) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('File Not Found');
        } else {
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
          fs.createReadStream(page404).pipe(res);
        }
      });
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Local web compilation & deployment server running at http://localhost:${PORT}/`);
  console.log('To stop the server, press Ctrl+C');
});
