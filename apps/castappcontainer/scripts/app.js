/**
 * Created by Shawn on 5/6/14.
 */

(function () {

// The app entry: just after document load finished.
    var appContainerFrame = null;
    var load_timeout = true;
    var closetimer = null;
    var loadtimer = null;
    var load_count = 0;

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
        //appContainerFrame.purgeHistory();
        appContainerFrame.src = url;
        var error_info = navigator.mozL10n.get('network-error');
        var error_wait = navigator.mozL10n.get('network-wait');

        $("#app_container").on("load", function () {
            console.log('frame load');
            load_timeout = false;
            if (closetimer != null) {
                clearTimeout(closetimer);
                closetimer = null;
                alertBox.hide();
            }

            if (loadtimer != null) {
                clearInterval(loadtimer);
                loadtimer = null;
                alertBox.hide();
            }
        });

        loadtimer = window.setInterval(function () {
            console.log('load count = ' + load_count);
            load_count++;
            if (load_timeout && load_count == 1) {
                console.log('Load timeout count = 1');
                alertBox.show(error_wait);
            } else if (load_timeout && load_count == 2) {
                console.log('Load timeout count = 2');
                clearInterval(loadtimer);
                loadtimer = null;
                alertBox.show(error_info);
                close_self(5000);
            } else {
                console.log('load success');
            }
        }, 30 * 1000);
    }

    function init() {
        appContainerFrame = document.getElementById('app_container');

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
        console.log('pal:', 'Receive iframe event: ' + evt.type);
        switch (evt.type) {
            case 'mozbrowserclose':
                window.close();
                break;
            default:
                break;
        }
    }

    function close_self(delay) {

        closetimer = setTimeout(function () {
            console.log('load timeout close self');
            window.close();
        }, delay);
    }

    init();
    navigator.mozSetMessageHandler("activity", function (activityRequest) {
        var option = activityRequest.source;
        console.log(option.data.url);
        launchCastApp(option.data.url);
    });

})();