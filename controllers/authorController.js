const mongoose = require('mongoose');
const Author = require('../models/Author');
const Book = require('../models/Book');

// POST /authors
exports.createAuthor = async (req, res) => {
  try {
    const author = await Author.create(req.body);
    res.status(201).json(author);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /authors
exports.getAuthors = async (req, res) => {
  try {
    const authors = await Author.find();
    res.json(authors);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /authors/:id
exports.getAuthorById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: `"${req.params.id}" is not a valid author id` });
    }

    const author = await Author.findById(req.params.id);
    if (!author) {
      return res.status(404).json({ message: `Author with id ${req.params.id} not found` });
    }
    res.json(author);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// PUT /authors/:id
exports.updateAuthor = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: `"${req.params.id}" is not a valid author id` });
    }

    // runValidators makes Mongoose check the schema rules on update, not just on create
    const author = await Author.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!author) {
      return res.status(404).json({ message: `Author with id ${req.params.id} not found` });
    }
    res.json(author);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// DELETE /authors/:id
// Policy A: block deletion while the author still has books (409 Conflict).
exports.deleteAuthor = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: `"${req.params.id}" is not a valid author id` });
    }

    const author = await Author.findById(req.params.id);
    if (!author) {
      return res.status(404).json({ message: `Author with id ${req.params.id} not found` });
    }

    const bookCount = await Book.countDocuments({ author: author._id });
    if (bookCount > 0) {
      return res.status(409).json({
        message: `Cannot delete "${author.name}": they have ${bookCount} book(s). Delete or reassign those books first.`,
      });
    }

    await author.deleteOne();
    res.json({ message: `Author "${author.name}" deleted` });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
// GET /authors/:id/books
exports.getAuthorBooks = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: `"${req.params.id}" is not a valid author id` });
    }

    const author = await Author.findById(req.params.id);
    if (!author) {
      return res.status(404).json({ message: `Author with id ${req.params.id} not found` });
    }

    // An author with no books should return an empty array, not a 404
    const books = await Book.find({ author: author._id });
    res.json(books);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /authors/:id/stats
exports.getAuthorStats = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: `"${req.params.id}" is not a valid author id` });
    }

    const author = await Author.findById(req.params.id);
    if (!author) {
      return res.status(404).json({ message: `Author with id ${req.params.id} not found` });
    }

    const books = await Book.find({ author: author._id });

    // Requirement 6: an author with no books gets sensible empty values, not a crash
    if (books.length === 0) {
      return res.json({
        author: author.name,
        bookCount: 0,
        averagePrice: null,
        cheapestBook: null,
        mostExpensiveBook: null,
      });
    }

    const total = books.reduce((sum, book) => sum + book.price, 0);
    const sorted = [...books].sort((a, b) => a.price - b.price);

    res.json({
      author: author.name,
      bookCount: books.length,
      averagePrice: Math.round((total / books.length) * 100) / 100,
      cheapestBook: sorted[0].title,
      mostExpensiveBook: sorted[sorted.length - 1].title,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

