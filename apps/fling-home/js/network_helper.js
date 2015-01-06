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
var networkHelper = {

    getNetworkManager: function() {
        return this.networkManager;
    },

    networkManager: function() {
        return navigator.mozWifiManager;
    }(),

    connectWifi: function(ssid, bssid, type, password, ishidden) {
        console.log("connect_wifi...." + ssid + "-->" + bssid +"-->" + password);

        var SCAN_NETWORK_TIMEOUT = 10000;
        var NETWORK_MAX_CONNECT = 5;
        var NETWORK_MAX_FIND = 5;

        var networkManager = this.networkManager;
        var network_find_count = 0;
        var network_connect_count = 0;
        var scaning = false;

        function setPassword(network, password) {

            var security = undefined;
            if (network.security === undefined) {
                security = network.capabilities[0];
            } else {
                security = network.security[0];
            }

            for (var i in network) {
                console.log(i + "-->" + network[i]);
            }
            console.log(network.ssid + ":" + security);

            switch (security) {
                case 'OPEN':
                    break;
                case 'WEP':
                    network.wep = password;
                    break;
                case 'WPA-PSK':
                    network.psk = password;
                    break;
                case 'WPA-EAP':
                    break;
            }

//        else if (security === 'WPA-EAP') {
//            network.eap = prompt('Which EAP method should be used:');
//            network.identity = prompt('Which identity should be used:');
//            network.password = prompt('This network requires a password:');
//            network.pin = prompt('Thanks to finally provide your own PIN:');
//        }
            if(security != undefined) {
                if (security == 'OPEN') {
                    security = '';
                }
                network.keyManagement = security;
            }
        }

        function connect(network) {
            console.log("ssid:" + network.ssid + "password:" + password);

            if (password) {
                setPassword(network, password);
            }

            var lock = navigator.mozSettings.createLock();
            var connectRequest = networkManager.associate(network);
            lock.set({'wifi.connect_via_settings': true});
            connectRequest.onsuccess = function() {
                console.log("wifi connect success");
            };

            connectRequest.onerror = function() {
                console.log("wifi connect error:" + network_connect_count);
                if (networkManager.enabled) {
                    if (network_connect_count < NETWORK_MAX_CONNECT) {
                        connect(network);
                        network_connect_count ++;
                    } else {
                        networkHelper.openHotspot('fail');
                    }
                }
            }
        }

        function hiddenNetwork() {
            var network = {};
            network.hidden = true;
            network.security = [type];
            network.ssid = ssid;
            if (window.MozWifiNetwork !== undefined) {
                network = new window.MozWifiNetwork(network);
            }
            // if (network.security === undefined) {
            //     network.capabilities = [type];
            // } else {
            //     network.security = [type];
            // }

            connect(network);
        }

        function matchNetwork() {
            console.log("network_find_count:" + network_find_count);
            if (scaning) {
                console.log("network scaning");
                return;
            }

            if(!networkManager.enabled) {
                console.log("networkManager disabled");
                return;
            }

            if (password == null || password == '') {
                if (type != 'OPEN') {
                    console.log('password is null');
                    networkHelper.openHotspot('!fail');
                    return;
                }
            }

            scaning = true;
            console.log("start scan");
            var scanTimeouter = setTimeout(scanTimeout, SCAN_NETWORK_TIMEOUT);
            console.log("set sca timeouter");
            var reuqest = networkManager.getNetworks();
            console.log("stop scan");
            reuqest.onsuccess = function() {
                console.log("network_find_count:onsuccess");
                if (scanTimeouter) {
                    clearTimeout(scanTimeouter);
                    scanTimeouter = null;
                }
                var networks = reuqest.result;
                var network = undefined;

                [].forEach.call(networks, function(nt) {
                    //console.log("ssid:" + nt.ssid + " bssid:" + nt.bssid);
                    if (null != bssid && bssid == nt.bssid) {
                        network = nt;
                        return network;
                    }
                });

/*
                for (var index in networks) {
                    //console.log(networks[index].bssid + ":" + networks[index].ssid);
                    if (null != bssid && bssid == networks[index].bssid) {
                        network = networks[index];
                        break;
                    }
                }
*/

                if (network != undefined) {
                    connect(network);
                } else {
                    console.log("can not find the network " + ssid);
                    if (network_find_count < NETWORK_MAX_FIND) {
                        window.setTimeout(matchNetwork, 5000);
                        network_find_count ++;

                    } else {
                        networkHelper.openHotspot('!fail');
                    }

                }
                scaning = false;
            };

            reuqest.onerror = function(err) {
                console.log("scan network onerror");
                if (scanTimeouter) {
                    clearTimeout(scanTimeouter);
                    scanTimeouter = null;
                }
                if (network_find_count < NETWORK_MAX_FIND) {
                    window.setTimeout(matchNetwork, 5000);
                    network_find_count ++;
                } else {
                    networkHelper.openHotspot('!fail');
                }
                scaning = false;
            };
        }

        function scanTimeout() {
            console.log("Failed to getNetworks...[" + scaning + "]["+network_find_count + "]");
            if (network_find_count < NETWORK_MAX_FIND) {
                window.setTimeout(matchNetwork, 5000);
                network_find_count ++;
            } else {
                networkHelper.openHotspot('!fail');
            }
            scaning = false;
        }

        type = networkHelper.fixSecurity(type);
        var hidden = this.fixHidden(ishidden);
        console.log("ishidden:" + hidden);
        if (hidden) {
            console.log("hiddenNetwork");
            hiddenNetwork()
        } else {
            console.log("matchNetwork");
            matchNetwork();
        }
    },

    fixSecurity: function (type) {
        switch (type) {
            case 'OPEN':
                break;
            case 'WPA/WPA2 PSK':
                type = 'WPA-PSK';
                break;
            case '802.1x EAP':
                type = 'WPA-EAP';
                break;
            case 'WEP':
                type = 'WEP';
                break;
        }
        return type;
    },

    fixHidden: function (ishidden) {
        console.log("ishidden:" + ishidden);
        if ('false' == ishidden) {
            return false;
        } else if ('true' == ishidden) {
            return true;
        } else if (null == ishidden) {
            return false;
        } else {
            return ishidden;
        }
    },

    isWifiConnected: function() {
        var networkManager = this.networkManager;
        return undefined != networkManager.connection && null != networkManager.connection
            && networkManager.connection.status == 'connected';
    },

    forgetWifi: function() {
        console.log("forget the network");
        var networkManager = networkHelper.networkManager;
        var connection = networkManager.connection;
        if (connection != undefined) {
            console.log("connection");
            if (connection.network != undefined) {
                console.log("network forget:" + connection.network.ssid);
                navigator.mozSettings.createLock().set({'wifi.connect_via_settings': false});
                networkManager.forget(connection.network);
            }
        }
    },

    closeWifi: function() {
        console.log("close wifi");
        var lock = window.navigator.mozSettings.createLock();
        if(networkHelper.networkManager.enabled) {
            var result = lock.set({
                'wifi.enabled': false,
                'wifi.suspended': false
            });
        }
    },

    openWifi: function() {
        console.log("open wifi");
        //this.closeHotspot();
        var settings = window.navigator.mozSettings;
        var wifi = settings.createLock().set({
            'wifi.enabled': true,
            'wifi.suspended': false
        });

        wifi.onsuccess = function () {
            console.log("wifi enabled");
        };

        wifi.onerror = function () {
            var hotspot = settings.createLock().set({
                'tethering.wifi.enabled': true
            });
        };
    },

    closeHotspot: function() {
        console.log("close hotspot");
        var lock = window.navigator.mozSettings.createLock();
        var hotspot = lock.get('tethering.wifi.enabled');

        hotspot.onsuccess = function() {
            if (true == hotspot.result['tethering.wifi.enabled']) {
                console.log("tethering disenabled!");
                lock.set({
                    'tethering.wifi.enabled': false
                });
            } else {
                console.log("tethering already disenabled");
            }
        };

        hotspot.onerror = function() {
            console.log("hotspot close error");
        }
    },

    openHotspot: function(configState) {
        console.log("open hotspot!");
        if (undefined != configState && null != configState) {
            if (configState == 'fail'){
                PageHelper.skipPage(6);
            } else {
                PageHelper.skipPage(5);
            }
        }
        //this.closeWifi();
        var lock = window.navigator.mozSettings.createLock();
        var hotspot = lock.get('tethering.wifi.enabled');

        hotspot.onsuccess = function() {
            console.log("tethering enabled!");
            if (false == hotspot.result['tethering.wifi.enabled']) {
              console.log("tethering enabled!");
              lock.set({'tethering.wifi.enabled': true});
            } else {
              console.log("tethering already enabled!");
            }
        };

        hotspot.onerror = function() {
            console.log("hotspot open error!");
        };
    }
};
