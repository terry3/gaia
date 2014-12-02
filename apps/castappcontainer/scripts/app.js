/**
 * Created by Shawn on 5/6/14.
 */

(function () {

// The app entry: just after document load finished.
    var appContainerFrame = null;
    var load_timeout = true;
    var loadtimer = null;
    var error_wait = '';

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

    function init() {
        appContainerFrame = document.getElementById('app_container');

        var mozL10n = navigator.mozL10n;
        mozL10n.ready(function () {
          error_wait = navigator.mozL10n.get('network-wait');
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

    window.onload  = function () {
      init();
      navigator.mozSetMessageHandler("activity", function (activityRequest) {
        var option = activityRequest.source;
        launchCastApp(option.data.url);
      });
    }
})();