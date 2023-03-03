const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Environment Variavles
require('dotenv/config');
const apiUrl = process.env.API_URL;
const dbUrl = process.env.DB_URL;

app.use(cors());
app.options('*', cors());

// Middlewares
app.use(express.json());
app.use(morgan('tiny'));

// Routes
const productRouter = require('./routes/products');
const categoryRouter = require('./routes/categories');
const orderRouter = require('./routes/orders');
const userRouter = require('./routes/users');

// Route Paths
app.use(`${apiUrl}/products`, productRouter);
app.use(`${apiUrl}/categories`, categoryRouter);
app.use(`${apiUrl}/orders`, orderRouter);
app.use(`${apiUrl}/users`, userRouter);

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