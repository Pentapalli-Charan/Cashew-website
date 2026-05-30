/* ── Admin Dashboard JS ── */

const toast = document.getElementById('toast');

function showToast(msg, type = 'success') {
  if (!toast) return;
  toast.textContent = msg;
  toast.className   = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function fmtDate(dt) {
  if (!dt) return '—';
  const d = new Date(dt.replace(' ', 'T') + 'Z');
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true });
}

function statusClass(s) { return s || 'Pending'; }

function buildRow(o) {
  return `
    <tr id="row-${o.id}">
      <td data-label="Order ID"><span class="order-id">${o.order_id}</span></td>
      <td data-label="Customer"><span class="customer-name">${o.name}</span></td>
      <td data-label="Phone"><a class="phone-link" href="tel:${o.phone}">${o.phone}</a></td>
      <td data-label="Address" title="${o.address}">${o.address.length > 30 ? o.address.slice(0,30)+'…' : o.address}</td>
      <td data-label="Pack"><span class="pack-badge">${o.pack}</span></td>
      <td data-label="Price"><span class="price-cell">₹${o.price}</span></td>
      <td data-label="Status">
        <select class="status-select ${statusClass(o.status)}" data-id="${o.id}" onchange="updateStatus(this)">
          <option ${o.status==='Pending'   ? 'selected' : ''}>Pending</option>
          <option ${o.status==='Packed'    ? 'selected' : ''}>Packed</option>
          <option ${o.status==='Delivered' ? 'selected' : ''}>Delivered</option>
        </select>
      </td>
      <td data-label="Date"><span class="date-cell">${fmtDate(o.created_at)}</span></td>
      <td data-label="Notes" title="${o.notes || ''}">${o.notes ? (o.notes.length > 20 ? o.notes.slice(0,20)+'…' : o.notes) : '—'}</td>
    </tr>`;
}

async function loadOrders() {
  const q      = document.getElementById('search-input')?.value.trim() || '';
  const status = document.getElementById('status-filter')?.value || '';

  const params = new URLSearchParams();
  if (q)      params.set('q', q);
  if (status) params.set('status', status);

  try {
    const res  = await fetch(`/api/orders?${params}`);
    if (!res.ok) { location.href = '/admin'; return; }
    const data = await res.json();

    // Update stats
    document.getElementById('stat-total')?.setAttribute('data-val', data.stats.Total     || 0);
    document.getElementById('stat-pending')?.setAttribute('data-val', data.stats.Pending  || 0);
    document.getElementById('stat-packed')?.setAttribute('data-val', data.stats.Packed   || 0);
    document.getElementById('stat-delivered')?.setAttribute('data-val', data.stats.Delivered || 0);

    ['total','pending','packed','delivered'].forEach(k => {
      const el = document.getElementById(`stat-${k}`);
      if (el) el.textContent = el.getAttribute('data-val');
    });

    const tbody = document.getElementById('orders-tbody');
    if (!tbody) return;

    if (!data.orders.length) {
      tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><span class="icon">📦</span>No orders found.</div></td></tr>`;
      return;
    }
    tbody.innerHTML = data.orders.map(buildRow).join('');
  } catch (err) {
    showToast('Failed to load orders', 'error');
  }
}

async function updateStatus(select) {
  const id     = select.dataset.id;
  const status = select.value;
  select.className = `status-select ${status}`;

  try {
    const res = await fetch(`/api/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) showToast(`Status updated to ${status}`);
    else        showToast('Update failed', 'error');
  } catch {
    showToast('Network error', 'error');
  }
}

// Debounced search
let searchTimer;
document.getElementById('search-input')?.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadOrders, 350);
});

document.getElementById('status-filter')?.addEventListener('change', loadOrders);
document.getElementById('refresh-btn')?.addEventListener('click', () => { loadOrders(); showToast('Refreshed ✓'); });

// Auto-refresh every 60s
loadOrders();
setInterval(loadOrders, 60000);
