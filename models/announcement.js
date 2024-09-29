const mongoose = require('mongoose');

const announceSchema = mongoose.Schema({
    content: String,
    standard: String,
    date : {
        type : Date,
        default : Date.now, 
    },
})

module.exports = mongoose.model("announce", announceSchema);