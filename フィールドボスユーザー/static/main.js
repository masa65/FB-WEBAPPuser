// Firebaseの設定
var firebaseConfig = {
    apiKey: "AIzaSyAUqu12Twv-CzxaDFC6NebC30xw8f-E7WQ",
    authDomain: "fbnotification-system.firebaseapp.com",
    databaseURL: "https://fbnotification-system-default-rtdb.firebaseio.com",
    projectId: "fbnotification-system",
    storageBucket: "fbnotification-system.appspot.com",
    messagingSenderId: "542867341104",
    appId: "1:542867341104:web:be6c950107a4f5045052f5",
    measurementId: "G-KLY6GY9XB4"
};
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// 公開VAPIDキーの設定
messaging.usePublicVapidKey("BAR4N-B_xwZJu04RWouAMufE1iTQRO1ouXiHdacjGkBBTEbLQLhpard8Nj4cELGL9LveQXM-BzZbrGgmDOdZA3I");

// サービスワーカーの登録
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then(function(registration) {
            console.log('Service Worker registered with scope:', registration.scope);
            // 通知の許可を求める
            requestNotificationPermission();
        })
        .catch(function(err) {
            console.error('Service Worker registration failed:', err);
        });
}

// 通知の許可を求める関数
function requestNotificationPermission() {
    console.log('通知の許可をユーザーに求めています...');
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            console.log('通知の許可が得られました。');
            // ユーザーIDを取得してトークンを登録
            registerUserToken();
        } else {
            console.error('通知の許可が拒否されました。');
        }
    }).catch(err => {
        console.error('通知許可のリクエストに失敗しました:', err);
    });
}

// ユーザーIDとトークンをサーバーに送信する関数
function registerUserToken() {
    var userId = document.getElementById('userId').value;
    if (!userId) {
        console.error('ユーザーIDが入力されていません。');
        return;
    }
    // Service Worker の登録を待ってからトークンを取得する
    navigator.serviceWorker.ready.then(registration => {
        firebase.messaging().getToken({ serviceWorkerRegistration: registration }).then(token => {
            console.log('トークンを取得しました。', token);
            fetch('/register-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ user_id: userId, token: token })
            })
            .then(response => {
                if (response.ok) {
                    console.log('ユーザーIDとトークンをサーバーに登録しました。');
                    alert('ユーザーIDとトークンをサーバーに登録しました。');
                    document.getElementById('userForm').reset(); // フォームの内容をリセット
                } else {
                    console.error('サーバーへのトークン登録に失敗しました。');
                }
            })
            .catch(error => {
                console.error('エラー:', error);
            });
        }).catch(error => {
            console.error('トークンの取得に失敗しました:', error);
        });
    });
}

// ユーザーIDの重複チェックとフォーム送信のイベント処理を統合
document.addEventListener('DOMContentLoaded', function() {
    var form = document.getElementById('userForm');
    var userIdInput = document.getElementById('userId');
    var isValidUserId = false; // ユーザーIDのバリデーション状態を追跡

    // フォームの送信処理
    form.addEventListener('submit', function(e) {
        e.preventDefault(); // フォームのデフォルト送信を防止
        var userId = userIdInput.value;

        if (!userId) {
            alert("ユーザーIDを入力してください。");
            userIdInput.focus();
            return;
        }

        // ユーザーIDの重複チェック
        fetch('/check-username', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username: userId })
        })
        .then(response => {
            if (!response.ok && response.status === 409) {
                return response.json().then(data => Promise.reject(new Error(data.error)));
            }
            isValidUserId = true; // ユーザーIDが有効であることをマーク
            alert('ユーザーIDが利用可能です'); // 重複がない場合のメッセージ
            return response.json();
        })
        .then(data => {
            if (isValidUserId) {
                requestNotificationPermission();
            }
        })
        .catch(error => {
            alert(error.message); // 重複エラーメッセージをアラートで表示
            userIdInput.value = ''; // 入力フィールドをクリア
            userIdInput.focus(); // ユーザーが新しいIDを入力できるようにフォーカスを戻す
            isValidUserId = false; // ユーザーIDが無効であることをマーク
        });
    });

    var permitButton = document.getElementById('permitButton');
    permitButton.addEventListener('click', function() {
        if (!isValidUserId) {
            alert("先に有効なユーザーIDを入力してください。");
            userIdInput.focus();
            return;
        }
        requestNotificationPermission();
    });
});

+

// フォアグラウンドで通知を受け取った時の処理
messaging.onMessage((payload) => {
    console.log('通知を受信しました。', payload);
    // 通知を手動で作成し表示
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: payload.notification.icon,
        data: { url: "http://127.0.0.1:5001/notifications" } // 通知からのリダイレクト用URLを設定
    };
    if (Notification.permission === "granted") {
        var notification = new Notification(notificationTitle, notificationOptions);
        notification.onclick = function(event) {
            event.preventDefault(); // デフォルトのイベントをキャンセル
            window.open(notification.data.url, '_blank'); // 新しいタブでURLを開く
        }
    }
});


