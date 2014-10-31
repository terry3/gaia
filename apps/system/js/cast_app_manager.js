'use strict';

var CastAppManager = (function () {

  var castAppConfig = {
    'isActivity': false,
    'url': 'app://castappcontainer.gaiamobile.org/index.html',
    'name': 'CastAppContainer',
    'manifestURL': 'app://castappcontainer.gaiamobile.org/manifest.webapp',
    'origin': 'app://castappcontainer.gaiamobile.org'
  };

  var localAppConfig = {
    'url': '',
    'manifestURL': '',
    'origin': ''
  };
  var appWindowFactory = new AppWindowFactory();

  function doAppCommand(message) {
    console.log('pal:', 'message = ' + JSON.stringify(message));
    var command = message.type;
    if (command == 'LAUNCH_RECEIVER') {
      if (message.app_id == '~browser') {
        if (!message.app_info) {
          return;
        }
        var httpStr = message.app_info.url;
        if (httpStr.indexOf('http') == 0) {
          startCastAppContainer(httpStr);
        }
      } else if (message.app_id == '~native') {
        if (!message.app_info) {
          return;
        }
        var appStr = message.app_info.url;
        if (appStr.index('app:?') == 0) {
          startLocalApp(appStr.slice(5));
        } else {
          console.error('can not start native application: ' + appStr);
        }
      } else if (message.appUrl) {
        startCastAppContainer(message.appUrl);
      }
    } else if (command == 'STOP_RECEIVER') {
      if (message.app_id == '~browser') {
        stopApplication(castAppConfig);
      } else if (message.app_id == '~native') {
        if (message.app_info && message.app_info.url) {
          var nativeStr = message.app_info.url;
          if (nativeStr.index('app:?') == 0) {
            var appPkg = nativeStr.slice(5);
            var prefix = 'app://';
            console.log('native app package name: ' + appPkg);
            localAppConfig.url = prefix + appPkg + '/index.html';
            localAppConfig.manifestURL = prefix + appPkg + '/manifest.webapp';
            localAppConfig.origin = prefix + appPkg;
            stopApplication(localAppConfig);
          } else {
            console.error('can not stop native application: ' + nativeStr);
          }
        }
      }
      else {
        stopApplication(castAppConfig);
      }
    } else {
      console.error('not support command: ' + command);
    }
  }

  function stopApplication(config) {
    console.log('pal:', 'Stop Receiver App!');
    AppWindowManager.display(null, 'immediate', 'immediate');
    AppWindowManager.kill(config.origin);
    //TODO
//    appWindowFactory.handleEvent({
//      type: 'webapps-close',
//      detail: config
//    });
  }

  function startLocalApp(pkg) {
    console.log('package name = ' + pkg);
    var prefix = 'app://';
    localAppConfig.url = prefix + pkg + '/index.html';
    localAppConfig.manifestURL = prefix + pkg + '/manifest.webapp';
    localAppConfig.origin = prefix + pkg;
    appWindowFactory.handleEvent({
      type: 'webapps-launch',
      detail: localAppConfig
    });
    console.log('pal:', 'startLocalApp:', pkg);
  }

  function startCastAppContainer(appUrl) {
    navigator.mozApps.mgmt.getAll().onsuccess = function (event) {
      var apps;
      apps = event.target.result;
      apps.forEach(function (app) {
        if (app.manifest.name === 'CastAppContainer') {
          app.launch();
        }
      });
    };
    console.log('pal:', 'startCastAppContainer:', appUrl);
    setAppUrl(['launch', appUrl], 'pal-app-cmd');
  }

  function setAppUrl(data, cmd) {
    console.log('pal:', 'setAppUrl! the data is ' + data + ' , the command is ' + cmd);
    navigator.mozApps.getSelf().onsuccess = function (event) {
      var _selfApp;
      _selfApp = event.target.result;
      console.log('pal:', 'ready to connect app');
      if (_selfApp.connect !== null) {
        (_selfApp.connect(cmd)).then(function (ports) {
          ports.forEach(function (port) {
            port.postMessage(data);
          });
        }, function (reason) {
          console.log('pal:', 'failed to connect to ' + cmd + ' ' + reason);
          console.log('pal:', 'try to reconnect...');
          window.setTimeout(function () {
            setAppUrl(data, cmd);
          }, 500);
        });
      }
    };
  }

  return {
    doAppCommand: doAppCommand
  }

})
();
