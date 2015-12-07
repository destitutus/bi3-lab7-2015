var express = require('express');
var session = require('cookie-session');
var bodyParser = require('body-parser');
var jade = require('jade');
var q = require('q');

var auth = require('./lib/auth');
var db = require('./lib/db');
var check = require('./lib/check');

var app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({secret: process.env.pid + ''}));

app.get('/', function (req, res) {
    console.log('req.session.sid', req.session.sid);
    var html = jade.renderFile('templates/main.jade', {user: req.session.sid});
    res.send(html);
});


app.get('/errorlogin', function (req, res) {
    var html = jade.renderFile('templates/errorlogin.jade', {error: req.session.error, user: req.session.sid});
  res.send(html);
});

app.get('/profile/:username', function (req, res) {
    db.findUser(req.params.username).then(function (account) {
        var html = jade.renderFile('templates/profile.jade', {user: req.session.sid, account: account, username: req.params.username});
        res.send(html);        
    }, function (err) {
        res.send('Error:' + err);        
    });
});

app.get('/profiles', function (req, res) {
    var filter = req.session.sid ? req.session.sid.access : 'GUEST';
    db.filterUsers(filter, req.query.limit).then(function (accounts) {
        var html = jade.renderFile('templates/profiles.jade', {user: req.session.sid, accounts: accounts});
        res.send(html);   
    }, function (err) {
        res.send('Error:' + err);        
    });
});

app.get('/doctors', function (req, res) {
    if (!req.session.sid) {
        var html = jade.renderFile('templates/reject.jade', {});
        res.send(html);   
        return;
    }
    
    var start = req.query.start ? req.query.start : 0;
    var limit = req.query.limit ? req.query.limit : 25;
    var doctors = db.doctors(start, limit);
    var doctorsCount = db.doctorsCount();
    
    q.all([doctors, doctorsCount]).spread(function (doctors, count) {
        var html = jade.renderFile('templates/doctors.jade', {user: req.session.sid, doctors: doctors, count: count, start: start, limit: limit});
        res.send(html);   
    }, function (err) {
        res.send('Error:' + err);        
    });
});

app.get('/doctor/:id', function (req, res) {
    if (!req.session.sid) {
        var html = jade.renderFile('templates/reject.jade', {});
        res.send(html);   
        return;
    }
        
    db.doctor(req.params.id).then(function (doctor) {
        var html = jade.renderFile('templates/doctor.jade', {user: req.session.sid, doctor: doctor});
        res.send(html);   
    }, function (err) {
        res.send('Error:' + err);        
    });
});

app.get('/wall', function (req, res) {
    if (!req.session.sid) {
        var html = jade.renderFile('templates/reject.jade', {});
        res.send(html);   
        return;
    }
    
    var limit = req.query.limit ? req.query.limit : 25;
    
    db.loadComments(limit).then(function (comments) {
        var html = jade.renderFile('templates/wall.jade', {user: req.session.sid, comments: comments});
        res.send(html);  
    }, function (err) {
        res.send('Error:' + err);        
    });
    

});

app.post('/login', function(req, res){    
    if (req.body['login-btn']) {
        auth.login(req.body.login, req.body.password).then(function (sid) {
            console.log('HERERRERER')
            req.session.sid = sid;  
            res.redirect('/');
            res.end();
        }, function (err) {
            req.session.sid = null;
            req.session.error = err;
            res.redirect('/errorlogin/');    
        });
    } else {
        req.session = null;  
        res.redirect('/');
    }
});

app.post('/addcomment', function(req, res){    
    if (req.body['comment-btn']) {
        var comment = req.body.comment;
        var hasInjection = check.checkInjection(comment);
        if (hasInjection) {
            res.send('SQL injection detected');
            return;
        }
        comment = check.removeSwearing(comment);        
        db.addComment(req.session.sid, comment).then(function (sid) {
            res.redirect('/wall');    
        }, function (err) {
            res.redirect('/wall');    
        });
    } else {  
        res.redirect('/wall');
    }
});

var server = app.listen(process.env.pid, function () {

  var host = server.address().address
  var port = server.address().port

  console.log('Example app listening at http://%s:%s', host, port)

});