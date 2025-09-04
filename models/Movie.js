const mongoose = require("mongoose");

const movieSchema = new mongoose.Schema({
  tmdbId: { type: Number, required: true, unique: true }, // unique index
  title: { type: String, required: true },
  overview: String,
  poster_path: String,
  release_date: String,
});

movieSchema.virtual("id").get(function () {
  return this.tmdbId;
});

module.exports = mongoose.model("Movie", movieSchema);
