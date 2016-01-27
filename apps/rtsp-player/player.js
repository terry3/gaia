/**
 * Created by dafeng on 16-1-26.
 */

(function () {
  var mediaElement;
  var label;

  window.onload = function () {
    console.log("XXXXX window onload");
    mediaElement = document.getElementById('media');
    label = document.getElementById('label');

    document.getElementById('btn').addEventListener('click', function (event) {
      mediaElement.src = document.getElementById('ipaddr').value;
    });
//    label.innerHTML = "PAGE READY " + (new Date()).toString();
    mediaElement.addEventListener('error', function (event) {
      label.innerHTML = "error";
    });
    mediaElement.addEventListener('stalled', function (event) {
      label.innerHTML = "stalled";
    });
    mediaElement.addEventListener('waiting', function (event) {
      label.innerHTML = "waiting";
    });
    mediaElement.addEventListener('playing', function (event) {
      label.innerHTML = "playing";
    });
    mediaElement.addEventListener('pause', function (event) {
      label.innerHTML = "pause";
    });
    mediaElement.addEventListener('ended', function (event) {
      label.innerHTML = "ended";
    });
    mediaElement.addEventListener('seeking', function (event) {
      label.innerHTML = "seeking";
    });
    mediaElement.addEventListener('seeked', function (event) {
      label.innerHTML = "seeked";
    });
    mediaElement.addEventListener('volumechange', function (event) {
      label.innerHTML = "volumechange";
    });
    mediaElement.addEventListener('loadedmetadata', function (event) {
      label.innerHTML = "loadedmetadata";
    });

  }
})();