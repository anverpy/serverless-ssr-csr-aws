const { Client } = require('pg');
const queries = require('./db-queries');

exports.handler = async (event) => {
  const path = event.path || event.rawPath || "/ssr";
  const qs = event.queryStringParameters || {};

  const client = new Client({
    host: 'postgres-db',
    port: 5432,
    user: 'admin',
    password: 'password',
    database: 'products_db',
  });

  let products = [];
  let dashboardData = {};
  let dbTime = 0;
  let apiLatency = 'N/A';

  try {
    const tDbStart = Date.now();
    await client.connect();
    
    // SSR Dashboard: Aggregation queries
    const q = queries.getSsrQueries();
    const [globalsRes, topCostRes, topRevRes, catRes, topRoiRes, bottomRoiRes, trendingRes, profitByCatRes, costByStateRes] = await Promise.all([
      client.query(q.globals),
      client.query(q.topCost),
      client.query(q.topRev),
      client.query(q.categories),
      client.query(q.topRoi),
      client.query(q.bottomRoi),
      client.query(q.trending),
      client.query(q.profitByCategory),
      client.query(q.costByState)
    ]);
    
    // Attempt to get API latency, but ignore if table does not exist
    let apiMetricsRes = null;
    try {
      apiMetricsRes = await client.query(queries.getMetricsQuery());
    } catch (e) {
      // Table might not exist yet
    }
    apiLatency = apiMetricsRes && apiMetricsRes.rows && apiMetricsRes.rows.length > 0 ? apiMetricsRes.rows[0].val : 'N/A';

    dashboardData = {
      globals: globalsRes.rows[0],
      topCost: topCostRes.rows,
      topRev: topRevRes.rows,
      categories: catRes.rows,
      topRoi: topRoiRes.rows,
      bottomRoi: bottomRoiRes.rows,
      trending: trendingRes.rows,
      profitByCategory: profitByCatRes.rows,
      costByState: costByStateRes.rows
    };
    
    dbTime = Date.now() - tDbStart;
  } catch (err) {
    console.error('Error executing query', err.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  } finally {
    await client.end();
  }

  const formatDollar = (num) => '$' + Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatPct = (num) => Number(num).toFixed(1) + '%';
  const formatDollarCompact = (num) => {
    const n = Number(num);
    if(n >= 1e6) return '$' + (n/1e6).toFixed(1) + 'M';
    if(n >= 1e3) return '$' + (n/1e3).toFixed(1) + 'K';
    return '$' + n.toFixed(1);
  };
  
  const generateDonutChart = (data, valueKey, labelKey, title, colors) => {
    let total = data.reduce((acc, curr) => acc + Number(curr[valueKey]), 0);
    if (total === 0) total = 1;

    let cumulativePct = 0;
    
    const svgSegments = data.map((item, idx) => {
        let val = Number(item[valueKey]);
        let pct = (val / total) * 100;
        
        let strokeDasharray = `${pct} ${100 - pct}`;
        // SVG circle starts at 3 o'clock. Move to 12 o'clock = 25 offset. 
        // We subtract cumulative percent from 25 to rotate correctly.
        let strokeDashoffset = 25 - cumulativePct;
        cumulativePct += pct;
        
        let color = colors[idx % colors.length];
        
        return `<circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="${color}" stroke-width="6" stroke-dasharray="${strokeDasharray}" stroke-dashoffset="${strokeDashoffset}"></circle>`;
    }).join("");
    
    // Legend HTML
    const legendHtml = data.map((item, idx) => {
        let color = colors[idx % colors.length];
        let pct = ((item[valueKey] / total) * 100).toFixed(1);
        return `<div style="display:flex;align-items:center;gap:6px;font-size:0.8rem;color:#cbd5e1;margin-bottom:6px; background:#12121a; padding:6px 8px; border-radius:4px; border-left:3px solid ${color};">
                  <span style="flex:1;">${item[labelKey]}</span>
                  <strong style="color:#f8fafc;">${formatDollarCompact(item[valueKey])} (${pct}%)</strong>
                </div>`;
    }).join("");

    return `
    <div style="background:#1e1e2e; padding:1.5rem; border-radius:8px; display:flex; flex-direction:column; align-items:center; gap:1.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
      <h3 style="color:#f8fafc; font-size:1.1rem; width:100%; border-bottom:1px solid #334155; padding-bottom:0.5rem; text-align:left; margin:0;">${title}</h3>
      <svg width="220" height="220" viewBox="0 0 42 42" class="donut">
        <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#334155" stroke-width="6"></circle>
        ${svgSegments}
        <text x="21" y="19.5" alignment-baseline="middle" text-anchor="middle" fill="#94a3b8" font-size="3" font-weight="normal">TOTAL</text>
        <text x="21" y="24" alignment-baseline="middle" text-anchor="middle" fill="#f8fafc" font-size="3.5" font-weight="bold">${formatDollarCompact(total)}</text>
      </svg>
      <div style="width:100%;">
        ${legendHtml}
      </div>
    </div>
    `;
  };

  const enrichedProfitCategory = dashboardData.profitByCategory.map(pc => {
    const cat = dashboardData.categories.find(c => c.categoria === pc.categoria);
    return {
      ...pc,
      categoriaDisplay: `${pc.categoria} <span style="color:#cbd5e1; font-size:0.85rem; font-weight:bold; margin-left:4px;">(${cat ? cat.count : 0} proy.)</span>`
    };
  });

  const profitChartHtml = generateDonutChart(
    enrichedProfitCategory,
    'total_profit',
    'categoriaDisplay',
    '💰 Beneficio Neto por Categoría (Prod.)',
    ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#6366f1']
  );

  const costChartHtml = generateDonutChart(
    dashboardData.costByState,
    'total_cost',
    'state',
    '🔥 Distribución del Gasto en Cómputo (GPU)',
    ['#ef4444', '#f97316', '#8b5cf6', '#14b8a6', '#64748b']
  );

  const topCostHtml = dashboardData.topCost.map(p => 
    `<li style="background: #12121a; padding: 1.2rem; border-radius: 8px; border-top: 4px solid #f43f5e; display: flex; flex-direction: column; gap: 0.5rem; justify-content: space-between;">
      <div>
        <div style="margin-bottom: 0.2rem;">
          <span style="color:#64748b; font-size:0.8rem; background: #0f172a; padding: 2px 8px; border-radius: 4px; font-family: monospace;">${p.serial_id}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <strong style="color: #f8fafc; font-size: 1.1rem;">${p.nombre}</strong> 
          <span style="color:#64748b; font-size:0.8rem; background: #1e1e2e; padding: 2px 8px; border-radius: 12px; white-space: nowrap;">${p.categoria}</span>
        </div>
      </div>
      <div>
        <span style="color:#f8fafc; font-size:1.3rem; font-weight:bold; display:block; margin-bottom:0.3rem;">${formatDollar(p.coste_computo_usd)}</span>
        <span style="font-size:0.7rem; color: #fda4af; background:#4c0519; padding:3px 8px; border-radius:12px; border: 1px solid #881337; display:inline-block;">Estado: ${p.estado_desarrollo}</span>
      </div>
    </li>`
  ).join('');
    
  const topRevHtml = dashboardData.topRev.map(p => 
    `<li style="background: #12121a; padding: 1.2rem; border-radius: 8px; border-top: 4px solid #10b981; display: flex; flex-direction: column; gap: 0.6rem; justify-content: space-between;">
      <div>
        <div style="margin-bottom: 0.2rem;">
          <span style="color:#64748b; font-size:0.8rem; background: #0f172a; padding: 2px 8px; border-radius: 4px; font-family: monospace;">${p.serial_id}</span>
        </div>
        <div style="display: flex; align-items: flex-start; flex-direction: column; gap: 4px;">
          <strong style="color: #f8fafc; font-size: 1.1rem;">${p.nombre}</strong> 
          <span style="color:#64748b; font-size:0.8rem; background: #1e1e2e; padding: 2px 8px; border-radius: 12px;">${p.categoria}</span>
        </div>
      </div>
      <div>
        <span style="color:#f8fafc; font-size:1.3rem; font-weight:bold;">${formatDollar(p.revenue)}</span>
        <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
          <div style="background: #064e3b; padding: 0.5rem; border-radius: 6px; flex: 1; text-align: center;">
            <span style="display: block; font-size: 0.65rem; color: #6ee7b7; text-transform: uppercase;">Costo</span>
            <span style="font-size: 0.8rem; color: #a7f3d0; font-weight: bold;">${formatDollar(p.coste_computo_usd)}</span>
          </div>
          <div style="background: #172554; padding: 0.5rem; border-radius: 6px; flex: 1; text-align: center;">
            <span style="display: block; font-size: 0.65rem; color: #93c5fd; text-transform: uppercase;">Margen</span>
            <span style="font-size: 0.8rem; color: #bfdbfe; font-weight: bold;">${formatPct(p.roi_pct)}</span>
          </div>
        </div>
      </div>
    </li>`
  ).join('');

  const topRoiHtml = dashboardData.topRoi.map(p => 
    `<li style="background: #12121a; padding: 1.2rem; border-radius: 8px; border-top: 4px solid #3b82f6; display: flex; flex-direction: column; gap: 0.6rem; justify-content: space-between;">
      <div>
        <div style="margin-bottom: 0.2rem;">
          <span style="color:#64748b; font-size:0.8rem; background: #0f172a; padding: 2px 8px; border-radius: 4px; font-family: monospace;">${p.serial_id}</span>
        </div>
        <div style="display: flex; align-items: flex-start; flex-direction: column; gap: 4px;">
          <strong style="color: #f8fafc; font-size: 1.1rem;">${p.nombre}</strong> 
          <span style="color:#64748b; font-size:0.8rem; background: #1e1e2e; padding: 2px 8px; border-radius: 12px;">${p.categoria}</span>
        </div>
      </div>
      <div>
        <span style="color:#f8fafc; font-size:1.3rem; font-weight:bold;">ROI: +${formatPct(p.roi_pct)}</span>
        <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
          <div style="background: #172554; padding: 0.5rem; border-radius: 6px; flex: 1; text-align: center;">
            <span style="display: block; font-size: 0.65rem; color: #93c5fd; text-transform: uppercase;">Ingresos</span>
            <span style="font-size: 0.8rem; color: #bfdbfe; font-weight: bold;">${formatDollar(p.revenue)}</span>
          </div>
          <div style="background: #2e1065; padding: 0.5rem; border-radius: 6px; flex: 1; text-align: center;">
            <span style="display: block; font-size: 0.65rem; color: #c4b5fd; text-transform: uppercase;">Cómputo</span>
            <span style="font-size: 0.8rem; color: #ddd6fe; font-weight: bold;">${formatDollar(p.coste_computo_usd)}</span>
          </div>
        </div>
      </div>
    </li>`
  ).join('');

  const bottomRoiHtml = dashboardData.bottomRoi.map(p => 
    `<li style="background: #12121a; padding: 1.2rem; border-radius: 8px; border-top: 4px solid #f59e0b; display: flex; flex-direction: column; gap: 0.6rem; justify-content: space-between;">
      <div>
        <div style="margin-bottom: 0.2rem;">
          <span style="color:#64748b; font-size:0.8rem; background: #0f172a; padding: 2px 8px; border-radius: 4px; font-family: monospace;">${p.serial_id}</span>
        </div>
        <div style="display: flex; align-items: flex-start; flex-direction: column; gap: 4px;">
          <strong style="color: #f8fafc; font-size: 1.1rem;">${p.nombre}</strong> 
          <span style="color:#64748b; font-size:0.8rem; background: #1e1e2e; padding: 2px 8px; border-radius: 12px;">${p.categoria}</span>
        </div>
      </div>
      <div>
        <span style="color:#f8fafc; font-size:1.3rem; font-weight:bold;">ROI: ${p.roi_pct > 0 ? '+' : ''}${formatPct(p.roi_pct)}</span>
        <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
          <div style="background: #422006; padding: 0.5rem; border-radius: 6px; flex: 1; text-align: center;">
            <span style="display: block; font-size: 0.65rem; color: #fcd34d; text-transform: uppercase;">Ingresos</span>
            <span style="font-size: 0.8rem; color: #fde68a; font-weight: bold;">${formatDollar(p.revenue)}</span>
          </div>
          <div style="background: #4c1d95; padding: 0.5rem; border-radius: 6px; flex: 1; text-align: center;">
            <span style="display: block; font-size: 0.65rem; color: #c4b5fd; text-transform: uppercase;">Cómputo</span>
            <span style="font-size: 0.8rem; color: #ddd6fe; font-weight: bold;">${formatDollar(p.coste_computo_usd)}</span>
          </div>
        </div>
      </div>
    </li>`
  ).join('');

  const trendingHtml = dashboardData.trending.map(p => 
    `<li style="background: #12121a; padding: 1.2rem; border-radius: 8px; border-top: 4px solid #c084fc; display: flex; flex-direction: column; gap: 0.6rem; justify-content: space-between;">
      <div>
        <div style="margin-bottom: 0.2rem;">
          <span style="color:#64748b; font-size:0.8rem; background: #0f172a; padding: 2px 8px; border-radius: 4px; font-family: monospace;">${p.serial_id}</span>
        </div>
        <div style="display: flex; align-items: flex-start; flex-direction: column; gap: 4px;">
          <strong style="color: #f8fafc; font-size: 1.1rem;">${p.nombre}</strong> 
          <span style="color:#64748b; font-size:0.8rem; background: #1e1e2e; padding: 2px 8px; border-radius: 12px;">${p.categoria}</span>
        </div>
      </div>
      <div>
        <span style="color:#f8fafc; font-size:1.3rem; font-weight:bold;">Crece: +${formatPct(p.growth_pct)} W/W</span>
        <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
          <div style="background: #2e1065; padding: 0.5rem; border-radius: 6px; flex: 1; text-align: center; border: 1px solid #4c1d95;">
            <span style="display: block; font-size: 0.6rem; color: #d8b4fe; text-transform: uppercase; letter-spacing: 0.05em;">W1 (Actual)</span>
            <span style="font-size: 0.85rem; color: #f3e8ff; font-weight: bold;">${formatDollar(p.current_week_avg)}</span>
          </div>
          <div style="background: #1e1e2e; padding: 0.5rem; border-radius: 6px; flex: 1; text-align: center; border: 1px solid #334155;">
            <span style="display: block; font-size: 0.6rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">W2 (Previa)</span>
            <span style="font-size: 0.85rem; color: #cbd5e1; font-weight: bold;">${formatDollar(p.prev_week_avg)}</span>
          </div>
        </div>
      </div>
    </li>`
  ).join('');
    
  const catHtml = dashboardData.categories.map(c => 
    `<li style="background: #12121a; padding: 1rem; border-radius: 6px; border-left: 3px solid #818cf8; display: flex; justify-content: space-between; align-items: center;">
      <span style="color:#cbd5e1; font-size:0.95rem;">${c.categoria}</span>
      <strong style="color:#a78bfa; font-size:1.1rem; background:#1e1b4b; padding:2px 8px; border-radius:4px;">${c.count}</strong>
    </li>`
  ).join('');

  let html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Dashboard Ejecutivo SSR - Reportes financieros y distribución de portafolio">
  <meta name="robots" content="index, follow">
  <title>Dashboard I+D — Analítica SSR</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0a0a0f; color: #e8e8f0; padding: 2rem; }
    header.site-header { text-align: center; padding: 2rem 0; border-bottom: 1px solid #222; margin-bottom: 2rem; }
    h1 { font-size: 2.2rem; color: #a78bfa; letter-spacing: -0.02em; }
    .ssr-badge { display: inline-block; background: #16a34a; color: #fff; font-size: 0.7rem; font-family: monospace; padding: 0.2rem 0.6rem; border-radius: 4px; margin-top: 0.5rem; letter-spacing: 0.1em; }
    .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 2rem; margin-top: 2rem; align-items: start; }
    .panel { background: #1e1e2e; border-radius: 8px; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .panel h3 { color: #f8fafc; font-size: 1.1rem; margin-bottom: 1rem; border-bottom: 1px solid #334155; padding-bottom: 0.5rem; }
    ul { list-style: none; }
    .kpi-row { display: flex; gap: 1rem; flex-wrap: wrap; }
    .kpi-card { background: #1e1e2e; padding: 1.5rem; border-radius: 8px; flex: 1; min-width: 200px; text-align: center; border-top: 4px solid #334155; }
    .kpi-value { font-size: 2rem; font-weight: bold; color: #f8fafc; margin-top: 0.5rem; }
    .kpi-title { color: #94a3b8; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .section-wrapper { margin-top: 3.5rem; }
    .section-title { font-size: 1.4rem; color: #f8fafc; border-bottom: 2px solid #334155; padding-bottom: 0.5rem; margin-bottom: 1.5rem; }
    .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; }
    .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem; }
    .grid-5 { display: grid; grid-template-columns: repeat(5, minmax(200px, 1fr)); gap: 1rem; align-items: start; }
    .vertical-list { display: flex; flex-direction: column; gap: 1rem; list-style: none; padding: 0; margin: 0; }
    .btn-csr { display: inline-block; margin-top: 1.5rem; padding: 0.8rem 1.5rem; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; transition: background 0.2s; box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.4); }                                                                                                                                                                                             .btn-csr:hover { background: #4f46e5; }
  </style>
</head>
<body>
  <header class="site-header">
    <h1>Dashboard Ejecutivo Global</h1>
    <span class="ssr-badge">⚡ SSR INTELIGENCIA DE NEGOCIO</span>
    <p style="margin-top:1rem;color:#e2e8f0;font-size:1.1rem; max-width: 800px; margin-left: auto; margin-right: auto; line-height: 1.5;">
      Generación en servidor <strong>(${dbTime}ms)</strong><br/>Último tiempo de respuesta de API: <strong>${apiLatency}ms</strong>
    </p>
    <a href="/csr-app/index.html" class="btn-csr">Ir a sitio de cliente</a>
  </header>
  
  <main>
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-title">Proyectos Totales</div>
        <div class="kpi-value">${dashboardData.globals.total_projects}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Gasto Global en I+D</div>
        <div class="kpi-value">${formatDollar(dashboardData.globals.total_cost)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Ingresos Brutos</div>
        <div class="kpi-value">${formatDollar(dashboardData.globals.total_rev)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Beneficio Neto</div>
        <div class="kpi-value">${formatDollar(dashboardData.globals.total_rev - dashboardData.globals.total_cost)}</div>
      </div>
    </div>

    <div class="section-wrapper">
      <h2 class="section-title">📊 Visión Macro y Salud de Negocio</h2>
      <div class="grid-2">
        ${profitChartHtml}
        ${costChartHtml}
      </div>
    </div>

    <div class="section-wrapper">
      <h2 class="section-title">🏆 Top Performers y ⚠️ Riesgos (Visión Panorámica)</h2>
      <div class="grid-5" style="overflow-x: auto;">
        
        <section class="panel" style="margin-bottom: 2rem;">
          <h3 style="color: #10b981; margin-bottom: 1rem; font-size: 1rem;">💰 Top Ingresos</h3>
          <ul class="vertical-list">${topRevHtml}</ul>
        </section>
        
        <section class="panel" style="margin-bottom: 2rem;">
          <h3 style="color: #3b82f6; margin-bottom: 1rem; font-size: 1rem;">📈 Mayor Rentabilidad</h3>
          <ul class="vertical-list">${topRoiHtml}</ul>
        </section>

        <section class="panel" style="margin-bottom: 2rem;">
          <h3 style="color: #c084fc; margin-bottom: 1rem; font-size: 1rem;">🚀 Crecimiento Top</h3>
          <ul class="vertical-list">${trendingHtml}</ul>
        </section>

        <section class="panel" style="border-top: 4px solid #ef4444; margin-bottom: 2rem;">
          <h3 style="color: #ef4444; margin-bottom: 1rem; font-size: 1rem;">🔥 Fugas Capital</h3>
          <ul class="vertical-list">${topCostHtml}</ul>
        </section>
        
        <section class="panel" style="border-top: 4px solid #f59e0b; margin-bottom: 2rem;">
          <h3 style="color: #f59e0b; margin-bottom: 1rem; font-size: 1rem;">⚠️ Alerta de Riesgo</h3>
          <ul class="vertical-list">${bottomRoiHtml}</ul>
        </section>
        
      </div>
    </div>
  </main>

  <footer style="text-align:center;padding:3rem 0 1rem;color:#334155;font-size:0.75rem;font-family:monospace;">
    Generado dinámicamente vía AWS Lambda · BD PostgreSQL · ${new Date().toISOString()}
  </footer>
</body>
</html>`;

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Render-Mode": "SSR",
      "X-Products-Count": String(dashboardData.globals.total_projects),
    },
    body: html,
  };
};
