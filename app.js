const express = require('express');
const mongoose = require('mongoose');
const app = express();
const userModel = require("./models/user");
const teacherModel = require("./models/teacher");
const adminModel = require("./models/admin");
const announceModel = require("./models/announcement");
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { get } = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch((err) => console.error('MongoDB connection error:', err));

app.set("view engine", "ejs");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/', async (req, res) => {
    res.render("login");
})

app.get('/login', (req, res) => {
    res.render("login");
})

app.post('/registerStudent', async (req, res) => {
    let { username, name, email, age, standard } = req.body;
    let password = generatePassword(username, age); 
    let user = await userModel.findOne({ email });

    if (user) {
        return res.status(500).send("User already registered");
    }

    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            let user = await userModel.create({
                username,
                name,
                email,
                age,
                password: hash,
                standard
            });
            let token = jwt.sign({ email: email, userid: user._id }, "abcd");
            res.cookie("token", token);
            res.redirect("/admin");
        });
    });
});

app.post('/registerTeacher', async (req, res) => {
    let { username, name, email, age } = req.body;
    let password = generatePassword(username, age); 
    let teacher = await teacherModel.findOne({ email });

    if (teacher) {
        return res.status(500).send("User already registered");
    }

    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            let teacher = await teacherModel.create({
                username,
                name,
                email,
                age,
                password: hash,
            });
            let token = jwt.sign({ email: email, teacherid: teacher._id }, "abcd");
            res.cookie("token", token);
            res.redirect("/admin");
        });
    });
});

app.post('/login', async (req, res) => {
    let { email, password } = req.body;
    let admin = await adminModel.findOne({ email });
    let user = await userModel.findOne({ email });
    let teacher = await teacherModel.findOne({ email });

    if (!user && !admin && !teacher) {
        return res.status(500).send("Something went wrong");
    }
    else if (user) {
        bcrypt.compare(password, user.password, function (err, result) {
            if (result) {
                let token = jwt.sign({ email: email, userid: user._id }, "abcd");
                res.cookie("token", token);
                res.status(200).redirect("/student");
            }
            else {
                res.redirect("/login");
            }
        });
    }
    else if (teacher) {
        bcrypt.compare(password, teacher.password, function (err, result) {
            if (result) {
                let token = jwt.sign({ email: email, teacherid: teacher._id }, "abcd");
                res.cookie("token", token);
                res.status(200).redirect("/teacher");
            }
            else {
                res.redirect("/login");
            }
        });
    }
    else {
        let token = jwt.sign({ email: email, adminid: admin._id }, "abcd");
        res.cookie("token", token);
        res.status(200).redirect("/admin");
    }
});

app.get('/logout', (req, res) => {
    res.cookie("token", "");
    res.redirect("/login");
});

function isLoggedIn(req, res, next) {
    const token = req.cookies.token;
    
    try {
        let data = jwt.verify(token, "abcd");
        // console.log(data);
        req.user = data;
        next();
    } catch (err) {
        return res.redirect("/login");
    }
}

app.get('/student', isLoggedIn, async (req, res) => {
    try {
        // Ensure req.user is populated from the session/authentication
        if (!req.user || !req.user.email) {
            return res.redirect("/login");
        }

        // Find the logged-in student in the database
        let user = await userModel.findOne({ email: req.user.email });

        // If user is not found
        if (!user) {
            return res.redirect("/login");
        }

        // Get the user's standard
        let userStandard = user.standard;
        // console.log(userStandard);  // Debugging purpose

        // Find announcements for the user's standard
        const announcements = await announceModel.find({ standard: userStandard });

        // Render student page with user and announcements
        res.render("student", { user: user, announcements: announcements });

    } catch (error) {
        console.log("Error fetching student or announcements:", error);
        res.status(500).send("Error occurred");
    }
});


app.get('/teacher', isLoggedIn, async (req, res) => {
    let teacher = await teacherModel.findOne({ email: req.user.email });
    if (teacher) {
        res.render("teacher", { teacher });
    } else {
        res.redirect("/login");
    }
});

app.get('/admin', isLoggedIn, async (req, res) => {
    let admin = await adminModel.findOne({ email: req.user.email });
    if (admin) {
        res.render("admin", { admin });
    } else {
        res.redirect("/login");
    }
});

app.get('/studentRegister', (req, res) => {
    res.render('registerStudent', );
})

app.get('/teacherRegister', (req, res) => {
    res.render('registerTeacher', );
})

app.get('/announcement', (req, res) => {
    res.render('teacherAnnouncement');
})

app.post('/announcement', async(req, res) => {
    let {standard, content} = req.body;

    const announce = new announceModel({
        standard : standard,
        content : content
    })

    await announce.save();
    res.redirect('/teacher');
})

app.get('/stuprof', (req, res) => {
    res.render('stuprof', { students: [], choice: null }); 
})

app.post('/stuprof', async (req, res) => {
    choice = req.body.standard;
    try{
        students = await userModel.find( { standard : choice });
        res.render('stuprof', { students: students, choice: choice });
    }
    catch(error){
        console.error(error);
        res.status(500).send("An error occured");
    }


})

app.post('/announcement', async (req, res) => {
    let {standard, content} = req.body;

    let announce = await announceModel.create({
        standard,
        content
    });

    res.redirect('/notification', { announce });
})

function generatePassword(username, age){
    return username + age.toString();
}

app.listen(3000, () => {
    console.log("Server running on port 3000");
});

