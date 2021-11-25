require("dotenv").config();  // require dot env package
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");  // to work findOrCreate method we install it


const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
// set session
app.use(session({
  secret: "our little secret",
  resave: false,
  saveUninitialized: false
}));
// initialized passport and session
app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});
//mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

//set plugin
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);   // plugin findOrCreate method

const User = mongoose.model("User", userSchema);
// set cookies and read cookies using serializeUser and deserializeUser
passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

// set googe  Oauth
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/", function(req, res){
  res.render("home");
});

// set google auth path
app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] }));

  // set route for callback for google auth
  app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets page.
    res.redirect("/secrets");
  });


app.get("/register", function(req, res){
  res.render("register");
});

app.get("/login", function(req, res){
  res.render("login", {errMsg: "", username: "", password: ""});
});

// set secret route
app.get("/secrets", function(req, res){
User.find({"secret": {$ne: null}}, function(err, foundUsers){
  if(err){
    console.log(err);
  }else{
    if(foundUsers){
      res.render("secrets", {usersWithSecrets: foundUsers});
    }
  }
});
});

// set subit get route
app.get("/submit", function(req, res){
  if(req.isAuthenticated()){
    res.render("submit");
  }else{
    res.redirect("/login");
  }
});

// set submit post route
app.post("/submit", function(req, res){
  const submittedSecret = req.body.secret;

  console.log(req.user._id);   // it is passport function so we are access id by user._id
  User.findById(req.user._id, function(err, foundUser){
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        foundUser.secret = submittedSecret;
        foundUser.save(function(){
          res.redirect("/secrets");
        });
      }
    }
  });
});

//set log out route
app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
});

app.post("/register", function(req, res){
  User.register({username: req.body.username}, req.body.password, function(err, user){
    if(err){
      console.log(err);
      res.redirect("/register");
    }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

});

app.post("/login", function(req, res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if(err){
      console.log(err);
    }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

});

app.listen(3000, function(){
  console.log("server started on port 3000");
});
