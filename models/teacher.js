const mongoose = require('mongoose');

const teacherSchema = mongoose.Schema({
    username: String,
    name: String,
    age: Number,
    email: String,
    password: String,
})

module.exports = mongoose.model("teacher", teacherSchema);