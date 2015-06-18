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
var netcastdb = netcastdb || {};
netcastdb = (function netcast_db() {

    var netcastDb;
    var _db_name;
    var _db_version;
    var _db_store_name;

    function NetcastDB(db_name, db_store_name, db_version) {

        var count = 0;
        window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
        window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
        if (!window.indexedDB) {
            console.log("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.");
        }

        _db_name = db_name;
        _db_version = db_version;
        _db_store_name = db_store_name;

        this.openDb = function () {
            return openDb();
        };

        this.getObjectStore = function (store_name, mode) {
            return getObjectStore(store_name, mode);
        };

        this.storeData = function (object) {
            return addStoreObj(object);
        };

        this.getStoreData = function () {
            return getStoreData();
        };

        this.clearStoreData = function () {
            return clearStore();
        };

        this.updateData = function (object) {
            return updateStoreData(object);
        };

        this.setDB = function (db) {
            netcastDb = db;
        };

        this.closeDB = function() {
            closeDB();
        }
    }
    NetcastDB.READ_ONLY = "readonly";
    NetcastDB.READ_WRITE = "readwrite";

    function openDb() {
        console.log("openDb ...");
        var req = window.indexedDB.open(_db_name, _db_version);
        req.onsuccess = function (evt) {
            db = this.result;
            console.log("openDb DONE");
        };

        req.onerror = function (evt) {
            console.error("openDb:", evt.target.errorCode);
        };

        req.onupgradeneeded = function (evt) {
            console.log("openDb.onupgradeneeded");
            var store = evt.currentTarget.result.createObjectStore(
                _db_store_name, { keyPath: 'id', autoIncrement: true });
            store.createIndex('name', 'name', { unique: false });
            store.createIndex('code', 'code', { unique: false });
            store.createIndex('apmac', 'apmac', { unique: false });
            store.createIndex('timezone', 'timezone', { unique: false });
            store.createIndex('language', 'language', { unique: false });
            store.createIndex('ssid', 'ssid', { unique: false });
            store.createIndex('bssid', 'bssid', { unique: true });
            store.createIndex('password', 'password', { unique: false });
            store.createIndex('type', 'type', { unique: false });
            store.createIndex('hidden', 'hidden', { unique: false });
            store.createIndex('state', 'state', { unique: false });
            store.createIndex('url', 'url', { unique: false });
        };
        return req;
    }

    function getObjectStore(store_name, mode) {
        var tx = netcastDb.transaction(store_name, mode);
        return tx.objectStore(store_name);
    }

    function clearStore() {
        var store = getObjectStore(_db_store_name, 'readwrite');
        var req = store.clear();
        req.onsuccess = function (evt) {
            console.log("clearObjectStore success");
        };
        req.onerror = function (evt) {
            console.error("clearObjectStore error");
        };

        return req;
    }

    function addStoreObj(storeObj) {
        console.log("addData====");
        var store = getObjectStore(_db_store_name, 'readwrite');
        var req;
        try {
            req = store.add(storeObj);
        } catch (e) {
            if (e.name == 'DataCloneError')
                console.log("This engine doesn't know how to clone a Blob, " +
                    "use Firefox");
            throw e;
        }
        req.onsuccess = function (evt) {
            console.log("Insertion in DB successful");
            closeDB();
        };
        req.onerror = function () {
            console.error("addPublication error");
            closeDB();
        };

        return req;
    }

    function getStoreData(store) {
        console.log("displayPubList");

        if (typeof store == 'undefined')
            store = getObjectStore(_db_store_name, 'readonly');

        var req = store.openCursor();
        req.onsuccess = function (evt) {
            console.log("get store data success");
            closeDB();
        };
        req.onerror = function () {
            console.error("get store data error");
            closeDB();
        };
        return req;
    }

    function updateStoreData(updateObj) {
        console.log("updateStoreData");
        var store = getObjectStore(_db_store_name, 'readwrite');
        var req = store.openCursor();
        var i;
        req.onsuccess = function (evt) {
            var cursor = evt.target.result;
            if (cursor) {
                var keyreq = store.get(cursor.key);
            //    console.log("cursor key:" + cursor.key);
                var value = cursor.value;
                keyreq.onsuccess = function (evt) {
                    var value = evt.target.result;
                    for (var index in updateObj) {
                        value[index] = updateObj[index];
                    }
                //    console.log("===="+ value.ssid);
                    cursor.update(value);
                };

                // Move on to the next object in store
                cursor.continue();

                // This counter serves only to create distinct ids
                i++;
            } else {
            //    console.log("No more entries");
                closeDB();
            }
        };

        req.onerror = function () {
            console.error("update store data error");
            closeDB();
        };
        return req;
    }

    function closeDB() {
        if (undefined != netcastDb && null != netcastDb) {
            netcastDb.close();
            netcastDb = null;
        }
    }

    return {
        NetcastDB: NetcastDB
    }
}());
