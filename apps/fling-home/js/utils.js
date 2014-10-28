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
var MessageDecoder = {

    //return JSON object
    ProtocolDecode : function (message) {
        console.log('message: ' + JSON.stringify(message));
        return message.data;
    },

    //return String
    ProtocolEncode : function (data, message_type, meta, protocol_version) {
        if (protocol_version == null || protocol_version == undefined) {
            protocol_version = '1.0';
        }
        var message = {
            'protocol_version': protocol_version,
            'message_type': message_type,
            'meta': meta,
            'data': data
        };
        var protocolMessage = JSON.stringify(message).length + ':' + JSON.stringify(message);
        console.log('protocolMessage: '+ protocolMessage);
        return protocolMessage;
    }

};


var ConstantUtils = {

    CHECK_NETWORK_TIME: 60000,
    //Server for check whether or not internet is available.
    CHECK_NETWORK_SERVER: ["182.92.81.74", "www.bing.com", "www.baidu.com"],
    //Check Internet is available or not.
    isNetAvailable: function (availableCallback, notAvailableCallback, timeout) {
        var context = this;

        var aCallback = availableCallback || function () {
            console.log("Default callback: Internet is available!");
        };
        var nCallback = notAvailableCallback || function () {
            console.log("Default callback: Internet is not available!");
        };
        var mTimeout = timeout || context.CHECK_NETWORK_TIME;
        if (!Array.isArray(context.CHECK_NETWORK_SERVER) && context.CHECK_NETWORK_SERVER.length <= 0) {
            nCallback();
            return;
        }
        var checked = context.CHECK_NETWORK_SERVER.slice(0, 3);
        var length = checked.length;
        check();
        function check() {
            var server = checked.shift();
            if (!server) {
                nCallback();
                return;
            }
            var req = new XMLHttpRequest({mozSystem: true, mozAnon: true, mozBackgroundRequest: true});
            req.timeout = mTimeout / length - 1000;
            req.onerror = function () {
                check();
            };
            req.onreadystatechange = function () {
                if (this.readyState == 4) {
                    if (this.status == 200) {
                        checked.length = 0;
                        aCallback();
                    } else {
                        check();
                    }
                }
            };
            var url = "http://" + server + "/?timestamp-" + (+new Date());
            req.open("GET", url, true);
            try {
                req.send(null);
            } catch (error) {
                check();
            }
        }
    },
    //Decode
    decode: function (buf) {
        var i = 0, pos = 0, str = "", unicode = 0, flag = 0;
        for (pos = 0; pos < buf.length;) {
            flag = buf.charCodeAt(pos);
            if ((flag >>> 7) === 0) {
                str += String.fromCharCode(buf.charCodeAt(pos));
                pos += 1;
            } else if ((flag & 0xFC) === 0xFC) {
                unicode = (buf.charCodeAt(pos) & 0x3) << 30;
                unicode |= (buf.charCodeAt(pos + 1) & 0x3F) << 24;
                unicode |= (buf.charCodeAt(pos + 2) & 0x3F) << 18;
                unicode |= (buf.charCodeAt(pos + 3) & 0x3F) << 12;
                unicode |= (buf.charCodeAt(pos + 4) & 0x3F) << 6;
                unicode |= (buf.charCodeAt(pos + 5) & 0x3F);
                str += String.fromCharCode(unicode);
                pos += 6;
            } else if ((flag & 0xF8) === 0xF8) {
                unicode = (buf.charCodeAt(pos) & 0x7) << 24;
                unicode |= (buf.charCodeAt(pos + 1) & 0x3F) << 18;
                unicode |= (buf.charCodeAt(pos + 2) & 0x3F) << 12;
                unicode |= (buf.charCodeAt(pos + 3) & 0x3F) << 6;
                unicode |= (buf.charCodeAt(pos + 4) & 0x3F);
                str += String.fromCharCode(unicode);
                pos += 5;
            } else if ((flag & 0xF0) === 0xF0) {
                unicode = (buf.charCodeAt(pos) & 0xF) << 18;
                unicode |= (buf.charCodeAt(pos + 1) & 0x3F) << 12;
                unicode |= (buf.charCodeAt(pos + 2) & 0x3F) << 6;
                unicode |= (buf.charCodeAt(pos + 3) & 0x3F);
                str += String.fromCharCode(unicode);
                pos += 4;
            } else if ((flag & 0xE0) === 0xE0) {
                unicode = (buf.charCodeAt(pos) & 0x1F) << 12;
                unicode |= (buf.charCodeAt(pos + 1) & 0x3F) << 6;
                unicode |= (buf.charCodeAt(pos + 2) & 0x3F);
                str += String.fromCharCode(unicode);
                pos += 3;
            } else if ((flag & 0xC0) === 0xC0) { //110
                unicode = (buf.charCodeAt(pos) & 0x3F) << 6;
                unicode |= (buf.charCodeAt(pos + 1) & 0x3F);
                str += String.fromCharCode(unicode);
                pos += 2;
            } else {
                str += String.fromCharCode(buf.charCodeAt(pos));
                pos += 1;
            }
        }
        return str;
    },

    encode: function (str) {
        var i, len, ch;
        var utf8Str = "";
        len = str.length;
        for (i = 0; i < len; i++) {
            ch = str.charCodeAt(i);

            if ((ch >= 0x0) && (ch <= 0x7F)) {
                utf8Str += str.charAt(i);

            } else if ((ch >= 0x80) && (ch <= 0x7FF)) {
                utf8Str += String.fromCharCode(0xc0 | ((ch >> 6) & 0x1F));
                utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

            } else if ((ch >= 0x800) && (ch <= 0xFFFF)) {
                utf8Str += String.fromCharCode(0xe0 | ((ch >> 12) & 0xF));
                utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3F));
                utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

            } else if ((ch >= 0x10000) && (ch <= 0x1FFFFF)) {
                utf8Str += String.fromCharCode(0xF0 | ((ch >> 18) & 0x7));
                utf8Str += String.fromCharCode(0x80 | ((ch >> 12) & 0x3F));
                utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3F));
                utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

            } else if ((ch >= 0x200000) && (ch <= 0x3FFFFFF)) {
                utf8Str += String.fromCharCode(0xF8 | ((ch >> 24) & 0x3));
                utf8Str += String.fromCharCode(0x80 | ((ch >> 18) & 0x3F));
                utf8Str += String.fromCharCode(0x80 | ((ch >> 12) & 0x3F));
                utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3F));
                utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

            } else if ((ch >= 0x4000000) && (ch <= 0x7FFFFFFF)) {
                utf8Str += String.fromCharCode(0xFC | ((ch >> 30) & 0x1));
                utf8Str += String.fromCharCode(0x80 | ((ch >> 24) & 0x3F));
                utf8Str += String.fromCharCode(0x80 | ((ch >> 18) & 0x3F));
                utf8Str += String.fromCharCode(0x80 | ((ch >> 12) & 0x3F));
                utf8Str += String.fromCharCode(0x80 | ((ch >> 6 ) & 0x3F));
                utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

            }

        }
        return utf8Str;
    },

    computeRemainSpace: function (e, text, sumWidth) {

        if (2 == arguments.length) {
            sumWidth = arguments[0].offsetWidth;
        } else if (3 == arguments.length) {
            sumWidth = arguments[2];
        } else {
            throw new Error("IllegalArguments Exception");
        }

        var fontSize = document.defaultView.getComputedStyle(e, null).getPropertyValue("font-size");
        var moreSpaceWidth = 0;
        var spaceCounter = innerSpaceStat(text);
        var spaceWidth = computeSpaceWidth(fontSize);
        for (var i = 0; i < spaceCounter.length; i++) {
            if (spaceCounter[i] > 1) {
                moreSpaceWidth += (spaceCounter[i] - 1) * spaceWidth;
            }
        }
        return sumWidth - computeFontWidth(text, fontSize) - moreSpaceWidth;

        function computeFontWidth(str, fontSize) {
            var width = 0;
            if (!!str && "string" == typeof str && str.length > 0) {
                var e = document.querySelector("#computeFontWidth");
                e.textContent = "";
                e.style.fontSize = fontSize;
                e.textContent = str;
                width = e.offsetWidth;
            }
            return width;
        }

        function computeSpaceWidth(fontSize) {
            return computeFontWidth("1 1", fontSize) - 2 * computeFontWidth("1");
        }

        function innerSpaceStat(str) {
            var counterArray = [];
            if (!!str && "string" == typeof str && str.length > 0) {
                var counter = 0;
                for (var i = 0; i < str.length; i++) {
                    if (" " == str.charAt(i)) {
                        counter++;
                    } else {
                        if (counter != 0) {
                            counterArray.push(counter);
                        }
                        counter = 0;
                    }
                }
            }
            return counterArray;
        }
    },

    htmlEncode: function (str) {
        return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/  /g, '&nbsp;');
    }

};