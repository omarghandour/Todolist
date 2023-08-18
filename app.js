//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require('passport-local-mongoose');
const { Console } = require('console');
const app = express();
const port = 3000;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate")
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(session({
    secret: "Our Little Secret.",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static("public"));
app.use("/", express.static("./node_modules/bootstrap/dist/"));
mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true });

const itemsSchema = {
    name: { type: String },
    userId: { type: String }
};
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);
const Item = mongoose.model("Item", itemsSchema);


const task = ["name"];
passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, {
            id: user.id,
            username: user.username,
            picture: user.picture
        });
    });
});

passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/todo"
},
    function (accessToken, refreshToken, profile, cb) {
        const gname = profile.displayName
        const gpic = profile.photos
        // console.log(gpic)
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));
app.get("/", function (req, res) {
    res.render("home");
});

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile'] })
);



app.get('/auth/todo',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/todo');
    });

app.get("/login", function (req, res) {
    res.render("login");
});

app.get("/register", function (req, res) {
    res.render("register");
});
app.route("/todo").get((req, res) => {
    if (req.isAuthenticated()) {
        // console.log(passport)
        const hw = req.user.id
        const item1 = new Item({
            name: "Welcome to your todoList",
            userId: hw
        })
        const item2 = new Item({
            name: "Hit the + button to off a new item",
            userId: hw
        })
        const item3 = new Item({
            name: "<-- Hit this to delete an item>",
            userId: hw
        })
        const defaultItems = [item1, item2, item3];
        const tasks = req.body.newItem

        // console.log(hw)
        const gg = Item.find({ userId: req.user.id })
        // console.log(gg)

        Item.find({ userId: req.user.id })
            .then(foundItems => {
                if (foundItems.length === 0) {
                    Item.insertMany(defaultItems);
                } res.render("todo", { newListItems: foundItems, sessid: hw });
            })
            .catch(err => {
                console.log(err);
            })
    }

}).post((req, res) => {
    const itemName = req.body.newItem;
    const uid = req.user.id
    // console.log(uid)
    // console.log({ itemName })
    const item = new Item({
        name: itemName,
        userId: uid
    });
    if (itemName.length === 0) {
        console.log("fail");
    } else {
        item.save();
        // User.findByIdAndUpdate({ uid }, { task: "itemName" })
        res.redirect("todo")
    }
}).patch((req, res) => {

})
app.get("/logout", (req, res) => {
    req.logout((err) => {
        if (err) {
            console.log(err);
        } else {
            res.redirect("/");
        }
    });

});

app.post("/register", function (req, res) {

    User.register({ username: req.body.username }, req.body.password, (err, user) => {
        if (err) {
            console.log(err)
            res.status(500).send({ status: 500, message: 'Account already exist', type: 'error' });
            if (8 > req.body.password) {
                res.status(500).send({ status: 500, message: 'Account already exist', type: 'error' });
            }
        }
        else {
            passport.authenticate("local")(req, res, () => {
                res.redirect("todo");
            })
        }
    })

});

app.post("/login", function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, (err) => {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, () => {
                res.redirect("/todo");
            });
        }
    })

});


app.post("/delete", (req, res) => {
    const checkedIemId = req.body.checkbox;
    Item.findByIdAndRemove(checkedIemId).then({
        if(err) {
            console.log(err)
        }

    })
    // console.log({ checkedIemId })
    setTimeout(() => {
        res.redirect('/todo')

    }, 300)

});




app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
