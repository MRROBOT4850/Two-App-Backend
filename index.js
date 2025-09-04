const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const userRoutes = require("./routes/userRoutes");
const movieRoutes = require("./routes/movieRoutes");
const cookieParser= require("cookie-parser")
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(cookieParser());
const PORT = process.env.PORT || 5000;



const http = require('http');
const { Server } = require('socket.io');


require('dotenv').config();
const nodemailer=require("nodemailer")
const server = http.createServer(app);
const allowedOrigin = process.env.CLIENT_URL
const io = new Server(server, {
  cors: {
    origin:["https://movie-maniacs.vercel.app","https://ghost-talk-tan.vercel.app"],
    methods:["GET","POST"],
    credentials: true
  }
});
let gmailQueue=[]
app.use(cors());
app.use(express.json());



const roomMap = new Map();
const roomCount=100;
const ROOM_TTL_MS = 60* 60 * 1000;

io.on('connection', (socket) => {
  //console.log(`User connected: ${socket.id}`);

  socket.on('notify-user', (obj) => {
    if (!roomMap.has(obj.room)) {
      socket.emit('error', 'Room does not exist');
      return;
    }
    socket.join(obj.room);
    //console.log("user joined the room "+obj.room)
    socket.to(obj.room).emit('user-notified',obj.name );
  });
 
  socket.on("notify-user",(roomId)=>{
    socket.to(roomId).emit('user-notified',roomId );
  })
  socket.on("receive-messages",(obj)=>{
    const Obj={
      sender:obj.sender,
      message:obj.message

    }
    console.log("meesage mil gya "+obj.message+"  "+obj.room)
      io.to(obj.room).emit("message-received",Obj);
  })
  socket.on('message', ({ roomId, message }) => {
    console.log(message)
    io.to(roomId).emit('message', `${socket.id}: ${message}`);
  });

  socket.on('disconnect', () => {
    //console.log(`User disconnected: ${socket.id}`);
  });
});
const transporter = nodemailer.createTransport({
      service:'gmail',
      auth: {
          user: process.env.GMAIL,
          pass: process.env.PASS
      }
});
async function processEmailQueue() {
   // if (gmailQueue.length === 0) return;

    const email = gmailQueue.shift(); // Take the first email in queue
    
    try {
        const info = await transporter.sendMail(email);
        //console.log('Email sent:', info);
    } catch (error) {
        console.error('Error sending email:', error);
        // Optionally re-add to the queue or handle error
    }
}
app.get('/check-rooms/:roomId', (req, res) => {
  const { roomId } = req.params;

  if (!roomId) {
    return res.status(400).json({ success: false, message: "Room ID is required" });
  }

  const exists = roomMap.has(roomId);

  return res.json({ success: exists });
});
app.post("/send-gmail",async (req,res)=>{
 
  const {to}=req.body;
  const subject="Regarding Scheduling of Room";
  
    const mailOptions = {
        from:process.env.GMAIL,
        to,
        subject,
        text:"Your Request is accepted . Now you can join a room .",
       html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2 style="color: #4CAF50;">Request Accepted!</h2>
            <p>Your request has been approved. You can now join a room.</p>
            <p>
              <a href="https://ghost-talk-tan.vercel.app/generate-room" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
                Join a Room
              </a>
            </p>
            <p>If you have any questions, feel free to reply to this email.</p>
          </div>
        `

        
    };

    //gmailQueue.push(mailOptions);

  try{
      gmailQueue.push(mailOptions);
      console.log(mailOptions);
      res.status(200).json({
        success:true,
        message:"Your Request is Scheduled."
      })
      //console.log("request chal gyi hai "+gmailQueue.length)
  }
  catch(e){
      console.log(e);
      res.json({
        success:false,
        message:e
      })
  }
 


})
app.post('/register-room', (req, res) => {
  const { roomId } = req.body;

  if (!roomId || typeof roomId !== 'string') {
    return res.status(400).json({
      success:false,
       meesage: 'Invalid roomId'
       });
  }

  if (roomMap.size >=roomCount) {
    return res.status(400).json({
        success:false,
       error: 'Room limit reached (100)' 
      });
  }

  if (roomMap.has(roomId)) {
    return res.status(400).json({ 
      success:false,
      message: 'Room already exists' 
    });
  }

  roomMap.set(roomId, Date.now());
  setInterval(() => {
  const now = Date.now();
  for (const [roomId, createdAt] of roomMap.entries()) {
    if (now - createdAt > ROOM_TTL_MS) {
      roomMap.delete(roomId);
      //console.log(`Room ${roomId} expired and removed itne room bache hai -> ${roomMap.size}`);
      const clients = io.sockets.adapter.rooms.get(roomId);
      if (clients) {
        for (const socketId of clients) {
          const socket = io.sockets.sockets.get(socketId);
          if (socket) {
           
            socket.leave(roomId);
            socket.disconnect(true);
             socket.emit('roomClosed', `Room ${roomId} has expired and is now closed.`);
            
          }
        }
      }
      //console.log("room delete ho gya ")
      if(gmailQueue.length>0){
       // console.log("Email bhej rhe hai ")
        processEmailQueue();
        //return;

      }
    }
  }
},ROOM_TTL_MS);
  res.json({ success: true, message: `Room ${roomId} registered.`,roomLeft:roomCount-roomMap.size });
});
app.get("/",(req,res)=>{
  res.send("<h2>Server is Running </h2>")
})
app.get("/ping",(req,res)=>{
   res.status(200).send('pong');
})
app.get("/get-roomCount",(req,res)=>{
  res.json({
    roomCount:roomCount-roomMap.size
  })
})
// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });
//const mongoose = require('mongoose');
const MONGO_URI = process.env.MONGO_URL;  // Make sure this is getting the correct value
;
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB connected');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});
//console.log("userRoutes type:", typeof userRoutes);
//console.log("movieRoutes type:", typeof movieRoutes);
app.use("/api/users", userRoutes);
app.use("/api/movies", movieRoutes);
app.get("/home",(req,res)=>{
     res.send(`<h1>THis is HomePage </h1>`)
})
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('MongoDB URI:', MONGO_URI);
});
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
  
// });
