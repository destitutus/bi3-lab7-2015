var q = require('q');
var db = require('./db');
var uuid = require('node-uuid');

exports.login = function (user, password) {
    console.log('user, password', user, password)
    return db.login(user, password).then(function (data) {
        console.log('data', data.length)
        if (data.length === 1) {
            var sid = uuid.v4();
            var user = data[0];
            user.sid = sid;
            this.user = user;
            delete user.password;
            return db.addSession(user.id, sid);
        } else {
            return q.reject('Not found');
        }
    }).then(function () {
       return this.user; 
    });
};