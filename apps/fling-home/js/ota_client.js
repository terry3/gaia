/**
 * Copyright (C) 2013-2014, Infthink (Beijing) Technology Co., Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.ß
 */
(function () {
    //var otaDiv = document.querySelector("#version_ota");

    var platform = null;
    var version = null;

    var status = 0;
    var CURRENT_STATUS = {
        CURRENT_VERSION: 0,
        UPDATE_SUCCESS: 1,
        UPDATE_FAILED: 2,
        DOWNLOAD_SUCCESS: 3,
        DOWNLOAD_FAILED: 4
    };

    var otaSocket = null;
    //Server host
    var SERVER_HOST = "127.0.0.1";
    //Server port
    var SERVER_PORT = 4999;

    var restartTimer = null;

    function reConnect() {
        if (restartTimer) {
            clearTimeout(restartTimer);
            restartTimer = null;
        }
        restartTimer = setTimeout(function () {
            console.log('reconnect ota');
            connectOTAServer();
        }, 5 * 1000);
    }

    function connectOTAServer() {
        otaSocket = navigator.mozTCPSocket.open(SERVER_HOST, SERVER_PORT);
        otaSocket.onopen = function (event) {
            console.log('socket opend');

            var msg = JSON.stringify({
                type: 'HANDSHAKE',
                data: 'ota_client'
            });
            otaSocket.send(msg);
        };

        otaSocket.onerror = function (event) {
            console.log('socket error: ' + event.data.name);
            reConnect();
        };

        otaSocket.onclose = function (event) {
            console.log('socket closed: ' + event.data.name);
            otaSocket.close();
            otaSocket = null;
        };

        otaSocket.ondata = function (event) {
            console.log('socket ondata message = ' + event.data);

            var message = event.data;
            var msg;
            try {
               msg = JSON.parse((message.slice(message.split(':', 1).toString().length + 1)));
            } catch (err) {
                console.log('pares message error: ' + err);
            }
            if (msg.type == 'SYSTEM_STATUS') {
                console.log('SYSTEM_STATUS platform: ' + platform + ', version: ' + version);
                platform = msg.data.platform;
                version = msg.data.version;
                showVersion();
                // Set deviceVersion for Setting App device_info
                ConnectService.setDeviceVersion(platform + '.' + version);
            } else if (msg.type == 'OTA_UPDATE') {
                if (msg.data.event == 'EVENT_CLEAR_MSG') {
                    showVersion();
                } else if (msg.data.event == 'EVENT_UPGRADE') {
                    if (msg.data.result == 'SUCCESS') {
                        version = msg.data.version;
                        platform = msg.data.platform;
                        updateSuccess();

                        ConnectService.setDeviceVersion(platform + '.' + version);
                        window.setTimeout(function () {
                            showVersion();
                        }, 60 * 1000);
                    } else if (msg.data.result == 'FAIL') {
                        status = CURRENT_STATUS.UPDATE_FAILED;
                        updateFailed();
                    }
                } else if (msg.data.event == 'EVENT_DOWNLOAD') {
                    if (msg.data.result == 'SUCCESS') {
                        downloadSuccess();
                    } else if (msg.data.result == 'FAIL') {
                        downloadFailed();
                    }
                }
            }
        };
    }

    function showVersion() {
        status = CURRENT_STATUS.CURRENT_VERSION;
        if (platform == null || version == null) {
            console.log('platform or version == null');
            return;
        }
        console.log('show version platform: ' + platform + ', version: ' + version);
        //otaDiv.style.color = '8f7a10';
        //otaDiv.innerHTML = navigator.mozL10n.get('current_version') + platform + '.' + version;
    }

    function downloadSuccess() {
        status = CURRENT_STATUS.DOWNLOAD_SUCCESS;
        console.log('download success');
        //otaDiv.style.color = '8f7a10';
        //otaDiv.innerHTML = navigator.mozL10n.get('download_success');
    }

    function downloadFailed() {
        console.log('download failed');
    }

    function updateSuccess() {
        if (platform == null || version == null) {
            console.log('platform or version == null');
            return;
        }
        status = CURRENT_STATUS.UPDATE_SUCCESS;
        console.log('show version success: ' + platform + ', version: ' + version);
        //otaDiv.style.color = '8f7a10';
        //otaDiv.innerHTML = navigator.mozL10n.get('update_success') + platform + '.' + version;
    }

    function updateFailed() {
        console.log('update failed');
        status = CURRENT_STATUS.UPDATE_FAILED;
        //otaDiv.style.color = 'FF0000';
        //otaDiv.innerHTML = navigator.mozL10n.get('update_filed');
    }

    window.addEventListener('localized', function () {
        document.documentElement.lang = navigator.mozL10n.language.code;
        document.documentElement.dir = navigator.mozL10n.language.direction;
        switch (status) {
            case CURRENT_STATUS.CURRENT_VERSION:
                showVersion();
                break;
            case CURRENT_STATUS.DOWNLOAD_FAILED:
                downloadFailed();
                break;
            case CURRENT_STATUS.DOWNLOAD_SUCCESS:
                downloadSuccess();
                break;
            case CURRENT_STATUS.UPDATE_FAILED:
                updateFailed();
                break;
            case CURRENT_STATUS.UPDATE_SUCCESS:
                updateSuccess();
                break;
        }

    });

    window.onload = function () {
        connectOTAServer();
    };
})();