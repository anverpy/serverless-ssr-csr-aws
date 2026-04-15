const getProductsQuery = (qs) => {
  let queryStr = "SELECT id, serial_id, nombre, descripcion, precio, categoria, seo_tags FROM products WHERE estado_desarrollo = 'EN_PRODUCCION'";
  const queryParams = [];
  
  if (qs.category && qs.category !== 'All') {
    const catsArray = qs.category.split(',');
    queryParams.push(catsArray);
    queryStr += ` AND categoria = ANY($${queryParams.length})`;
  }
  if (qs.min_price) {
    queryParams.push(Number(qs.min_price));
    queryStr += ` AND precio >= $${queryParams.length}`;
  }
  if (qs.max_price) {
    queryParams.push(Number(qs.max_price));
    queryStr += ` AND precio <= $${queryParams.length}`;
  }
  
  if (qs.sort === 'price_desc') {
    queryStr += " ORDER BY precio DESC LIMIT 30";
  } else if (qs.sort === 'price_asc') {
    queryStr += " ORDER BY precio ASC LIMIT 30";
  } else {
    queryStr += " ORDER BY precio DESC LIMIT 30";
  }

  return { queryStr, queryParams };
};

const getSsrQueries = () => ({
  globals: "SELECT SUM(coste_computo_usd) as total_cost, SUM(revenue) as total_rev, COUNT(*) as total_projects FROM products",
  topCost: "SELECT serial_id, nombre, coste_computo_usd, estado_desarrollo, categoria FROM products WHERE estado_desarrollo IN ('BETA_INTERNA', 'I+D') ORDER BY coste_computo_usd DESC LIMIT 5",
  topRev: "SELECT serial_id, nombre, revenue, coste_computo_usd, categoria, ((revenue - coste_computo_usd) / NULLIF(coste_computo_usd, 0)) * 100 as roi_pct FROM products WHERE estado_desarrollo = 'EN_PRODUCCION' ORDER BY revenue DESC LIMIT 5",
  categories: "SELECT categoria, COUNT(*) as count FROM products GROUP BY categoria ORDER BY count DESC",
  topRoi: "SELECT serial_id, nombre, revenue, coste_computo_usd, categoria, ((revenue - coste_computo_usd) / NULLIF(coste_computo_usd, 0)) * 100 as roi_pct FROM products WHERE estado_desarrollo = 'EN_PRODUCCION' ORDER BY roi_pct DESC NULLS LAST LIMIT 5",
  bottomRoi: "SELECT serial_id, nombre, revenue, coste_computo_usd, categoria, ((revenue - coste_computo_usd) / NULLIF(coste_computo_usd, 0)) * 100 as roi_pct FROM products WHERE estado_desarrollo = 'EN_PRODUCCION' ORDER BY roi_pct ASC NULLS LAST LIMIT 5",
  profitByCategory: "SELECT categoria, SUM(revenue - coste_computo_usd) as total_profit FROM products WHERE estado_desarrollo = 'EN_PRODUCCION' AND (revenue - coste_computo_usd) > 0 GROUP BY categoria ORDER BY total_profit DESC",
  costByState: "SELECT estado_desarrollo as state, SUM(coste_computo_usd) as total_cost FROM products GROUP BY estado_desarrollo ORDER BY total_cost DESC",
  trending: `
    WITH WeeklyAverages AS (
      SELECT
        product_id,
        AVG(CASE WHEN log_date >= CURRENT_DATE - INTERVAL '7 days' THEN daily_revenue END) as current_week_avg,
        AVG(CASE WHEN log_date >= CURRENT_DATE - INTERVAL '14 days' AND log_date < CURRENT_DATE - INTERVAL '7 days' THEN daily_revenue END) as prev_week_avg
      FROM daily_revenue_log
      GROUP BY product_id
    )
    SELECT 
      p.serial_id,
      p.nombre, 
      p.categoria,
      w.current_week_avg,
      w.prev_week_avg,
      ((w.current_week_avg - w.prev_week_avg) / NULLIF(w.prev_week_avg, 0)) * 100 as growth_pct
    FROM WeeklyAverages w
    JOIN products p ON p.id = w.product_id
    WHERE w.prev_week_avg > 0
    ORDER BY growth_pct DESC
    LIMIT 5
  `
});

const getMetricsQuery = () => "SELECT val FROM sys_metrics WHERE id = 'last_api_latency'";
const setMetricsQueries = () => [
  "CREATE TABLE IF NOT EXISTS sys_metrics (id VARCHAR(50) PRIMARY KEY, val INT)",
  "INSERT INTO sys_metrics (id, val) VALUES ('last_api_latency', $1) ON CONFLICT (id) DO UPDATE SET val = $1"
];

module.exports = {
  getProductsQuery,
  getSsrQueries,
  getMetricsQuery,
  setMetricsQueries
};
