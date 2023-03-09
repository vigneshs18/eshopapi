const express = require('express');
const bcryptjs = require('bcryptjs');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { User } = require('../models/user');

const router = express.Router();

const pwdSalt = process.env.PWD_SALT;
const tokenSecret = process.env.TOKEN_SECRET;

router.get(`/`, async(req, res) => {
  const userList = await User.find().select('-passwordHash');
  
  if(!userList) {
    return res.status(500).json({
      success: false
    })
  }

  res.send(userList);
})

router.get('/:id', async(req, res) => {

  if(!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).send('Invalid User Id');
  }

  const user = await User.findById(req.params.id).select('-passwordHash');

  if(!user) {
    return res.status(500).json({
      message: 'The user with given ID was not found'
    });
  }

  res.status(200).send(user);
})

router.post('/', async(req, res) => {

  let user = new User({
    name: req.body.name,
    email: req.body.email,
    passwordHash: bcryptjs.hashSync(req.body.password, +pwdSalt),
    phone: req.body.phone,
    isAdmin: req.body.isAdmin,
    street: req.body.street,
    apartment: req.body.apartment,
    zip: req.body.zip,
    city: req.body.city,
    country: req.body.country
  })

  user = await user.save();

  if(!user) {
    return res.status(404).send('The user can not be created');
  }

  res.send(user);
})

router.put('/:id', async(req, res) => {

  if(!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).send('Invalid User Id');
  }

  const userExist = await User.findById(req.params.id);

  let newPassword;
  if(req.body.password){
    newPassword = bcryptjs.hashSync(req.body.password, +pwdSalt)
  }
  else {
    newPassword = userExist.passwordHash;
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    {
      name: req.body.name,
      email: req.body.email,
      passwordHash: newPassword,
      phone: req.body.phone,
      isAdmin: req.body.isAdmin,
      street: req.body.street,
      apartment: req.body.apartment,
      zip: req.body.zip,
      city: req.body.city,
      country: req.body.country
    },
    {
      new: true
    }
  );

  if(!user) {
    return res.status(404).send('the user can not be updated');
  }

  res.send(user);
})

router.delete('/:id', (req, res) => {

  if(!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).send('Invalid User Id');
  }

  User.findByIdAndRemove(req.params.id)
  .then(user => {
    if(user) {
      return res.status(200).json({success: true, message: 'the user is deleted'});
    }
    else {
      return res.status(404).json({success: false, message: 'user not found'});
    }
  })
  .catch(err => {
    return res.status(400).json({success: false, error: err});
  })
})

router.post('/login', async(req, res) => {
  const user = await User.findOne({email: req.body.email});

  if(!user){
    return res.status(400).send('The user not found');
  }

  if(user && bcryptjs.compareSync(req.body.password, user.passwordHash)){
    const token = jwt.sign(
      {
        userId: user.id,
        isAdmin: user.isAdmin
      },
      tokenSecret,
      {expiresIn: '1d'}
    )
    
    res.status(200).send({user: user.email, token: token});
  }
  else {
    res.status(400).send('Password is Wrong');
  }

})

router.post('/register', async(req, res) => {

  let user = new User({
    name: req.body.name,
    email: req.body.email,
    passwordHash: bcryptjs.hashSync(req.body.password, +pwdSalt),
    phone: req.body.phone,
    isAdmin: req.body.isAdmin,
    street: req.body.street,
    apartment: req.body.apartment,
    zip: req.body.zip,
    city: req.body.city,
    country: req.body.country
  })

  user = await user.save();

  if(!user) {
    return res.status(404).send('The user can not be created');
  }

  res.send(user);
})

router.get('/get/count', async(req, res) => {
  const userCount = await User.countDocuments();
  
  if(!userCount) {
    return res.status(500).json({
      success: false
    })
  }

  res.send({
    userCount: userCount
  });
})

module.exports = router;