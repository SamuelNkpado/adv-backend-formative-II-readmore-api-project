const mongoose = require('mongoose');
const Author = require('../models/Author');
const Book = require('../models/Book');

const ALLOWED_FIELDS = ['title', 'genre', 'price', 'publishedYear', 'author'];
const MIN_PUBLISHED_YEAR = 1450;

// Escape regex special characters so a title like "What?" is matched literally
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Keep only the fields a client is allowed to set
const pickAllowedFields = (body) =>
  Object.fromEntries(Object.entries(body).filter(([key]) => ALLOWED_FIELDS.includes(key)));

// Checks the business rules against a set of values.
// Returns { status, message } for the first rule broken, or null if all pass.
// excludeId lets an update skip its own book when checking for duplicate titles.
const findRuleViolation = async ({ title, author, price, publishedYear, excludeId }) => {
  // Requirement 1: a book must reference an author that really exists (400)
  if (author !== undefined) {
    if (!mongoose.isValidObjectId(author)) {
      return { status: 400, message: `"${author}" is not a valid author id` };
    }
    const authorExists = await Author.exists({ _id: author });
    if (!authorExists) {
      return { status: 400, message: `No author found with id ${author}` };
    }
  }

  // Requirement 3: values the schema cannot express (422)
  if (price !== undefined && Number(price) <= 0) {
    return { status: 422, message: 'Price must be greater than 0' };
  }
  if (publishedYear !== undefined) {
    const year = Number(publishedYear);
    const currentYear = new Date().getFullYear();
    if (year > currentYear || year < MIN_PUBLISHED_YEAR) {
      return {
        status: 422,
        message: `publishedYear must be between ${MIN_PUBLISHED_YEAR} and ${currentYear}`,
      };
    }
  }

  // Requirement 2: no duplicate titles per author, case-insensitive (409)
  if (title !== undefined && author !== undefined) {
    const duplicateQuery = {
      author,
      title: { $regex: `^${escapeRegex(String(title))}$`, $options: 'i' },
    };
    if (excludeId) {
      duplicateQuery._id = { $ne: excludeId };
    }
    const duplicate = await Book.exists(duplicateQuery);
    if (duplicate) {
      return { status: 409, message: `This author already has a book titled "${title}"` };
    }
  }

  return null;
};

// POST /books
exports.createBook = async (req, res) => {
  try {
    const fields = pickAllowedFields(req.body);

    const violation = await findRuleViolation(fields);
    if (violation) {
      return res.status(violation.status).json({ message: violation.message });
    }

    const book = await Book.create(fields);
    res.status(201).json(book);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /books
exports.getBooks = async (req, res) => {
  try {
    const books = await Book.find().populate('author');
    res.json(books);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /books/:id
exports.getBookById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: `"${req.params.id}" is not a valid book id` });
    }

    const book = await Book.findById(req.params.id).populate('author');
    if (!book) {
      return res.status(404).json({ message: `Book with id ${req.params.id} not found` });
    }
    res.json(book);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// PUT /books/:id
exports.updateBook = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: `"${req.params.id}" is not a valid book id` });
    }

    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: `Book with id ${req.params.id} not found` });
    }

    const updates = pickAllowedFields(req.body);

    // Judge the rules against the merged result, so a partial update
    // (e.g. only changing price) is checked against the book's existing values
    const violation = await findRuleViolation({
      title: updates.title ?? book.title,
      author: updates.author ?? book.author,
      price: updates.price ?? book.price,
      publishedYear: updates.publishedYear ?? book.publishedYear,
      excludeId: book._id,
    });
    if (violation) {
      return res.status(violation.status).json({ message: violation.message });
    }

    book.set(updates);
    const updated = await book.save();
    res.json(updated);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// DELETE /books/:id
// Books have no dependents, so a plain delete is safe here.
exports.deleteBook = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: `"${req.params.id}" is not a valid book id` });
    }

    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) {
      return res.status(404).json({ message: `Book with id ${req.params.id} not found` });
    }
    res.json({ message: `Book "${book.title}" deleted` });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};