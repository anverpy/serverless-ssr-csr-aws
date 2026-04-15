import { useState, useEffect } from 'react'
import './App.css'

// En build de producción, apunta al API Gateway de LocalStack.
// En dev, el proxy de Vite redirige /api → LocalStack.
const API_URL = import.meta.env.VITE_API_URL || '/api/products'

const CATEGORY_COLORS = {
  'Natural Language Processing': '#6366f1',
  'Computer Vision': '#0ea5e9',
  'Data Analytics': '#f59e0b',
  'AI Audio': '#ec4899',
  'Herramientas Dev': '#10b981',
}

function ProductCard({ product }) {
  const color = CATEGORY_COLORS[product.categoria] || '#94a3b8'
  const tags = product.seo_tags.split(', ')

  return (
    <article className="product-card" style={{ '--accent': color }}>
      <div className="card-inner">
        <header>
          <div style={{ marginBottom: '0.5rem' }}>
            <span className="category">👑 Top // {product.categoria}</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold', fontFamily: 'monospace', marginBottom: '0.2rem' }}>{product.serial_id}</div>
          <h2 style={{ margin: 0, color: '#f8fafc' }}>{product.nombre}</h2>
        </header>
        <p className="description">{product.descripcion}</p>
        <footer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.8rem' }}>
            <span className="price" style={{ color: '#f8fafc' }}>Precio: €{Number(product.precio).toFixed(2)}</span>
          </div>
          <ul className="tags">
            {tags.map(t => <li key={t}>#{t}</li>)}
          </ul>
        </footer>
      </div>
    </article>
  )
}

function Skeleton() {
  return (
    <div className="skeleton-card">
      <div className="skel skel-cat" />
      <div className="skel skel-title" />
      <div className="skel skel-desc" />
      <div className="skel skel-desc short" />
      <div className="skel skel-price" />
    </div>
  )
}

function ProductListItem({ product }) {
  const color = CATEGORY_COLORS[product.categoria] || '#94a3b8'
  const tags = product.seo_tags.split(', ')

  return (
    <article style={{ display: 'flex', gap: '1.5rem', background: '#0e0e1a', padding: '1rem', borderRadius: '6px', borderLeft: `4px solid ${color}`, marginBottom: '1rem', borderTop: '1px solid #1a1a2e', borderRight: '1px solid #1a1a2e', borderBottom: '1px solid #1a1a2e', alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ flex: '2', minWidth: '250px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.4rem' }}>
          <span style={{ fontSize: '0.7rem', color, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold' }}>{product.categoria}</span>
        </div>
        <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold', fontFamily: 'monospace', marginBottom: '0.2rem' }}>{product.serial_id}</div>
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', color: '#e2e8f0' }}>{product.nombre}</h2>
        <p style={{ fontSize: '0.9rem', color: '#cbd5e1', margin: 0, lineHeight: '1.5' }}>{product.descripcion}</p>
      </div>
      <div style={{ flex: '1', minWidth: '200px' }}>
        <ul className="tags" style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
          {tags.map(t => <li key={t} style={{ fontSize: '0.7rem', background: '#1e293b', color: '#e2e8f0', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #334155' }}>#{t}</li>)}
        </ul>
      </div>
            <div style={{ flex: '1', minWidth: '150px', textAlign: 'right' }}>
        <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#e2e8f0', fontFamily: 'Georgia, serif' }}>€{Number(product.precio).toFixed(2)}</div>
      </div>
    </article>
  )
}

export default function App() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [fetchTime, setFetchTime] = useState(null)
  
  const [categories, setCategories] = useState([])
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sort, setSort] = useState('price_desc')
  const [viewMode, setViewMode] = useState('list')

  const toggleCategory = (cat) => {
    setCategories(prev => 
      prev.includes(cat) 
        ? prev.filter(c => c !== cat) 
        : [...prev, cat]
    )
  }

  useEffect(() => {
    setLoading(true)
    const t0 = performance.now()
    
    const params = new URLSearchParams()
    if (categories.length > 0) params.append('category', categories.join(','))
    if (minPrice) params.append('min_price', minPrice)
    if (maxPrice) params.append('max_price', maxPrice)
    if (sort !== 'price_desc') params.append('sort', sort)
    
    // Si API_URL ya tiene querystring, agregamos los nuevos con & o ?
    const separator = API_URL.includes('?') ? '&' : '?'
    const fetchUrl = params.toString() ? `${API_URL}${separator}${params.toString()}` : API_URL

    fetch(fetchUrl)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        setProducts(data)
        setFetchTime(Math.round(performance.now() - t0))
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [categories, minPrice, maxPrice, sort])

  const categoryOptions = [
    'Natural Language Processing',
    'Computer Vision',
    'Data Analytics',
    'AI Audio'
  ];

  return (
    <div className="app">
      <header className="site-header">
        <div className="header-content">
          <h1>El Mejor <span className="highlight">Catálogo</span> de <span className="highlight">IA</span> Empresarial</h1>
          <p style={{ marginTop: '1rem', color: '#94a3b8', fontSize: '1.1rem' }}>Saca ventaja competitiva automatizando tus operaciones con las mejores IAs</p>
        </div>
      </header>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem', marginBottom: '2rem' }}>
      <aside style={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem', background: '#12121a', borderRadius: '12px', border: '1px solid #1e1e2e', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', position: 'sticky', top: '2rem' }}>
        
        {/* Modern Category Selector */}
        <div>
          <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.8rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filtro de Categorías</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {categoryOptions.map(cat => {
              const color = CATEGORY_COLORS[cat] || '#94a3b8';
              const active = categories.includes(cat);
              return (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <span style={{ 
                    display: 'inline-block', 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '50%', 
                    background: color,
                    flexShrink: 0,
                    boxShadow: `0 0 8px ${color}80`
                  }}></span>
                  <button 
                    onClick={() => toggleCategory(cat)}
                    style={{
                      background: active ? `${color}20` : '#0f172a',
                      color: active ? '#ffffff' : '#64748b',
                      border: `1px solid ${active ? color : '#334155'}`,
                      padding: '0.5rem 1rem',
                      borderRadius: '20px',
                      fontSize: '0.85rem',
                      fontWeight: active ? 'bold' : 'normal',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      width: '100%',
                      textAlign: 'left',
                      boxShadow: active ? `0 0 10px ${color}40` : 'none'
                    }}
                  >
                    {cat}
                  </button>
                </div>
              );
            })}
            
            {categories.length > 0 && (
              <button 
                onClick={() => setCategories([])} 
                style={{
                  background: 'transparent',
                  color: '#ef4444',
                  border: 'none',
                  padding: '0.5rem 0.5rem',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Other Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', borderTop: '1px solid #1e1e2e', paddingTop: '1.5rem' }}>
          <div style={{ width: '100%' }}>
            <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Precio Base Mín. (€)</label>
            <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="0" style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#f8fafc', outline: 'none' }} />
          </div>
          <div style={{ width: '100%' }}>
            <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Precio Base Máx. (€)</label>
            <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="999" style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#f8fafc', outline: 'none' }} />
          </div>
          <div style={{ width: '100%' }}>
            <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.6rem', fontSize: '0.85rem' }}>Organizar Ranking Por</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', background: '#0f172a', padding: '1rem', borderRadius: '6px', border: '1px solid #334155' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', color: '#f8fafc', fontSize: '0.9rem' }}>
                <input 
                  type="radio" 
                  value="price_desc" 
                  checked={sort === 'price_desc'} 
                  onChange={e => setSort(e.target.value)} 
                  style={{ accentColor: '#0ea5e9', transform: 'scale(1.2)' }} 
                />
                <span>💰 Mayor Precio Base</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', color: '#f8fafc', fontSize: '0.9rem' }}>
                <input 
                  type="radio" 
                  value="price_asc" 
                  checked={sort === 'price_asc'} 
                  onChange={e => setSort(e.target.value)} 
                  style={{ accentColor: '#0ea5e9', transform: 'scale(1.2)' }} 
                />
                <span>💵 Menor Precio Base</span>
              </label>
            </div>
          </div>
        </div>
      </aside>

      <main style={{ flex: '1', minWidth: '0' }}>
        {error && (
          <div className="error-state">
            <p>❌ Error al cargar productos: <code>{error}</code></p>
            <p>Asegúrate de que LocalStack está corriendo y la Lambda desplegada.</p>
          </div>
        )}

        {!loading && (
          <section style={{ background: '#1e1e2e', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', borderLeft: '4px solid #0ea5e9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ color: '#0ea5e9', marginBottom: '0.5rem', fontSize: '1.2rem' }}>🛒 Las Mejores IAs para Tu Empresa</h3>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#e2e8f0', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  {products.length} Solucion{products.length !== 1 ? 'es' : ''} IA de Alto Rendimiento
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button 
                    onClick={() => setViewMode('grid')}
                    style={{ padding: '0.4rem 0.8rem', background: viewMode === 'grid' ? '#0ea5e9' : '#0f172a', color: viewMode === 'grid' ? '#fff' : '#94a3b8', border: '1px solid #334155', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', transition: 'all 0.2s' }}
                  >
                    Cuadrícula
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    style={{ padding: '0.4rem 0.8rem', background: viewMode === 'list' ? '#0ea5e9' : '#0f172a', color: viewMode === 'list' ? '#fff' : '#94a3b8', border: '1px solid #334155', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', transition: 'all 0.2s' }}
                  >
                    Lista
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        <div className={viewMode === 'grid' ? "grid" : "list-view"}>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)
            : products.map(p => viewMode === 'grid' ? <ProductCard key={p.id} product={p} /> : <ProductListItem key={p.id} product={p} />)
          }
        </div>
      </main>
      </div>

      <footer className="site-footer">
        Catálogo Premium de IA Empresarial · Evaluadas por Rendimiento y ROI
      </footer>
    </div>
  )
}
