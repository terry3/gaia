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
var checkNetworkInterval = null;
var refreshTimer = null;
var cast_socket = null;
var requestId = 0;
var send_faile_event = null;
var ip;
var PageHelper = {
    PAGE_STATUS : {
        setup_page:1,
        await_page:2,
        connect_page:3,
        ready_page:4,
        reconnect_page:5,
        connectfail_page:6
    },
    //Default background image resources.
    page: [
        document.querySelector("#setup_page"),
        document.querySelector("#await_page"),
        document.querySelector("#connect_page"),
        document.querySelector("#ready_page"),
        document.querySelector("#reconnect_page"),
        document.querySelector("#connectfail_page")
    ],
    //Skip page to index.
    skipPage: function (index) {
        console.log("page index: " + index);
        if (!parseInt(index)) {
            return;
        }

        if (index == this.PAGE_STATUS.ready_page) {
            this.network_change('station');
        } else if (index == this.PAGE_STATUS.reconnect_page || index == this.PAGE_STATUS.connectfail_page) {
            this.network_change('ap');
        }

        index = parseInt(index) - 1;
        if (index < 0 || index > 5) {
            return;
        }
        const READY_PAGE_INDEX = 3;
        var context = this;
        for (var i = 0; i < context.page.length; i++) {
            if (i == index) {
                context.page[i].style.display = "block";
            } else {
                context.page[i].style.display = "none";
            }
        }
        if (index == READY_PAGE_INDEX) {
            //Check internet status.
            context.startCheckNetworkStatus();
        }

    },

    network_change: function (st) {
        var message;
        console.log("Handle network status change: " + st);
        message = JSON.stringify({
            'type': 'SYSTEM_STATUS',
            'network_changed': st, //'ap/station'
            'requestId': this.generateRequestID()
        });
        flingUtils.castdStatusChange(message);
        flingUtils.flingdStatusChange(message);
    },

    generateRequestID: function () {
        return ++requestId;
    },

    showTime: function () {
        function showTime() {
            var now = new Date();
            var hours = now.getHours();
            var minutes = now.getMinutes();
            var timeValue = ((hours > 12) ? hours - 12 : hours);
            timeValue += ((minutes < 10) ? ":0" : ":") + minutes;
            timeValue += "" + ((hours >= 12) ? "  PM " : "  AM " );
            document.querySelector("#ready_show_time").textContent = timeValue + "";
        }
        if (refreshTimer != null) {
            clearInterval(refreshTimer);
            refreshTimer = null;
        }
        refreshTimer = setInterval(showTime, 1000);
    },

    setElement: function (castName, ssid) {
        const ellipsis = "...";
        if (!castName || "string" != typeof castName) {
            castName = "MatchStick";
        }
        if (!ssid || "string" != typeof ssid) {
            ssid = "Wi-Fi"
        }
        castName = castName.trim().substring(0, 32).trim();
        ssid = ssid.trim();
        var mainWidth = document.body.offsetWidth * 0.8;
        var wifiNameWidth = mainWidth * 0.62 - 52 * 2;

        var _ = navigator.mozL10n.get;

        //set page
        var ssidElement = document.getElementById("setup_ssid");
        ssidElement.innerHTML = ConstantUtils.htmlEncode(castName);

        //await page
        var awaitSsidNameElement = document.getElementById("await_ssid_name");
        awaitSsidNameElement.innerHTML = ConstantUtils.htmlEncode(_("cast_wait", { castName: castName}));
        var awaitSsidElement = document.getElementById("await_ssid");
        awaitSsidElement.innerHTML = ConstantUtils.htmlEncode(castName);

        //connect page
        var connectWifiElement = document.getElementById('connect_wifi_name');
        if (ConstantUtils.computeRemainSpace(connectWifiElement, ssid, wifiNameWidth) < 0) {
            ssid = ellipsis + ssid;
            while (ConstantUtils.computeRemainSpace(connectWifiElement, ssid, wifiNameWidth) < 0) {
                if (ssid.length > 3) {
                    ssid = ssid.substring(0, ssid.length - 1).trim();
                } else {
                    break;
                }
            }
            ssid = ssid.trim();
            if (ssid.length > 3) {
                ssid = ssid.substring(3).trim() + ellipsis;
            } else {
                if (ssid.length < 1) {
                    ssid = "Wi-Fi";
                } else {
                    ssid += ellipsis;
                }
            }
        }
        connectWifiElement.innerHTML = ConstantUtils.htmlEncode(ssid);
        var connectSsidElement = document.getElementById("connect_ssid");
        connectSsidElement.innerHTML = ConstantUtils.htmlEncode(castName);
        var connectSsidNameElement = document.getElementById("connect_ssid_name");
        connectSsidNameElement.innerHTML = ConstantUtils.htmlEncode(setCastWifiName(connectSsidNameElement, "connect_status"));
        //reconnect page
        var reconnectSsidNameElement = document.getElementById("reconnect_ssid_name");
        reconnectSsidNameElement.innerHTML = ConstantUtils.htmlEncode(setCastWifiName(reconnectSsidNameElement, "reconnect_status"));
        document.querySelector("#reconnect_help_two").innerHTML = ConstantUtils.htmlEncode(_("reconnect_help_two", {wifiName: ssid}));
        var reconnectSsidElement = document.getElementById("reconnect_ssid");
        reconnectSsidElement.innerHTML = ConstantUtils.htmlEncode(castName);
        var reconnectWifiElement = document.getElementById("reconnect_wifi_name");
        reconnectWifiElement.innerHTML = ConstantUtils.htmlEncode(ssid);

        //connect fail page
        var connectfailSsidNameElement = document.getElementById("connectfail_ssid_name");
        connectfailSsidNameElement.innerHTML = ConstantUtils.htmlEncode(setCastWifiName(connectfailSsidNameElement, "connectfail_status"));
        var connectfailSsidElement = document.getElementById("connectfail_ssid");
        connectfailSsidElement.innerHTML = ConstantUtils.htmlEncode(castName);
        var connectfailWifiElement = document.getElementById("connectfail_wifi_name");
        connectfailWifiElement.innerHTML = ConstantUtils.htmlEncode(ssid);

        //ready page
        var readyCastNameElement = document.getElementById('ready_ssid');
        readyCastNameElement.innerHTML = ConstantUtils.htmlEncode(castName);
        var readyWifiElement = document.getElementById('ready_wifi_name');
        readyWifiElement.innerHTML = ConstantUtils.htmlEncode(ssid);
        function setCastWifiName(e, localeDescription) {
            var shortSsid = ssid;
            if (ellipsis == shortSsid.substring(shortSsid.length - 3)) {
                shortSsid = shortSsid.substring(0, shortSsid.length - 3);
            }
            var text = _(localeDescription, {castName: castName, wifiName: shortSsid});
            if (ConstantUtils.computeRemainSpace(e, text, mainWidth) < 0) {
                shortSsid = ellipsis + shortSsid;
                while (ConstantUtils.computeRemainSpace(e, text, mainWidth) < 0) {
                    if (shortSsid.length > 3) {
                        shortSsid = shortSsid.substring(0, shortSsid.length - 1).trim();
                        text = _(localeDescription, {castName: castName, wifiName: shortSsid});
                    } else {
                        break;
                    }
                }
                shortSsid = shortSsid.trim();
                if (shortSsid.length > 3) {
                    shortSsid = shortSsid.substring(3).trim() + ellipsis;
                } else {
                    if (shortSsid.length < 1) {
                        shortSsid = "WiFi";
                    } else {
                        shortSsid += ellipsis;
                    }
                }
            }
            text = _(localeDescription, {castName: castName, wifiName: shortSsid});
            return text;
        }
    },

    setKeyCodeElement: function (keyCode) {
        var keyCodeElement = document.querySelectorAll('.key_code');
        for (var i = 0; i < keyCodeElement.length; i++) {
            keyCodeElement[i].innerHTML = keyCode;
        }
    },
    //Check network status.
    startCheckNetworkStatus: function () {
        var context = this;
        context.checkWifiStatus();
        context.stopCheckNetworkStatus();
        //In the design of the new UI,Deleted the "internet_status" function,so comment the following js code.
        /*check();
        checkNetworkInterval = setInterval(check, ConstantUtils.CHECK_NETWORK_TIME / 2);
        function check() {
            var internetStatusUI = document.querySelector("#internet_status");
            ConstantUtils.isNetAvailable(function () {
                if (internetStatusUI) {
                    if ("style/images/internet_on.png" != internetStatusUI.src) {
                        internetStatusUI.src = "style/images/internet_on.png";
                    }
                }
            }, function () {
                if (internetStatusUI) {
                    if ("style/images/internet_off.png" != internetStatusUI.src) {
                        internetStatusUI.src = "style/images/internet_off.png";
                    }
                }
            }, ConstantUtils.CHECK_NETWORK_TIME / 2 - 2000);
        }*/
    },

    stopCheckNetworkStatus: function () {
        if (checkNetworkInterval) {
            clearInterval(checkNetworkInterval);
        }
    },

    checkWifiStatus: function () {
        var wifiStatusUI = document.querySelector("#ready_wifi_icon");
        if (!wifiStatusUI) {
            return;
        }
        navigator.mozWifiManager.onconnectionInfoUpdate = function(event) {
            console.log('WiFi Status:', 'signalStrength =', event.signalStrength,
                'relSignalStrength  =', event.relSignalStrength, 'linkSpeed =', event.linkSpeed,
                'ipAddress =', event.ipAddress, 'network =', event.network);
            update(event.relSignalStrength);
            updateIp(event.ipAddress);
        };
        function updateIp(ip) {
            console.log('updateIp: ' +ip);
            var readyWifiIp = document.getElementById('ready_wifi_ip');
            readyWifiIp.innerHTML = ip;
        };

        function update(relSignalStrength) {
            var strength = parseFloat(relSignalStrength);
            if (!isNaN(strength)) {
                if (strength <= 0) {
                    if ("style/images/wifi_signal_0.png" != wifiStatusUI.src) {
                        wifiStatusUI.src = "style/images/wifi_signal_0.png"
                    }
                } else if (strength > 0 && strength <= 40) {
                    if ("style/images/wifi_signal_1.png" != wifiStatusUI.src) {
                        wifiStatusUI.src = "style/images/wifi_signal_1.png"
                    }
                } else if (strength > 40 && strength <= 70) {
                    if ("style/images/wifi_signal_2.png" != wifiStatusUI.src) {
                        wifiStatusUI.src = "style/images/wifi_signal_2.png"
                    }
                } else if (strength > 70 && strength <= 90) {
                    if ("style/images/wifi_signal_3.png" != wifiStatusUI.src) {
                        wifiStatusUI.src = "style/images/wifi_signal_3.png"
                    }
                } else if (strength > 90) {
                    if ("style/images/wifi_signal_4.png" != wifiStatusUI.src) {
                        wifiStatusUI.src = "style/images/wifi_signal_4.png"
                    }
                }
            }
        }
    }
};
