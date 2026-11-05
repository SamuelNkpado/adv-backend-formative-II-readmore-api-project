const express = require('express');
const { createBook } = require('../controllers/bookController');

const router = express.Router();

router.post('/', createBook);

module.exports = router;