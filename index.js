const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const path = require('path');
const cookieParser = require('cookie-parser');
const md5 = require("md5")
const db = require('better-sqlite3')('weak-sessions.db');


db.exec("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT)");
const stmt = db.prepare('INSERT INTO users (username, password) VALUES (@username, @password)');
stmt.run({ username: "administrator", password: "you will never get this! :)" });
stmt.run({ username: "admin", password: "you will never get this! :)" });
stmt.run({ username: "root", password: "you will never get this! :)" });

app.use(express.static(path.join(__dirname, '/public')));
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(cookieParser());



app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', function (req, res) {
    res.render('index', { title: 'Cookie Factory' });
});

app.post('/register', function (req, res) {
    if(req.body.username.length < 4 || req.body.password.length < 4){
        res.render('index', {message: "username or password cannot be less than 4 characters"})
    }

    regex = /^[a-zA-Z0-9]+$/
    if(!req.body.username.match(regex)){
        res.render('index', {message: "only letters and numbers allowed"})
    }
    try{
        userResults = db.prepare('SELECT * FROM users WHERE username = ?').get(req.body.username);
        if(userResults){
            res.render('index', {message: "error! user already exists"})
            return;
        }
    } catch(err){
        res.render('index', {message: err});
        return;
    }
    
    try {
        const stmt = db.prepare('INSERT INTO users (username, password) VALUES (@username, @password)');
        insertResults = stmt.run({ username: req.body.username, password: req.body.password });
        res.render('index', {message: "user registered!"});
        return;
    } catch (err) {
        res.render('index', {message: err});
        return;
    }
});


app.post('/login', function (req, res) {
    try {
        loginResults = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(req.body.username, req.body.password);
        if (loginResults) {
            res.cookie('session', createSession(loginResults.username))
            res.redirect('/dashboard');
        } else {
            res.render('index', {message: "invalid login"});        }
    } catch (err) {
        res.render('index', {message: err});
    }

});

app.get('/dashboard', function (req, res) {
    if (req.cookies.session && validSession(req.cookies.session)) {
        username = req.cookies.session.slice(0, req.cookies.session.indexOf(":"))
        if (username === "admin" || username === "administrator" || username === "root") {
            res.render('dashboard', {message: 'Welcome admin! Your flag is FLAG-SESSION_SHENANIGANS-FLAG'});
        } else {
            res.render('dashboard', {message: 'Welcome to the userdash dashboard, ' + username + '!'});
        }
    } else {
        res.redirect('/');
    }
});


app.get('/logout', function (req, res) {
    if(req.cookies.session){
        res.clearCookie("session");
    }
    if(req.cookies['connect.sid']){
        res.clearCookie("connect.sid");
    }
    res.redirect('/');
});


app.listen(3334, function () {
    console.log('Node.js with Express application listening on port 3334!');
});


function validSession(cookie) {
    if(!cookie){
        return false
    }
    try {
        username = cookie.slice(0, cookie.indexOf(":"))
        hashCheck = cookie.slice(cookie.indexOf(":") + 1)
        loginResults = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (md5(loginResults.username) == hashCheck) {
            return true
        } else {
            return false
        }
    } catch (err) {
        return false
    }
}

function createSession(user){
    return user + ":" + md5(user)
}
