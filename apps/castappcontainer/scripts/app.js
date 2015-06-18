/**
 * Created by Shawn on 5/6/14.
 */

(function () {

// The app entry: just after document load finished.
    var appContainerFrame = null;
    var load_timeout = true;
    var loadtimer = null;
    var error_wait = '';
    var network_connected = '';
    var network_disconnect = '';
    var network_connecting = '';
    var network_connect_failed = '';
    var ssid='';
    var networkManager = navigator.mozWifiManager;

    var networkBox = {
        "init": function () {
            this.network = document.getElementById("network");
            this.network_text = document.getElementById('network_text');
        },
        "show": function (text) {
            this.init();
            this.network_text.innerHTML = text;
            this.network.className = "network_status";
        },
        "hide": function () {
            this.init();
            this.network.className = "network_status hide";
        }
    };
    var alertBox = {
        "init": function () {
            this.alert = document.getElementById("alert");
            this.alertText = document.getElementById("alert-text");
        },
        "show": function (text) {
            this.init();
            this.alertText.innerHTML = text;
            this.alert.className = "alert";
        },
        "hide": function () {
            this.init();
            this.alert.className = "alert hide";
        }
    };

    function launchCastApp(url) {
        console.log("launchCastApp: url: " + url);
        appContainerFrame.src = url;

        $("#app_container").on("load", function () {
            load_timeout = false;
            if (loadtimer != null) {
                clearTimeout(loadtimer);
                loadtimer = null;
                alertBox.hide();
            }
        });

        loadtimer = window.setTimeout(function () {
            if (load_timeout) {
                alertBox.show(error_wait);
            } else {
                console.log('load success');
            }
        }, 15 * 1000);
    }

    function handleHomeCommand(event) {
        console.log('handle home command: ' + event.detail);
        try {
            var port = IACHandler.getPort('home-app-cmd');
        } catch (error) {
            console.log(error.toString());
        }
        var command = event.detail[0];

        if (command === 'close') {
            console.log('close self');
            window.close();
        } else if (command === 'connect') {
            ssid = event.detail[1];
            console.log('connect to: ' + ssid);
        } else if (command === 'reload') {
            console.log('reload url  to: ' + event.detail[1]);
            launchCastApp(event.detail[1]);
        } else {
            console.error('error command: ' +command)
        }
    }

    function init() {
        appContainerFrame = document.getElementById('app_container');
        window.addEventListener('iac-home-app-cmd', handleHomeCommand);

        var mozL10n = navigator.mozL10n;
        mozL10n.ready(function () {
            error_wait = navigator.mozL10n.get('network-wait');
            network_connected = navigator.mozL10n.get('network-connected');
            network_connect_failed = navigator.mozL10n.get('network-connect-failed');
            network_disconnect = navigator.mozL10n.get('network-connect-disconnect');
            network_connecting = navigator.mozL10n.get('network-connecting');

        });
        var iframeEvents = ['loadstart', 'loadend', 'locationchange',
            'titlechange', 'iconchange', 'contextmenu',
            'securitychange', 'openwindow', 'close',
            'showmodalprompt', 'error', 'asyncscroll',
            'usernameandpasswordrequired'];
        iframeEvents.forEach(function attachEvent(type) {
            appContainerFrame.addEventListener('mozbrowser' + type, handleAppContainerEvent);
        });
    }

    function handleAppContainerEvent(evt) {
        console.log('pal:', 'Receive iframe event: ' + evt.type + ' ' + evt.detail);
        switch (evt.type) {
            case 'mozbrowserclose':
                window.close();
                break;
            default:
                break;
        }
    }

    networkManager.onstatuschange = function (event) {
        console.log('network status change: ' + event.status + ', network enabled: ' + networkManager.enabled);
        if (event.status == 'connected') {
            networkBox.show(network_connected);
            window.setTimeout(function () {
                networkBox.hide();
            }, 1000);
        } else if (event.status == 'connectingfailed' && networkManager.enabled) {
            networkBox.show(network_connect_failed);
            window.setTimeout(function () {
                networkBox.hide();
            }, 1000);
        } else if (event.status == 'associated' || event.status == 'connecting') {
            networkBox.show(network_connecting +' ' + ssid);
        } else if (event.status == 'disconnected' && networkManager.enabled) {
            networkBox.show(network_disconnect);
        }
    };

    window.onload  = function () {
      init();
      navigator.mozSetMessageHandler("activity", function (activityRequest) {
        var option = activityRequest.source;
        launchCastApp(option.data.url);
      });
      document.getElementById("app_container").focus();
    }
})();