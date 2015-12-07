var pg = require('pg'); 
var q = require('q');
var uuid = require('node-uuid');

var config = require('/home/codio/configs/' + process.env.pid);

var pqClientDef = q.defer();
var pqClient = pqClientDef.promise;

var client = new pg.Client(config.connection);
client.connect(function(err) {
    if(err) {
        return pqClientDef.reject(err);
    }
    pqClientDef.resolve(client);
});

function escape1(value) {
    if (typeof value === "string") {
        return value.replace(/[\0\n\r\b\t\\\'\"\x1a]/g, "");
    } else {
        return value;
    }
}

function escape2(value) {
    if (typeof value === "string") {
        return value.replace(/[\0\n\r\b\t\\\'\"\x1a]/g, function(s) {
            switch(s) {
              case "\0": return "\\0";
              case "\n": return "\\n";
              case "\r": return "\\r";
              case "\b": return "\\b";
              case "\t": return "\\t";
              case "\x1a": return "\\Z";
              default: return "\\"+s;
            }
          });
    } else {
        return value;
    }
}

function htmlunescape(value) {
    if (value) {
        return unescape(value);
    } else {
        return value;
    }
}

exports.login = function (user, password) {
    return pqClient.then(function (client) {
        var deferred = q.defer();
        var query = "SELECT * FROM users where login='" + htmlunescape(escape1(user)) + "' and password='" + htmlunescape(escape1(password)) + "'";
        console.log(query);
        client.query(query, function (err, result) {
            if (err) {
                var strErr = err.message ? err.message : err;
                deferred.reject(strErr);
            } else {
                deferred.resolve(result.rows) 
            };
        });
        return deferred.promise;
    });    
};

exports.addSession = function (userId, sessionId) {
    return pqClient.then(function (client) {
        var deferred = q.defer();
        client.query("INSERT INTO sessions (id, user_id) VALUES('" + sessionId + "','" + userId + "')", function (err, result) {
            console.log('err, result', err, result);
            if (err) return deferred.reject(err);
            deferred.resolve(result.rows);
        });
        return deferred.promise;
    });
}; 

exports.findUser = function (username) {
    return pqClient.then(function (client) {
        var deferred = q.defer();
        var query = "select * from users join users_details on users.id = users_details.id where users.login='" + username + "'";
        client.query(query, function (err, result) {            
            if (err) return deferred.reject(err);
            deferred.resolve(result.rows[0]);
        });
        return deferred.promise;
    });
};

exports.doctors = function (start, limit) {
    return pqClient.then(function (client) {
        var deferred = q.defer();
        var query = "select * from doctors offset " + parseInt(start, 10) + " limit " + escape2(limit);
        console.log('query', query);
        client.query(query, function (err, result) {
            if (err) return deferred.reject(err);
            console.log('result.rows', result.rows);
            deferred.resolve(result.rows);
        });
        return deferred.promise;
    });
};

exports.doctorsCount = function () {
    return pqClient.then(function (client) {
        var deferred = q.defer();
        var query = "select count(*) as count from doctors";
        client.query(query, function (err, result) {
            if (err) return deferred.reject(err);
            deferred.resolve(result.rows[0].count);
        });
        return deferred.promise;
    });
};

exports.doctor = function (id) {
    if (!id || id.length !== 36) {
        return q.reject('Wrong id');
    }
    return pqClient.then(function (client) {
        var deferred = q.defer();
        var query = "select * from doctors join salary on doctors.id = salary.id join professions on doctors.profession_id = professions.id WHERE doctors.id = '" + id + "'";
        client.query(query, function (err, result) {
            if (err) return deferred.reject(err);
            if (!result.rows[0]) {
                return q.reject('Not found');
            }
            deferred.resolve(result.rows[0]);
        });
        return deferred.promise;
    });
};


exports.filterUsers = function (filter, limit) {
    if (!limit) {
        limit = 100;
    }
    var filterMap = {
        GUEST: ['USER', 'ADMIN'],
        USER: ['USER'],
        ADMIN: []
    };
    return pqClient.then(function (client) {
        var deferred = q.defer();
        console.log('filter', filter);
        var filterQuery = filterMap[filter].length != 0 ? "WHERE access NOT IN ('" + filterMap[filter].join("','") + "')" : "";
        var query = "select * from users " + filterQuery + " LIMIT " + limit;
        console.log('query', query);
        client.query(query, function (err, result) {
            if (err) return deferred.reject(err);
            var ret = [];
            for (var i = 0, len = result.rows.length; i < len; i++) {
                ret.push(result.rows[i].login);
            }
            deferred.resolve(ret);
        });
        return deferred.promise;
    });
};

exports.loadComments = function (count) {
    return pqClient.then(function (client) {
        var deferred = q.defer();
        var query = "select comments.id, comments.comment, comments.created_time, users.login from comments join users on comments.user_id = users.id order by comments.created_time desc limit " + count;
        client.query(query, function (err, result) {
            if (err) return deferred.reject(err);
            deferred.resolve(result.rows);
        });
        return deferred.promise;
    });
}

exports.addComment = function (user, comment) {
    return pqClient.then(function (client) {
        var deferred = q.defer();
        client.query("INSERT INTO comments (id, user_id, comment) VALUES('" + uuid.v4() + "','" + user.id + "','" + comment + "')", function (err, result) {
            console.log('err, result', err, result);
            if (err) return deferred.reject(err);
            deferred.resolve(result.rows);
        });
        return deferred.promise;
    });
};