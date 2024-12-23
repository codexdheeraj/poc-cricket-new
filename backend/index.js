const express = require('express'); 
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const http = require('http');
const mongodb = require('mongodb');
const socketIo = require('socket.io');
require('dotenv').config(); // Load environment variables

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
  }
});
const port = 3001;


io.on('connection', (socket) => {
  console.log(socket.id)
})

app.use(cors());

const mongoClient = mongodb.MongoClient;
const ObjectId = mongodb.ObjectId;

let client;
let db;
let bucket;


// Set up multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // Save with the original file extension
  },
});

const upload = multer({ storage });

let streamStartTime = null; // Global variable to track stream start time

let currentState = { status: "Stopped" };
app.use(express.json())

// Endpoint to update state
app.post('/update', (req, res) => {
  const { action } = req.body;
  console.log("action", action)
  currentState.status = action === "start" ? "Recording" : "Stopped"; // Update state based on action
  io.emit("recordingStatus", {status: currentState.status})
  res.sendStatus(200);
});

// Streamer upload endpoint
app.post('/upload', upload.single('video'), async (req, res) => {
  const videoFile = req.file;
  
  // Get current timestamp in milliseconds when the streamer starts recording
  streamStartTime = Date.now();
  if (videoFile) {
    try {
      // Upload file to GridFSBucket
      const uploadPath = path.join(__dirname, 'uploads', 'live.webm');
      fs.promises.copyFile(req.file.path, uploadPath).then(() => {
        console.log("File uploaded successfully")
        io.emit("newVideoStatus", {status: "Available"})
      });
      const uploadStream = bucket.openUploadStream(req.file.originalname, {
        chunkSizeBytes: 1048576,
        metadata: {
          name: req.file.originalname,
          streamStartTime: new Date(streamStartTime),
          size: req.file.size,
          type: req.file.mimetype,
        }
      })

      fs.createReadStream(req.file.path).pipe(uploadStream).on('finish', ()=> {
        console.log("upload finished")
        res.json({
          message: 'Video uploaded successfully!',
          // url: result.secure_url,
          streamStartTime: streamStartTime,
        });
        io.emit("newVideoStatus", {status: "Saved to DB"})
      })
      
    } catch (error) {
      console.error('Error uploading video to Cloudinary:', error);
      res.status(500).send('Error uploading video.');
    }   
  } else {
    res.status(400).send('No video uploaded.');
  }
});

// Video stream endpoint
app.get('/video-stream/:id', (req, res) => {
  const videoId = new ObjectId(req.params.id);

  try {
    const downloadStream = bucket.openDownloadStream(videoId);
    res.set({
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
    });

    downloadStream.pipe(res).on('error', (error) => {
      console.error('Error streaming video:', error);
      res.status(500).send('Error streaming video');
    });
  } catch (error) {
    console.error('Error fetching video stream:', error);
    res.status(500).send('Error fetching video stream');
  }
});

app.get("/latest-video", async(req, res) => {
  try {
    // return the streamable URL for the video file
    res.json({
      url: "/uploads/live.webm",
      streamStartTime: streamStartTime,
    });
  } catch (error) {
    console.error('Error fetching video stream:', error);
    res.status(500).send('Error fetching video stream');
  }
});


// API to get all videos list
// API to get metadata of the last 10 videos
app.get('/all-videos', async (req, res) => {
  try {
    const allVideos = await db.collection('fs.files')
      .find({})
      .sort({ uploadDate: -1 })
      .toArray();

    const videoList = allVideos.map(video => ({
      id: video._id,
      name: video.filename,
      streamStartTime: video.metadata.streamStartTime,
    }));

    res.json(videoList);
  } catch (error) {
    console.error('Error fetching recent videos:', error);
    res.status(500).json({ message: 'Error fetching recent videos' });
  }
});


// Serve static files from the uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

server.listen(port, async() => {
  console.log(`Server running on http://localhost:${port}`);
  // Connect to MongoDB
  try {
    client = await mongoClient.connect(process.env.MONGO_URI, {
      useUnifiedTopology: true,
    });
    db = client.db('videoDB');
    console.log('MongoDB connected');

    bucket = new mongodb.GridFSBucket(db);
  } catch (error) {
    console.log("Error: " + error)
  }
});
