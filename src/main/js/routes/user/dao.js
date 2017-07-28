"use strict";

const mongoose = require('mongoose');
const config = require('config');
mongoose.Promise = require('q').Promise;
mongoose.connect (config.get("mongoDbUrl"), {
  useMongoClient: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("Mongo has been connected");
});

const options = {
  versionKey: false,
  collection: "Users",
  toJSON: { minimize: false }
};

let file = mongoose.Schema({
  name:String,
  size:Number,
  extension:String
}, options);

let UserSchema = mongoose.Schema({
  _id: { type: mongoose.Schema.ObjectId},
  firstName:  { type: String, required: true },
  lastName:  { type: String, required: false },
  email:  { type: String, required: true },
  files: {
    image: {type: file, required: true},
    thumbnails: [file],
    video: {type: file, required: false},
    audio: {type: file, required: false},
  },
}, options);


module.exports = {
  Users: mongoose.model("Users", UserSchema)
};
