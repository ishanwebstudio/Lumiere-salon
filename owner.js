emailjs.init({
  publicKey: "GAJsOD4eWsk4y4VZ4"
});

const SUPABASE_URL = "https://nvxmxlgpfkncdndarylr.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_RnuwaWluwVNXFWEa-CFp_Q_zKfn6cfd";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const safe = value =>
  String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[c]));

let currentFilter = 'all';
let bookings = [];


/* ================================
   LOAD BOOKINGS
================================ */

async function loadBookings() {
  const { data, error } = await supabaseClient
    .from('bookings')
    .select('*')
    .order('booking_date', { ascending: true })
    .order('booking_time', { ascending: true });

  if (error) {
    console.error('Dashboard loading error:', error);
    document.getElementById('list').innerHTML =
      '<div class="empty">Unable to load appointments.</div>';
    return;
  }

  bookings = data || [];
  renderOwner();
}


/* ================================
   DASHBOARD RENDER
================================ */

function renderOwner() {

  const pending = bookings.filter(b => b.status === 'Pending');
  const confirmed = bookings.filter(b => b.status === 'Confirmed');
  const cancelled = bookings.filter(b => b.status === 'Cancelled');
  const completed = bookings.filter(b => b.status === 'Completed');

  document.getElementById('stats').innerHTML = `
    <div class="stat">
      <span>Pending</span>
      <strong>${pending.length}</strong>
    </div>

    <div class="stat">
      <span>Confirmed</span>
      <strong>${confirmed.length}</strong>
    </div>

    <div class="stat">
      <span>Cancelled</span>
      <strong>${cancelled.length}</strong>
    </div>

    <div class="stat">
      <span>Total</span>
      <strong>${bookings.length}</strong>
    </div>
    <div class="stat">
      <span>Completed</span>
      <strong>${completed.length}</strong>
    </div>
  `;

  renderDailyProgress();

  const shown =
    currentFilter === 'all'
      ? bookings
      : bookings.filter(b => b.status === currentFilter);

  const list = document.getElementById('list');

  if (!shown.length) {
    list.innerHTML =
      '<div class="empty">No appointments in this view.</div>';
    return;
  }

  list.innerHTML = shown.map(b => `
    <article class="booking-row">

      <div>
        <small class="booking-code">
          ${safe(b.booking_code)}
        </small>

        <strong>
          ${safe(b.customer_name)}
        </strong>

        <span>
          ${safe(b.customer_phone)}
        </span>

        <span>
          ${safe(b.customer_email)}
        </span>
      </div>

      <div>
        <strong>
          ${safe(b.service)}
        </strong>

        <span>
          Appointment
        </span>
      </div>

      <div>
        <strong>
          ${safe(b.booking_date)}
        </strong>

        <span>
          ${safe(b.booking_time)}
        </span>
      </div>

      <div>
        <span class="status ${String(b.status).toLowerCase()}">
          ${safe(b.status)}
        </span>
      </div>

      <div class="actions">

        ${
          b.status === 'Pending'
            ? `
              <button
                class="btn mini success-btn"
                data-action="confirm"
                data-id="${safe(b.id)}">
                Confirm
              </button>
            `
            : ''
        }

        ${
          b.status === 'Confirmed'
            ? `
              <button
                class="btn mini success-btn"
                data-action="complete"
                data-id="${safe(b.id)}">
                Finish
              </button>
            `
            : ''
        }

        ${
          b.status !== 'Cancelled' && b.status !== 'Completed'
            ? `
              <button
                class="btn mini danger-btn"
                data-action="cancel"
                data-id="${safe(b.id)}">
                Reject
              </button>
            `
            : ''
        }

      </div>

    </article>
  `).join('');
}


/* ================================
   DAILY PROGRESS / DAY FINISH
================================ */

function getTodayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function renderDailyProgress() {
  const today = getTodayISO();
  const todays = bookings.filter(b =>
    b.booking_date === today &&
    b.status !== 'Cancelled'
  );

  const finished = todays.filter(b => b.status === 'Completed').length;
  const total = todays.length;

  let panel = document.getElementById('dailyProgress');

  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'dailyProgress';
    const list = document.getElementById('list');
    list.parentNode.insertBefore(panel, list);
  }

  if (!total) {
    panel.innerHTML = `
      <div class="box daily-progress">
        <strong>Today</strong>
        <span>No appointments scheduled for today.</span>
      </div>
    `;
    return;
  }

  const done = finished === total;

  panel.innerHTML = `
    <div class="box daily-progress ${done ? 'day-finished' : ''}">
      <div>
        <small>TODAY'S APPOINTMENTS</small>
        <strong>${finished} / ${total} Completed</strong>
      </div>
      <div class="daily-progress-bar">
        <span style="width:${Math.round((finished / total) * 100)}%"></span>
      </div>
      <p>${done
        ? '✨ DAY COMPLETE — All today’s appointments are finished.'
        : `${total - finished} appointment${total - finished === 1 ? '' : 's'} remaining today.`}</p>
    </div>
  `;
}

/* ================================
   UPDATE STATUS
================================ */

async function updateOwnerStatus(id, status) {

  const booking = bookings.find(b => b.id === id);

  if (!booking) return;


  // Prevent two confirmed appointments
  // at the same date and time.
  if (status === 'Confirmed') {

    const clash = bookings.some(b =>
      b.id !== id &&
      b.booking_date === booking.booking_date &&
      b.booking_time === booking.booking_time &&
      b.status === 'Confirmed'
    );

    if (clash) {
      alert(
        'That time slot already has a confirmed appointment.'
      );
      return;
    }
  }


  // Update status in Supabase
  const { error } = await supabaseClient
    .from('bookings')
    .update({
      status: status
    })
    .eq('id', id);


  if (error) {

    console.error(
      'Status update error:',
      error
    );

    alert(
      'Could not update booking status.'
    );

    return;
  }


  // Send status email to customer
  try {

    await emailjs.send(
      'service_xv9v8s6',
      'template_htqaywg',
      {
        email: booking.customer_email,
        customer_name: booking.customer_name,
        booking_code: booking.booking_code,
        service: booking.service,
        booking_date: booking.booking_date,
        booking_time: booking.booking_time,
        status: status
      }
    );

    console.log(
      'Status email sent successfully.'
    );

  } catch (emailError) {

    console.error(
      'Status email error:',
      emailError
    );

    alert(
      'Booking status updated, but the email could not be sent.'
    );
  }


  // Refresh dashboard
  await loadBookings();
}

/* ================================
   NOTIFICATION SOUND
================================ */

let audioContext = null;

function enableSound() {

  if (!audioContext) {
    audioContext = new (
      window.AudioContext ||
      window.webkitAudioContext
    )();
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
}


const SOUND_OPTIONS = {
  bell: { name: 'Classic Bell', notes: [[880, 0], [1175, 0.16]], duration: 0.55 },
  chime: { name: 'Soft Chime', notes: [[660, 0], [880, 0.14], [1047, 0.28]], duration: 0.7 },
  luxury: { name: 'Luxury Chime', notes: [[523, 0], [659, 0.18], [784, 0.36], [1047, 0.54]], duration: 0.9 },
  alert: { name: 'Alert', notes: [[880, 0], [880, 0.18], [880, 0.36]], duration: 0.65 },
  double: { name: 'Double Ding', notes: [[988, 0], [988, 0.22]], duration: 0.55 },
  soft: { name: 'Soft Ding', notes: [[740, 0], [988, 0.2]], duration: 0.65 }
};

function playTone(frequency, start, duration = 0.45) {
  if (!audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime + start;

  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.22, now + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.03);
}

function playBookingSound() {
  if (!audioContext) return;

  const selected = localStorage.getItem('salonNotificationSound') || 'bell';
  const sound = SOUND_OPTIONS[selected] || SOUND_OPTIONS.bell;

  sound.notes.forEach(([frequency, start]) => {
    playTone(frequency, start, 0.42);
  });
}

function initSoundSelector() {
  const head = document.querySelector('.dashboard-head');
  if (!head || document.getElementById('soundSelector')) return;

  const wrap = document.createElement('div');
  wrap.className = 'sound-settings';
  wrap.innerHTML = `
    <label for="soundSelector">🔔 Notification Sound</label>
    <select id="soundSelector">
      ${Object.entries(SOUND_OPTIONS).map(([key, sound]) =>
        `<option value="${key}">${sound.name}</option>`
      ).join('')}
    </select>
    <button type="button" class="btn mini" id="testSound">Test Sound</button>
  `;

  head.appendChild(wrap);

  const selector = document.getElementById('soundSelector');
  const saved = localStorage.getItem('salonNotificationSound') || 'bell';
  selector.value = SOUND_OPTIONS[saved] ? saved : 'bell';

  selector.addEventListener('change', () => {
    localStorage.setItem('salonNotificationSound', selector.value);
    enableSound();
    playBookingSound();
  });

  document.getElementById('testSound').addEventListener('click', () => {
    enableSound();
    playBookingSound();
  });
}



/* ================================
   NEW BOOKING DASHBOARD POPUP
================================ */

function showBookingPopup(booking) {
  const old = document.getElementById('newBookingPopup');
  if (old) old.remove();

  const popup = document.createElement('div');
  popup.id = 'newBookingPopup';
  popup.innerHTML = `
    <div class="booking-popup-card">
      <button type="button" class="booking-popup-close" aria-label="Close">×</button>
      <div class="booking-popup-icon">🔔</div>
      <div class="booking-popup-label">NEW BOOKING</div>
      <h3>${safe(booking.customer_name)}</h3>
      <p class="booking-popup-service">${safe(booking.service)}</p>
      <div class="booking-popup-meta">
        <span>📅 ${safe(booking.booking_date)}</span>
        <span>🕐 ${safe(booking.booking_time)}</span>
      </div>
      <div class="booking-popup-code">Code: ${safe(booking.booking_code)}</div>
      <button type="button" class="btn primary booking-popup-view">
        View Booking
      </button>
    </div>
  `;

  document.body.appendChild(popup);

  const close = () => {
    popup.classList.remove('show');
    setTimeout(() => popup.remove(), 250);
  };

  popup.querySelector('.booking-popup-close').addEventListener('click', close);
  popup.querySelector('.booking-popup-view').addEventListener('click', () => {
    close();
    const row = [...document.querySelectorAll('.booking-row')].find(el =>
      el.textContent.includes(booking.booking_code)
    );
    if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  requestAnimationFrame(() => popup.classList.add('show'));

  // Keep the popup visible long enough to notice it.
  setTimeout(() => {
    if (document.getElementById('newBookingPopup') === popup) close();
  }, 9000);
}

/* ================================
   REALTIME NEW BOOKINGS
================================ */

function startRealtime() {

  supabaseClient
    .channel('owner-bookings-live')

    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'bookings'
      },
      payload => {

        console.log(
          'New booking received:',
          payload.new
        );

        const isNewBooking = !bookings.some(b => b.id === payload.new.id);

        if (isNewBooking) {
          bookings.push(payload.new);
        }

        bookings.sort((a, b) =>
          new Date(
            a.booking_date + 'T' + a.booking_time
          ) -
          new Date(
            b.booking_date + 'T' + b.booking_time
          )
        );

        renderOwner();

        if (isNewBooking) {
          showBookingPopup(payload.new);
          playBookingSound();
        }

        if ('Notification' in window &&
            Notification.permission === 'granted') {

          new Notification(
            'New Salon Booking',
            {
              body:
                `${payload.new.customer_name} booked ${payload.new.service}`,
            }
          );
        }
      }
    )

    .subscribe(status => {
      console.log(
        'Realtime status:',
        status
      );
    });
}


/* ================================
   FILTERS
================================ */

function initFilters() {

  const filterWrap = document.querySelector('.filters');
  if (filterWrap && !filterWrap.querySelector('[data-filter="Completed"]')) {
    const completedButton = document.createElement('button');
    completedButton.className = 'filter';
    completedButton.dataset.filter = 'Completed';
    completedButton.textContent = 'Completed';
    filterWrap.appendChild(completedButton);

    completedButton.addEventListener('click', () => {
      document.querySelectorAll('.filter').forEach(b => b.classList.remove('active'));
      completedButton.classList.add('active');
      currentFilter = 'Completed';
      renderOwner();
    });
  }

  document
    .querySelectorAll('.filter')
    .forEach(button => {

      button.addEventListener('click', () => {

        document
          .querySelectorAll('.filter')
          .forEach(b =>
            b.classList.remove('active')
          );

        button.classList.add('active');

        currentFilter =
          button.dataset.filter;

        renderOwner();
      });

    });
}


/* ================================
   BUTTON ACTIONS
================================ */

function initBookingActions() {

  document
    .getElementById('list')
    .addEventListener('click', e => {

      const button =
        e.target.closest(
          'button[data-action]'
        );

      if (!button) return;

      const id = button.dataset.id;

      enableSound();

      if (button.dataset.action === 'confirm') {

        updateOwnerStatus(id, 'Confirmed');

      } else if (button.dataset.action === 'complete') {

        updateOwnerStatus(id, 'Completed');

      } else {

        updateOwnerStatus(id, 'Cancelled');
      }

    });
}


/* ================================
   CLEAR DEMO BUTTON
================================ */
function initClearButton() {
  const clearButton = document.getElementById('clearDemo');
  if (!clearButton) return;

  clearButton.addEventListener('click', async () => {
    if (!bookings.length) {
      alert('There are no bookings to clear.');
      return;
    }

    const confirmed = window.confirm(
      `Delete ALL ${bookings.length} bookings from Supabase?\n\n` +
      'This permanently deletes every booking. This cannot be undone.'
    );

    if (!confirmed) return;

    clearButton.disabled = true;
    const originalText = clearButton.textContent;
    clearButton.textContent = 'Clearing...';

    try {
      const { data, error } = await supabaseClient
        .from('bookings')
        .delete()
        .not('id', 'is', null)
        .select('id');

      if (error) throw error;

      bookings = [];
      await loadBookings();
      alert(`Deleted ${(data || []).length} booking(s).`);
    } catch (error) {
      console.error('Clear bookings error:', error);
      alert('Delete failed. Check the Supabase DELETE policy and permissions.');
    } finally {
      clearButton.disabled = false;
      clearButton.textContent = originalText;
    }
  });
}

/* ================================
   NOTIFICATION PERMISSION
================================ */

function requestNotifications() {

  if (
    'Notification' in window &&
    Notification.permission === 'default'
  ) {

    Notification.requestPermission();

  }
}


/* ================================
   START
================================ */

document.addEventListener(
  'DOMContentLoaded',
  async () => {

    // First click enables notification sound
    document.addEventListener(
      'click',
      enableSound,
      { once: true }
    );

    requestNotifications();

    initFilters();

    initBookingActions();

    initClearButton();
    initSoundSelector();

    await loadBookings();

    startRealtime();

  }
);

/* Firebase web push token setup. Replace the VAPID placeholder with your saved public Web Push key. */
(async function setupFirebaseNotifications(){
  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !window.firebase) return;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') { console.log('Notification permission not granted.'); return; }
    const registration = await navigator.serviceWorker.register('./firebase-messaging-sw.js');

    // Initialize Firebase on the owner page before using Firebase Messaging.
    if (!firebase.apps.length) {
      firebase.initializeApp({
        apiKey: "AIzaSyCspk25xyFZCZcU_nrsukil2vdOxq0pBIM",
        authDomain: "ladies-salon-booking.firebaseapp.com",
        projectId: "ladies-salon-booking",
        storageBucket: "ladies-salon-booking.firebasestorage.app",
        messagingSenderId: "350305192103",
        appId: "1:350305192103:web:a5f9ded7f2300d51d83382",
        measurementId: "G-RC67B2MR37"
      });
    }

    const messaging = firebase.messaging();
    const token = await messaging.getToken({
      vapidKey: 'BL1QfxGu24uD7-5vgHahzzK0T60n8wWKZwQ0vbm7xr1lKIKhmMq7m3rXTMqq8H42oasp47RtGQKjWTOWrnWLw9U',
      serviceWorkerRegistration: registration
    });
    if (token) {
      localStorage.setItem('salon_fcm_token', token);
      console.log('Firebase FCM token saved locally.');
    } else {
      console.warn('No Firebase FCM token was returned.');
    }
  } catch (error) {
    console.error('Firebase push setup failed:', error);
  }
})();
