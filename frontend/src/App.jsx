import React, { useEffect, useMemo, useState } from 'react'

const NAV = [
  ['dashboard', 'Overview', '⌂'],
  ['analytics', 'Analytics', '↗'],
  ['budgets', 'Budgets', '◫'],
  ['hub', 'Financial hub', '✦']
]

const today = new Date().toISOString().slice(0, 10)

function useApi(path) {
  const [state, setState] = useState({ loading: true, data: null, error: null })
  const load = async () => {
    setState((current) => ({ ...current, loading: true, error: null }))
    try {
      const response = await fetch(path)
      if (!response.ok) throw new Error('Could not load this data.')
      setState({ loading: false, data: await response.json(), error: null })
    } catch (error) {
      setState({ loading: false, data: null, error: error.message })
    }
  }
  useEffect(() => { load() }, [path])
  return { ...state, load }
}

function formatMoney(value, currency = 'USD') {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: currency === 'JPY' ? 0 : 2 }).format(value || 0)
}

function App() {
  const [view, setView] = useState('dashboard')
  const [currency, setCurrency] = useState('USD')
  const [dark, setDark] = useState(() => localStorage.getItem('ledger-theme') === 'dark')
  const [privateMode, setPrivateMode] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    localStorage.setItem('ledger-theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <div className={privateMode ? 'app private' : 'app'}>
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">F</span><span>Finance Tracker</span></div>
        <p className="eyebrow">Workspace</p>
        <nav>
          {NAV.map(([id, label, icon]) => <button key={id} className={view === id ? 'nav-item active' : 'nav-item'} onClick={() => setView(id)}><span>{icon}</span>{label}</button>)}
        </nav>
        <div className="sidebar-bottom"><span className="live-dot" />Local-first finance workspace</div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-label">{NAV.find(([id]) => id === view)?.[1]}</div>
          <div className="topbar-actions">
            <button className="icon-button" onClick={() => setPrivateMode(!privateMode)} aria-label="Toggle privacy mode">{privateMode ? '◌' : '◉'}</button>
            <button className="icon-button" onClick={() => setDark(!dark)} aria-label="Toggle color theme">{dark ? '☼' : '☾'}</button>
            <button className="primary-button" onClick={() => setComposerOpen(true)}><span>＋</span> Add transaction</button>
          </div>
        </header>
        <div className="content">
          {view === 'dashboard' && <Dashboard currency={currency} setCurrency={setCurrency} onAdd={() => setComposerOpen(true)} />}
          {view === 'analytics' && <Analytics />}
          {view === 'budgets' && <Budgets currency={currency} />}
          {view === 'hub' && <Hub currency={currency} />}
        </div>
      </main>
      {composerOpen && <TransactionDialog currency={currency} onClose={() => setComposerOpen(false)} onSaved={() => { setComposerOpen(false); setView('dashboard') }} />}
    </div>
  )
}

function Dashboard({ currency, setCurrency, onAdd }) {
  const { data, loading, error, load } = useApi(`/api/dashboard?currency=${currency}`)
  const [query, setQuery] = useState('')
  if (loading) return <Loading />
  if (error) return <ErrorState message={error} onRetry={load} />
  const { metrics, budgets, transactions, ledger, anomalies, currencies } = data
  const filtered = transactions.filter((item) => `${item.title} ${item.category} ${item.notes || ''}`.toLowerCase().includes(query.toLowerCase()))
  const cards = [
    ['Income', metrics.income, 'positive', `${metrics.comparison.income_change ?? '—'}% vs. last month`],
    ['Spending', metrics.expenses, 'negative', `${metrics.comparison.expense_change ?? '—'}% vs. last month`],
    ['Net balance', metrics.balance, 'primary', 'All recorded transactions'],
    ['Financial health', metrics.health.score, 'neutral', metrics.health.status, true]
  ]
  return <>
    <section className="page-heading">
      <div><p className="eyebrow">Your money at a glance</p><h1>Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}.</h1><p>Here is the current shape of your finances.</p></div>
      <div className="heading-actions"><select value={currency} onChange={(event) => setCurrency(event.target.value)}>{currencies.map((item) => <option key={item.code} value={item.code}>{item.code} · {item.symbol}</option>)}</select><a className="secondary-button" href="/export/csv">Export CSV</a></div>
    </section>
    <div className={ledger.valid ? 'notice verified' : 'notice danger'}><span>{ledger.valid ? '✓' : '!'}</span><div><strong>{ledger.valid ? 'Ledger verified' : 'Ledger needs attention'}</strong><small>{ledger.valid ? `${ledger.verified} transactions are linked and intact.` : `Integrity check failed at transaction #${ledger.compromisedId}.`}</small></div></div>
    {anomalies.length > 0 && <div className="notice warning"><span>!</span><div><strong>{anomalies.length} transaction{anomalies.length > 1 ? 's' : ''} worth reviewing</strong><small>Unusual spending or possible duplicates were detected.</small></div></div>}
    <section className="metric-grid">{cards.map(([label, value, tone, subtext, isScore]) => <article className={`metric-card ${tone}`} key={label}><p>{label}</p><strong className="money-value">{isScore ? `${value}/100` : formatMoney(value, currency)}</strong><small>{subtext}</small></article>)}</section>
    <section className="two-column">
      <article className="panel"><div className="panel-head"><div><h2>Budget progress</h2><p>Monthly spending against your limits.</p></div><button className="text-button" onClick={() => document.querySelector('.nav-item:nth-child(3)')?.click()}>Manage</button></div>
        {budgets.length ? <div className="budget-list">{budgets.slice(0, 4).map((budget) => <div className="budget-row" key={budget.category}><div className="budget-title"><span>{budget.category}</span><strong className="money-value">{formatMoney(budget.spent, currency)} <small>/ {formatMoney(budget.limit, currency)}</small></strong></div><div className="progress"><span style={{ width: `${Math.min(budget.percent, 100)}%`, background: budget.color }} /></div><small>{budget.status} · {budget.percent}% used</small></div>)}</div> : <Empty message="Set your first budget to start tracking progress." action="Create a budget" />}</article>
      <article className="panel runway"><div className="panel-head"><div><h2>Spending pace</h2><p>Keep the rest of the month in view.</p></div></div><div className="runway-stat"><span>Daily spend</span><strong className="money-value">{formatMoney(metrics.burn.daily_burn_rate, currency)}</strong></div><div className="runway-stat"><span>Safe daily spend</span><strong className="money-value">{formatMoney(metrics.burn.safe_daily_spend, currency)}</strong></div><div className="runway-stat"><span>Estimated runway</span><strong>{metrics.burn.runway_days ?? '—'} days</strong></div></article>
    </section>
    <section className="panel transactions-panel"><div className="panel-head"><div><h2>Recent activity</h2><p>{transactions.length} recorded transactions</p></div><div className="table-actions"><input aria-label="Search transactions" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search activity" /><button className="secondary-button compact" onClick={onAdd}>Add new</button></div></div>
      <div className="table-wrap"><table><thead><tr><th>Description</th><th>Category</th><th>Date</th><th>Amount</th><th /></tr></thead><tbody>{filtered.length ? filtered.slice(0, 12).map((item) => <TransactionRow key={item.id} item={item} currency={currency} refresh={load} />) : <tr><td colSpan="5" className="empty-cell">No transactions match your search.</td></tr>}</tbody></table></div>
    </section>
  </>
}

function TransactionRow({ item, currency, refresh }) {
  const remove = async () => {
    if (!window.confirm(`Delete ${item.title}?`)) return
    await fetch(`/api/transactions/${item.id}`, { method: 'DELETE' })
    refresh()
  }
  return <tr><td><strong>{item.title}</strong>{item.notes && <small>{item.notes}</small>}</td><td><span className="pill">{item.category}</span></td><td>{item.date}</td><td className={item.type === 'income' ? 'amount positive money-value' : 'amount negative money-value'}>{item.type === 'income' ? '+' : '−'}{formatMoney(item.display_amount, currency)}</td><td><button className="row-button" onClick={remove}>Delete</button></td></tr>
}

function Analytics() {
  const { data, loading, error, load } = useApi('/api/analytics')
  if (loading) return <Loading />
  if (error) return <ErrorState message={error} onRetry={load} />
  const highestCategory = data.categories[0]
  return <><section className="page-heading"><div><p className="eyebrow">Decision support</p><h1>Analytics</h1><p>Trends based on your recorded income and expenses.</p></div></section><section className="metric-grid three"><article className="metric-card primary"><p>12 month outlook</p><strong className="money-value">{formatMoney(data.projection.projected_median)}</strong><small>Median projected balance</small></article><article className="metric-card negative"><p>Risk of ruin</p><strong>{data.projection.risk_of_ruin}%</strong><small>Over the next 12 months</small></article><article className="metric-card neutral"><p>Largest category</p><strong>{highestCategory?.category || '—'}</strong><small>{highestCategory ? formatMoney(highestCategory.total) : 'No expense data'}</small></article></section><section className="two-column"><article className="panel"><div className="panel-head"><div><h2>Cash flow</h2><p>Income and expenses over time.</p></div></div><TrendChart months={data.months} income={data.income} expenses={data.expenses} /></article><article className="panel"><div className="panel-head"><div><h2>Expense categories</h2><p>Where your money is going.</p></div></div><div className="ranking">{data.categories.slice(0, 6).map((item, index) => <div key={item.category}><span><b>{index + 1}</b>{item.category}</span><strong className="money-value">{formatMoney(item.total)}</strong></div>)}</div></article></section></>
}

function TrendChart({ months, income, expenses }) {
  const values = [...income, ...expenses, 1]
  const max = Math.max(...values)
  const points = (series) => series.map((value, index) => `${index * (100 / Math.max(series.length - 1, 1))},${94 - (value / max) * 78}`).join(' ')
  return <div className="chart"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="0" y1="94" x2="100" y2="94" /><line x1="0" y1="54" x2="100" y2="54" /><line x1="0" y1="14" x2="100" y2="14" /><polyline points={points(income)} className="income-line" /><polyline points={points(expenses)} className="expense-line" /></svg><div className="chart-key"><span><i className="income-key" />Income</span><span><i className="expense-key" />Expenses</span></div><div className="chart-labels">{months.map((month) => <span key={month}>{month.slice(5)}</span>)}</div></div>
}

function Budgets({ currency }) {
  const { data, loading, error, load } = useApi(`/api/budgets?currency=${currency}`)
  const [form, setForm] = useState({ category: '', monthly_limit: '' })
  const save = async (event) => { event.preventDefault(); const response = await fetch(`/api/budgets?currency=${currency}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); if (response.ok) { setForm({ category: '', monthly_limit: '' }); load() } }
  if (loading) return <Loading />
  if (error) return <ErrorState message={error} onRetry={load} />
  return <><section className="page-heading"><div><p className="eyebrow">Plan ahead</p><h1>Budgets</h1><p>Set a monthly guardrail for the categories that matter.</p></div></section><section className="budget-layout"><form className="panel form-panel" onSubmit={save}><h2>Set a budget</h2><p>Create a new category or update an existing one.</p><label>Category<input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="e.g. Dining" required /></label><label>Monthly limit<input type="number" min="0.01" step="0.01" value={form.monthly_limit} onChange={(event) => setForm({ ...form, monthly_limit: event.target.value })} placeholder="0.00" required /></label><button className="primary-button" type="submit">Save budget</button></form><div className="budget-cards">{data.budgets.length ? data.budgets.map((budget) => <article className="panel budget-card" key={budget.category}><div className="panel-head"><h2>{budget.category}</h2><span className="pill" style={{ color: budget.color }}>{budget.status}</span></div><strong className="money-value">{formatMoney(budget.spent, currency)}</strong><p>of {formatMoney(budget.limit, currency)} monthly limit</p><div className="progress large"><span style={{ width: `${Math.min(budget.percent, 100)}%`, background: budget.color }} /></div><small>{budget.percent}% used · {formatMoney(Math.max(budget.limit - budget.spent, 0), currency)} remaining</small></article>) : <Empty message="No budgets yet." />}</div></section></>
}

function Hub({ currency }) {
  const { data, loading, error, load } = useApi(`/api/hub?currency=${currency}`)
  if (loading) return <Loading />
  if (error) return <ErrorState message={error} onRetry={load} />
  return <><section className="page-heading"><div><p className="eyebrow">Complete picture</p><h1>Financial hub</h1><p>Accounts, recurring commitments, and savings goals.</p></div></section><section className="metric-grid three"><article className="metric-card primary"><p>Tax set-aside</p><strong className="money-value">{formatMoney(data.tax.est_tax_amount, currency)}</strong><small>Estimated at a 25% rate</small></article><article className="metric-card neutral"><p>Quarterly payment</p><strong className="money-value">{formatMoney(data.tax.est_quarterly_payment, currency)}</strong><small>Estimated payment</small></article><article className="metric-card positive"><p>Goals</p><strong>{data.goals.length}</strong><small>Active savings goals</small></article></section><section className="two-column"><ResourcePanel title="Accounts" items={data.accounts} empty="No wallet accounts yet." render={(item) => <><span className="swatch" style={{ background: item.color }} /><div><strong>{item.name}</strong><small>{item.type?.replace('_', ' ')}</small></div><b className="money-value">{formatMoney(item.balance_disp, currency)}</b></>} /><ResourcePanel title="Upcoming subscriptions" items={data.subscriptions} empty="No subscriptions coming up." render={(item) => <><div><strong>{item.name}</strong><small>Due {item.next_due_date}</small></div><b className="money-value">{formatMoney(item.amount_disp, currency)}</b></>} /></section><section className="panel"><div className="panel-head"><div><h2>Savings goals</h2><p>Your progress toward the things you are saving for.</p></div></div>{data.goals.length ? <div className="goal-grid">{data.goals.map((goal) => <div className="goal" key={goal.id}><div><strong>{goal.icon} {goal.title}</strong><b>{goal.percent}%</b></div><div className="progress"><span style={{ width: `${goal.percent}%` }} /></div><small className="money-value">{formatMoney(goal.current_disp, currency)} of {formatMoney(goal.target_disp, currency)}</small></div>)}</div> : <Empty message="No goals yet." />}</section></>
}

function ResourcePanel({ title, items, empty, render }) { return <article className="panel"><div className="panel-head"><h2>{title}</h2></div><div className="resource-list">{items.length ? items.map((item) => <div key={item.id} className="resource-row">{render(item)}</div>) : <Empty message={empty} />}</div></article> }

function TransactionDialog({ currency, onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', amount: '', type: 'expense', category: '', date: today, notes: '', currency, exchange_rate: '' })
  const [error, setError] = useState('')
  const submit = async (event) => { event.preventDefault(); const response = await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); if (!response.ok) { const body = await response.json(); setError(body.error || 'Could not save the transaction.'); return } onSaved() }
  return <div className="dialog-backdrop" onMouseDown={onClose}><form className="dialog" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><div className="dialog-title"><div><p className="eyebrow">New entry</p><h2>Add transaction</h2></div><button className="icon-button" type="button" onClick={onClose}>×</button></div>{error && <p className="form-error">{error}</p>}<label>Description<input autoFocus value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Weekly groceries" required /></label><div className="form-grid"><label>Amount<input type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required /></label><label>Type<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option value="expense">Expense</option><option value="income">Income</option></select></label></div><div className="form-grid"><label>Category<input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="e.g. Groceries" required /></label><label>Date<input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required /></label></div><label>Notes <span>optional</span><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Add context if it helps." /></label><div className="dialog-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button">Save transaction</button></div></form></div>
}

function Loading() { return <div className="loading"><span />Loading your workspace…</div> }
function ErrorState({ message, onRetry }) { return <div className="error-state"><h2>Something went wrong</h2><p>{message}</p><button className="primary-button" onClick={onRetry}>Try again</button></div> }
function Empty({ message, action }) { return <div className="empty"><p>{message}</p>{action && <button className="text-button">{action}</button>}</div> }

export default App
