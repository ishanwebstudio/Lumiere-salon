importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCspk25xyFZCZcU_nrsukil2vdOxq0pBIM",
  authDomain: "ladies-salon-booking.firebaseapp.com",
  projectId: "ladies-salon-booking",
  storageBucket: "ladies-salon-booking.firebasestorage.app",
  messagingSenderId: "350305192103",
  appId: "1:350305192103:web:a5f9ded7f2300d51d83382",
  measurementId: "G-RC67B2MR37"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'New Salon Booking';
  const options = {
    body: payload.notification?.body || 'A new appointment has been received.',
    data: payload.data || {}
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/owner.html'));
});
