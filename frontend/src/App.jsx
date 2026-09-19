import React, { useEffect, useState } from 'react'

const NAV = [
  ['dashboard', 'Overview', '⌂'],
  ['analytics', 'Analytics', '↗'],
  ['budgets', 'Budgets', '◫'],
  ['fx', 'FX Portfolio', '💱'],
  ['hub', 'Financial hub', '✦']
]

const today = new Date().toISOString().slice(0, 10)

function useApi(path, refreshKey = 0) {
  const [state, setState] = useState({ loading: true, data: null, error: null })
  const load = async () => {
    setState((current) => ({ ...current, loading: true, error: null }))
    try {
      const response = await fetch(path)
      if (!response.ok) throw new Error('Could not load data.')
      setState({ loading: false, data: await response.json(), error: null })
    } catch (error) {
      setState({ loading: false, data: null, error: error.message })
    }
  }
  useEffect(() => { load() }, [path, refreshKey])
  return { ...state, load }
}

function formatMoney(value, currency = 'USD') {
  return new Intl.NumberFormat(undefined, { 
    style: 'currency', 
    currency, 
    maximumFractionDigits: currency === 'JPY' ? 0 : 2 
  }).format(value || 0)
}

function App() {
  const [view, setView] = useState('dashboard')
  const [currency, setCurrency] = useState('USD')
  const [dark, setDark] = useState(() => localStorage.getItem('ledger-theme') === 'dark')
  const [privateMode, setPrivateMode] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const triggerRefresh = () => setRefreshKey(k => k + 1)
  
  // Modals state
  const [composerModal, setComposerModal] = useState({ open: false, editingItem: null })
  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [subModalOpen, setSubModalOpen] = useState(false)
  const [goalModalOpen, setGoalModalOpen] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    localStorage.setItem('ledger-theme', dark ? 'dark' : 'light')
  }, [dark])

  // Hotkey Listeners (A = Add, / = Search, P = Privacy)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName.toLowerCase()
      if (['input', 'textarea', 'select'].includes(tag) || e.target.isContentEditable) return
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault()
        setComposerModal({ open: true, editingItem: null })
      } else if (e.key === '/') {
        e.preventDefault()
        document.getElementById('search-input')?.focus()
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault()
        setPrivateMode(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className={privateMode ? 'app private' : 'app'}>
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">🛡️</span><span className="brand-title">VaultLedger</span></div>
        <p className="eyebrow">Workspace</p>
        <nav>
          {NAV.map(([id, label, icon]) => (
            <button key={id} className={view === id ? 'nav-item active' : 'nav-item'} onClick={() => setView(id)}>
              <span>{icon}</span>{label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom"><span className="live-dot" />Local-first finance workspace</div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-label">{NAV.find(([id]) => id === view)?.[1]}</div>
          <div className="topbar-actions">
            <button className="icon-button" onClick={() => setPrivateMode(!privateMode)} title="Toggle Privacy Mode (HotKey: P)">
              {privateMode ? '◌' : '◉'}
            </button>
            <button className="icon-button" onClick={() => setDark(!dark)} title="Toggle Color Theme">
              {dark ? '☼' : '☾'}
            </button>
            <button className="primary-button" onClick={() => setComposerModal({ open: true, editingItem: null })}>
              <span>＋</span> Add transaction
            </button>
          </div>
        </header>

        <div className="content">
          {view === 'dashboard' && (
            <Dashboard 
              currency={currency} 
              setCurrency={setCurrency} 
              refreshKey={refreshKey}
              onRefresh={triggerRefresh}
              onAdd={() => setComposerModal({ open: true, editingItem: null })} 
              onEdit={(item) => setComposerModal({ open: true, editingItem: item })} 
            />
          )}
          {view === 'analytics' && <Analytics currency={currency} setCurrency={setCurrency} refreshKey={refreshKey} />}
          {view === 'budgets' && <Budgets currency={currency} setCurrency={setCurrency} refreshKey={refreshKey} onRefresh={triggerRefresh} />}
          {view === 'fx' && <FxPortfolio currency={currency} setCurrency={setCurrency} refreshKey={refreshKey} onRefresh={triggerRefresh} />}
          {view === 'hub' && (
            <Hub 
              currency={currency} 
              refreshKey={refreshKey}
              onRefresh={triggerRefresh}
              onAddAccount={() => setAccountModalOpen(true)}
              onAddSub={() => setSubModalOpen(true)}
              onAddGoal={() => setGoalModalOpen(true)}
            />
          )}
        </div>
      </main>

      {composerModal.open && (
        <TransactionDialog 
          currency={currency} 
          editingItem={composerModal.editingItem}
          onClose={() => setComposerModal({ open: false, editingItem: null })} 
          onSaved={() => { setComposerModal({ open: false, editingItem: null }); triggerRefresh(); setView('dashboard') }} 
        />
      )}

      {accountModalOpen && <AccountModal currency={currency} onClose={() => setAccountModalOpen(false)} onSaved={() => { setAccountModalOpen(false); triggerRefresh(); setView('hub') }} />}
      {subModalOpen && <SubscriptionModal currency={currency} onClose={() => setSubModalOpen(false)} onSaved={() => { setSubModalOpen(false); triggerRefresh(); setView('hub') }} />}
      {goalModalOpen && <SavingsGoalModal currency={currency} onClose={() => setGoalModalOpen(false)} onSaved={() => { setGoalModalOpen(false); triggerRefresh(); setView('hub') }} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// 1. DASHBOARD COMPONENT
// ---------------------------------------------------------------------------
function Dashboard({ currency, setCurrency, refreshKey, onRefresh, onAdd, onEdit }) {
  const { data, loading, error, load } = useApi(`/api/dashboard?currency=${currency}`, refreshKey)
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkCategory, setBulkCategory] = useState('')
  const [auditStatus, setAuditStatus] = useState(null)
  const [auditLoading, setAuditLoading] = useState(false)

  if (loading) return <Loading />
  if (error) return <ErrorState message={error} onRetry={load} />

  const { metrics, budgets, transactions, ledger, anomalies, currencies } = data

  const handleVerifyIntegrity = async () => {
    setAuditLoading(true)
    try {
      const res = await fetch('/api/audit/verify', { method: 'POST' })
      const body = await res.json()
      setAuditStatus(body)
    } catch (err) {
      alert('Verification failed')
    } finally {
      setAuditLoading(false)
    }
  }

  const handleDismissAnomaly = async (txId) => {
    await fetch(`/api/anomalies/${txId}/dismiss`, { method: 'POST' })
    onRefresh()
  }

  // Row Filter Logic
  const filtered = transactions.filter((item) => {
    const textMatch = `${item.title} ${item.category} ${item.notes || ''}`.toLowerCase().includes(query.toLowerCase())
    if (!textMatch) return false
    if (categoryFilter === 'all') return true
    if (categoryFilter === 'income') return item.type === 'income'
    if (categoryFilter === 'flagged') return Boolean(item.flag)
    return item.category.toLowerCase().includes(categoryFilter.toLowerCase())
  })

  // Bulk selection logic
  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filtered.map(i => i.id))
    } else {
      setSelectedIds([])
    }
  }

  const toggleSelectRow = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} selected transactions?`)) return
    await fetch('/api/transactions/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', ids: selectedIds })
    })
    setSelectedIds([])
    onRefresh()
  }

  const handleBulkRecategorize = async () => {
    if (!bulkCategory.trim()) return alert('Enter a category name')
    await fetch('/api/transactions/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'recategorize', ids: selectedIds, new_category: bulkCategory })
    })
    setSelectedIds([])
    setBulkCategory('')
    onRefresh()
  }

  const activeLedgerValid = auditStatus ? auditStatus.valid : ledger.valid
  const activeLedgerMsg = auditStatus 
    ? (auditStatus.valid ? `${auditStatus.verified} blocks verified and intact.` : `Compromised at block #${auditStatus.compromisedId}`)
    : (ledger.valid ? `${ledger.verified} transactions are linked and intact.` : `Integrity check failed at transaction #${ledger.compromisedId}.`)

  const cards = [
    ['Income', metrics.income, 'positive', `${metrics.comparison.income_change ?? '—'}% vs. last month`],
    ['Expenses', metrics.expenses, 'negative', `${metrics.comparison.expense_change ?? '—'}% vs. last month`],
    ['Net balance', metrics.balance, 'primary', 'All-time cash flow'],
    ['Financial health', metrics.health.score, 'neutral', `${metrics.health.status} (${metrics.health.savings_rate}% saved)`, true]
  ]

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Your money at a glance</p>
          <h1>Overview</h1>
          <p>Multi-currency live balance &amp; cryptographic verification workspace.</p>
        </div>
        <div className="heading-actions">
          <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
            {currencies.map((item) => (
              <option key={item.code} value={item.code}>{item.code} ({item.symbol})</option>
            ))}
          </select>
          <a className="secondary-button" href="/export/csv">📥 Export CSV</a>
        </div>
      </section>

      {/* SHA-256 Cryptographic Ledger Status */}
      <div className={activeLedgerValid ? 'notice verified' : 'notice danger'} style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span>{activeLedgerValid ? '🛡️' : '🚨'}</span>
          <div>
            <strong>{activeLedgerValid ? 'SHA-256 Merkle Ledger: Verified Integrity' : 'SECURITY ALERT: Ledger Tampered!'}</strong>
            <small>{activeLedgerMsg}</small>
          </div>
        </div>
        <button className="secondary-button compact" onClick={handleVerifyIntegrity} disabled={auditLoading}>
          {auditLoading ? 'Verifying...' : '⚡ Verify Ledger'}
        </button>
      </div>

      {/* Algorithmic Fraud & Anomaly Drawer */}
      {anomalies.length > 0 && (
        <div className="notice warning" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>🚨</span>
              <div>
                <strong>Sentinel Audit: {anomalies.length} Anomalies Flagged</strong>
                <small>Review potential duplicates or unusual transaction spikes.</small>
              </div>
            </div>
            <button className="text-button" onClick={onRefresh}>🔄 Re-check</button>
          </div>
          <div style={{ display: 'grid', gap: '6px' }}>
            {anomalies.map((a, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface-soft)', borderRadius: '6px', fontSize: '0.8rem' }}>
                <div>
                  <span className="pill" style={{ marginRight: '8px', color: a.level === 'danger' ? 'var(--negative)' : 'var(--warning)' }}>{a.type}</span>
                  <span>{a.message}</span>
                </div>
                <button className="text-button" style={{ color: 'var(--primary)' }} onClick={() => handleDismissAnomaly(a.transaction_id)}>
                  ✓ Allow &amp; Dismiss
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Metrics */}
      <section className="metric-grid">
        {cards.map(([label, value, tone, subtext, isScore]) => (
          <article className={`metric-card ${tone}`} key={label}>
            <p>{label}</p>
            <strong className="money-value">{isScore ? `${value}/100` : formatMoney(value, currency)}</strong>
            <small>{subtext}</small>
          </article>
        ))}
      </section>

      {/* Budget & Spending Pace */}
      <section className="two-column">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Budget progress</h2>
              <p>Monthly category limits ({currency}).</p>
            </div>
          </div>
          {budgets.length ? (
            <div className="budget-list">
              {budgets.slice(0, 4).map((budget) => (
                <div className="budget-row" key={budget.category}>
                  <div className="budget-title">
                    <span>{budget.category}</span>
                    <strong className="money-value">{formatMoney(budget.spent, currency)} <small>/ {formatMoney(budget.limit, currency)}</small></strong>
                  </div>
                  <div className="progress">
                    <span style={{ width: `${Math.min(budget.percent, 100)}%`, background: budget.color }} />
                  </div>
                  <small>{budget.status} · {budget.percent}% used</small>
                </div>
              ))}
            </div>
          ) : (
            <Empty message="No category budgets set." />
          )}
        </article>

        <article className="panel runway">
          <div className="panel-head">
            <div>
              <h2>Spending pace</h2>
              <p>Burn rate &amp; runway estimation.</p>
            </div>
          </div>
          <div className="runway-stat">
            <span>Daily burn rate</span>
            <strong className="money-value">{formatMoney(metrics.burn.daily_burn_rate, currency)}</strong>
          </div>
          <div className="runway-stat">
            <span>Safe daily spend</span>
            <strong className="money-value">{formatMoney(metrics.burn.safe_daily_spend, currency)}</strong>
          </div>
          <div className="runway-stat">
            <span>Runway estimate</span>
            <strong>{metrics.burn.runway_days ?? '∞'} days</strong>
          </div>
        </article>
      </section>

      {/* Transaction Table with Category Filter Chips & Bulk Action Toolbar */}
      <section className="panel transactions-panel">
        <div className="panel-head" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2>Recent activity</h2>
            <p>{transactions.length} recorded entries</p>
          </div>
          <div className="table-actions">
            <input 
              id="search-input" 
              aria-label="Search transactions" 
              value={query} 
              onChange={(event) => setQuery(event.target.value)} 
              placeholder="🔍 Search (HotKey: /)..." 
            />
            <button className="secondary-button compact" onClick={onAdd}>+ Add new</button>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {[
            ['all', '✨ All'],
            ['income', '💼 Income'],
            ['food', '🍔 Dining'],
            ['housing', '🏠 Housing'],
            ['transport', '🚗 Transport'],
            ['flagged', '🚨 Sentinel Flagged']
          ].map(([val, label]) => (
            <button 
              key={val} 
              className={categoryFilter === val ? 'secondary-button compact' : 'text-button'}
              style={{ padding: '4px 10px', borderRadius: '20px', background: categoryFilter === val ? 'var(--primary-soft)' : 'transparent', color: categoryFilter === val ? 'var(--primary)' : 'var(--muted)' }}
              onClick={() => setCategoryFilter(val)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Bulk Action Toolbar */}
        {selectedIds.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--primary-soft)', borderRadius: '8px', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.83rem', fontWeight: '700', color: 'var(--primary)' }}>
              {selectedIds.length} selected
            </span>
            <button className="row-button" onClick={handleBulkDelete} style={{ background: 'var(--surface)', padding: '5px 10px', borderRadius: '6px' }}>
              🗑️ Delete Selected
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input 
                placeholder="New Category..." 
                value={bulkCategory} 
                onChange={(e) => setBulkCategory(e.target.value)} 
                style={{ width: '130px', padding: '4px 8px', fontSize: '0.78rem' }}
              />
              <button className="primary-button compact" onClick={handleBulkRecategorize}>
                🏷️ Recategorize
              </button>
            </div>
          </div>
        )}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: '30px' }}>
                  <input type="checkbox" onChange={toggleSelectAll} checked={selectedIds.length > 0 && selectedIds.length === filtered.length} />
                </th>
                <th>Description</th>
                <th>Category</th>
                <th>Date</th>
                <th>Amount</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((item) => (
                  <TransactionRow 
                    key={item.id} 
                    item={item} 
                    currency={currency} 
                    selected={selectedIds.includes(item.id)}
                    onToggle={() => toggleSelectRow(item.id)}
                    onEdit={() => onEdit(item)}
                    refresh={onRefresh} 
                  />
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="empty-cell">No transactions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

function TransactionRow({ item, currency, selected, onToggle, onEdit, refresh }) {
  const remove = async () => {
    if (!window.confirm(`Delete ${item.title}?`)) return
    await fetch(`/api/transactions/${item.id}`, { method: 'DELETE' })
    refresh()
  }

  const curr = item.currency || 'USD'
  const isIncome = item.type === 'income'

  return (
    <tr style={{ background: item.flag ? 'rgba(239, 68, 68, 0.04)' : undefined }}>
      <td>
        <input type="checkbox" checked={selected} onChange={onToggle} />
      </td>
      <td>
        <strong>{item.title}</strong>
        {item.notes && <small>{item.notes}</small>}
        {item.flag && <small style={{ color: 'var(--negative)', fontWeight: '700' }}>{item.flag}</small>}
      </td>
      <td><span className="pill">{item.category}</span></td>
      <td>{item.date}</td>
      <td className={isIncome ? 'amount positive money-value' : 'amount negative money-value'}>
        <div>{isIncome ? '+' : '−'}{formatMoney(item.amount, curr)}</div>
        {curr !== 'USD' && <small style={{ color: 'var(--muted)' }}>≈ {formatMoney(item.display_amount, currency)}</small>}
      </td>
      <td style={{ textAlign: 'right' }}>
        <button className="text-button" onClick={onEdit} style={{ marginRight: '8px' }}>Edit</button>
        <button className="row-button" onClick={remove}>Delete</button>
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// 2. ANALYTICS COMPONENT
// ---------------------------------------------------------------------------
function Analytics({ currency, setCurrency, refreshKey }) {
  const { data, loading, error, load } = useApi(`/api/analytics?currency=${currency}`, refreshKey)
  if (loading) return <Loading />
  if (error) return <ErrorState message={error} onRetry={load} />
  const highestCategory = data.categories && data.categories.length > 0 ? data.categories[0] : null
  const currencies = data.currencies || []

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Decision support</p>
          <h1>Analytics &amp; Forecasting</h1>
          <p>Income vs. expenses trend models and Monte Carlo simulations.</p>
        </div>
        <div className="heading-actions">
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {currencies.map((item) => (
              <option key={item.code} value={item.code}>{item.code} ({item.symbol})</option>
            ))}
          </select>
        </div>
      </section>

      <section className="metric-grid three">
        <article className="metric-card primary">
          <p>12 month outlook</p>
          <strong className="money-value">{formatMoney(data.projection?.projected_median || 0, currency)}</strong>
          <small>Median projected balance</small>
        </article>
        <article className="metric-card negative">
          <p>Risk of ruin</p>
          <strong>{data.projection?.risk_of_ruin || 0}%</strong>
          <small>Over the next 12 months</small>
        </article>
        <article className="metric-card neutral">
          <p>Top category</p>
          <strong>{highestCategory ? highestCategory.category : '—'}</strong>
          <small>{highestCategory ? formatMoney(highestCategory.total, currency) : 'No expense data'}</small>
        </article>
      </section>

      <section className="panel" style={{ marginTop: '18px' }}>
        <div className="panel-head">
          <div>
            <h2>Expense categories</h2>
            <p>Top spending allocations.</p>
          </div>
        </div>
        {data.categories && data.categories.length > 0 ? (
          <div className="ranking">
            {data.categories.slice(0, 8).map((item, index) => (
              <div key={item.category}>
                <span><b>{index + 1}</b>{item.category}</span>
                <strong className="money-value">{formatMoney(item.total, currency)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <Empty message="No category spending data yet." />
        )}
      </section>
    </>
  )
}

// ---------------------------------------------------------------------------
// 3. BUDGETS COMPONENT
// ---------------------------------------------------------------------------
function Budgets({ currency, setCurrency, refreshKey, onRefresh }) {
  const { data, loading, error, load } = useApi(`/api/budgets?currency=${currency}`, refreshKey)
  const [form, setForm] = useState({ category: '', monthly_limit: '', currency: currency })
  const [submitting, setSubmitting] = useState(false)

  const save = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      const response = await fetch(`/api/budgets?currency=${currency}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (response.ok) {
        setForm({ category: '', monthly_limit: '', currency: currency })
        onRefresh()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const deleteBudget = async (id) => {
    if (!window.confirm('Delete this budget limit?')) return
    await fetch(`/api/budgets/${id}`, { method: 'DELETE' })
    onRefresh()
  }

  if (loading) return <Loading />
  if (error) return <ErrorState message={error} onRetry={load} />

  const currencies = data.currencies || []

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Plan ahead</p>
          <h1>Category Budgets</h1>
          <p>Set monthly spending guardrails for your major spending categories.</p>
        </div>
        <div className="heading-actions">
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {currencies.map((item) => (
              <option key={item.code} value={item.code}>{item.code} ({item.symbol})</option>
            ))}
          </select>
        </div>
      </section>

      <section className="budget-layout">
        <form className="panel form-panel" onSubmit={save}>
          <h2>Set a budget limit</h2>
          <p>Create a category threshold or update existing limit.</p>
          <label>
            Category Name
            <input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="e.g. Dining" required />
          </label>
          <div className="form-grid" style={{ margin: 0 }}>
            <label>
              Limit Amount
              <input type="number" min="0.01" step="0.01" value={form.monthly_limit} onChange={(event) => setForm({ ...form, monthly_limit: event.target.value })} placeholder="0.00" required />
            </label>
            <label>
              Currency Type
              <select value={form.currency || currency} onChange={(event) => setForm({ ...form, currency: event.target.value })}>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
                <option value="CAD">CAD ($)</option>
                <option value="JPY">JPY (¥)</option>
              </select>
            </label>
          </div>
          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save budget limit'}
          </button>
        </form>

        <div className="budget-cards">
          {data.budgets && data.budgets.length ? (
            data.budgets.map((budget) => (
              <article className="panel budget-card" key={budget.category}>
                <div className="panel-head">
                  <h2>{budget.category}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="pill" style={{ color: budget.color }}>{budget.status}</span>
                    {budget.id && <button className="row-button" onClick={() => deleteBudget(budget.id)}>Delete</button>}
                  </div>
                </div>
                <strong className="money-value">{formatMoney(budget.spent, currency)}</strong>
                <p>of {formatMoney(budget.limit, currency)} limit {budget.currency ? `(Set in ${budget.currency})` : ''}</p>
                <div className="progress large">
                  <span style={{ width: `${Math.min(budget.percent, 100)}%`, background: budget.color }} />
                </div>
                <small>{budget.percent}% used · {formatMoney(Math.max(budget.limit - budget.spent, 0), currency)} remaining</small>
              </article>
            ))
          ) : (
            <Empty message="No budget limits configured yet." />
          )}
        </div>
      </section>
    </>
  )
}

// ---------------------------------------------------------------------------
// 4. FX PORTFOLIO COMPONENT
// ---------------------------------------------------------------------------
function FxPortfolio({ currency, setCurrency, refreshKey, onRefresh }) {
  const { data, loading, error, load } = useApi(`/api/fx?currency=${currency}`, refreshKey)
  const [rates, setRates] = useState({})

  useEffect(() => {
    if (data?.rates) setRates(data.rates)
  }, [data])

  if (loading) return <Loading />
  if (error) return <ErrorState message={error} onRetry={load} />

  const { analysis } = data
  const currenciesList = analysis?.currencies || []
  const currencies = data.currencies || []

  const handleRateChange = async (curr, val) => {
    const updated = { ...rates, [curr]: parseFloat(val) || 0 }
    setRates(updated)
    await fetch(`/api/fx?currency=${currency}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rates: updated })
    })
    onRefresh()
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Multi-Currency Engine</p>
          <h1>FX Portfolio &amp; Gain/Loss</h1>
          <p>Real-time foreign currency positions, historical cost basis, and FX simulation.</p>
        </div>
        <div className="heading-actions">
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {currencies.map((item) => (
              <option key={item.code} value={item.code}>{item.code} ({item.symbol})</option>
            ))}
          </select>
        </div>
      </section>

      <section className="metric-grid three">
        <article className="metric-card primary">
          <p>Total FX Portfolio Value</p>
          <strong className="money-value">{formatMoney(analysis?.total_fx_portfolio_value_usd || 0, currency)}</strong>
          <small>Normalized portfolio value ({currency})</small>
        </article>
        <article className="metric-card positive">
          <p>Realized FX Gain / Loss</p>
          <strong className="money-value">{formatMoney(analysis?.total_realized_gain || 0, currency)}</strong>
          <small>Closed conversions ({currency})</small>
        </article>
        <article className="metric-card neutral">
          <p>Unrealized FX Gain / Loss</p>
          <strong className="money-value">{formatMoney(analysis?.total_unrealized_gain || 0, currency)}</strong>
          <small>Mark-to-market position ({currency})</small>
        </article>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Foreign Currency Positions</h2>
            <p>Exchange rates (1 Foreign = X USD) and cost basis analysis.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Currency</th>
                <th>Net Balance</th>
                <th>Simulated Rate (USD)</th>
                <th>Cost Basis (USD)</th>
                <th>Current Value (USD)</th>
                <th>Unrealized Gain/Loss</th>
                <th>Realized Gain/Loss</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(rates).map((currCode) => {
                const item = currenciesList.find(c => c.currency === currCode) || {
                  currency: currCode,
                  balance: 0,
                  market_rate: rates[currCode] || 1.0,
                  avg_cost_rate: 0,
                  current_val_usd: 0,
                  total_cost_basis_usd: 0,
                  unrealized_gain_usd: 0,
                  realized_gain_usd: 0
                }
                return (
                  <tr key={currCode}>
                    <td><strong>{currCode}</strong></td>
                    <td className="money-value">{item.balance.toFixed(2)} {currCode}</td>
                    <td>
                      {currCode === 'USD' ? (
                        '1.0000'
                      ) : (
                        <input 
                          type="number" 
                          step="0.0001" 
                          value={rates[currCode] || ''} 
                          onChange={(e) => handleRateChange(currCode, e.target.value)}
                          style={{ width: '100px', padding: '4px 8px', fontSize: '0.8rem' }}
                        />
                      )}
                    </td>
                    <td className="money-value">${item.total_cost_basis_usd.toFixed(2)}</td>
                    <td className="money-value">${item.current_val_usd.toFixed(2)}</td>
                    <td className={item.unrealized_gain_usd >= 0 ? 'amount positive money-value' : 'amount negative money-value'}>
                      {item.unrealized_gain_usd >= 0 ? '+' : ''}${item.unrealized_gain_usd.toFixed(2)}
                    </td>
                    <td className={item.realized_gain_usd >= 0 ? 'amount positive money-value' : 'amount negative money-value'}>
                      {item.realized_gain_usd >= 0 ? '+' : ''}${item.realized_gain_usd.toFixed(2)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

// ---------------------------------------------------------------------------
// 5. FINANCIAL HUB COMPONENT
// ---------------------------------------------------------------------------
function Hub({ currency, refreshKey, onRefresh, onAddAccount, onAddSub, onAddGoal }) {
  const { data, loading, error, load } = useApi(`/api/hub?currency=${currency}`, refreshKey)
  const [depositModalGoal, setDepositModalGoal] = useState(null)

  if (loading) return <Loading />
  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Complete picture</p>
          <h1>Financial Hub</h1>
          <p>Multi-account wallets, recurring subscription sentinel, and savings goals.</p>
        </div>
      </section>

      <section className="metric-grid three">
        <article className="metric-card primary">
          <p>Estimated Tax Set-Aside</p>
          <strong className="money-value">{formatMoney(data.tax.est_tax_amount, currency)}</strong>
          <small>25% tax liability estimate</small>
        </article>
        <article className="metric-card neutral">
          <p>Quarterly Tax Payment</p>
          <strong className="money-value">{formatMoney(data.tax.est_quarterly_payment, currency)}</strong>
          <small>Estimated quarterly installment</small>
        </article>
        <article className="metric-card positive">
          <p>Savings Target Buckets</p>
          <strong>{data.goals.length}</strong>
          <small>Active target goals</small>
        </article>
      </section>

      <section className="two-column">
        {/* Accounts / Wallets */}
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Multi-Account Wallets</h2>
              <p>Balances across checking, savings, and crypto.</p>
            </div>
            <button className="secondary-button compact" onClick={onAddAccount}>+ Account</button>
          </div>
          <div className="resource-list">
            {data.accounts.length ? (
              data.accounts.map((item) => (
                <div key={item.id} className="resource-row">
                  <span className="swatch" style={{ background: item.color }} />
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.type?.replace('_', ' ')}</small>
                  </div>
                  <b className="money-value">{formatMoney(item.balance_disp, currency)}</b>
                </div>
              ))
            ) : (
              <Empty message="No accounts registered yet." />
            )}
          </div>
        </article>

        {/* Subscriptions */}
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Subscriptions Sentinel</h2>
              <p>Upcoming recurring charges timeline.</p>
            </div>
            <button className="secondary-button compact" onClick={onAddSub}>+ Subscription</button>
          </div>
          <div className="resource-list">
            {data.subscriptions.length ? (
              data.subscriptions.map((item) => (
                <div key={item.id} className="resource-row">
                  <div>
                    <strong>{item.name}</strong>
                    <small>Due {item.next_due_date} · {item.billing_cycle}</small>
                  </div>
                  <b className="money-value">{formatMoney(item.amount_disp, currency)}</b>
                </div>
              ))
            ) : (
              <Empty message="No upcoming subscriptions." />
            )}
          </div>
        </article>
      </section>

      {/* Savings Goals Jars */}
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Visual Savings Buckets</h2>
            <p>Target goal jars and progress rings.</p>
          </div>
          <button className="primary-button compact" onClick={onAddGoal}>+ Add Goal Jar</button>
        </div>
        {data.goals.length ? (
          <div className="goal-grid">
            {data.goals.map((goal) => (
              <div className="goal" key={goal.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{goal.icon} {goal.title}</strong>
                  <b>{goal.percent}%</b>
                </div>
                <div className="progress">
                  <span style={{ width: `${Math.min(goal.percent, 100)}%` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <small className="money-value">{formatMoney(goal.current_disp, currency)} of {formatMoney(goal.target_disp, currency)}</small>
                  <button className="text-button" onClick={() => setDepositModalGoal(goal)}>+ Deposit</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty message="No savings goals created." />
        )}
      </section>

      {depositModalGoal && (
        <DepositModal 
          goal={depositModalGoal} 
          currency={currency} 
          onClose={() => setDepositModalGoal(null)} 
          onSaved={() => { setDepositModalGoal(null); onRefresh() }} 
        />
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// MODALS FOR CREATING RESOURCES
// ---------------------------------------------------------------------------
function TransactionDialog({ currency, editingItem, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: editingItem?.title || '',
    amount: editingItem?.amount || '',
    type: editingItem?.type || 'expense',
    category: editingItem?.category || '',
    date: editingItem?.date || today,
    notes: editingItem?.notes || '',
    currency: editingItem?.currency || currency,
    exchange_rate: editingItem?.exchange_rate || ''
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const url = editingItem ? `/api/transactions/${editingItem.id}` : '/api/transactions'
      const method = editingItem ? 'PUT' : 'POST'
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (!response.ok) {
        const body = await response.json()
        setError(body.error || 'Could not save the transaction.')
        setSubmitting(false)
        return
      }
      onSaved()
    } catch (err) {
      setError('Network error saving transaction.')
      setSubmitting(false)
    }
  }

  return (
    <div className="dialog-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <form className="dialog" onSubmit={submit}>
        <div className="dialog-title">
          <div>
            <p className="eyebrow">{editingItem ? 'Edit Entry' : 'New Entry'}</p>
            <h2>{editingItem ? 'Edit Transaction' : 'Add Transaction'}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose}>×</button>
        </div>
        {error && <p className="form-error">{error}</p>}

        <label>
          Description
          <input autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Salary or Coffee" required />
        </label>

        <div className="form-grid">
          <label>
            Amount
            <input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </label>
          <label>
            Type
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </label>
        </div>

        <div className="form-grid">
          <label>
            Category
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Dining" required />
          </label>
          <label>
            Date
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </label>
        </div>

        <div className="form-grid">
          <label>
            Currency
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="INR">INR (₹)</option>
              <option value="CAD">CAD ($)</option>
              <option value="JPY">JPY (¥)</option>
            </select>
          </label>
          <label>
            Exchange Rate <span>optional</span>
            <input type="number" step="0.0001" value={form.exchange_rate} onChange={(e) => setForm({ ...form, exchange_rate: e.target.value })} placeholder="Auto" />
          </label>
        </div>

        <label>
          Notes <span>optional</span>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Context..." />
        </label>

        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? 'Saving...' : (editingItem ? 'Update transaction' : 'Save transaction')}
          </button>
        </div>
      </form>
    </div>
  )
}

function AccountModal({ currency, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', account_type: 'checking', initial_balance: '', currency, color: '#2563eb' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (res.ok) {
        onSaved()
      } else {
        const b = await res.json()
        setError(b.error || 'Could not save account.')
        setSubmitting(false)
      }
    } catch (err) {
      setError('Network error.')
      setSubmitting(false)
    }
  }

  return (
    <div className="dialog-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <form className="dialog" onSubmit={submit}>
        <div className="dialog-title">
          <div><p className="eyebrow">Wallet</p><h2>Add Account</h2></div>
          <button className="icon-button" type="button" onClick={onClose}>×</button>
        </div>
        {error && <p className="form-error">{error}</p>}
        <label>Account Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Chase Checking" required /></label>
        <div className="form-grid">
          <label>Type
            <select value={form.account_type} onChange={(e) => setForm({ ...form, account_type: e.target.value })}>
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
              <option value="credit">Credit Card</option>
              <option value="crypto">Crypto Wallet</option>
            </select>
          </label>
          <label>Initial Balance<input type="number" step="0.01" value={form.initial_balance} onChange={(e) => setForm({ ...form, initial_balance: e.target.value })} placeholder="0.00" required /></label>
        </div>
        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="primary-button" disabled={submitting}>{submitting ? 'Creating...' : 'Create Account'}</button>
        </div>
      </form>
    </div>
  )
}

function SubscriptionModal({ currency, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', amount: '', currency, billing_cycle: 'monthly', next_due_date: today, category: 'Software & Subscriptions' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (res.ok) {
        onSaved()
      } else {
        const b = await res.json()
        setError(b.error || 'Could not add subscription.')
        setSubmitting(false)
      }
    } catch (err) {
      setError('Network error.')
      setSubmitting(false)
    }
  }

  return (
    <div className="dialog-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <form className="dialog" onSubmit={submit}>
        <div className="dialog-title">
          <div><p className="eyebrow">Sentinel</p><h2>Add Subscription</h2></div>
          <button className="icon-button" type="button" onClick={onClose}>×</button>
        </div>
        {error && <p className="form-error">{error}</p>}
        <label>Subscription Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Netflix, AWS" required /></label>
        <div className="form-grid">
          <label>Amount<input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" required /></label>
          <label>Next Due Date<input type="date" value={form.next_due_date} onChange={(e) => setForm({ ...form, next_due_date: e.target.value })} required /></label>
        </div>
        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="primary-button" disabled={submitting}>{submitting ? 'Adding...' : 'Add Subscription'}</button>
        </div>
      </form>
    </div>
  )
}

function SavingsGoalModal({ currency, onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', target_amount: '', current_amount: '0', currency, icon: '🎯' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (res.ok) {
        onSaved()
      } else {
        const b = await res.json()
        setError(b.error || 'Could not create goal jar.')
        setSubmitting(false)
      }
    } catch (err) {
      setError('Network error.')
      setSubmitting(false)
    }
  }

  return (
    <div className="dialog-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <form className="dialog" onSubmit={submit}>
        <div className="dialog-title">
          <div><p className="eyebrow">Bucket Jar</p><h2>Add Savings Goal</h2></div>
          <button className="icon-button" type="button" onClick={onClose}>×</button>
        </div>
        {error && <p className="form-error">{error}</p>}
        <label>Goal Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Emergency Fund" required /></label>
        <div className="form-grid">
          <label>Target Amount<input type="number" step="0.01" value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} placeholder="10000" required /></label>
          <label>Initial Saved<input type="number" step="0.01" value={form.current_amount} onChange={(e) => setForm({ ...form, current_amount: e.target.value })} placeholder="0" /></label>
        </div>
        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="primary-button" disabled={submitting}>{submitting ? 'Creating...' : 'Create Savings Jar'}</button>
        </div>
      </form>
    </div>
  )
}

function DepositModal({ goal, currency, onClose, onSaved }) {
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch(`/api/goals/${goal.id}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(amount) })
      })
      if (res.ok) {
        onSaved()
      } else {
        const b = await res.json()
        setError(b.error || 'Could not deposit funds.')
        setSubmitting(false)
      }
    } catch (err) {
      setError('Network error.')
      setSubmitting(false)
    }
  }

  return (
    <div className="dialog-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <form className="dialog" onSubmit={submit}>
        <div className="dialog-title">
          <div><p className="eyebrow">Deposit</p><h2>Deposit to {goal.title}</h2></div>
          <button className="icon-button" type="button" onClick={onClose}>×</button>
        </div>
        {error && <p className="form-error">{error}</p>}
        <label>Deposit Amount<input autoFocus type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100.00" required /></label>
        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="primary-button" disabled={submitting}>{submitting ? 'Depositing...' : 'Deposit Funds'}</button>
        </div>
      </form>
    </div>
  )
}

function Loading() {
  return <div className="loading"><span />Loading workspace...</div>
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state">
      <h2>Something went wrong</h2>
      <p>{message}</p>
      <button className="primary-button" onClick={onRetry}>Try again</button>
    </div>
  )
}

function Empty({ message }) {
  return <div className="empty"><p>{message}</p></div>
}

export default App
