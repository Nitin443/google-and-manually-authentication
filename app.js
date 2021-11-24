//require("dotenv").config(); // adding dotenv config ( it should be declare in top of program)
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
//const encrypt = require("mongoose-encryption");
const md5 = require("md5");

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});

const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

// encryption method
// const secret = "Thisisourlittlesecret";   // we remove that secret const from here because now we are using its in .env file.
// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptionFields: ["password"], excludeFromEncryption: ["email"] });  // encrypt the password in database

const User = mongoose.model("User", userSchema);

app.get("/", function(req, res){
  res.render("home");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/login", function(req, res){
  res.render("login", {errMsg: "", username: "", password: ""});
});

app.post("/register", function(req, res){
  const newUser = new User({
    email: req.body.username,
    password: md5(req.body.password) // using hashing method md5 to hash the password
  });

  newUser.save(function(err){
    if(err){
      console.log(err);
    }else{
      res.render("secrets");   // given access secret page to user after registration
    }
  });
});

app.post("/login", function(req, res){  // given access secret page to user after login
  const userName = req.body.username;
  const password = md5(req.body.password) // using hashing method md5 to hash the password then match in database

  User.findOne({email: userName}, function(err, foundUser){  // find user name in database that enter user
    //console.log(foundUser);
    if(err){
      console.log(err);
    }else {
      if(foundUser){
        if(foundUser.password === password){  // if user name found then check password that enter by user if password correct then access to secret page
          res.render("secrets");
        }else{  //  password wrong then show this msg to user and render to login page
             res.render("login", {errMsg: "Password incorrect", username: userName, password: password});
        }
      }else{  // if user not found then show this err msg to user and render to login page
            res.render("login", {errMsg: "Email or password incorrect", username: userName, password: password});
      }
    }
  });
});

app.listen(3000, function(){
  console.log("server started on port 3000");
});
