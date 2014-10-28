/**
 * Created by wangxianfeng on 14-7-4.
 */


var CastAppManager = (function () {
    window.addEventListener('castappclosed', function onkilled(evt) {
        console.log('pal:', 'get castappclosed event, current:', fsm.current);
        if (fsm.current == 'stopping') {
            fsm.stopped();
        } else if (fsm.current == 'running') {
            fsm.bash_kill();
        }
    });

    window.addEventListener('castappopened', function onopened(evt) {
        console.log('pal:', 'get castappopened event, current:', fsm.current);
        if (fsm.current == 'starting') {
            fsm.started();
        } else if (fsm.current == 'idle') {
            fsm.bash_open();
        }
    });

    var fsm = StateMachine.create({

        initial: 'idle',
        events: [
            { name: 'start', from: 'idle', to: 'starting' },
            { name: 'started', from: 'starting', to: 'running' },
            { name: 'stop', from: 'running', to: 'stopping' },
            { name: 'stopped', from: 'stopping', to: 'idle' },
            { name: 'bash_kill', from: 'running', to: 'idle' },
            { name: 'bash_open', from: 'idle', to: 'running' }
        ],

        callbacks: {
            onstart: function () {
            },
            onstarted: function () {
                console.log('pal:', 'onstarted');
                doPending();
            },
            onstop: function () {
            },
            onstopped: function () {
                console.log('pal:', 'onstopped');
                doPending();
            },
            error: function (eventName, from, to, args, errorCode, errorMessage) {
                return 'event ' + eventName + ': ' + errorMessage;
            },
            onchangestate: function (event, from, to) {
                console.log('pal:', "change statue: " + from + " to " + to);
            }
        }

    });

    function doPending() {
        var length = cmdQueue.length;
        var lastCmd = '';
        console.log('pal:', 'cmdQueue length: ' + cmdQueue.length);
        if (length > 0) {
            lastCmd = cmdQueue[length - 1];
            console.log('pal:', 'lastCmd = ' + JSON.stringify(lastCmd));
            doAppCommand(lastCmd);
            cmdQueue = [];
        }
    }

    var cmdQueue = [];

    function doAppCommand(message) {
        console.log('pal:', 'message = ' + JSON.stringify(message));
        console.log('pal:', 'current status: ' + fsm.current);
        var command = message.type;
        var appUrl;
        if (command == 'LAUNCH_RECEIVER') {
            appUrl = message.appUrl;
            if (fsm.current == 'idle') {
                fsm.start();
                startApplication(appUrl);
            } else if (fsm.current == 'starting') {
                cmdQueue.push({'type': command, 'appUrl': appUrl});
            } else if (fsm.current == 'running') {
                startApplication(appUrl);
            } else if (fsm.current === 'stopping') {
                cmdQueue.push({'type': command, 'appUrl': appUrl});
            }
        } else if (command == 'STOP_RECEIVER') {
            if (fsm.current == 'idle') {

            } else if (fsm.current == 'starting') {
                cmdQueue.push({'type': command});
            } else if (fsm.current == 'running') {
                fsm.stop();
                stopApplication();
            } else if (fsm.current === 'stopping') {
            }
        }
    }

    function stopApplication() {
        var origin = 'app://castappcontainer.gaiamobile.org';
        console.log("pal:", "Stop Receiver App!");
        AppWindowManager.display(null, 'immediate', 'immediate');
        AppWindowManager.kill(origin);
    }

    function startApplication(appUrl) {
        console.log("pal:", "start app:", appUrl);
        startAppContainer('CastAppContainer');
        setAppUrl(['launch', appUrl], 'pal-app-cmd');
    }

    /*
     start app's container application
     */
    function startAppContainer(appName) {
        navigator.mozApps.mgmt.getAll().onsuccess = function (event) {
            var apps;
            apps = event.target.result;
            apps.forEach(function (app) {
                if (app.manifest.name === appName) {
                    app.launch();
                }
            });
        };
    }

    function setAppUrl(data, cmd) {
        console.log('pal:', "setAppUrl! the data is " + data + " , the command is " + cmd);
        navigator.mozApps.getSelf().onsuccess = function (event) {
            var _selfApp;
            _selfApp = event.target.result;
            console.log("pal:", "ready to connect app");
            if (_selfApp.connect !== null) {
                (_selfApp.connect(cmd)).then(function (ports) {
                    ports.forEach(function (port) {
                        port.postMessage(data);
                    });
                }, function (reason) {
                    console.log("pal:", "failed to connect to " + cmd + " " + reason);
                    console.log("pal:", "try to reconnect...");
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

})();
