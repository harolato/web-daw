var express = require('express');
var cool = require('cool-ascii-faces');
var app = express();
var path = require('path');

app.set('port', (process.env.PORT || 5000));

app.use(express.static(path.join(process.cwd() + '/public/')));
app.get('/', function(req, res){
  res.sendFile(path.join(process.cwd() + '/public/app/index.html'));
})

app.get('/cool', function(request, response) {
  response.send(cool());
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});


