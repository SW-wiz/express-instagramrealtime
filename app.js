var express = require('express');
var exphbs  = require('express-handlebars');
var moment = require('moment');
var bodyParser = require('body-parser');
var instagram = require('instagram-node-lib');
var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// set the file name of the default layout
app.engine('handlebars', exphbs({defaultLayout: 'main'}));

// set the expressJS view engine to handlebars
app.set('view engine', 'handlebars');

// set the path to the front-end assets
app.use(express.static('public'));

var instagram_client_id = 'a35b8b768af742fca896dabcc0da32bf';
var instagram_client_secret = 'd6194381cb554df2b087fb39fb722701';

instagram.set('client_id', instagram_client_id);
instagram.set('client_secret', instagram_client_secret);

var server = app.listen(4000, function(){
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});

var io = require('socket.io').listen(server);

app.get('/', function(req, res){
  res.render('home');
});

var current_tag;

app.post('/tag/subscribe', function(req, res){
  current_tag = req.body.tag;
  console.log('current tag: ' + current_tag);

  instagram.tags.unsubscribe_all({
    complete: function(unsubscribe_data) {
      if(unsubscribe_data == null){
        console.log('unsubscribed from everything!');
        instagram.tags.subscribe({
          object_id: current_tag,
          callback_url: 'https://9c176eb1.ngrok.io/subscribe',
          complete: function(subscribe_data){
            if(subscribe_data){
              res.send({type: 'success'});
            }
          }
        });
      }
    }
  });
});

app.get('/subscribe', function(req, res){
  res.send(req.query['hub.challenge']);
});

app.post('/subscribe', function(req, res){

  // get the most recent photo posted which has the tag that the user has specified
  instagram.tags.recent({
    name: current_tag,
    count: 1,
    complete: function(data){
      //store the data that you need
      var photo = {
        'user': data[0].user.username,
        'profile_pic': data[0].caption.from.profile_picture,
        'created_time': data[0].created_time,
        'image': data[0].images.standard_resolution.url,
        'caption': data[0].caption.text
      };
      //send it to the client-side
      io.sockets.emit('new_photo', photo);
    }
  });

});
