importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

firebase.initializeApp({
    apiKey: "AIzaSyAUqu12Twv-CzxaDFC6NebC30xw8f-E7WQ",
    authDomain: "fbnotification-system.firebaseapp.com",
    databaseURL: "https://fbnotification-system-default-rtdb.firebaseio.com",
    projectId: "fbnotification-system",
    storageBucket: "fbnotification-system.appspot.com",
    messagingSenderId: "542867341104",
    appId: "1:542867341104:web:be6c950107a4f5045052f5",
    measurementId: "G-KLY6GY9XB4"
});

const messaging = firebase.messaging();

// バックグラウンドで受信したプッシュ通知の処理
messaging.setBackgroundMessageHandler(function(payload) {
    const notificationTitle = 'Notification Title Here';
    const notificationOptions = {
        body: 'Notification Body Here',
        icon: '/images/icons/icon-192x192.png',
        data: { url: "https://www.jp.playblackdesert.com/ja-JP/Main/Index" }  // 通知からリダイレクトするURL
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

/// 通知クリック時の処理
self.addEventListener('notificationclick', function(event) {
    console.log('[Service Worker] Notification click Received.');
    event.notification.close(); // 通知を閉じる

    const urlToOpen = event.notification.data.url;
    console.log('Trying to open URL:', urlToOpen);

    const promiseChain = clients.matchAll({
        type: 'window',
        includeUncontrolled: true
    })
    .then((windowClients) => {
        let matchingClient = null;
        for (let client of windowClients) {
            if (client.url === urlToOpen && 'focus' in client) {
                matchingClient = client;
                break;
            }
        }
        if (matchingClient) {
            return matchingClient.focus();
        } else {
            return clients.openWindow(urlToOpen);
        }
    });
    event.waitUntil(promiseChain);
});
