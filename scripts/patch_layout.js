const fs = require('fs');
let code = fs.readFileSync('/home/andv/js_proj/src/App.jsx', 'utf8');

// Replace top level container start
code = code.replace(
  `<div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem', padding: '1.5rem', background: '#12121a', borderRadius: '12px', border: '1px solid #1e1e2e', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>`,
  `<div style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem', marginBottom: '2rem' }}>\n      <aside style={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem', background: '#12121a', borderRadius: '12px', border: '1px solid #1e1e2e', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', position: 'sticky', top: '2rem' }}>`
);

// Replace modern filters row to column
code = code.replace(
  `<div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', borderTop: '1px solid #1e1e2e', paddingTop: '1.5rem' }}>`,
  `<div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', borderTop: '1px solid #1e1e2e', paddingTop: '1.5rem' }}>`
);

// Replace minWidth values to adapt to sidebar
code = code.replace(
  /<div style={{ flex: '1', minWidth: '120px' }}>/g,
  `<div style={{ width: '100%' }}>`
);
code = code.replace(
  `<div style={{ flex: '2', minWidth: '200px' }}>`,
  `<div style={{ width: '100%' }}>`
);

// Close aside instead of div, start main wrapper
code = code.replace(
  `      </div>\n\n      <main>`,
  `      </aside>\n\n      <main style={{ flex: '1', minWidth: '0' }}>`
);

// Close layout container
code = code.replace(
  `      </main>\n\n      <footer className="site-footer">`,
  `      </main>\n      </div>\n\n      <footer className="site-footer">`
);

// Update category filter layout to flex-column
code = code.replace(
  `<div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>`,
  `<div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>`
);

// Remove button flex center since it's column to align text to left
code = code.replace(
  `                    display: 'flex',\n                    alignItems: 'center',\n                    gap: '0.4rem',`,
  `                    display: 'flex',\n                    alignItems: 'center',\n                    justifyContent: 'flex-start',\n                    gap: '0.6rem',`
);

fs.writeFileSync('/home/andv/js_proj/src/App.jsx', code, 'utf8');
console.log('Layout patched');
