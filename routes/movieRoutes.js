const express = require("express");
const axios = require("axios");
const Movie = require("../models/Movie");
const User = require("../models/User");
//const { authMiddleware } = require("../middleware/authmiddleware");
const router = express.Router();
//const authMiddleware =require("../middleware/authMiddleware");

// Fetch movies from TMDB
// router.get("/search", async (req, res) => {
//   const { query } = req.query;

//   try {
//     const response = await axios.get(`https://api.themoviedb.org/3/search/movie`, {
//       params: {
//         api_key: TMDB_API_KEY,
//         query,
//       },
//     });

//     res.json(response.data);
//   } catch (err) {
//     res.status(500).json({ message: "Error fetching movies from TMDB" });
//   }
// });

router.post("/add",async (req, res) => {
  const movie=req.body;

  //console.log(movie)
  const { id, title, overview, poster_path, release_date } = movie;

  try {
    
    let existingMovie = await Movie.findOne({ tmdbId: id });
    if (existingMovie) {
      return res.status(200).json(existingMovie);
    }

    const newMovie = new Movie({
      tmdbId: id, //map "id" from TMDB to "tmdbId" in schema
      title,
      overview,
      poster_path,
      release_date,
    });

    await newMovie.save();
    res.status(201).json(newMovie);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error saving movie" });
  }
});
router.post("/remove",async (req, res) => {
  try {
    const { userId, movieId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Remove movie from favorites
    if (!user.favorites.includes(movieId)) {
      return res.status(400).json({ message: 'Movie not found in favorites.' });
    }

    user.favorites = user.favorites.filter(id => id.toString() !== movieId);
    await user.save();

    // Check if the movie is still in any user's favorites or watchLater lists
    const isMovieStillInUse = await User.exists({
      $or: [
        { favorites: movieId },
        { watchLater: movieId },
      ],
    });

    if (!isMovieStillInUse) {
      
      await Movie.findByIdAndDelete(movieId);
      //console.log(`Movie with ID ${movieId} deleted from database as it's not in use.`);
    }

    res.status(200).json({ message: 'Movie removed from favorites', favorites: user.favorites });
  } catch (error) {
    //console.log(error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
