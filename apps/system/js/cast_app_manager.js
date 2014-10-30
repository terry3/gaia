'used dict'
var CastAppManager = (function () {
  var prefix = 'app://';

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
    //{"type":"LAUNCH_RECEIVER","app_id":"~browser",
    // "app_info":{"url":"http://castapp.infthink.com/receiver/mediaplayer/index.html",
    // "useIpc":true}}

    var command = message.type;
    if (command == 'LAUNCH_RECEIVER') {
      if (message.app_id == '~browser') {
        console.log('XXXXX appinfo');
        startCastAppContainer(message.app_info.url);
      } else if (message.app_id == '~native') {
        console.log('XXXXX packagename');
        startLocalApp(message.app_info.package_name);
      } else if (message.appUrl) {
        //for node-castd
        startCastAppContainer(message.appUrl);
      }
    } else if (command == 'STOP_RECEIVER') {

      if (message.app_info.package_name) {
        localAppConfig.url = prefix + message.app_info.package_name + '/index.html';
        localAppConfig.manifestURL = prefix + message.app_info.package_name + '/manifest.webapp';
        localAppConfig.origin = prefix + message.app_info.package_name;
        stopApplication(localAppConfig);
      }
      stopApplication(castAppConfig);

    }


  }


  function stopApplication(config) {
    console.log('pal:', 'Stop Receiver App!');
    AppWindowManager.display(null, 'immediate', 'immediate');
    appWindowFactory.handleEvent({
      type: 'webapps-close',
      detail: config
    });
  }

  function startLocalApp(pkg) {
    //com.a.com
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
    appWindowFactory.handleEvent({
      type: 'webapps-launch',
      detail: castAppConfig
    });
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
