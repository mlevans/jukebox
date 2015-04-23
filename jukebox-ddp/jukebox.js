var exec = require('child_process').exec;
var DDPClient = require("ddp");

var next_unplayed_song = {}; // global for first-in, unplayed song
var current_song;

var ddpclient = new DDPClient({
  // All properties optional, defaults shown
  host : "localhost",
  port : 3000,
  ssl  : false,
  autoReconnect : true,
  autoReconnectTimer : 500,
  maintainCollections : true,
  ddpVersion : '1',  // ['1', 'pre2', 'pre1'] available
  // uses the SockJs protocol to create the connection
  // this still uses websockets, but allows to get the benefits
  // from projects like meteorhacks:cluster
  // (for load balancing and service discovery)
  // do not use `path` option when you are using useSockJs
  useSockJs: true,
  // Use a full url instead of a set of `host`, `port` and `ssl`
  // do not set `useSockJs` option if `url` is used
  url: 'wss://example.com/websocket'
});

/*
 * Connect to the Meteor Server
 */
ddpclient.connect(function(error, wasReconnect) {
  // If autoReconnect is true, this callback will be invoked each time
  // a server connection is re-established
  if (error) {
    console.log('DDP connection error!');
    return;
  }

  if (wasReconnect) {
    console.log('Reestablishment of a connection.');
  }

  console.log('connected!');

  ddpclient.call("login", [
  { user : { email : "" }, password : "" }
  ], function (err, result) { console.log('logged in'); });

  /*
   * Subscribe to a Meteor Collection
   */
   /*
  ddpclient.subscribe(
    'requests',                // name of Meteor Publish function to subscribe to
    [],                       // any parameters used by the Publish function
    function () {             // callback when the subscription is complete
      //console.log('posts complete:');
      //console.log(ddpclient.collections.requests);
    }
  );
  */

  /*
  var observer = ddpclient.observe("requests");

  observer.added = function(id) {
    console.log("[ADDED] to " + observer.name + ":  " + id);
    //console.log(ddpclient.collections.requests);

    ddpclient.call(
      'getLatest',   // name of Meteor Method being called
      [],            // parameters to send to Meteor Method
      function (err, result) {   // callback which returns the method call results
        console.log('called function, result: ' + result[0].artist);
        next_unplayed = result;
      }
    );
  };
  */

  setInterval(function() {
    // track current song, and next unplayed song
    ddpclient.call('getNextUnplayedSong',[],
      function (err, result) {
        if (err){
          console.log(err);
        }
        
        if (result[0]){
          next_unplayed_song = result[0];
        } else {
          next_unplayed_song = null;
        }
      }
    );

    /*
    if (next_unplayed_song) { 
      // do the rest
    }
    */

    // Check if a song is currently playing
    exec('osascript check_track.scrpt', function(err, stdout, stderr){
      //console.log('info', stdout)
      if (err){
        console.log(err);
      }

      var info = JSON.parse(stdout);
      //console.log('info', info['ct'])

      ddpclient.call('trackCurrentSong',[info['ct']],
        function (err, result) {
          if (err){
            console.log(err);
          }
        }
      );

      /*
      // check if paused
      if (player_state == "paused"){
        // has the song been registered as played?
        exec('osascript play.scrpt', function(err, stdout, stderr){
          if (err) {
            console.log(err);
          }
        });
      }
      */

      if (info['sta'] == "paused" && next_unplayed_song) {
        exec('osascript play_track.scrpt ' + next_unplayed_song.track_uri, function(err, stdout, stderr){
          if (err){
            console.log(err);
          }
          /*
          // Check duration
          var duration = parseInt(stdout, 10);
          if (duration <= 30) {

          }
          */

          // set playing and played

          console.log('playing ' + next_unplayed_song.artist + ', ' + next_unplayed_song.song, stdout);
          
          current_song = next_unplayed_song; // unnecessary

          // Register the song as playing
          ddpclient.call('registerPlayedSong',[current_song.datetime],
            function (err, result) {
              if (err) {
                console.log(err);
              }
              console.log('result', result);
            }
          );

        });
      }
    });
  }, 6000);
});

