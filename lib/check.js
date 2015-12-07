exports.checkInjection = function (comment) {
    var regexp = /(\bINFORMATION_SCHEMA\b|\bselect\b|\balter\b|\btable\b|\bupdate\b|\bCONCAT\b|\bfrom\b|\bwhere\b|\bschema\b|\bdelete\b|\binsert\b|\bGROUP BY\b|\bUNION\b)/i;    
    return comment && regexp.test(comment);
}

exports.removeSwearing = function (comment) {
    comment = comment.replace(/(fuck|crap|shit)/gi, '');
    return comment;
};
