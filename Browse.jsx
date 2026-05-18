import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabaseclient'
import { useAuth } from './AuthContext.jsx'
import { logAnalytics } from './analytics'

const isUrlString = (value) => {
  if (typeof value !== 'string') return false
  return /^(https?:\/\/|www\.)[\w\-]+(\.[\w\-]+)+[\w\-.,@?^=%&:/~+#]*[\w@?^=%&/~+#]$/.test(value)
}

const getMovieUrl = (movie) => movie.url || movie.link || movie.movie_url || movie.link_url || ''
const getMovieTitle = (movie) => movie.title || movie.name || movie.movie_title || `ID ${movie.movie_id ?? movie.id ?? 'unknown'}`

const subscriptionTiers = {
  Basic: 4.99,
  Standard: 9.99,
  Premium: 14.99,
}

const normalizeUrl = (value) => {
  if (typeof value !== 'string') return ''
  return value.startsWith('http') ? value : `https://${value}`
}

const isPlayableMedia = (url) => {
  if (typeof url !== 'string') return false
  return /\.(mp4|webm|ogg|mp3|wav|m4a|mov|flac|aac|m3u8)(\?.*)?$/i.test(url)
}

export default function Browse() {
  const { user } = useAuth()
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedGenre, setSelectedGenre] = useState('')
  const [selectedMovie, setSelectedMovie] = useState(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    async function loadMovies() {
      const { data, error } = await supabase.from('movies').select('*')

      if (error) {
        setError(error.message)
      } else {
        setMovies(data ?? [])
        await logAnalytics('browse_page_view', {
          page: 'browse',
          metadata: { total_movies: data?.length ?? 0 },
        })
      }
      setLoading(false)
    }

    loadMovies()
  }, [user])

  async function handleMovieClick(movie, event) {
    if (event?.preventDefault) {
      event.preventDefault()
    }

    const movieUrl = getMovieUrl(movie)
    const normalizedUrl = normalizeUrl(movieUrl)

    setSelectedMovie({ ...movie, playbackUrl: normalizedUrl })

    await logAnalytics('movie_click', {
      page: 'browse',
      movie_id: movie.movie_id ?? movie.id,
      movie_title: getMovieTitle(movie),
      metadata: {
        movie_link: movieUrl,
        clicked_by: user?.name ?? 'anonymous',
      },
    })
  }

  if (!user) {
    return (
      <div>
        <h2>Browse Movies</h2>
        <p>You need to be logged in to browse movie links.</p>
        <p>
          <Link to="/login">Login</Link> or <Link to="/register">create an account</Link> to continue.
        </p>
      </div>
    )
  }

  if (loading) {
    return <p>Loading movie table...</p>
  }

  if (error) {
    return <p style={{ color: 'red' }}>Error loading movies: {error}</p>
  }

  const columns = movies.length > 0 ? Object.keys(movies[0]) : []
  const genreOptions = Array.from(new Set(movies.map((movie) => movie.genre).filter(Boolean))).sort()
  const visibleMovies = selectedGenre ? movies.filter((movie) => movie.genre === selectedGenre) : movies

  return (
    <div>
      <h2>Browse Movies</h2>
      <div className="info-section">
        <p>
          <strong>Signed in as:</strong> {user.name}
        </p>
        <p>
          <strong>Pricing Tier:</strong>{' '}
          {user.subscription
            ? `${user.subscription} ($${subscriptionTiers[user.subscription]}/month)`
            : 'None selected'}
        </p>
      </div>

      {selectedMovie && selectedMovie.playbackUrl && (
        <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8 }}>
          <h3 style={{ marginTop: 0, marginBottom: '0.75rem' }}>Now playing: {getMovieTitle(selectedMovie)}</h3>
          {isPlayableMedia(selectedMovie.playbackUrl) ? (
            selectedMovie.playbackUrl.match(/\.(mp3|wav|m4a|aac|flac)(\?.*)?$/i) ? (
              <audio controls src={selectedMovie.playbackUrl} style={{ width: '100%' }} />
            ) : (
              <video controls src={selectedMovie.playbackUrl} style={{ width: '100%', maxHeight: 520 }} />
            )
          ) : (
            <iframe
              title={`Playback for ${getMovieTitle(selectedMovie)}`}
              src={selectedMovie.playbackUrl}
              style={{ width: '100%', height: 520, border: '1px solid rgba(0,0,0,0.12)' }}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            />
          )}
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setSelectedMovie(null)}
              style={{ padding: '0.5rem 0.75rem', cursor: 'pointer' }}
            >
              Close player
            </button>
            <a href={selectedMovie.playbackUrl} target="_blank" rel="noreferrer">
              Open in new tab
            </a>
          </div>
        </div>
      )}

      {movies.length === 0 ? (
        <p>No movies found in the database.</p>
      ) : (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 600 }}>Genre:</span>
              <select
                value={selectedGenre}
                onChange={(event) => setSelectedGenre(event.target.value)}
                style={{ padding: '0.5rem', minWidth: 180 }}
              >
                <option value="">All genres</option>
                {genreOptions.map((genre) => (
                  <option key={genre} value={genre}>
                    {genre}
                  </option>
                ))}
              </select>
            </label>
            {selectedGenre && (
              <button
                type="button"
                onClick={() => setSelectedGenre('')}
                style={{ padding: '0.5rem 0.75rem', cursor: 'pointer' }}
              >
                Clear filter
              </button>
            )}
          </div>
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
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
                {visibleMovies.map((movie, index) => (
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
                              href={normalizeUrl(value)}
                              onClick={(event) => handleMovieClick(movie, event)}
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
        </>
      )}
    </div>
  )
}
