self.addEventListener('push', function (event) {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: data.icon || '/Logo.png',
            badge: '/Logo.png',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: '2',
                url: data.url || '/'
            },
        };
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
                const isAppFocused = windowClients.some(client => client.focused);
                // If app is focused, don't show notification (let app handle it via socket/in-app UI)
                // Or show it anyway? Usually better to suppress.
                // But ChatProvider logic only shows if document.hidden.
                // If document is visible (focused), ChatProvider shows nothing (message just appears in chat).
                // So if focused, we generally don't want system notification.
                if (isAppFocused) {
                    return;
                }
                return self.registration.showNotification(data.title, options);
            })
        );
    }
});

self.addEventListener('notificationclick', function (event) {
    console.log('Notification click received.');
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
