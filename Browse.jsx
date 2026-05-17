import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabaseclient'

const isUrlString = (value) => {
  if (typeof value !== 'string') return false
  return /^(https?:\/\/|www\.)[\w\-]+(\.[\w\-]+)+[\w\-.,@?^=%&:/~+#]*[\w@?^=%&/~+#]$/.test(value)
}

function Dropdown({ value, onChange, options, placeholder = 'Select…' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const current = options.find((o) => o.value === value)

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: 160 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          width: '100%',
          height: 36,
          padding: '0 12px',
          background: 'white',
          border: '1px solid rgba(0,0,0,0.18)',
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 14,
          color: '#000',
        }}
      >
        <span>{current ? current.label : placeholder}</span>
        <span style={{ fontSize: 10, opacity: 0.5 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            margin: 0,
            padding: 0,
            listStyle: 'none',
            background: 'white',
            border: '1px solid rgb(0, 0, 0)',
            borderRadius: 6,
            zIndex: 50,
            maxHeight: 220,
            overflowY: 'auto',
          }}
        >
          {options.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              style={{
                padding: '8px 12px',
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                background: opt.value === value ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
                color: '#000',
              }}
            >
              {opt.label}
              {opt.value === value && <span style={{ opacity: 0.5 }}>✓</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Browse() {
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedGenre, setSelectedGenre] = useState('')

  useEffect(() => {
    async function loadMovies() {
      const { data, error } = await supabase
        .from('movies')
        .select('*')

      if (error) {
        setError(error.message)
      } else {
        setMovies(data ?? [])
      }
      setLoading(false)
    }

    loadMovies()
  }, [])

  if (loading) {
    return <p>Loading movie table...</p>
  }

  if (error) {
    return <p style={{ color: 'red' }}>Error loading movies: {error}</p>
  }

  const columns = movies.length > 0 ? Object.keys(movies[0]) : []

  // Build genre options from unique values in the genre column
  const genreOptions = [
    { value: '', label: 'All genres' },
    ...Array.from(new Set(movies.map((m) => m.genre).filter(Boolean)))
      .sort()
      .map((g) => ({ value: g, label: g })),
  ]

  // Filter movies by selected genre
  const visible = movies.filter((movie) =>
    selectedGenre ? movie.genre === selectedGenre : true
  )

  return (
    <div>
      <h2>Browse Movies</h2>

      {/* Genre filter bar */}
      {movies.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: '1rem' }}>
          <span style={{ fontSize: 14, opacity: 0.6 }}>Genre</span>
          <Dropdown
            value={selectedGenre}
            onChange={setSelectedGenre}
            options={genreOptions}
            placeholder="All genres"
          />
          {selectedGenre && (
            <button
              onClick={() => setSelectedGenre('')}
              style={{
                fontSize: 13,
                padding: '0 10px',
                height: 36,
                border: '1px solid rgba(0,0,0,0.15)',
                borderRadius: 6,
                cursor: 'pointer',
                background: 'transparent',
              }}
            >
              Clear
            </button>
          )}
          {selectedGenre && (
            <span style={{ fontSize: 13, opacity: 0.5 }}>
              {visible.length} of {movies.length} movies
            </span>
          )}
        </div>
      )}

      {movies.length === 0 ? (
        <p>No movies found in the database.</p>
      ) : (
        <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column}
                    style={{
                      border: '1px solid rgba(0,0,0,0.12)',
                      padding: '0.75rem',
                      textAlign: 'left',
                      background: 'rgba(0,0,0,0.05)',
                    }}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((movie, index) => (
                <tr key={movie.id ?? movie.movie_id ?? index}>
                  {columns.map((column) => {
                    const value = movie[column]
                    const display =
                      value === null || value === undefined
                        ? '-'
                        : typeof value === 'object'
                        ? JSON.stringify(value)
                        : String(value)

                    return (
                      <td
                        key={column}
                        style={{
                          border: '1px solid rgba(0,0,0,0.12)',
                          padding: '0.75rem',
                          verticalAlign: 'top',
                        }}
                      >
                        {isUrlString(value) ? (
                          <a
                            href={value.startsWith('http') ? value : `https://${value}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {String(value)}
                          </a>
                        ) : (
                          display
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
