const express = require('express');
const mongoose = require('mongoose');
const stripe = require('stripe')('sk_test_51N8k4pSHP0ulwrHIK3USnQXPraQOdvmyqdvOX5ZD4SyGXavmk20OsrwQpzaNjNBGmNyoBBGRwOWFwvSMjZiyIXY200I2IftEGt');
const { Order } = require('../models/order');
const { OrderItem } = require('../models/order-item');
const { Product } = require('../models/product');

const router = express.Router();

router.get(`/`, async(req, res) => {
  const orderList = await Order.find().populate('user', 'name phone').sort({'dateOrdered': -1});
  
  if(!orderList) {
    return res.status(500).json({
      success: false
    })
  }

  res.send(orderList);
})

router.get('/:id', async(req, res) => {

  if(!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).send('Invalid Order Id');
  }

  const order = await Order.findById(req.params.id)
    .populate('user', 'name phone')
    .populate(
      {
        path: 'orderItems', populate: 
          {
            path: 'product', populate: 'category'
          }
      }
    );

  if(!order) {
    return res.status(500).json({
      message: 'The order with given ID was not found'
    });
  }

  res.status(200).send(order);
})

router.post('/create-checkout-session', async (req, res) => {
  const orderItems = req.body;

  if (!orderItems) {
    return res.status(400).send('checkout session cannot be created - check the order items');
  }

  const lineItems = await Promise.all(
    orderItems.map(async(orderItem) => {
      const product = await Product.findById(orderItem.product);
      return {
        price_data: {
          currency: 'inr',
          product_data: {
            name: product.name
          },
          // Product Price to be mentioned in paise
          unit_amount: product.price * 100
        },
        quantity: orderItem.quantity
      };
    })
  );


  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    success_url: 'http://localhost:4200/success',
    cancel_url: 'http://localhost:4200/error'
  })

  res.json({id: session.id});
})

router.post('/', async(req, res) => {
  // Note: Here we are using Promise.all(), bcoz orederItems might contain n items and 
  // all those n items should be saved in DB and must return their respective '_id', 
  // which could be a long asyncronous process. Hence, it must be treated and resolves as
  // multiple promises comibined to form a single big promise.
  const orderItemsIds = Promise.all(req.body.orderItems.map(async(orderItem) => {
    let newOrderItem = new OrderItem({
      quantity: orderItem.quantity,
      product: orderItem.product
    })

    newOrderItem = await newOrderItem.save();

    return newOrderItem._id;
  }))

  // Big Promise Resolution happens here
  const resolvedOrderItemsIds = await orderItemsIds;
  // console.log('resolvedOrderItemsIds: ', resolvedOrderItemsIds);

  // Calculating totalPrice for the Order
  const totalPrices = await Promise.all(resolvedOrderItemsIds.map(async(orderItemId) => {
    const orderItem = await OrderItem.findById(orderItemId).populate('product', 'price');
    const totalAmt = orderItem.product.price * orderItem.quantity;
    return totalAmt;
  }))
  // console.log('totalPrices: ', totalPrices);

  const totalPrice = totalPrices.reduce((a,b) => a +b, 0);
  // console.log('totalPrice: ', totalPrice);

  let order = new Order({
    orderItems: resolvedOrderItemsIds,
    shippingAddress1: req.body.shippingAddress1,
    shippingAddress2: req.body.shippingAddress2,
    city: req.body.city,
    zip: req.body.zip,
    country: req.body.country,
    phone: req.body.phone,
    status: req.body.status,
    totalPrice: totalPrice,
    user: req.body.user
  })

  order = await order.save();

  if(!order) {
    return res.status(404).send('The order can not be created');
  }

  res.send(order);
})

router.put('/:id', async(req, res) => {

  if(!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).send('Invalid Order Id');
  }

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    {
      status: req.body.status
    },
    {
      new: true
    }
  );

  if(!order) {
    return res.status(404).send('the order status can not be updated');
  }

  res.send(order);
})

router.delete('/:id', (req, res) => {

  if(!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).send('Invalid Order Id');
  }

  Order.findByIdAndRemove(req.params.id)
  .then(async(order) => {
    if(order) {
      await order.orderItems.map(async orderItem => {
        await OrderItem.findByIdAndRemove(orderItem)
      })
      return res.status(200).json({success: true, message: 'the order is deleted'});
    }
    else {
      return res.status(404).json({success: false, message: 'order not found'});
    }
  })
  .catch(err => {
    return res.status(400).json({success: false, error: err});
  })
})

router.get('/get/totalsales', async(req, res) => {
  
  // we are delebrately putting '_id' as null, bcoz mongo DB is required to return an _id in any case
  const totalSales = await Order.aggregate([
    { $group: { _id: null, totalsales: { $sum: '$totalPrice'}}}
  ])
  // console.log('totalSales: ', totalSales);

  if (!totalSales) {
    return res.status(400).send('The order sales cannot be generated');
  }

  // poping out of 'totalSales' Array to just obtain the actual amt of 'totalsales'
  res.send({totalsales: totalSales.pop().totalsales})
})

router.get('/get/count', async(req, res) => {
  const orderCount = await Order.countDocuments();
  
  if(!orderCount) {
    return res.status(500).json({
      success: false
    })
  }

  res.send({
    orderCount: orderCount
  });
})

router.get('/get/userorders/:userid', async(req, res) => {

  if(!mongoose.isValidObjectId(req.params.userid)) {
    return res.status(400).send('Invalid User Id');
  }

  const userOrderList = await Order.find({user: req.params.userid})
  .populate(
    {
      path: 'orderItems', populate: 
        {
          path: 'product', populate: 'category'
        }
    }
  )
  .sort({'dateOrdered': -1});
  
  if(!userOrderList) {
    return res.status(500).json({
      success: false
    })
  }

  res.send(userOrderList);
})

module.exports = router;