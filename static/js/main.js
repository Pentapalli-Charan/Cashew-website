/* ── Navbar scroll effect ── */
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
});

/* ── Smooth scroll for anchor links ── */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

/* ── Testimonial Carousel ── */
const track  = document.querySelector('.carousel-track');
const slides = document.querySelectorAll('.testimonial-card');
const dots   = document.querySelectorAll('.dot');
let current  = 0;
let autoPlay;

function goTo(idx) {
  current = (idx + slides.length) % slides.length;
  track.style.transform = `translateX(-${current * 100}%)`;
  dots.forEach((d, i) => d.classList.toggle('active', i === current));
}

document.querySelector('.prev-btn')?.addEventListener('click', () => { goTo(current - 1); resetAuto(); });
document.querySelector('.next-btn')?.addEventListener('click', () => { goTo(current + 1); resetAuto(); });
dots.forEach((dot, i) => dot.addEventListener('click', () => { goTo(i); resetAuto(); }));

function resetAuto() { clearInterval(autoPlay); autoPlay = setInterval(() => goTo(current + 1), 4500); }
resetAuto();

/* ── Product card: quick-fill form ── */
document.querySelectorAll('.product-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const pack = btn.dataset.pack;
    const formSection = document.getElementById('order');
    const select = document.getElementById('pack-select');
    if (select) select.value = pack;
    updatePricePreview();
    formSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

/* ── Price preview ── */
const prices = { '1kg': 750, '2kg': 1400, '3kg': 2000, '5kg': 3200 };
const packNames = { '1kg': '1 KG Pack', '2kg': '2 KG Family Pack', '3kg': '3 KG Value Pack', '5kg': '5 KG Bulk Pack' };

function updatePricePreview() {
  const sel = document.getElementById('pack-select');
  const amtEl = document.getElementById('price-amount');
  const packEl = document.getElementById('price-pack');
  if (!sel || !amtEl) return;
  const val = sel.value;
  if (prices[val]) {
    amtEl.textContent = `₹${prices[val]}`;
    if (packEl) packEl.textContent = packNames[val];
  } else {
    amtEl.textContent = '—';
    if (packEl) packEl.textContent = 'Select a pack';
  }
}
document.getElementById('pack-select')?.addEventListener('change', updatePricePreview);

/* ── Order Form Submission ── */
const orderForm = document.getElementById('order-form');
const formWrap  = document.getElementById('form-wrap');
const successWrap = document.getElementById('form-success');

orderForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = orderForm.querySelector('.submit-btn');
  submitBtn.textContent = 'Placing Order…';
  submitBtn.disabled = true;

  const data = {
    name:    document.getElementById('name').value.trim(),
    phone:   document.getElementById('phone').value.trim(),
    address: document.getElementById('address').value.trim(),
    pack:    document.getElementById('pack-select').value,
    notes:   document.getElementById('notes').value.trim()
  };

  try {
    const res  = await fetch('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();

    if (res.ok && json.success) {
      document.getElementById('success-order-id').textContent = json.order_id;
      document.getElementById('success-pack').textContent     = json.pack;
      document.getElementById('success-price').textContent    = `₹${json.price}`;
      formWrap.style.display    = 'none';
      successWrap.style.display = 'block';

      // Offer WhatsApp confirmation
      const waMsg = encodeURIComponent(
        `Hello Syamala! I've placed an order.\n\nOrder ID: ${json.order_id}\nPack: ${json.pack}\nPrice: ₹${json.price}\nName: ${data.name}\nPhone: ${data.phone}\nAddress: ${data.address}`
      );
      document.getElementById('wa-confirm-btn').href = `https://wa.me/919398410266?text=${waMsg}`;
    } else {
      alert(json.error || 'Something went wrong. Please try again.');
      submitBtn.textContent = 'Place Order';
      submitBtn.disabled = false;
    }
  } catch {
    alert('Network error. Please check your connection.');
    submitBtn.textContent = 'Place Order';
    submitBtn.disabled = false;
  }
});

/* ── Intersection Observer fade-in ── */
const animEls = document.querySelectorAll('.feature-card,.product-card,.testimonial-inner,.about-text-side,.stat-item');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (en.isIntersecting) { en.target.style.opacity = '1'; en.target.style.transform = 'translateY(0)'; }
  });
}, { threshold: 0.12 });

animEls.forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(22px)';
  el.style.transition = 'opacity .55s ease, transform .55s ease';
  observer.observe(el);
});
