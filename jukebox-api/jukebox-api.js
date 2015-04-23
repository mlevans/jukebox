// meteor add percolate:momentum
// meteor remove autopublish
// twitter keys
// spotify keys
// create user: http://stackoverflow.com/questions/11629759/how-can-i-create-users-server-side-in-meteor
// insert credentials in jukebox.js
// current song insert

var Latest_Requests = new Mongo.Collection("requests");
var Current_Song = new Mongo.Collection("current");
//Current_Song.insert({"name": ""});

if (Meteor.isClient) {
  Momentum.registerPlugin('fades', function(options) {
  return {
    insertElement: function(node, next) {
      $(node)
        .hide()
        .insertBefore(next)
        .velocity('fadeIn', { delay: 850, duration: 1500});
    },
    removeElement: function(node) {
      $(node).velocity('fadeOut', function() {
        $(this).remove();
      });
    }
  }
  });

  Meteor.subscribe('requests');
  Meteor.subscribe('current');

  
  Template.body.helpers({
    requests_images: function () {
      return Latest_Requests.find({});
    },

    requests_texts: function () {
      return Latest_Requests.find({});
    },

    current_song: function () {
      return Current_Song.find({});
    }
  });
}

if (Meteor.isServer) {
    var Twit = Meteor.npmRequire('twit');
    var SpotifyWebApi = Meteor.npmRequire('spotify-web-api-node');

    var T = new Twit({
        consumer_key: "",
        consumer_secret: "",
        access_token: "",
        access_token_secret: "" 
    });

    var spotifyApi = new SpotifyWebApi({
      clientId : "",
      clientSecret : ""
    });

    var stream = T.stream('statuses/filter', {track: '#jukebox13'});

    var dbInsert = Meteor.bindEnvironment(function(latest_request){
      Latest_Requests.insert(latest_request);
    });

    stream.on('tweet', function(tweet) {
      var latest_request = {};

      var screen_name = tweet.user.screen_name;
      var profile_image = tweet.user.profile_image_url.replace('_normal','');
      var adjusted_profile_image = profile_image.replace('_normal', '');
      var tweet_text = tweet.text;
      var retweeted = tweet.retweeted;

      latest_request['screen_name'] = screen_name;
      latest_request['profile_image'] = adjusted_profile_image;
      latest_request['tweet_text'] = tweet_text;
      latest_request['datetime'] = (new Date()).getTime();
      latest_request['played'] = 0;

      // Adjust text
      var text = tweet_text.replace(/(#[A-Za-z0-9]+)|(@[A-Za-z0-9]+)|([^0-9A-Za-z, \t])|(\w+:\/\/\S+)/ig, ' ');

      var text_array = text.trim().split(',');

      if (text_array.length === 2) {
        //var artist = text_array[0].trim().replace(/\W/g, '').toLowerCase();
        //var song = text_array[1].trim().replace(/\W/g, '').toLowerCase();
        var artist = text_array[0].trim().toLowerCase();
        var song = text_array[1].trim().toLowerCase();

        latest_request['artist'] = artist;
        latest_request['song'] = song;
      } else {
        console.log('Not the standard format');
      }

      console.log('artist, song: ' + artist + ', ' + song);

      spotifyApi.searchTracks(artist + ' ' + song)
        .then(function(data) {
          latest_request['track_uri'] = data.body.tracks.items[0].uri;
          latest_request['spotify_art'] = data.body.tracks.items[0].album.images[0].url;
          latest_request['spotify_art_width'] = data.body.tracks.items[0].album.images[0].width;
          latest_request['spotify_art_height'] = data.body.tracks.items[0].album.images[0].height;
          latest_request['spotify_artist'] = data.body.tracks.items[0].artists[0].name;
          latest_request['spotify_song'] = data.body.tracks.items[0].name;

          dbInsert(latest_request);
      }, function(err) {
        console.error(err);
      });
    });
  });
}

Meteor.methods({
  getNextUnplayedSong : function () {
    var cursor = Latest_Requests.find({"played": 0}, { limit : 1 , sort: {datetime: 1}});

    return cursor.fetch();
  },

  registerPlayedSong: function (datetime) {
    console.log('register playing song');
    Latest_Requests.update({"datetime": datetime}, {$set:{"played": 1}});
    return 1;
  },

  trackCurrentSong: function(currentTrack) {
    Current_Song.update({}, {$set:{"name": currentTrack}});
    return 1;
  }
  /*
  unRegisterPlayingSong: function (datetime) {
    console.log('unregistering played song');
    Latest_Requests.update({"datetime": datetime}, {$set:{"playing": 0}});
    return 1;
  },

  /*
  registerFinishedSong: function (datetime) {
    // change entry
    console.log('register played song');
    Latest_Requests.update({"datetime": datetime}, {$set:{"finished": 1}});
    return 1;
  }
  */
});