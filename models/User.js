const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  // Just raw TMDB IDs
  favorites: [Number],
  watchLater: [Number],
});

// Virtual populate for movies
userSchema.virtual("favoriteMovies", {
  ref: "Movie",
  localField: "favorites",   // Array of tmdbIds in User
  foreignField: "tmdbId",    // tmdbId field in Movie
});

userSchema.virtual("watchLaterMovies", {
  ref: "Movie",
  localField: "watchLater",
  foreignField: "tmdbId",
});

userSchema.set("toObject", { virtuals: true });
userSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("User", userSchema);
