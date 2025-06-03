document.addEventListener('DOMContentLoaded', () => {
    const notificationTimeInput = document.getElementById('notificationTime');
    const setReminderButton = document.getElementById('setReminder');
    const clearReminderButton = document.getElementById('clearReminder');
    const statusMessage = document.getElementById('statusMessage');

    // Service Workerの登録
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('Service Worker 登録成功:', registration);
                statusMessage.textContent = 'アプリのインストール準備ができました（ホーム画面に追加してください）。';
            })
            .catch(error => {
                console.error('Service Worker 登録失敗:', error);
                statusMessage.textContent = '通知機能が利用できません。';
            });
    } else {
        statusMessage.textContent = 'お使いのブラウザはService Workerをサポートしていません。';
    }

    // 以前設定した時間をロード
    const savedTime = localStorage.getItem('notificationTime');
    if (savedTime) {
        notificationTimeInput.value = savedTime;
    
    // ★以下の部分を追加または、既に存在することを確認
        // Service Workerにメッセージを送信して、通知のスケジュールを設定
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                action: 'setReminder',
                time: savedTime // 保存された時間をSWに送る
            });
            statusMessage.textContent = `リマインダーが設定されています: 毎日 ${savedTime} に通知。`;
        }

    }

    // 通知許可を要求
    if ('Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('通知許可が与えられました。');
            } else {
                console.warn('通知許可が拒否されました。通知は表示されません。');
                statusMessage.textContent = '通知が許可されていません。ブラウザ設定を確認してください。';
            }
        });
    }

    // リマインダー設定ボタンのクリックイベント
    setReminderButton.addEventListener('click', () => {
        const time = notificationTimeInput.value; // 例: "08:30"
        if (!time) {
            statusMessage.textContent = '時間を入力してください。';
            return;
        }

        localStorage.setItem('notificationTime', time); // 時間を保存

        // Service Workerにメッセージを送信して、通知のスケジュールを設定
        // ここでは即時実行ではなく、定期実行のトリガーをService Worker側に任せる
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                action: 'setReminder',
                time: time
            });
            statusMessage.textContent = `毎日 ${time} に通知を設定しました。`;
            console.log(`Reminder set for: ${time}`);
        } else {
            statusMessage.textContent = 'Service Workerが準備できていません。しばらくお待ちください。';
        }
    });

    // リマインダー解除ボタンのクリックイベント
    clearReminderButton.addEventListener('click', () => {
        localStorage.removeItem('notificationTime');

        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                action: 'clearReminder'
            });
            statusMessage.textContent = 'リマインダーを解除しました。';
            console.log('Reminder cleared.');
        }
    });
});