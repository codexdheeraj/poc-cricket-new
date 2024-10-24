const express = require('express'); 
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const mongodb = require('mongodb');
require('dotenv').config(); // Load environment variables

const app = express();
const port = 3001;

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

// Streamer upload endpoint
app.post('/upload', upload.single('video'), async (req, res) => {
  const videoFile = req.file;
  
  // Get current timestamp in milliseconds when the streamer starts recording
  streamStartTime = Date.now();
  console.log("video file:",videoFile)
  if (videoFile) {
    try {
      // Upload file to GridFSBucket
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
      })
      
    } catch (error) {
      console.error('Error uploading video to Cloudinary:', error);
      res.status(500).send('Error uploading video.');
    }   
  } else {
    res.status(400).send('No video uploaded.');
  }
});

// API to get the latest video file and its recording timestamp
app.get('/latest-video', async (req, res) => {
  try {
    // Find the latest uploaded video by checking the upload date
    const latestFile = await db.collection('fs.files')
      .find({})
      .sort({ uploadDate: -1 })
      .limit(1)
      .toArray();

    if (latestFile.length === 0) {
      return res.status(404).json({ message: 'No video found' });
    }

    const videoFile = latestFile[0];
    const videoId = videoFile._id;
    const streamStartTime = videoFile.metadata.streamStartTime;

    // Return the streamable URL for the video file
    res.json({
      url: `/latest-video-stream/${videoId}`, // Stream endpoint
      streamStartTime: streamStartTime,
    });
  } catch (error) {
    console.error('Error fetching the latest video:', error);
    res.status(500).json({ message: 'Error fetching video' });
  }
});

// Video stream endpoint
app.get('/latest-video-stream/:id', (req, res) => {
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


// Serve static files from the uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(port, async() => {
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
