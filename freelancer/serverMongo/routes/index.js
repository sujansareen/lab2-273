    var express = require('express');
    var router = express.Router();
    var mysql = require('mysql');
    var mongo = require('mongodb');
    var mongoClient = require('mongodb').MongoClient;
    var passport = require('passport')
        , LocalStrategy = require('passport-local').Strategy;

    var kafka = require('./kafka/client');

  //  var url = "mongodb://localhost:27017/";
    var url = "mongodb://root:root@ds035796.mlab.com:35796/test1";



    /* GET home page. */
    router.get('/', function(req, res, next) {
      res.render('index', { title: 'Express' });
    });

    router.post('/insertuser', function(req, res, next) {
      console.log(req.body);
      var name = req.body.username;
      var password = req.body.password;
      var email = req.body.emailid

      //req.checkBody('username', 'Username is required').notEmpty();
      //var errors = req.validationErrors();
      //
      // if(errors) {
      //   console.log('YES');
      // } else {
      //    console.log('NO');
          mongoClient.connect(url, (err, db) => {
              if(err) throw err;
              else {
                      console.log("Connected to mongodb...");
                      var dbo = db.db("test1");
                      dbo.collection('users').insertOne({
                          username: req.body.username,
                          password: req.body.password,
                          email: req.body.emailid
                      }).then( (result) => {
                          console.log("Insertion Successfully");
                      console.log(result.insertedId);

                      res.json('SIGNUP_SUCCESS');
                  })
                      db.close();
                  }
          });
      // /}



    });


    passport.use(new LocalStrategy( function(username, password, done) {

        kafka.make_request('login_topic',{"username":username,"password":password}, function(err,results){
            console.log('in result');
            console.log("After our result from kafka backend",results);

                        if(err) {
                            return done(err, {});
                        }

                        if(results.length > 0) {
                            console.log(results[0].username);
                            console.log("Inside result.length",results[0].username);
                            return done(null, results[0]);
                        } else {
                            return done('ERROR', {});
                        }
        });
        }
    ));

    router.post('/login', function(req, res) {
            passport.authenticate('local', function(err, user) {
                console.log("Printing in passport authenticate: ", err, user);
                if(err === 'ERROR') {
                    console.log("In authenticate....",err);
                    var jsonResponse = {"error" : "ERROR"};
                    res.send(jsonResponse);
                }

                if(!user) {
                    console.log("In authenticate error....");

                }
                if(user) {
                    console.log("In user authenticate....", user);
                    req.session.username = user.username;
                    console.log("Session Started...", req.session);
                    var jsonResponse = {"result" : user.username, "session": req.session.username};
                    res.send(jsonResponse);
                }

            })(req, res);
        }
    );

    router.get('/checksession', (req, res) => {
      console.log("In checksession....", req.session);
      if(req.session.username)
        res.json({"session" : req.session});
      else
        res.json({"session" : "ERROR"});
    });

    router.post('/logout', (req, res) => {
      console.log('Before logout call....', req.session);
      req.session.destroy();
      console.log('After logout call....', req.session);
      res.json('SESSION_DESTROYED');
    })



    module.exports = router;
