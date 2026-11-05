require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const authorRoutes = require('./routes/authorRoutes');
const bookRoutes = require('./routes/bookRoutes');


const app = express();
app.use(express.json());
app.use('/authors', authorRoutes);
app.use('/books', bookRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'ReadMore API is running' });
});

const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });