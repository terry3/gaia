/**
 * netcast phone reset
 */
'use strict';

(function () {
    var screen = document.getElementById('screen');
    var overlay = document.getElementById('system-overlay');
    var resetPage = document.getElementById('reset_page');
    var resetProgress = document.getElementById('reset_progress');
    var overlayClasses = overlay.classList;
    var classes = resetPage.classList;
    var maxValue = resetProgress.max;
    var progressTimer = null;
    var currProgress = 0;

    function showResetPage() {
        console.log("reset max:" + maxValue);
        if (currProgress < 0) {
            currProgress = 0;
        }
        if (currProgress >= maxValue) {
            currProgress = maxValue;
            resetProgress.style.backgroundColor = "#ff9600";
        }
        progressTimer = window.setInterval(function () {
            console.log("reset currprogress:" + currProgress);
            resetProgress.value = currProgress;
            currProgress ++;
        }, 100);
    }

    function hiddenResetPage() {
        if (progressTimer) {
            clearInterval(progressTimer);
            progressTimer = null;
        }
        currProgress = 0;
        resetProgress.value = 0;
        resetPage.style.display = "none";
        overlayClasses.remove('reset_page');
        overlay.style.visibility = "hidden";
    }

    window.addEventListener('phonereset', function () {
        console.log("reset phone");
        clearInterval(progressTimer);
        progressTimer = null;
        resetProgress.value = maxValue;

        var power = navigator.mozPower;
        if (!power) {
            console.error('Cannot get mozPower');
            return;
        }

        if (!power.factoryReset) {
            console.error('Cannot invoke mozPower.factoryReset()');
            return;
        }

        window.setTimeout(function() {
            console.log("reset success");
            power.factoryReset();
        }, 100);
    });

    window.addEventListener('reseton', function() {
        console.log("reset press");
        overlay.style.visibility = "visible";
        overlayClasses.add('reset_page');
        console.log("reset overlayClass:" + overlayClasses);
        resetProgress.style.backgroundColor = "#2d2d2d";
        resetPage.style.display = "block";
        currProgress = 0;
        showResetPage();
    });

    window.addEventListener('resetoff', function() {
        console.log("reset release:" + progressTimer);
        hiddenResetPage();
    })
})();