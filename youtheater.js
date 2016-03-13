function parseTime(t) {
  if (t == null || t == "") {
    return 0;
  }

  p = t.match(/((\d{1,2})h)?((\d{1,2})m)?((\d{1,2})s)/);
  if (p == null) {
    return 0;
  }

  ph = p[2] == null ? 0 : parseInt(p[2]);
  pm = p[4] == null ? 0 : parseInt(p[4]);
  ps = p[6] == null ? 0 : parseInt(p[6]);
  s = ph*3600 + pm*60 + ps;
  return s;
}

function onYouTubeIframeAPIReady() {
  startVideo();
}

var player1;
function startVideo(url) {
  vid = $.url('?v', url);
  vid = vid != null ? vid : $.url('#v', url);
  if (vid == null) {
    return;
  }

  player1 = new YT.Player('player1', {
    width: $(window).width(),
    height: $(window).height(),
    // suggestedQuality: 'hd1080',
    videoId: vid,

    events: {
      'onReady': function(event) {onPlayerReady(event, url)},
      'onPlaybackQualityChange': onPlaybackQualityChange,
    }
  });
}

$(window).on('resize', function(){
  if (player1 == null) {
    return;
  }

  player1.setSize($(window).width(), $(window).height());
});

function onPlayerReady(event, url) {
  t = $.url('?t', url);
  t = t != null ? t : $.url('#t', url);
  event.target.seekTo(parseTime(t), true);
  event.target.playVideo();
  defaultQuality = $.cookie('DefaultQuality');
  if (defaultQuality == null) {
    defaultQuality = 'hd1080';
  }

  event.target.setPlaybackQuality(defaultQuality);
}

function onPlaybackQualityChange(event) {
  $.cookie('DefaultQuality', event.target.getPlaybackQuality(), { expires: 7, path: '/' });
}

$(document).ready(function() {
  $( "#yurl" ).focus();

  $( "#f1" ).submit(function( event ) {
    yurl = $( "#yurl" ).val();
    startVideo(yurl)
    document.location.hash=$.url('query', yurl);
    event.preventDefault();
  });
});
