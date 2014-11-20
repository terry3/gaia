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
    var appStr = message.app_info.url;

    if (command == 'LAUNCH_RECEIVER') {
      if (appStr && (appStr).indexOf('http') == 0) {
        startCastAppContainer(appStr);
      } else if (appStr && appStr.index('app:?') == 0) {
        startNativeApp(appStr.slice(5));
      }  else if (message.appUrl) {
        startCastAppContainer(message.appUrl);
      }
    } else if (command == 'STOP_RECEIVER') {
      if (appStr && (appStr).indexOf('http') == 0) {
        stopApplication(castAppConfig);
      } else if (appStr && appStr.index('app:?') == 0) {
        var nativeStr = message.app_info.url;
        var appPkg = nativeStr.slice(5);
        var prefix = 'app://';
        console.log('native app package name: ' + appPkg);
        localAppConfig.url = prefix + appPkg + '/index.html';
        localAppConfig.manifestURL = prefix + appPkg + '/manifest.webapp';
        localAppConfig.origin = prefix + appPkg;
        stopApplication(localAppConfig);
      } else {
        stopApplication(castAppConfig);
      }
    } else {
      console.error('not support command: ' + command);
    }
  }

  function stopApplication(config) {
    console.log('pal:', 'Stop app:', config.origin);
    AppWindowManager.display(null, 'immediate', 'immediate');
    AppWindowManager.kill(config.origin);
    //TODO
//    appWindowFactory.handleEvent({
//      type: 'webapps-close',
//      detail: config
//    });
  }

  function startNativeApp(pkg) {
    console.log('pal:', 'Start native app, package name = ' + pkg);
    var prefix = 'app://';
    localAppConfig.url = prefix + pkg + '/index.html';
    localAppConfig.manifestURL = prefix + pkg + '/manifest.webapp';
    localAppConfig.origin = prefix + pkg;
    appWindowFactory.handleEvent({
      type: 'webapps-launch',
      detail: localAppConfig
    });
  }

  function startCastAppContainer(appUrl) {
    console.log('pal:', 'Start receiver app, url = ' + appUrl);
    var app = new MozActivity({
      name: 'launch-receiver',
      data: {
        type: 'url',
        url: appUrl
      }
    });
  }

  return {
    doAppCommand: doAppCommand
  }

})
();
