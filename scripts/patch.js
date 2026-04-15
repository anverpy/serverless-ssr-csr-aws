const fs = require('fs');
let code = fs.readFileSync('/home/andv/js_proj/lambda-ssr/index.js', 'utf8');

code = code.replace(
  /<div style="display: flex; justify-content: space-between; align-items: start;">[\s\S]*?<strong[^>]*>\$\{p\.nombre\}<\/strong>[\s\S]*?<span[^>]*>\$\{p\.categoria\}<\/span>[\s\S]*?<\/div>[\s\S]*?<span[^>]*>\$\{p\.serial_id\}<\/span>[\s\S]*?<\/div>/g,
  `<div>
        <div style="margin-bottom: 0.2rem;">
          <span style="color:#64748b; font-size:0.8rem; background: #0f172a; padding: 2px 8px; border-radius: 4px; font-family: monospace;">\${p.serial_id}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <strong style="color: #f8fafc; font-size: 1.1rem;">\${p.nombre}</strong> 
          <span style="color:#64748b; font-size:0.8rem; background: #1e1e2e; padding: 2px 8px; border-radius: 12px;">\${p.categoria}</span>
        </div>
      </div>`
);

code = code.replace(/color:#fb7185;/g, 'color:#f8fafc;'); // topCost
code = code.replace(/color:#34d399;/g, 'color:#f8fafc;'); // topRev
code = code.replace(/color:#60a5fa;/g, 'color:#f8fafc;'); // topRoi
code = code.replace(/color:#fbbf24;/g, 'color:#f8fafc;'); // bottomRoi
code = code.replace(/color:#e879f9;/g, 'color:#f8fafc;'); // trendingHtml

fs.writeFileSync('/home/andv/js_proj/lambda-ssr/index.js', code, 'utf8');
console.log('patched');
