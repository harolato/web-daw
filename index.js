// Load modules
var express = require('express');
var app = express();
var path = require('path');
// Set port for our application
app.set('port', (process.env.PORT || 5000));
// Define root directory for serving public files
app.use(express.static(path.join(process.cwd() + '/public/')));
// landing page
app.get('/', function(req, res){
  res.sendFile(path.join(process.cwd() + '/public/app/index.html'));
})
// Serve files for specified port
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});


