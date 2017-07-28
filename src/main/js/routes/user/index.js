"use strict";

const _ = require('lodash');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');
const config = require('config');
const mkdirp = require('mkdirp');
const Q = require('q');
const path = require('path');
const fs = require('fs');
const Users = require('./dao').Users;
const cert = fs.readFileSync('./src/main/resources/secrets/signing.key');
const bytesToMegaBytes = config.get("bytesToMegaBytes");
const pathToUsersFiles = config.get("pathToUsersFiles");
const THUMBNAILS_SIZE = config.get("thumbnailsSize");
const TYPE_FILES = config.get("typesFiles");

function extension(fileName) {
  return fileName.match(/\.\w+$/)[0];
}
function getFileName(fileName) {
  return fileName.substring(0, fileName.lastIndexOf('.'))
}

function configureThumbnails(imageFile) {
  return THUMBNAILS_SIZE.map(itemSize => {
    return {
      name: imageFile.name,
      size: itemSize,
      extension: extension(imageFile.name)
    };
  });
}

function uploadToDirectory(uploadObject, files, id) {

  let pathToFiles = [];
  mkdirp.sync(path.join(pathToUsersFiles, id.toString(), 'photos', 'thumbnails'));

  TYPE_FILES.forEach(key => {
    if (uploadObject[key]) {
      let pathUploadedFiles = path.join(pathToUsersFiles, id, files[key].name.toString());
      pathToFiles.push(pathUploadedFiles);
      fs.writeFile(pathUploadedFiles, uploadObject[key], function (err) {
        if (err) {
          return Q.promise.reject(err);
        }
        console.log("The file was saved! " + files[key].name);
      });
    }
  });

  files.thumbnails.forEach(thumbnail => {

    let pathToThumbnails = path.join(pathToUsersFiles, id, 'photos', 'thumbnails',
      `${getFileName(thumbnail.name)}-${thumbnail.size}${thumbnail.extension}`);

    pathToFiles.push(pathToThumbnails);

    sharp(uploadObject.image)
      .resize(thumbnail.size, thumbnail.size)
      .toFile(pathToThumbnails, (err) => {
        if (err) {
          return Q.promise.reject(err);
        }
      });
  });

  return Q.promise.resolve(pathToFiles);
}

function validateFileSize(file, size) {
  if (file && file.size > size * bytesToMegaBytes) {
    return `file '${file.name}' exceeded limit of ${size} MB`
  }
}

function validateRequire(name, value) {
  if (!value) {
    return `${name} field is reacquired.`;
  }
}

function validateReceivedData(user) {
  let errors = _.compact([
    validateRequire('email', user.email),
    validateRequire('firstName', user.firstName),
    validateRequire('image', user.files.image),

    validateFileSize(user.files.image, 15),
    validateFileSize(user.files.audio, 20),
    validateFileSize(user.files.video, 25),
  ]);

  if (errors.length) {
    throw {code: 401, errors: errors};
  }
}

function configureFiles(files) {
  return _.mapValues(files, (file) => {
    return {
      name: file.name,
      extension: extension(file.name),
      size: file.size
    }
  });
}

function restorePathToFiles(id, file) {

  if (!Array.isArray(file)) {
    file.path = path.join(pathToUsersFiles, id.toString(), file.name.toString());
  } else {

    _.forEach(file, item => {
      item.path = path.join(pathToUsersFiles, id.toString(), 'photos', 'thumbnails',
        `${getFileName(item.name)}-${item.size}${item.extension}`);
    });
  }
}


/**
 * User route implementation
 * @module routes/user
 */

let self = {

  authenticate: function (req, res, next) {

    let email = req.userAdapter.userData.email;

    return Users.findOne({email: email})
      .then(data => {

        let user = data.toObject();
        user.files = _.forIn(user.files, file => restorePathToFiles(user._id, file));
        delete user._id;

        res.send(200, user);
      })
      .catch(err => {
        res.send(400, err);
      })
      .done(next);

  },

  signIn: function (req, res, next) {

    let user = {
      _id: mongoose.Types.ObjectId(),
      email: req.body.email,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      files: configureFiles(req.files),
    };

    try {
      validateReceivedData(user);
    } catch (err) {
      res.send(err.code, err.errors);
      return;
    }

    user.files.thumbnails = configureThumbnails(req.files.image);

    return Users.findOne({email: user.email})
      .then((data) => {

        if (data) {
          throw {code: 405, message: "The email has already been used"}
        }

        return Q.all([
          Users.create(user),
          uploadToDirectory(req.params, user.files, user._id.toString())
        ])
      })
      .then((userAndPathways) => {
        user.files = userAndPathways[1];
        delete user._id;
        res.send(200, {
          user: user,
          jwt: jwt.sign(user, cert, {algorithm: 'RS256'}),
        });
      })
      .catch((err) => {
        res.send(410, err);
      })
      .done(next);
  }
};

module.exports = self;
