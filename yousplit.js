$(window).on('resize', function() {
  repositionSplits();
});

$(document).keypress(function(event) {
  // console.log('Handler for .keypress() called. - ' + event.charCode + ' shift:' + event.shiftKey + ' alt:' + event.altKey);

  var shiftSplits = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'].map(function(c) {return c.charCodeAt(0)});
  var c = event.charCode
  if (c >= 49 && c - 49 < players.length) {
    // NUMBER
    // change main split
    changeMainSplit(c-49, false);
    return;
  } else if (c == 32) {
    // SPACE - play/pause
    brTogglePlay();
  } else if (shiftSplits.indexOf(c) != -1) {
    c = shiftSplits.indexOf(c);
    if (c < players.length) {
      changeMainSplit(c, true);
    }
  } else if (c == 109) {
    // m - mute/unMute
    brToggleMute();
  }
});

$(document).keydown(function(e){
  // console.log('Handler for .keydown() called. - ' + e.which);
  var c = e.which;
  switch (c) {
    case 37:
      seekTo(getCurrentProgressTime() - 5);
      break;
    case 39:
      seekTo(getCurrentProgressTime() + 5);
      break;
  }
});

function onSideCoverClick(event) {
  var idx = Math.floor(($(window).scrollTop() + event.clientY) / 240);
  changeMainSplit(idx, event.shiftKey);
}

function getMainSplit() {
  for (var i=0; i<players.length; ++i) {
    if (players[i].isMain) {
      return players[i];
    }
  }
}

function getAudioSplit() {
  return players[audioSourceId];
}

function repositionSplits() {
  players.forEach(function(p, i) {
    p.setSize(320, 240)
    p.getIframe().parentElement.className = "split_side";
    p.getIframe().parentElement.style.top = (i * 240) + "px";
  });

  var mp = getMainSplit();
  mp.setSize($(window).width()-320, $(window).height()-35)
  mp.getIframe().parentElement.className = "split_main";
  mp.getIframe().parentElement.style.top = "0px";

  var sc = $("#side_cover")[0];
  sc.style.height=(players.length * 240)+"px";
}

function changeMainSplit(id, audioSourceModifier) {
  players.forEach(function(p) {p.isMain = false});
  players[id].isMain = true;
  repositionSplits();

  var changeAudio = $('#switchAudio').is(':checked');
  if (audioSourceModifier) {
    changeAudio = !changeAudio;
  }

  if (changeAudio) {
    brAudio(id);
  }
}

function createPlayerEvents() {
  return {
    'onReady': onPlayerReady,
    //'onPlaybackQualityChange': onPlaybackQualityChange,
    'onStateChange': onPlayerStateChange,
  }
}

var players = [];
var isReady = []
function onYouTubeIframeAPIReady() {
  var pv = {
    controls: 0,
    disablekb: 1,
    iv_load_policy: 3,
    rel: 0,
  };

  var v = $.url('?v');
  var s = $.url('?s');
  if (s != undefined) {
    s = s.map(function(x) {return parseInt(x)});
  }

  var p = $.url('?p');
  if (s == undefined && p != undefined) {
    s = p.map(parseTime);
    var smin = Math.min(...s);
    s = s.map(function(x) {return x - smin});
  }

  for (var i = 0; i < v.length; ++i) {
    var pid = 'player' + i;
    $('body').append($('<div><div id="' + pid + '"></div></div>'));
    var startShift = ((s == undefined || s.length <= i || s[i] == undefined) ? 0 : s[i]);
    var p = new YT.Player(pid, {
      videoId: v[i],
      playerVars: $.extend({start: startShift}, pv),
      events: createPlayerEvents(),
    });
    p.isMain = (i == 0);
    p.splitId = i;
    p.isReady = false;
    p.startShift = startShift;
    players[i] = p;
  }

  repositionSplits();
}

function onPlayerReady(event) {
  var defaultQuality = $.cookie('DefaultQuality');
  if (defaultQuality == null) {
    defaultQuality = 'hd1080';
  }

  var p = event.target;
  p.setPlaybackQuality(defaultQuality);
  if (p.isMain == false) {
    p.mute();
  }

  p.isReady = true;
  if (players.map(function(x) {return x.isReady}).reduce(function(x, y) {return x+y}) == players.length) {
    onAllPlayersReady();
  }
}

var progressUpdatesEnabled = false;
function onAllPlayersReady() {
  // console.log('onAllPlayersReady');
  var rates = {};
  players[0].getAvailablePlaybackRates().forEach(function(r) {rates[r] = 0});

  players.forEach(function(p) {
    p.getAvailablePlaybackRates().forEach(function(r) {rates[r] += 1});
  })

  var rselect = $('#rateSelect');
  players[0].getAvailablePlaybackRates().forEach(function(r) {
    if (rates[r] == players.length) {
      var o = rselect.append($('<option value="'+r+'">'+r+'</option>'));
    }
  });
  rselect.val('1');

  var maxDuration = 0;
  var maxDurationPlayer = null;
  players.forEach(function(p) {
    if (p.getDuration() - p.startShift > maxDuration) {
      maxDuration = p.getDuration() - p.startShift;
      maxDurationPlayer = p;
    }
  });
  // console.log('max time = ' + maxDuration);

  $( "#progress" ).slider({
    orientation: "horizontal",
    range: "min",
    max: maxDuration,
    value: 0,
    step: 1,
    // slide: refreshSwatch,
    change: onProgressChange
  });

  // console.log('volume=' + getAudioSplit().getVolume());

  $( "#volume" ).slider({
    orientation: "horizontal",
    range: "min",
    max: 100,
    value: getAudioSplit().getVolume(),
    step: 1,
    // slide: refreshSwatch,
    change: onAudioChange
  });


  window.setInterval(function() {
    if (maxDurationPlayer.getPlayerState() == 1 && progressUpdatesEnabled) {
      var t = Math.floor(maxDurationPlayer.getCurrentTime() - maxDurationPlayer.startShift);
      setCurrentProgressTime(t);
      // players.forEach(function(p) {
      //   console.log("current time " + p.splitId + ":" + p.getCurrentTime());
      // });
    }
  }, 1000);

}

function onPlayerStateChange(event) {
  var sId = event.target.splitId;
  var st = event.data;
  // console.log('state ' + sId + ':' + st);
  switch (st) {
    case -1: return;
    case 1:
      // if anybody buffering - pause
      var buffered = 0;
      players.forEach(function(p) {buffered += (p.getPlayerState() == 3)});
      if (buffered > 0) {
        // console.log('find ' + buffered + ' buffering');
        event.target.pauseVideo();
      } else
      {
        if (isPlayingNow) {
          // console.log('resume play all');
          players.forEach(function(p) {tryPlayVideo(p)});
          progressUpdatesEnabled = true;
        } else {
          event.target.pauseVideo();
        }
      }
      break;
    case 2:
      if (!isPlayingNow) {
        break;
      }

      if (players.map(function(x) {return x.getPlayerState()==2}).reduce(function(x, y) {return x+y}) == players.length) {
        // all paused but we are playing => resume
        // console.log('all paused => resume');
        progressUpdatesEnabled = true;
        players.forEach(function(p) {tryPlayVideo(p)});
      }
    case 3:
      progressUpdatesEnabled = false;
      players.forEach(function(p) {
        if (p.getPlayerState() == 1) {
          p.pauseVideo();
        }
      });
      break;
    default:
      break;
  }
}

function onPlaybackQualityChange(event) {
  $.cookie('DefaultQuality', event.target.getPlaybackQuality(), { expires: 7, path: '/' });
}

var isPlayingNow = false;
function brPlay() {
  // play only if none is buffering
  var buffered = 0;
  players.forEach(function(p) {buffered += (p.getPlayerState() == 3)});
  if (buffered > 0) {
    return;
  }

  isPlayingNow = true;
  progressUpdatesEnabled = true;
  players.forEach(function(p) {
    //p.addEventListener('onStateChange', 'onPlayerStateChange1');
    tryPlayVideo(p);
  });
}

function brPause() {
  isPlayingNow = false;
  progressUpdatesEnabled = false;
  players.forEach(function(p) {p.pauseVideo()});
}

function brTogglePlay() {
  if (players[0].getPlayerState() == 1) {
    brPause();
  } else {
    brPlay();
  }
}

var audioSourceId = 0;
function brAudio(id) {
  var pcur = players[audioSourceId];
  var pnew = players[id];
  if (!pcur.isMuted()) {
    pcur.mute();
    pnew.unMute();
  }

  audioSourceId = id;
  $( "#volume" ).slider('value', pnew.getVolume());
}

function brToggleMute() {
  var p = players[audioSourceId];
  if (p.isMuted()) {
    $( "#volume" ).parent().css('text-decoration', '');
    p.unMute();
  } else {
    $( "#volume" ).parent().css('text-decoration', 'line-through');
    p.mute();
  }
}

function brChangePlaybackRate(val) {
  players.forEach(function(p) {p.setPlaybackRate(val)});
}

function onProgressChange(event, ui) {
  if (!event.hasOwnProperty('view')) {
    // console.log('onProgressChange[p]: ' + ui.value);
    return;
  }
  var newTime = ui.value;
  // console.log('onProgressChange[m]: ' + ui.value);
  seekTo(newTime);
}

function onAudioChange(event, ui) {
  if (!event.hasOwnProperty('view')) {
    // console.log('onAudioChange[p]: ' + ui.value);
    return;
  }

  var newVolume = ui.value;
  // console.log('set voume ' + getAudioSplit().splitId + ':' + newVolume);
  getAudioSplit().setVolume(newVolume);
}

function getCurrentProgressTime() {
  return $('#progress').slider('option', 'value');
}

function setCurrentProgressTime(value) {
  $( "#progress" ).slider('value', value);
}

function seekTo(newTime) {
  progressUpdatesEnabled = false;
  setCurrentProgressTime(newTime);
  players.forEach(function(p) {
    if (p.getDuration() <= p.startShift + newTime) {
      // console.log('seekTo pause for ' + p.splitId + ' : ' + (p.startShift + newTime));
      p.pauseVideo();
    } else {
      // console.log('seekTo for ' + p.splitId + ' : ' + (p.startShift + newTime));
      p.seekTo(p.startShift + newTime, true)
    }
  });
}

function tryPlayVideo(p) {
  var curTime = getCurrentProgressTime();
  // console.log('tryPlayVideo: ' + p.splitId + ' -- ' + p.getDuration());
  if (p.getDuration() <= curTime) {
    // console.log('Can\'t start ' + p.splitId + ' - already ended.');
    return;
  }
  p.playVideo();
}

function parseTime(t) {
  if (t == null || t == "") {
    return 0;
  }

  p = t.match(/((\d{1,2}))(:(\d{1,2}))?(:(\d{1,2}))?/);
  if (p == null) {
    return 0;
  }

  var p = [p[2], p[4], p[6]].map(function(x) {return x == undefined ? undefined : parseInt(x)});
  var ps = 0;
  var pm = 0;
  var ph = 0;
  if (p[2] != undefined) {
    ps = p[2];
    pm = p[1];
    ph = p[0];
  } else if (p[1] != undefined) {
    ps = p[1];
    pm = p[0];
  } else {
    ps = p[0];
  }

  s = ph*3600 + pm*60 + ps;
  return s;
}
