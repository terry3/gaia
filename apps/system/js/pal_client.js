/*
 This is a tool connected with flingd and to launch/stop receivers app.
 */
'use strict';

(function () {

  var flingSocket = null;
  var HOST = '127.0.0.1';
  var FLINGDPORT = 9440;
  var opt = {binaryType: 'string'};
  var flingBuffer = '';
  var messageSize = -1;
  var pendingRequest = new AsyncSemaphore();
  var currentVolume = 15;
  var activeTimeout = 0;

  function createFlingConnection() {
    flingSocket = navigator.mozTCPSocket.open(HOST, FLINGDPORT, opt);

    flingSocket.onopen = function (event) {
      console.log('fling', 'flingSocket opened');
      initSystemVolume(flingSocket);
    };

    flingSocket.onerror = function (event) {
      console.error('fling:', "flingSocket error: " + event.data.name);
    };

    flingSocket.onclose = function (event) {
      console.log('fling', 'flingSocket closed');
      event.target.close();
      window.setTimeout(function () {
        createFlingConnection();
      }, 5000);
    };

    flingSocket.ondata = function (event) {
      console.log('fling:', "ondata: " + event.data);
      flingBuffer = flingBuffer.concat(event.data);
      while (true) {
        if (messageSize < 0) {
          var colonIndex = findColon(flingBuffer);
          if (colonIndex > 0) {
            messageSize = parseInt(flingBuffer.slice(0, colonIndex).toString());
            flingBuffer = flingBuffer.slice(colonIndex + 1);
          } else {
            break;
          }
        }

        if (messageSize > 0) {
          if (flingBuffer.length >= messageSize) {
            var msgBuffer = flingBuffer.slice(0, messageSize);
            doCommand(JSON.parse(msgBuffer.toString()));
            if (flingBuffer.length > messageSize) {
              flingBuffer = flingBuffer.slice(messageSize);
            } else {
              flingBuffer = '';
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
      flingSocket.send("" + volumeMessage.length + ":" + volumeMessage);
      console.log('set Volume success, send: ' + volumeMessage.length + ":" + volumeMessage);
      pendingRequest.p();
    };
    req.onerror = function onError() {
      pendingRequest.p();
    };
  }

  function initSystemVolume(socket) {
    var volumeLevel = 15;
    var volumeMuted = false;

    var req = SettingsListener.getSettingsLock().get('audio.volume.content');

    req.onsuccess = function onSuccess() {
      volumeLevel = req.result['audio.volume.content'];
      console.log('init volumeLevel: ' + volumeLevel);
      if (volumeLevel <= 0) {
        volumeMuted = true;
      }

      var bakVolume = volumeLevel / 15;
      var volumeMessage = JSON.stringify({
        'volumeLevel': bakVolume,
        'volumeMuted': volumeMuted
      });

      socket.send("" + volumeMessage.length + ":" + volumeMessage);
      console.log('init Volume success, send: ' + volumeMessage.length + ":" + volumeMessage);
    };

    req.onerror = function onError() {
    };

  }

  function findColon(buffer) {
    var colonCode = ':';
    for (var i = 0; i < buffer.length; ++i) {
      if (buffer[i] === colonCode) {
        return i;
      }
    }
    return -1;
  }

  createFlingConnection();
})();
