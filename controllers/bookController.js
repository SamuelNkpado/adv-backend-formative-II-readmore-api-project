const mongoose = require('mongoose');
const Author = require('../models/Author');
const Book = require('../models/Book');

// POST /books
exports.createBook = async (req, res) => {
  try {
    const { author } = req.body;

    // Requirement 1: a book must reference an author that really exists.
    // The schema's `required` only checks that the field is present, not that the id is real.
    if (!mongoose.isValidObjectId(author)) {
      return res.status(400).json({ message: `"${author}" is not a valid author id` });
    }
    const authorExists = await Author.exists({ _id: author });
    if (!authorExists) {
      return res.status(400).json({ message: `No author found with id ${author}` });
    }

    const book = await Book.create(req.body);
    res.status(201).json(book);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};