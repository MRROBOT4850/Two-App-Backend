const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const router = express.Router();
const Movie=require("../models/Movie")
//const { authMiddleware } = require("../middleware/authmiddleware");
// Signup route
router.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;
  console.log("username",username)
  try {
    const userExist = await User.findOne({ email });
    if (userExist) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();
    const token = jwt.sign({ id: newUser.id },process.env.JWT_SECRET, { expiresIn: "60m" });

    // ✅ Set cookie instead of returning token in JSON
    // res.cookie("token", token, {
    //   httpOnly: true,
    //   secure: true, // use HTTPS
    //   sameSite: "strict", // prevents CSRF
    //   maxAge: 15 * 60 * 1000, // 15 minutes
    // });

    res.status(201).json({
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
      },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// Login route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    //  const token1 = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "15m" });

    // // ✅ Set cookie instead of returning token in JSON
    // res.cookie("token", token1, {
    //   httpOnly: true,
    //   secure: true, // use HTTPS
    //   sameSite: "strict", // prevents CSRF
    //   maxAge: 15 * 60 * 1000, // 15 minutes
    // });

    res.status(200).json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Add to favorites
router.post("/favorites", async (req, res) => {
  const { userId, movieId } = req.body;
  console.log(userId,movieId,"haa bhai request aa gyi hai");
  try {
    const user = await User.findById(userId);
    //const movie= await Movie.findOne({ tmdbId: movieId });
    console.log("movie save hone jaa rhi hai")
    if (!user) {
      console.log("user nhi mila")
      return res.status(400).json({ message: "User not found" });
    }

    if (!user.favorites.includes(movieId)) {
      console.log("movie save ho rhi hai")
      user.favorites.push(movieId);
      await user.save();
    }

    res.status(200).json(user);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});
// Remove from favorites
router.post("/removeFavorite", async (req, res) => {
  try {
    let { userId, movieId } = req.body;
    movieId = Number(movieId)
    console.log("request aa gyi ", userId, movieId)
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Check if movie exists in favorites
    if (!user.favorites.includes(movieId)) {
      return res.status(400).json({ message: "Movie not found in favorites." });
    }

    // Remove movie from favorites
    user.favorites = user.favorites.filter((id) => id !== movieId);
    await user.save();
    //console.log(user.favorites)
    // Check if the movie is still in use (either in favorites or watchLater of any user)
    const isMovieStillInUse = await User.exists({
      $or: [{ favorites: movieId }, { watchLater: movieId }],
    });

    if (!isMovieStillInUse) {
      // Remove from Movie collection if no one uses it
       await Movie.findOneAndDelete({ tmdbId: movieId });
      console.log(
        `Movie with ID ${movieId} deleted from database as it's not in use.`
      );
    }
   // console.log(user.favorites)
   
    res
      .status(200)
      .json({ message: "Movie removed from favorites", favorites: user.favorites });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});


// Add to watch later
router.post("/watchlater", async (req, res) => {
  const { userId, movieId } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(400).json({ message: "User not found" });

    if (!user.watchLater.includes(movieId)) {
      user.watchLater.push(movieId);
      await user.save();
    }

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/removeWatchLater",async (req, res) => {
  try {
    const { userId, movieId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Remove movie from watchLater
    if (!user.watchLater.includes(movieId)) {
      return res.status(400).json({ message: 'Movie not found in watch later.' });
    }

    user.watchLater = user.watchLater.filter(id => id.toString() !== movieId);
    await user.save();

    // Check if the movie is still in any user's favorites or watchLater lists
    const isMovieStillInUse = await User.exists({
      $or: [
        { favorites: movieId },
        { watchLater: movieId },
      ],
    });

    if (!isMovieStillInUse) {
      // Remove the movie from the database
      await Movie.findByIdAndDelete(movieId);
      console.log(`Movie with ID ${movieId} deleted from database as it's not in use.`);
    }

    res.status(200).json({ message: 'Movie removed from watch later', watchLater: user.watchLater });
  } catch (error) {
    console.log(err);
    res.status(500).json({ message: error.message });
  }
});
router.post("/getfavorite",async (req,res)=>{
  const {userId}=req.body;
  console.log("requuest aa gya  hai")
   const data = await User.findById(userId)
  .populate({ path: "favorites", model: "Movie", localField: "favorites", foreignField: "tmdbId" })
  .populate({ path: "watchLater", model: "Movie", localField: "watchLater", foreignField: "tmdbId" });
  if(!data){
    console.log("movie nhi mili")
    res.json(
      {
        success:false,
        message:"User not found"
      }
    )
  }

  console.log("mil gyi movie",data);
  res.json({success:true,data:data})

})
// router.get("/getWatchlater",async (req,res)=>{
//   const {userId}=req.body;
//   console.log("requuest aa gya  hai")
//    const data = await User.findById(userId)
//   .populate({ path: "favorites", model: "Movie", localField: "favorites", foreignField: "tmdbId" })
//   .populate({ path: "watchLater", model: "Movie", localField: "watchLater", foreignField: "tmdbId" });
//   if(!data){
//     console.log("movie nhi mili")
//     res.json(
//       {
//         success:false,
//         message:"User not found"
//       }
//     )
//   }

//   console.log("mil gyi movie",data);
//   res.json({success:true,data:data})

// })


module.exports = router;
