const SERVICES = [
  { name: 'Hair Cut & Styling', price: 3500, desc: 'Cut, wash and signature styling.' },
  { name: 'Hair Colour', price: 7500, desc: 'Colour refresh with finishing style.' },
  { name: 'Glow Facial', price: 4500, desc: 'Relaxing facial for a fresh glow.' },
  { name: 'Manicure & Nails', price: 3000, desc: 'Classic manicure and nail care.' },
  { name: 'Luxury Pedicure', price: 3500, desc: 'Relax, refresh and polish.' },
  { name: 'Bridal Beauty', price: 15000, desc: 'Bridal makeup and beauty preparation.' }
];


// ===============================
// SUPABASE
// ===============================

const SUPABASE_URL =
  "https://nvxmxlgpfkncdndarylr.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_RnuwaWluwVNXFWEa-CFp_Q_zKfn6cfd";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


// ===============================
// EMAILJS
// ===============================

const EMAILJS_PUBLIC_KEY = "GAJsOD4eWsk4y4VZ4";
const EMAILJS_SERVICE_ID = "service_xv9v8s6";
const EMAILJS_TEMPLATE_ID = "template_htqaywg";

emailjs.init({
  publicKey: EMAILJS_PUBLIC_KEY
});


// ===============================
// BOOKING CODE
// ===============================

const makeCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  return 'LUM-' +
    Array.from(
      { length: 5 },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join('');
};


// ===============================
// SECURITY / HTML
// ===============================

const escapeHtml = value =>
  String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[c]));


// ===============================
// ELEMENTS
// ===============================

let els = {};


// ===============================
// SERVICES
// ===============================

function renderServices() {

  els.servicesGrid.innerHTML = SERVICES.map((s, i) => `
    <article class="service reveal-child">

      <div class="service-top">
        <small>0${i + 1}</small>
        <span>✦</span>
      </div>

      <h3>${s.name}</h3>

      <p>${s.desc}</p>

      <b>LKR ${s.price.toLocaleString()}</b>

    </article>
  `).join('');


  els.serviceChoices.innerHTML = SERVICES.map((s, i) => `
    <div class="choice">

      <input
        type="radio"
        name="service"
        id="s${i}"
        value="${i}"
        ${i === 0 ? 'checked' : ''}
      >

      <label for="s${i}">
        <strong>${s.name}</strong>
        <small>LKR ${s.price.toLocaleString()}</small>
      </label>

    </div>
  `).join('');
}


// ===============================
// TIME SLOTS
// ===============================

function fillTimes() {

  els.time.innerHTML = '';

  for (let h = 9; h <= 18; h++) {

    for (const m of [0, 30]) {

      if (h === 18 && m) continue;

      const value =
        `${String(h).padStart(2, '0')}:${m ? '30' : '00'}`;

      const label =
        new Date(2000, 0, 1, h, m)
          .toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit'
          });

      const option = document.createElement('option');

      option.value = value;
      option.textContent = label;

      els.time.appendChild(option);
    }
  }
}


// ===============================
// DATE
// ===============================

function localISODate(date = new Date()) {

  const local =
    new Date(
      date.getTime() -
      date.getTimezoneOffset() * 60000
    );

  return local.toISOString().slice(0, 10);
}


function setDateDefaults() {

  const today = localISODate();

  els.date.min = today;

  if (!els.date.value || els.date.value < today) {
    els.date.value = today;
  }

  refreshAvailability();
}


// ===============================
// CHECK BOOKED TIMES
// ===============================

async function getBookedTimes(date) {

  const { data, error } = await supabaseClient
    .from('bookings')
    .select('booking_time')
    .eq('booking_date', date)
    .neq('status', 'Cancelled');

  if (error) {

    console.error('Availability error:', error);

    return [];
  }

  return data.map(item => item.booking_time);
}


// ===============================
// REFRESH AVAILABILITY
// ===============================

async function refreshAvailability() {

  const date = els.date.value;

  if (!date) return;

  const bookedTimes = await getBookedTimes(date);

  [...els.time.options].forEach(option => {

    option.disabled =
      bookedTimes.includes(option.value);

    option.textContent =
      option.textContent.replace(' — Booked', '');

    if (option.disabled) {
      option.textContent += ' — Booked';
    }
  });


  const firstOpen =
    [...els.time.options]
      .find(option => !option.disabled);

  if (firstOpen) {
    els.time.value = firstOpen.value;
  }
}


// ===============================
// CHECK SINGLE SLOT
// ===============================

async function slotTaken(date, time) {

  const { data, error } = await supabaseClient
    .from('bookings')
    .select('id')
    .eq('booking_date', date)
    .eq('booking_time', time)
    .neq('status', 'Cancelled')
    .limit(1);

  if (error) {

    console.error('Slot check error:', error);

    return false;
  }

  return data.length > 0;
}


// ===============================
// SUCCESS MESSAGE
// ===============================

function showBookingSuccess(booking) {

  els.confirmation.innerHTML = `

    <div class="box success-box">

      <div class="success-icon">✓</div>

      <p class="eyebrow">
        BOOKING CREATED
      </p>

      <h3>
        ${escapeHtml(booking.code)}
      </h3>

      <p>
        <strong>
          ${escapeHtml(booking.service)}
        </strong>
        · ${escapeHtml(booking.date)}
        · ${escapeHtml(booking.time)}
      </p>

      <p>
        Guest:
        ${escapeHtml(booking.name)}
      </p>

      <span class="status pending">
        Pending confirmation
      </span>

      <p class="muted-note">
        Keep this booking code safe.
        Use “My Booking” to check the status later.
      </p>

    </div>

  `;
}


// ===============================
// BOOKING
// ===============================

function handleBooking() {

  els.bookingForm.addEventListener('submit', async e => {

    e.preventDefault();

    els.bookingError.textContent = '';

    const selected =
      document.querySelector(
        'input[name="service"]:checked'
      );

    const name =
      els.name.value.trim();

    const phone =
      els.phone.value.trim();

    const email =
      els.email.value.trim();

    const date =
      els.date.value;

    const time =
      els.time.value;


    // Validation

    if (!selected) {

      els.bookingError.textContent =
        'Please choose a service.';

      return;
    }


    if (!date || !time || !name || !phone || !email) {

      els.bookingError.textContent =
        'Please complete all required fields.';

      return;
    }


    // Check slot

    const alreadyTaken =
      await slotTaken(date, time);

    if (alreadyTaken) {

      els.bookingError.textContent =
        'That time is already booked. Please choose another time.';

      await refreshAvailability();

      return;
    }


    // Service

    const service =
      SERVICES[Number(selected.value)];


    // Booking code

    let bookingCode =
      makeCode();


    // Make sure code is unique

    let codeExists = true;

    while (codeExists) {

      const { data } =
        await supabaseClient
          .from('bookings')
          .select('id')
          .eq('booking_code', bookingCode)
          .limit(1);

      codeExists =
        data && data.length > 0;

      if (codeExists) {
        bookingCode = makeCode();
      }
    }


    // Disable button

    const submitButton =
      els.bookingForm.querySelector(
        'button[type="submit"]'
      );

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent =
        'Creating Booking...';
    }


    // Save to Supabase

    const { data: savedBooking, error } =
      await supabaseClient
        .from('bookings')
        .insert({

          booking_code: bookingCode,

          customer_name: name,

          customer_email: email,

          customer_phone: phone,

          service: service.name,

          booking_date: date,

          booking_time: time,

          status: 'Pending'

        })
        .select()
        .single();


    if (error) {

      console.error('Booking error:', error);

      els.bookingError.textContent =
        'Something went wrong while creating your booking. Please try again.';

      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent =
          'Book Appointment';
      }

      return;
    }


    // Booking object

    const booking = {

      code: savedBooking.booking_code,

      service: savedBooking.service,

      price: service.price,

      date: savedBooking.booking_date,

      time: savedBooking.booking_time,

      name: savedBooking.customer_name,

      phone: savedBooking.customer_phone,

      email: savedBooking.customer_email,

      status: savedBooking.status

    };


    // Send customer email

    let emailSent = false;

    try {

      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {

          email: booking.email,

          customer_name: booking.name,

          booking_code: booking.code,

          service: booking.service,

          booking_date: booking.date,

          booking_time: booking.time

        }
      );

      emailSent = true;

    } catch (emailError) {

      console.error(
        'EmailJS error:',
        emailError
      );

    }


    // Show success

    showBookingSuccess(booking);


    if (!emailSent) {

      const note =
        document.createElement('p');

      note.className = 'muted-note';

      note.textContent =
        'Your booking was created, but the confirmation email could not be sent.';

      els.confirmation
        .querySelector('.success-box')
        ?.appendChild(note);
    }


    // Reset form

    els.bookingForm.reset();

    const firstService =
      document.getElementById('s0');

    if (firstService) {
      firstService.checked = true;
    }


    fillTimes();


    els.confirmation.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });


    setDateDefaults();


    // Enable button

    if (submitButton) {

      submitButton.disabled = false;

      submitButton.textContent =
        'Book Appointment';
    }

  });
}


// ===============================
// LOOKUP BOOKING
// ===============================

function handleLookup() {

  els.lookupForm.addEventListener(
    'submit',
    async e => {

      e.preventDefault();

      let searchCode =
        els.code.value
          .trim()
          .toUpperCase()
          .replace(/^LUM-/i, '');


      if (!searchCode) {

        els.result.innerHTML = `
          <div class="box">
            <p class="missing">
              Please enter your booking code.
            </p>
          </div>
        `;

        return;
      }

      searchCode = 'LUM-' + searchCode;


      els.result.innerHTML = `
        <div class="box">
          <p>Checking booking...</p>
        </div>
      `;


      const { data: booking, error } =
        await supabaseClient
          .from('bookings')
          .select('*')
          .eq('booking_code', searchCode)
          .maybeSingle();


      if (error) {

        console.error(
          'Lookup error:',
          error
        );

        els.result.innerHTML = `
          <div class="box">
            <p class="missing">
              Unable to check the booking right now.
              Please try again.
            </p>
          </div>
        `;

        return;
      }


      if (!booking) {

        els.result.innerHTML = `
          <div class="box">

            <p class="missing">
              Booking not found.
              Please check your booking code.
            </p>

          </div>
        `;

        return;
      }


      const statusClass =
        booking.status.toLowerCase();


      els.result.innerHTML = `

        <div class="box lookup-box">

          <p class="eyebrow">
            ${escapeHtml(booking.booking_code)}
          </p>

          <h3>
            ${escapeHtml(booking.service)}
          </h3>

          <p>
            ${escapeHtml(booking.booking_date)}
            ·
            ${escapeHtml(booking.booking_time)}
          </p>

          <p>
            Guest:
            ${escapeHtml(booking.customer_name)}
          </p>

          <span class="status ${statusClass}">
            ${escapeHtml(booking.status)}
          </span>

        </div>

      `;

    }
  );
}


// ===============================
// NAVIGATION
// ===============================

function initNav() {

  const toggle =
    document.getElementById('menuToggle');

  const nav =
    document.getElementById('navMenu');


  if (!toggle || !nav) return;


  toggle.addEventListener('click', () => {

    nav.classList.toggle('active');

    toggle.classList.toggle('open');

  });


  nav.querySelectorAll('a')
    .forEach(a => {

      a.addEventListener('click', () => {

        nav.classList.remove('active');

        toggle.classList.remove('open');

      });

    });
}


// ===============================
// REVEAL ANIMATIONS
// ===============================

function initReveal() {

  const items =
    document.querySelectorAll(
      '.reveal, .reveal-child, .service, .gallery-card'
    );


  if (!('IntersectionObserver' in window)) {

    items.forEach(el => {

      el.classList.add(
        'active',
        'active-card'
      );

    });

    return;
  }


  const observer =
    new IntersectionObserver(
      entries => {

        entries.forEach(entry => {

          if (!entry.isIntersecting)
            return;


          entry.target.classList.add(
            'active'
          );


          if (
            entry.target.matches(
              '.service, .gallery-card'
            )
          ) {

            entry.target.classList.add(
              'active-card'
            );

          }


          observer.unobserve(
            entry.target
          );

        });

      },
      {
        threshold: 0.08,
        rootMargin:
          '0px 0px -40px 0px'
      }
    );


  items.forEach(el =>
    observer.observe(el)
  );
}


// ===============================
// REALTIME BOOKING UPDATE
// ===============================

function initRealtime() {

  supabaseClient
    .channel('bookings-live')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bookings'
      },
      payload => {

        console.log(
          'Booking update:',
          payload
        );


        // Refresh available slots

        refreshAvailability();

      }
    )
    .subscribe();
}


// ===============================
// START
// ===============================

document.addEventListener(
  'DOMContentLoaded',
  () => {

    els = {

      servicesGrid:
        document.getElementById(
          'servicesGrid'
        ),

      serviceChoices:
        document.getElementById(
          'serviceChoices'
        ),

      bookingForm:
        document.getElementById(
          'bookingForm'
        ),

      bookingError:
        document.getElementById(
          'bookingError'
        ),

      date:
        document.getElementById(
          'date'
        ),

      time:
        document.getElementById(
          'time'
        ),

      name:
        document.getElementById(
          'name'
        ),

      phone:
        document.getElementById(
          'phone'
        ),

      email:
        document.getElementById(
          'email'
        ),

      confirmation:
        document.getElementById(
          'confirmation'
        ),

      lookupForm:
        document.getElementById(
          'lookupForm'
        ),

      code:
        document.getElementById(
          'code'
        ),

      result:
        document.getElementById(
          'result'
        )

    };


    renderServices();

    fillTimes();
els.code.addEventListener('input', () => {
  const value = els.code.value
    .trim()
    .toUpperCase()
    .replace(/^LUM-/i, '');

  els.code.value = value;
});

    setDateDefaults();

    els.date.addEventListener(
      'change',
      refreshAvailability
    );

    handleBooking();

    handleLookup();

    initNav();

    initReveal();

    initRealtime();

  }
);