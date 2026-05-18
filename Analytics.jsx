import { useEffect, useState } from 'react'
import { supabase } from './supabaseclient'
import { getCurrentUser, isAdmin } from './auth'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function Analytics() {
  const [analytics, setAnalytics] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const currentUser = getCurrentUser()

  // Filter states
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [eventTypeFilter, setEventTypeFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [movieFilter, setMovieFilter] = useState('')

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0', '#82d8d8', '#ffb347']

  useEffect(() => {
    async function loadAnalytics() {
      if (!isAdmin(currentUser)) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('analytics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000)

      if (error) {
        setError(error.message)
      } else {
        setAnalytics(data ?? [])
      }
      setLoading(false)
    }

    loadAnalytics()
  }, [currentUser])

  // Apply filters
  const filteredAnalytics = analytics.filter((event) => {
    const eventDate = new Date(event.created_at).toISOString().split('T')[0]
    if (eventDate < startDate || eventDate > endDate) return false
    if (eventTypeFilter && event.event_type !== eventTypeFilter) return false
    if (userFilter && event.user_name !== userFilter) return false
    if (movieFilter && event.movie_title !== movieFilter) return false
    return true
  })

  // Calculate metrics
  const uniqueUsers = new Set(filteredAnalytics.map(e => e.user_id)).size
  const eventCounts = filteredAnalytics.reduce((acc, item) => {
    acc[item.event_type] = (acc[item.event_type] || 0) + 1
    return acc
  }, {})

  const userActivity = filteredAnalytics.reduce((acc, item) => {
    const username = item.user_name || 'Guest'
    if (!acc[username]) acc[username] = { name: username, events: 0, logins: 0 }
    acc[username].events++
    if (item.event_type === 'login_success') acc[username].logins++
    return acc
  }, {})

  const userActivityList = Object.values(userActivity)
    .sort((a, b) => b.events - a.events)
    .slice(0, 10)

  const movieCounts = filteredAnalytics.reduce((acc, item) => {
    const title = item.movie_title || 'Unknown'
    if (!title || title === 'Unknown') return acc
    if (!acc[title]) acc[title] = { title, views: 0, clicks: 0 }
    if (item.event_type === 'browse_page_view') acc[title].views++
    else if (item.event_type === 'movie_click') acc[title].clicks++
    return acc
  }, {})

  const movieEngagement = Object.values(movieCounts)
    .sort((a, b) => (b.views + b.clicks) - (a.views + a.clicks))
    .slice(0, 10)

  // Parse browser info
  const deviceBreakdown = filteredAnalytics.reduce((acc, item) => {
    const ua = item.metadata?.browser || 'Unknown'
    let device = 'Other'
    if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) device = 'Mobile'
    else if (ua.includes('Windows')) device = 'Windows'
    else if (ua.includes('Mac')) device = 'macOS'
    else if (ua.includes('Linux')) device = 'Linux'
    
    const existing = acc.find(d => d.name === device)
    if (existing) existing.value++
    else acc.push({ name: device, value: 1 })
    return acc
  }, [])

  // Events by hour
  const eventsByHour = filteredAnalytics.reduce((acc, item) => {
    const hour = new Date(item.created_at).toLocaleString('en-US', { hour: '2-digit', hour12: false })
    const existing = acc.find(e => e.hour === hour)
    if (existing) existing.events++
    else acc.push({ hour, events: 1 })
    return acc
  }, [])
  eventsByHour.sort((a, b) => a.hour - b.hour)

  // Get unique event types for filter
  const eventTypes = [...new Set(analytics.map(e => e.event_type))]
  const userNames = [...new Set(analytics.map(e => e.user_name).filter(Boolean))]
  const movieTitles = [...new Set(analytics.filter(e => e.movie_title).map(e => e.movie_title))]

  const exportToCSV = () => {
    const headers = ['Timestamp', 'User', 'Event Type', 'Page', 'Movie', 'Browser', 'URL']
    const rows = filteredAnalytics.map(e => [
      new Date(e.created_at).toLocaleString(),
      e.user_name || 'Guest',
      e.event_type,
      e.page || '-',
      e.movie_title || '-',
      e.metadata?.browser || '-',
      e.metadata?.url || '-'
    ])
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (!currentUser) {
    return <div><h2>Analytics</h2><p>Please log in as an admin user to access analytics.</p></div>
  }

  if (!isAdmin(currentUser)) {
    return <div><h2>Analytics</h2><p>You are not authorized to view this page. Admin only.</p></div>
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Admin Analytics Dashboard</h2>

      {/* Header */}
      <section style={{ marginBottom: '1.5rem' }}>
        <p>Logged in as <strong>{currentUser.name}</strong></p>
        <p>Total analytics events: {filteredAnalytics.length} (filtered from {analytics.length})</p>
      </section>

      {/* Filters */}
      <section style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9f9f9', borderRadius: '6px' }}>
        <h3>Filters</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <label>Start Date:</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div>
            <label>End Date:</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div>
            <label>Event Type:</label>
            <select value={eventTypeFilter} onChange={(e) => setEventTypeFilter(e.target.value)} style={{ width: '100%' }}>
              <option value="">All Events</option>
              {eventTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label>User:</label>
            <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} style={{ width: '100%' }}>
              <option value="">All Users</option>
              {userNames.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label>Movie:</label>
            <select value={movieFilter} onChange={(e) => setMovieFilter(e.target.value)} style={{ width: '100%' }}>
              <option value="">All Movies</option>
              {movieTitles.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button onClick={exportToCSV} style={{ width: '100%', padding: '0.5rem', cursor: 'pointer', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}>
              Export to CSV
            </button>
          </div>
        </div>
      </section>

      {/* Summary Cards */}
      <section style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <Card title="Total Events" value={filteredAnalytics.length} />
        <Card title="Unique Users" value={uniqueUsers} />
        <Card title="Logins" value={eventCounts['login_success'] || 0} />
        <Card title="Most Active User" value={userActivityList[0]?.name || 'N/A'} />
      </section>

      {/* Charts */}
      <section style={{ marginBottom: '1.5rem' }}>
        <h3>Events Over Time</h3>
        {eventsByHour.length > 0 && (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={eventsByHour}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="events" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      <section style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem' }}>
        <div>
          <h3>Event Type Distribution</h3>
          {Object.keys(eventCounts).length > 0 && (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={Object.entries(eventCounts).map(([name, value]) => ({ name, value }))} cx="50%" cy="50%" labelLine={false} label={({name, value}) => `${name}: ${value}`} outerRadius={80}>
                  {Object.entries(eventCounts).map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div>
          <h3>Device Breakdown</h3>
          {deviceBreakdown.length > 0 && (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={deviceBreakdown} cx="50%" cy="50%" labelLine={false} label={({name, value}) => `${name}: ${value}`} outerRadius={80}>
                  {deviceBreakdown.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h3>Top Users (by event count)</h3>
        {userActivityList.length > 0 && (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={userActivityList}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="events" fill="#82ca9d" name="Total Events" />
              <Bar dataKey="logins" fill="#ffc658" name="Logins" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h3>Movie Engagement (Views vs Clicks)</h3>
        {movieEngagement.length > 0 && (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={movieEngagement}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="title" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="views" fill="#8884d8" name="Views" />
              <Bar dataKey="clicks" fill="#ff7c7c" name="Clicks" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Tables */}
      <section style={{ marginBottom: '1.5rem' }}>
        <h3>User Activity Summary</h3>
        {userActivityList.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>User</th>
                  <th style={tableHeaderStyle}>Total Events</th>
                  <th style={tableHeaderStyle}>Logins</th>
                </tr>
              </thead>
              <tbody>
                {userActivityList.map(user => (
                  <tr key={user.name}>
                    <td style={tableCellStyle}>{user.name}</td>
                    <td style={tableCellStyle}>{user.events}</td>
                    <td style={tableCellStyle}>{user.logins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No user activity data.</p>
        )}
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h3>Movie Engagement Summary</h3>
        {movieEngagement.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>Movie Title</th>
                  <th style={tableHeaderStyle}>Views</th>
                  <th style={tableHeaderStyle}>Clicks</th>
                  <th style={tableHeaderStyle}>Total Engagement</th>
                </tr>
              </thead>
              <tbody>
                {movieEngagement.map(movie => (
                  <tr key={movie.title}>
                    <td style={tableCellStyle}>{movie.title}</td>
                    <td style={tableCellStyle}>{movie.views}</td>
                    <td style={tableCellStyle}>{movie.clicks}</td>
                    <td style={tableCellStyle}>{movie.views + movie.clicks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No movie engagement data.</p>
        )}
      </section>

      <section>
        <h3>Detailed Events</h3>
        {loading ? (
          <p>Loading analytics...</p>
        ) : error ? (
          <p style={{ color: 'red' }}>Error loading analytics: {error}</p>
        ) : filteredAnalytics.length === 0 ? (
          <p>No analytics records match the current filters.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1100px' }}>
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>Time</th>
                  <th style={tableHeaderStyle}>User</th>
                  <th style={tableHeaderStyle}>Event</th>
                  <th style={tableHeaderStyle}>Page</th>
                  <th style={tableHeaderStyle}>Movie</th>
                  <th style={tableHeaderStyle}>Browser</th>
                </tr>
              </thead>
              <tbody>
                {filteredAnalytics.slice(0, 100).map((event, index) => (
                  <tr key={event.id ?? index}>
                    <td style={tableCellStyle}>{new Date(event.created_at).toLocaleString()}</td>
                    <td style={tableCellStyle}>{event.user_name || 'Guest'}</td>
                    <td style={tableCellStyle}>{event.event_type}</td>
                    <td style={tableCellStyle}>{event.page || '-'}</td>
                    <td style={tableCellStyle}>{event.movie_title || '-'}</td>
                    <td style={{ ...tableCellStyle, fontSize: '0.85rem', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.metadata?.browser || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredAnalytics.length > 100 && <p style={{ marginTop: '1rem', color: '#666' }}>Showing first 100 of {filteredAnalytics.length} events</p>}
          </div>
        )}
      </section>
    </div>
  )
}

function Card({ title, value }) {
  return (
    <div style={{ padding: '1rem', background: '#f0f0f0', borderRadius: '6px', border: '1px solid #ddd' }}>
      <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>{title}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#333' }}>{value}</div>
    </div>
  )
}

const tableHeaderStyle = { border: '1px solid rgba(0,0,0,0.12)', padding: '0.75rem', background: '#f7f7f7', fontWeight: 'bold' }
const tableCellStyle = { border: '1px solid rgba(0,0,0,0.12)', padding: '0.75rem' }
