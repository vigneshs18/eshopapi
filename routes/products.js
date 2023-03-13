const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { Product } = require('../models/product');
const { Category } = require('../models/category');

const router = express.Router();

// To match MIME TYPE to their respective extentions
// Files are specified in http req. in the form of MIME TYPE only
const FILE_TYPE_MAP = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpg'
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // If uploaded file's MIME Type not mentioned above Object, then it is not valid
    const isValid = FILE_TYPE_MAP[file.mimetype];

    // Creating an new Error in Node
    let uploadError = new Error('Invalid Image Type');

    if (isValid) {
      uploadError = null;
    }

    cb(uploadError, 'public/uploads')
  },
  filename: function (req, file, cb) {
    const fileName = file.originalname.split(' ').join('-');
    const extention = FILE_TYPE_MAP[file.mimetype];
    cb(null, `${fileName}-${Date.now()}.${extention}`)
  }
})

const uploadOptions = multer({ storage: storage })

router.get(`/`, async(req, res) => {
  // localhost:3000/api/v1/products?categories=2342569,15874693

  let filter = {};
  if (req.query.categories) {
    filter = {category: req.query.categories.split(',')};
  }

  const productList = await Product.find(filter).populate('category');

  // const productList = await Product.find().select('name image -_id');
  
  if(!productList) {
    return res.status(500).json({
      success: false
    })
  }

  res.send(productList);
})

router.get(`/:id`, async(req, res) => {

  if(!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).send('Invalid Product Id');
  }

  const product= await Product.findById(req.params.id).populate('category');
  
  if(!product) {
    return res.status(500).json({
      success: false
    })
  }

  res.send(product);
})

router.post(`/`, uploadOptions.single('image'), async(req, res) => {

  const category = await Category.findById(req.body.category);
  if (!category) return res.status(400).send('Invalid Category')

  // File validation: To check whather the req contains an image or not
  const file = req.file;
  if (!file) return res.status(400).send('No Image in the request')

  const fileName = file.filename;
  // Ex: fileName = some-image.jpg
  const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;
  // Ex: basePath = http://localhost:3000/public/uploads/ 
  
  let product = new Product({
    name: req.body.name,
    description: req.body.description,
    richDescription: req.body.richDescription,
    image: `${basePath}${fileName}`,
    brand: req.body.brand,
    price: req.body.price,
    category: req.body.category,
    countInStock: req.body.countInStock,
    rating: req.body.rating,
    numReviews: req.body.numReviews,
    isFeatured: req.body.isFeatured
  })
  
  product = await product.save();

  if(!product)
  return res.status(500).send('The product cannot be created')

  res.send(product);
  
})


router.put('/:id', async(req, res) => {

  if(!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).send('Invalid Product Id');
  }

  const category = await Category.findById(req.body.category);
  if (!category) return res.status(400).send('Invalid Category')

  const product = await Product.findById(req.params.id);
  if (!product) return res.status(400).send('Invalid Product')

  const file = req.file;
  let imagePath;

  if (file) {
    const fileName = file.filename;
    const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;
    imagePath = `${basePath}${fileName}`
  }
  else {
    imagePath = product.image;
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    req.params.id,
    {
      name: req.body.name,
      description: req.body.description,
      richDescription: req.body.richDescription,
      image: imagePath,
      brand: req.body.brand,
      price: req.body.price,
      category: req.body.category,
      countInStock: req.body.countInStock,
      rating: req.body.rating,
      numReviews: req.body.numReviews,
      isFeatured: req.body.isFeatured
    },
    {
      new: true
    }
  );

  if(!updatedProduct) {
    return res.status(500).send('the product cannot be updated');
  }

  res.send(updatedProduct);
})

router.delete('/:id', (req, res) => {

  if(!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).send('Invalid Product Id');
  }

  Product.findByIdAndRemove(req.params.id)
  .then(product => {
    if(product) {
      return res.status(200).json({success: true, message: 'the product is deleted'});
    }
    else {
      return res.status(404).json({success: false, message: 'product not found'});
    }
  })
  .catch(err => {
    return res.status(400).json({success: false, error: err});
  })
})

router.get(`/get/count`, async(req, res) => {
  const productCount = await Product.countDocuments();
  
  if(!productCount) {
    return res.status(500).json({
      success: false
    })
  }

  res.send({
    productCount: productCount
  });
})

router.get(`/get/count`, async(req, res) => {
  const productCount = await Product.countDocuments();
  
  if(!productCount) {
    return res.status(500).json({
      success: false
    })
  }

  res.send({
    productCount: productCount
  });
})

router.get(`/get/featured/:count`, async(req, res) => {

  const count = req.params.count ? req.params.count : 0;

  const products = await Product.find({isFeatured: true}).limit(+count);
  
  if(!products) {
    return res.status(500).json({
      success: false
    })
  }

  res.send(products);
})

router.put(
  '/gallery-images/:id',
  uploadOptions.array('images', 10),
  async(req, res) => {

    if(!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).send('Invalid Product Id');
    }

    const files = req.files;
    let imagePaths = [];
    const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;

    if (files) {
      files.map(file => {
        imagePaths.push(`${basePath}${file.filename}`)
      })
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        images: imagePaths
      },
      {
        new: true
      }
    );

    if(!product) {
      return res.status(500).send('the product cannot be updated');
    }
  
    res.send(product);

  }
)

module.exports = router;