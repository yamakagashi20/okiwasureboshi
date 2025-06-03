// Service Workerのインストール時にキャッシュするリソース
const CACHE_NAME = 'umbrella-reminder-cache-v1';
const urlsToCache = [
    './',
    'index.html',
    'style.css',
    'app.js',
    'manifest.json',
    'icon.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
    self.skipWaiting(); // 新しいService Workerが即座にアクティブになるように
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName); // 古いキャッシュを削除
                    }
                })
            );
        })
    );
    // クライアントがService Workerを制御できるようにする
    event.waitUntil(self.clients.claim());
});

// fetchイベント: キャッシュからリソースを提供
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request);
            })
    );
});

// ----------------------------------------------------------------------
// 通知機能のロジック（Service Workerの定期的な起動と通知）

let reminderIntervalId; // 定期実行のIDを保持

// アプリからのメッセージを受信
self.addEventListener('message', event => {
    if (event.data && event.data.action === 'setReminder') {
        const time = event.data.time; // 例: "08:00"
        console.log('Service Worker: Reminder set for:', time);
      //  localStorage.setItem('notificationTime', time); // Service Worker自身のストレージにも保存 コメントアウトした。
        scheduleNextNotification(time);
    } else if (event.data && event.data.action === 'clearReminder') {
        console.log('Service Worker: Reminder cleared.');
      //  localStorage.removeItem('notificationTime');　　コメントアウトした。
        clearScheduledNotifications();
    }
});

function scheduleNextNotification(time) {
    clearScheduledNotifications(); // 既存の通知をクリア

    if (!time) return;

    // 現在時刻から、設定された時間までのミリ秒を計算
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const targetDate = new Date();
    targetDate.setHours(hours, minutes, 0, 0);

    let delay = targetDate.getTime() - now.getTime();
    if (delay < 0) {
        // もし目標時間が現在時刻より前なら、翌日に設定
        delay += 24 * 60 * 60 * 1000;
    }

    console.log(`Service Worker: Next notification in ${delay / 1000 / 60} minutes.`);

    // 指定された時間後に通知を発火
    reminderIntervalId = setTimeout(() => {
        self.registration.showNotification('傘、持った？', {
            body: '天気予報を確認して、傘を忘れずにね！',
            icon: 'icon.png',
            vibrate: [200, 100, 200],
            tag: 'umbrella-reminder', // 同じタグの通知は上書きされる
            renotify: true // 同じタグでも再通知する
        });
        // 通知後、翌日の同じ時間に再度スケジュール
        scheduleNextNotification(time);
    }, delay);
}

function clearScheduledNotifications() {
    if (reminderIntervalId) {
        clearTimeout(reminderIntervalId);
        reminderIntervalId = null;
        console.log('Service Worker: Cleared existing reminder.');
    }
    // 既存の通知も閉じる（通知センターから削除）
    self.registration.getNotifications({ tag: 'umbrella-reminder' }).then(notifications => {
        notifications.forEach(notification => notification.close());
    });
}

// Service Workerが起動した際に、以前設定したリマインダーを復元
self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
   // const savedTime = localStorage.getItem('notificationTime');　コメントアウトした
    if (savedTime) {
        console.log('Service Worker: Restoring reminder for', savedTime);
        scheduleNextNotification(savedTime);
    }
});