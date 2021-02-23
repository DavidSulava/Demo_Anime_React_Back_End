var createError   = require('http-errors');
var express       = require('express');
var path          = require('path');
var logger        = require('morgan');
var hpp           = require('hpp');
var contentLength = require('express-content-length-validator');
const formidable  = require('express-formidable');

require('dotenv').config();


var app = express();
app.use(contentLength.validateMax({max: 9999, status: 400, message: "stop it!"}));

app.use(formidable());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(hpp());

app.use(express.static(path.join(__dirname, 'public')));

// Enable CORS
<<<<<<< HEAD
const allowedOrigins = process.env.ALLOWED_DOMAINS.split(',').map( e=> e.trim() );

app.use( function(req, res, next){

  if ( allowedOrigins.indexOf(req.get('origin')) > -1 ){
    res.header("Access-Control-Allow-Origin",  req.headers.origin ); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Range, Set-Cookie");
  }

  // res.header('Access-Control-Expose-Headers', 'Content-Length');
  res.header('Access-Control-Allow-Credentials', true);
  res.header("preflightContinue", true);
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");


  if ( req.method === 'OPTIONS'){
    res.status(204).end();
  }
  else
    next();
});



=======
const allowedOrigins = process.env.ALLOWED_DOMAINS.split(',')
app.use( function(req, res, next)
  {
    console.log( allowedOrigins );
    console.log( req.get('origin') );
    if ( allowedOrigins.indexOf(req.get('origin')) > -1 )
      {
        res.header("Access-Control-Allow-Origin",  req.headers.origin ); // update to match the domain you will make the request from
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Range");
      }

    // res.header('Access-Control-Expose-Headers', 'Content-Length');
    res.header('Access-Control-Allow-Credentials', true);
    res.header("preflightContinue", true);
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");


    if ( req.method === 'OPTIONS')
      {
        res.status(204).end();
      }
    else
      next();
  });
>>>>>>> 5c04948 (test log)

// DataBase connection
var db_con  = require('./DB/db_connection');
db_con.on('error', console.error.bind(console, 'connection error:'));

var indexRouter = require('./routes/index');

app.use('/', indexRouter);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error   = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
