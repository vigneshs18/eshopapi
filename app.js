const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const app = express();

// Environment Variavles
require('dotenv/config');
const apiUrl = process.env.API_URL;
const dbUrl = process.env.DB_URL;

// Middlewares
app.use(express.json());
app.use(morgan('tiny'));

// Schemas & Models
const productSchema = mongoose.Schema({
  name: String,
  image: String,
  countInStock: {
    type: Number,
    required: true
  }
})

const Product = mongoose.model('Product', productSchema);

// Routes
app.get(`${apiUrl}/products`, async(req, res) => {
  const productList = await Product.find();
  
  if(!productList) {
    res.status(500).json({
      success: false
    })
  }

  res.send(productList);
})

app.post(`${apiUrl}/product`, (req, res) => {
  
  const product = new Product({
    name: req.body.name,
    image: req.body.image,
    countInStock: req.body.countInStock
  })
  
  product.save()
  .then(createdProduct => {
    res.status(201).json({
      success: true,
      data: createdProduct
    })
  })
  .catch(err => {
    res.status(500).json({
      success: false,
      error: err
    })
  })

})

// Database Connection
mongoose.connect(dbUrl)
.then(() => {
  console.log('Database Connection is ready');
})
.catch((err) => {
  console.log(err);
})

// Server Initialization
app.listen(3000, ()=>{
  console.log('Server started at http://localhost:3000');
})