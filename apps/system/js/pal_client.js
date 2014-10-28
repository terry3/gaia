/*
 This is a tool connected with castd and will be used by castd/home to launch/stop cast receivers
 */
(function () {

    var requestId = 0;
    var palSocket = null;
    var HOST = '127.0.0.1';
    var PORT = 8010;
    var opt = {binaryType: 'string'};
    var buffer = '';
    var messageSize = -1;
    var pendingRequest = new AsyncSemaphore();
    var cachedVolume = -1;
    var currentVolume = 15;
    var activeTimeout = 0;
    var WIFI_CONFIG_KEY = {
        NAME: 'name',
        SSID: 'ssid'
    };

    function createPalConnection() {
        palSocket = navigator.mozTCPSocket.open(HOST, PORT, opt);

        palSocket.onopen = function (event) {
            var _status;
            console.log("pal:", "connected to pal server! send name changed event!");
            _status = JSON.stringify({
                'type': 'SYSTEM_STATUS',
                'name': localStorage.getItem(WIFI_CONFIG_KEY.NAME),
                'ssid': localStorage.getItem(WIFI_CONFIG_KEY.SSID),
                'requestId': generateRequestID()
            });
            console.log("pal:", "Send SYSTEM_STATUS:" + _status.length + ":" + _status + " onopen!");
            palSocket.send("" + _status.length + ":" + _status);
            initSystemVolume();
        };

        palSocket.onerror = function (event) {
            console.error('pal:', "palSocket error: " + event.data.name);
        };

        palSocket.onclose = function (event) {
            console.log("pal:", "onclose! re-create pal connection. event:" + event +
                " target:" + event.target + " state:" + event.target.readyState + " pal_state:" + palSocket.readyState);
            event.target.close();
            window.setTimeout(function () {
                createPalConnection();
            }, 5000);
        };

        palSocket.ondata = function (event) {
            console.log('pal:', "ondata: " + event.data);
            buffer = buffer.concat(event.data);
            while (true) {
                if (messageSize < 0) {
                    var colonIndex = findColon(buffer);
                    if (colonIndex > 0) {
                        messageSize = parseInt(buffer.slice(0, colonIndex).toString());
                        buffer = buffer.slice(colonIndex + 1);
                    } else {
                        break;
                    }
                }

                if (messageSize > 0) {
                    if (buffer.length >= messageSize) {
                        var msgBuffer = buffer.slice(0, messageSize);
                        doCommand(JSON.parse(msgBuffer.toString()));
                        if (buffer.length > messageSize) {
                            buffer = buffer.slice(messageSize);
                        } else {
                            buffer = '';
                        }
                        messageSize = -1;
                    } else {
                        break;
                    }
                }
            }
        };
    }

    function doCommand(message) {
        var TYPE = message.type;
        if (TYPE == 'LAUNCH_RECEIVER' || TYPE == 'STOP_RECEIVER') {
            CastAppManager.doAppCommand(message);
        } else if (TYPE == 'SET_VOLUME') {
            console.log('TYPE = SET_VOLUME, volume level: ' + message.level);
            setSystemVolume(message.level, message.requestId, false);
        } else if (TYPE == 'SET_MUTED') {
            console.log('TYPE = SET_MUTE, muted : ' + message.muted);
            if (message.muted) {
                setSystemVolume(0, message.requestId, true);
            } else {
                setSystemVolume(currentVolume, message.requestId, false);
            }
        } else {
            console.log('nonsupport command type : ' + TYPE);
        }
    }

    function setSystemVolume(level, requestId, muted) {

        var channel = 'content';
        var overlay = document.getElementById('system-overlay');
        var notification = document.getElementById('volume');
        var overlayClasses = overlay.classList;
        var classes = notification.classList;
        var volume = Math.max(0, Math.min(15, Math.round(level * 15)));
        if (!muted) {
            currentVolume = volume;
        }
        console.log('volume = ' + volume);
        classes.remove('vibration');

        if (volume <= 0) {
            console.log('volume = ' + volume + '. add mute');
            classes.add('mute');
        } else {
            classes.remove('mute');

        }

        var steps =
            Array.prototype.slice.call(notification.querySelectorAll('div'), 0);

        for (var i = 0; i < steps.length; i++) {
            var step = steps[i];
            if (i < volume) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        }

        overlayClasses.add('volume');
        classes.add('visible');
        window.clearTimeout(activeTimeout);
        activeTimeout = window.setTimeout(function hideSound() {
            overlayClasses.remove('volume');
            classes.remove('visible');
        }, 1500);

        if (!window.navigator.mozSettings)
            return;

        pendingRequest.v();
        var req;
        notification.dataset.channel = channel;
        var settingObject = {};
        settingObject['audio.volume.content'] = volume;
        req = SettingsListener.getSettingsLock().set(settingObject);
        req.onsuccess = function onSuccess() {
            var volumeMessage = JSON.stringify({
                'volumeLevel': level,
                'volumeMuted': muted,
                'requestId': requestId
            });
            palSocket.send("" + volumeMessage.length + ":" + volumeMessage);
            console.log('set Volume success, send: ' + volumeMessage.length + ":" + volumeMessage);
            pendingRequest.p();
        };
        req.onerror = function onError() {
            pendingRequest.p();
        };
    }

    function initSystemVolume() {
        var volumeLevel = 15;
        var volumeMuted = false;

        var req = SettingsListener.getSettingsLock().get('audio.volume.content');

        req.onsuccess = function onSuccess() {
            volumeLevel = req.result['audio.volume.content'];
            console.log('init volumeLevel: '+ volumeLevel);
            if (volumeLevel <= 0) {
                volumeMuted = true;
            }

            var bakVolume = volumeLevel/15;
            var volumeMessage = JSON.stringify({
                'volumeLevel': bakVolume,
                'volumeMuted': volumeMuted
            });

            palSocket.send("" + volumeMessage.length + ":" + volumeMessage);
            console.log('init Volume success, send: ' + volumeMessage.length + ":" + volumeMessage);
        };

        req.onerror = function onError() {
        };



    }
    function generateRequestID() {
        return ++requestId;
    }

    window.addEventListener('iac-pal-name-change', function (event) {
        var _msgObj, _status;
        console.log("pal:", "Handle name change:  + " + event.detail);
        _msgObj = JSON.parse(event.detail);
        _status = JSON.stringify({
            'type': 'SYSTEM_STATUS',
            'name': _msgObj.name,
            'ssid': _msgObj.ssid,
            'requestId': generateRequestID()
        });

        /* save it */
        localStorage.setItem(WIFI_CONFIG_KEY.NAME, _msgObj.name);
        localStorage.setItem(WIFI_CONFIG_KEY.SSID, _msgObj.ssid);

        /* send system status event to castd */
        if (palSocket !== null && palSocket.readyState === "open") {
            console.log("pal:", "Send SYSTEM_STATUS:" + _status + " state:" + palSocket.readyState);
            palSocket.send(_status.length + ":" + _status);
        }
    });

    function findColon(buffer) {
        var colonCode = ':';
        for (var i = 0; i < buffer.length; ++i) {
            if (buffer[i] === colonCode) {
                return i;
            }
        }
        return -1;
    }

    createPalConnection();
})();
